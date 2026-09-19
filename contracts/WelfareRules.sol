// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {DWCToken} from "./DWCToken.sol";
import {DateLib} from "./lib/DateLib.sol";

/// @title Regolamento Piano Welfare — motore delle regole, a versioni
/// @notice Ogni versione del regolamento (marzo 2026, luglio 2026, …) è un insieme di parametri
///         con l'impronta del documento approvato. Una versione pubblicata non si modifica più:
///         per cambiare le regole se ne pubblica una nuova. Ogni accredito ricorda con quale
///         versione è stato calcolato.
///
///         Punti Welfare totali = Credito Base Soci + Credito Ruolo + Attività Extra
///                                + Bonus Commerciali + Altri Bonus
contract WelfareRules is AccessControl {
    /// Risorse Umane: profili, accrediti.
    bytes32 public constant HR_ROLE = keccak256("HR_ROLE");
    /// Chi approva il regolamento (CdA): crea e pubblica le versioni.
    bytes32 public constant RULES_ADMIN_ROLE = keccak256("RULES_ADMIN_ROLE");

    uint256 private constant UNIT = 1e18;
    uint256 private constant BPS = 10_000;

    enum CreditKind {
        BaseSocio,
        Ruolo,
        AttivitaExtra,
        BonusCommerciale,
        AltroBonus
    }

    struct Version {
        string name;
        string documentURI;
        bytes32 documentHash;
        uint64 effectiveFrom;
        bool published;
    }

    struct Role {
        bool defined;
        string label;
        uint256 creditSocio; // DWC interi all'anno
        uint256 creditNonSocio;
        bool halvedIfPartTime; // i ruoli operativi si dimezzano con il part-time
    }

    struct Rate {
        uint256 socio; // DWC interi all'ora
        uint256 nonSocio;
    }

    struct Profile {
        bool exists;
        bool isSocio;
        bool partTime;
        bool bonusSuspended; // sanzione disciplinare: decadono i bonus variabili
        uint64 startDate;
        bytes32 level; // livello operativo, per la tariffa oraria delle attività extra
        bytes32[] roles; // ruoli ricoperti: i crediti si sommano
    }

    DWCToken public immutable token;

    Version[] private _versions; // l'indice 0 è vuoto: le versioni partono da 1
    uint256 public currentVersion;

    mapping(uint256 => uint256[2]) private _baseCredit; // [socio, nonSocio]
    mapping(uint256 => mapping(bytes32 => Role)) private _roles;
    mapping(uint256 => bytes32[]) private _roleKeys;
    mapping(uint256 => mapping(bytes32 => Rate)) private _hourlyRates;
    mapping(uint256 => uint256[3]) private _quarterlyPrizes;
    mapping(uint256 => uint256[3]) private _annualPrizes;

    mapping(address => Profile) private _profiles;
    mapping(address => mapping(uint256 => bool)) public annualAccrued;
    mapping(bytes32 => bool) public rankingAwarded;

    event VersionCreated(uint256 indexed version, string name, bytes32 documentHash);
    event VersionPublished(uint256 indexed version);
    event ProfileSet(address indexed member, bool isSocio, bool partTime, uint64 startDate, bytes32 level, bytes32[] roles);
    event BonusSuspensionSet(address indexed member, bool suspended);
    event Credited(address indexed member, CreditKind indexed kind, uint256 amount, uint256 version, string memo);
    event AnnualAccrued(address indexed member, uint256 indexed year, uint256 version, uint256 proRataBps, uint256 amount);
    event BonusForfeited(address indexed member, uint256 amount, string memo);

    error VersionNotFound(uint256 version);
    error VersionAlreadyPublished(uint256 version);
    error NoPublishedVersion();
    error ProfileMissing(address member);
    error UnknownRole(bytes32 role);
    error AlreadyAccrued(address member, uint256 year);
    error YearNotStarted(uint256 year);
    error NothingToAccrue(address member, uint256 year);
    error NoHourlyRate(address member);
    error RankingAlreadyAwarded();
    error BonusSuspended(address member);

    constructor(DWCToken token_, address admin) {
        token = token_;
        _versions.push(); // segnaposto per l'indice 0
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RULES_ADMIN_ROLE, admin);
        _grantRole(HR_ROLE, admin);
    }

    // ───────────────────────────── Versioni del regolamento ─────────────────────────────

    function createVersion(string calldata name, string calldata documentURI, bytes32 documentHash, uint64 effectiveFrom)
        external
        onlyRole(RULES_ADMIN_ROLE)
        returns (uint256 version)
    {
        _versions.push(Version(name, documentURI, documentHash, effectiveFrom, false));
        version = _versions.length - 1;
        emit VersionCreated(version, name, documentHash);
    }

    function setBaseCredit(uint256 version, uint256 socio, uint256 nonSocio) external onlyRole(RULES_ADMIN_ROLE) {
        _draft(version);
        _baseCredit[version] = [socio, nonSocio];
    }

    function setRole(
        uint256 version,
        bytes32 key,
        string calldata label,
        uint256 creditSocio,
        uint256 creditNonSocio,
        bool halvedIfPartTime
    ) external onlyRole(RULES_ADMIN_ROLE) {
        _draft(version);
        if (!_roles[version][key].defined) _roleKeys[version].push(key);
        _roles[version][key] = Role(true, label, creditSocio, creditNonSocio, halvedIfPartTime);
    }

    function setHourlyRate(uint256 version, bytes32 level, uint256 socio, uint256 nonSocio)
        external
        onlyRole(RULES_ADMIN_ROLE)
    {
        _draft(version);
        _hourlyRates[version][level] = Rate(socio, nonSocio);
    }

    function setPrizes(uint256 version, uint256[3] calldata quarterly, uint256[3] calldata annual)
        external
        onlyRole(RULES_ADMIN_ROLE)
    {
        _draft(version);
        _quarterlyPrizes[version] = quarterly;
        _annualPrizes[version] = annual;
    }

    /// @notice Pubblica la versione: da qui in poi è immutabile ed è quella in vigore.
    function publish(uint256 version) external onlyRole(RULES_ADMIN_ROLE) {
        _draft(version);
        _versions[version].published = true;
        currentVersion = version;
        emit VersionPublished(version);
    }

    function _draft(uint256 version) private view {
        if (version == 0 || version >= _versions.length) revert VersionNotFound(version);
        if (_versions[version].published) revert VersionAlreadyPublished(version);
    }

    // ───────────────────────────── Profili ─────────────────────────────

    function setProfile(
        address member,
        bool isSocio,
        bool partTime,
        uint64 startDate,
        bytes32 level,
        bytes32[] calldata roles
    ) external onlyRole(HR_ROLE) {
        uint256 v = _current();
        for (uint256 i = 0; i < roles.length; i++) {
            if (!_roles[v][roles[i]].defined) revert UnknownRole(roles[i]);
        }
        Profile storage p = _profiles[member];
        p.exists = true;
        p.isSocio = isSocio;
        p.partTime = partTime;
        p.startDate = startDate;
        p.level = level;
        p.roles = roles;
        emit ProfileSet(member, isSocio, partTime, startDate, level, roles);
    }

    function setBonusSuspended(address member, bool suspended) external onlyRole(HR_ROLE) {
        if (!_profiles[member].exists) revert ProfileMissing(member);
        _profiles[member].bonusSuspended = suspended;
        emit BonusSuspensionSet(member, suspended);
    }

    // ───────────────────────────── Accrediti ─────────────────────────────

    /// @notice Accredito annuale: Credito Base + Credito Ruolo, riproporzionati alla data di ingresso.
    ///         Una sola volta per persona e per anno.
    function accrueAnnual(address member, uint256 year) external onlyRole(HR_ROLE) returns (uint256 total) {
        uint256 v = _current();
        if (annualAccrued[member][year]) revert AlreadyAccrued(member, year);
        (uint256 base, uint256 roleCredit, uint256 bps) = _annualAmounts(v, member, year);
        total = base + roleCredit;
        if (total == 0) revert NothingToAccrue(member, year);

        annualAccrued[member][year] = true;
        if (base > 0) _credit(member, CreditKind.BaseSocio, base, v, "Credito base annuale");
        if (roleCredit > 0) _credit(member, CreditKind.Ruolo, roleCredit, v, "Credito ruolo annuale");
        emit AnnualAccrued(member, year, v, bps, total);
    }

    /// @notice Anteprima dell'accredito annuale, senza emettere nulla.
    function previewAnnual(address member, uint256 year)
        external
        view
        returns (uint256 base, uint256 roleCredit, uint256 proRataBps)
    {
        return _annualAmounts(_current(), member, year);
    }

    /// @notice Attività extra-lavorative (baratto sociale): ore × tariffa del livello.
    ///         Ammesse solo per attività senza compenso in euro alla cooperativa, o interne: lo attesta HR.
    function creditExtraActivity(address member, uint256 minutesWorked, string calldata projectRef)
        external
        onlyRole(HR_ROLE)
        returns (uint256 amount)
    {
        uint256 v = _current();
        Profile storage p = _profile(member);
        Rate storage r = _hourlyRates[v][p.level];
        uint256 rate = p.isSocio ? r.socio : r.nonSocio;
        if (rate == 0) revert NoHourlyRate(member);
        amount = (rate * UNIT * minutesWorked) / 60;
        _credit(member, CreditKind.AttivitaExtra, amount, v, projectRef);
    }

    /// @notice Premi delle classifiche commerciali, convertiti 1:1 in DWC.
    /// @param quarter 1-4 per la classifica trimestrale, 0 per quella annuale.
    function creditRanking(uint256 year, uint8 quarter, address[3] calldata winners) external onlyRole(HR_ROLE) {
        uint256 v = _current();
        bytes32 key = keccak256(abi.encode(year, quarter));
        if (rankingAwarded[key]) revert RankingAlreadyAwarded();
        rankingAwarded[key] = true;

        uint256[3] storage table = quarter == 0 ? _annualPrizes[v] : _quarterlyPrizes[v];
        string memory memo = quarter == 0 ? "Classifica commerciale annuale" : "Classifica commerciale trimestrale";
        for (uint256 i = 0; i < 3; i++) {
            address w = winners[i];
            if (w == address(0) || table[i] == 0) continue;
            uint256 amount = table[i] * UNIT;
            if (_profile(w).bonusSuspended) {
                emit BonusForfeited(w, amount, memo);
            } else {
                _credit(w, CreditKind.BonusCommerciale, amount, v, memo);
            }
        }
    }

    /// @notice Altri bonus decisi da HR (produttività, sfide ed eventi interni).
    function creditBonus(address member, uint256 amount, string calldata memo) external onlyRole(HR_ROLE) {
        uint256 v = _current();
        if (_profile(member).bonusSuspended) revert BonusSuspended(member);
        _credit(member, CreditKind.AltroBonus, amount, v, memo);
    }

    // ───────────────────────────── Letture ─────────────────────────────

    function versionsCount() external view returns (uint256) {
        return _versions.length - 1;
    }

    function getVersion(uint256 version) external view returns (Version memory) {
        if (version == 0 || version >= _versions.length) revert VersionNotFound(version);
        return _versions[version];
    }

    function baseCredit(uint256 version) external view returns (uint256 socio, uint256 nonSocio) {
        return (_baseCredit[version][0], _baseCredit[version][1]);
    }

    function roleKeys(uint256 version) external view returns (bytes32[] memory) {
        return _roleKeys[version];
    }

    function getRole(uint256 version, bytes32 key) external view returns (Role memory) {
        return _roles[version][key];
    }

    function hourlyRate(uint256 version, bytes32 level) external view returns (Rate memory) {
        return _hourlyRates[version][level];
    }

    function prizes(uint256 version) external view returns (uint256[3] memory quarterly, uint256[3] memory annual) {
        return (_quarterlyPrizes[version], _annualPrizes[version]);
    }

    function getProfile(address member) external view returns (Profile memory) {
        return _profiles[member];
    }

    // ───────────────────────────── Interni ─────────────────────────────

    function _current() private view returns (uint256 v) {
        v = currentVersion;
        if (v == 0) revert NoPublishedVersion();
    }

    function _profile(address member) private view returns (Profile storage p) {
        p = _profiles[member];
        if (!p.exists) revert ProfileMissing(member);
    }

    function _annualAmounts(uint256 v, address member, uint256 year)
        private
        view
        returns (uint256 base, uint256 roleCredit, uint256 bps)
    {
        Profile storage p = _profile(member);
        uint256 ys = DateLib.yearStart(year);
        uint256 ye = DateLib.yearStart(year + 1);
        if (block.timestamp < ys) revert YearNotStarted(year);

        uint256 start = p.startDate > ys ? p.startDate : ys;
        if (start >= ye) return (0, 0, 0);
        bps = ((ye - start) * BPS) / (ye - ys);

        base = (_baseCredit[v][p.isSocio ? 0 : 1] * UNIT * bps) / BPS;

        uint256 roleUnits;
        for (uint256 i = 0; i < p.roles.length; i++) {
            Role storage r = _roles[v][p.roles[i]];
            uint256 c = (p.isSocio ? r.creditSocio : r.creditNonSocio) * UNIT;
            if (p.partTime && r.halvedIfPartTime) c /= 2;
            roleUnits += c;
        }
        roleCredit = (roleUnits * bps) / BPS;
    }

    function _credit(address member, CreditKind kind, uint256 amount, uint256 v, string memory memo) private {
        token.mint(member, amount);
        emit Credited(member, kind, amount, v, memo);
    }
}
