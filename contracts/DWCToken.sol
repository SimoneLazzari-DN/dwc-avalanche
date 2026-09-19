// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title DWC — Dreamnet Welfare Coin
/// @notice Punto welfare della cooperativa (1 DWC = 1 € di valore d'acquisto nel catalogo benefit).
///         Non è un token libero: circola solo dentro il network dei membri registrati e si
///         spende solo nel marketplace. Non può uscire verso indirizzi esterni, quindi non è
///         quotabile né convertibile in denaro.
/// @dev Sulla catena non c'è nessun dato anagrafico: solo indirizzi. Il collegamento
///      indirizzo ↔ persona vive fuori catena.
contract DWCToken is ERC20, AccessControl {
    /// Risorse Umane: gestisce il registro dei membri.
    bytes32 public constant HR_ROLE = keccak256("HR_ROLE");
    /// Contratti che possono emettere DWC (il motore delle regole).
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    /// Contratti che possono custodire e bruciare DWC (il marketplace).
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// Chi lascia la cooperativa conserva il saldo per 6 mesi, poi si azzera.
    uint64 public constant EXIT_GRACE = 180 days;

    enum Status {
        None,
        Active,
        Exited
    }

    struct Member {
        Status status;
        uint64 joinedAt;
        uint64 exitedAt;
    }

    mapping(address => Member) private _members;
    address[] private _memberList;

    event MemberAdded(address indexed member);
    event MemberExited(address indexed member, uint64 balanceExpiresAt);
    event MemberReinstated(address indexed member);
    event ExitedBalanceSwept(address indexed member, uint256 amount);

    error NotActiveMember(address account);
    error SenderNotAllowed(address account);
    error RecipientNotAllowed(address account);
    error AlreadyMember(address account);
    error NotExited(address account);
    error GraceNotOver(address account, uint64 expiresAt);

    constructor(address admin) ERC20("Dreamnet Welfare Coin", "DWC") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(HR_ROLE, admin);
    }

    // ───────────────────────────── Registro membri ─────────────────────────────

    function addMember(address account) external onlyRole(HR_ROLE) {
        Member storage m = _members[account];
        if (m.status != Status.None) revert AlreadyMember(account);
        m.status = Status.Active;
        m.joinedAt = uint64(block.timestamp);
        _memberList.push(account);
        emit MemberAdded(account);
    }

    /// @notice Registra l'uscita di un membro: da qui partono i 6 mesi di validità residua.
    function markExit(address account) external onlyRole(HR_ROLE) {
        Member storage m = _members[account];
        if (m.status != Status.Active) revert NotActiveMember(account);
        m.status = Status.Exited;
        m.exitedAt = uint64(block.timestamp);
        emit MemberExited(account, m.exitedAt + EXIT_GRACE);
    }

    /// @notice Annulla un'uscita (rientro, o uscita registrata per errore).
    function reinstate(address account) external onlyRole(HR_ROLE) {
        Member storage m = _members[account];
        if (m.status != Status.Exited) revert NotExited(account);
        m.status = Status.Active;
        m.exitedAt = 0;
        emit MemberReinstated(account);
    }

    /// @notice Azzera il saldo di chi è uscito da più di 6 mesi. Può chiamarla chiunque:
    ///         la regola è scritta nel contratto, non dipende dalla volontà di qualcuno.
    function sweepExited(address account) external {
        Member storage m = _members[account];
        if (m.status != Status.Exited) revert NotExited(account);
        uint64 expiresAt = m.exitedAt + EXIT_GRACE;
        if (block.timestamp < expiresAt) revert GraceNotOver(account, expiresAt);
        uint256 amount = balanceOf(account);
        _burn(account, amount);
        emit ExitedBalanceSwept(account, amount);
    }

    function memberInfo(address account) external view returns (Member memory) {
        return _members[account];
    }

    function isActive(address account) public view returns (bool) {
        return _members[account].status == Status.Active;
    }

    /// @notice Può ancora spendere nel marketplace: membro attivo, oppure uscito da meno di 6 mesi.
    function canSpend(address account) public view returns (bool) {
        Member storage m = _members[account];
        if (m.status == Status.Active) return true;
        return m.status == Status.Exited && block.timestamp < m.exitedAt + EXIT_GRACE;
    }

    function memberCount() external view returns (uint256) {
        return _memberList.length;
    }

    function memberAt(uint256 index) external view returns (address) {
        return _memberList[index];
    }

    // ───────────────────────────── Emissione e spesa ─────────────────────────────

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Il marketplace incassa in custodia i DWC di un acquisto.
    /// @dev Evita il doppio passaggio approve + transferFrom: chi non è tecnico firma una volta sola.
    ///      Il marketplace la chiama sempre e solo con `from = msg.sender` dell'acquirente.
    function collect(address from, uint256 amount) external onlyRole(OPERATOR_ROLE) {
        _transfer(from, msg.sender, amount);
    }

    /// @notice Il marketplace brucia i DWC in custodia quando il servizio è stato erogato.
    function burn(uint256 amount) external onlyRole(OPERATOR_ROLE) {
        _burn(msg.sender, amount);
    }

    /// @dev Regole di circolazione:
    ///      - emissione: solo verso membri attivi;
    ///      - membro attivo → altro membro attivo, oppure → marketplace;
    ///      - membro uscito (entro i 6 mesi) → solo marketplace: non può "parcheggiare" il saldo da un collega;
    ///      - marketplace → chi può ancora spendere (rimborso di un ordine annullato);
    ///      - bruciare è sempre ammesso.
    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0)) {
            if (!isActive(to)) revert NotActiveMember(to);
        } else if (to != address(0)) {
            bool fromOperator = hasRole(OPERATOR_ROLE, from);
            bool toOperator = hasRole(OPERATOR_ROLE, to);
            if (fromOperator) {
                if (!toOperator && !canSpend(to)) revert RecipientNotAllowed(to);
            } else if (toOperator) {
                if (!canSpend(from)) revert SenderNotAllowed(from);
            } else {
                if (!isActive(from)) revert SenderNotAllowed(from);
                if (!isActive(to)) revert RecipientNotAllowed(to);
            }
        }
        super._update(from, to, value);
    }
}
