// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {DWCToken} from "./DWCToken.sol";
import {DateLib} from "./lib/DateLib.sol";

/// @title Marketplace Welfare DWC
/// @notice Catalogo benefit con due flussi:
///         - prezzo fisso: il membro riscatta, il contratto verifica le regole e incassa subito;
///         - su preventivo: il membro chiede → HR (o il fornitore) fissa il prezzo → il membro accetta → si incassa.
///         I DWC incassati restano in custodia nel contratto: si bruciano quando il fornitore conferma
///         l'erogazione, tornano al membro se l'ordine viene annullato.
///         Le regole del catalogo (tetto mensile, copertura massima dello scontrino, preavviso, posti
///         limitati) le fa rispettare il contratto. "Chi prima arriva" è l'ordine stesso dei blocchi.
contract WelfareMarketplace is AccessControl {
    bytes32 public constant HR_ROLE = keccak256("HR_ROLE");

    uint256 private constant BPS = 10_000;

    enum Kind {
        Fixed,
        Quote
    }

    enum OrderStatus {
        None,
        Requested, // su preventivo: in attesa del prezzo
        Quoted, // prezzo fissato: in attesa dell'accettazione del membro
        InProgress, // pagato, DWC in custodia
        Fulfilled, // erogato, DWC bruciati
        Rejected, // rifiutato da HR / fornitore
        Cancelled // annullato (dal membro prima di pagare, o da HR con rimborso)
    }

    struct Service {
        address vendor; // chi eroga e conferma il servizio
        string title;
        string description;
        Kind kind;
        bool active;
        bool variableAmount; // prezzo fisso a importo libero (es. buoni): il membro sceglie quanti DWC usare
        bool limitedStock;
        uint32 stock;
        uint256 price; // DWC per unità (ignorato se variableAmount o su preventivo)
        uint256 monthlyCap; // tetto DWC per persona per mese di calendario (0 = nessun tetto)
        uint16 maxCoverageBps; // quota massima dello scontrino pagabile in DWC (0 = nessun vincolo)
        uint32 minNoticeDays; // preavviso minimo rispetto alla data del servizio (0 = nessuno)
    }

    struct Order {
        uint256 serviceId;
        address member;
        OrderStatus status;
        uint32 quantity;
        uint64 createdAt;
        uint64 paidAt;
        uint64 serviceDate;
        uint256 amount; // DWC
        uint256 receiptAmount; // importo dello scontrino, se il servizio lo richiede
        string details;
        string note; // nota di HR / fornitore
    }

    DWCToken public immutable token;

    Service[] private _services;
    Order[] private _orders;
    mapping(address => uint256[]) private _ordersOf;
    /// membro → servizio → mese di calendario → DWC già spesi
    mapping(address => mapping(uint256 => mapping(uint256 => uint256))) public spentInMonth;

    event ServiceListed(uint256 indexed serviceId, address indexed vendor, string title, Kind kind);
    event ServiceUpdated(uint256 indexed serviceId);
    event OrderCreated(uint256 indexed orderId, uint256 indexed serviceId, address indexed member, OrderStatus status, uint256 amount);
    event OrderQuoted(uint256 indexed orderId, uint256 amount, string note);
    event OrderPaid(uint256 indexed orderId, uint256 amount);
    event OrderFulfilled(uint256 indexed orderId, uint256 burned);
    event OrderClosed(uint256 indexed orderId, OrderStatus status, uint256 refunded, string note);

    error ServiceNotFound(uint256 serviceId);
    error ServiceInactive(uint256 serviceId);
    error WrongKind(uint256 serviceId);
    error OrderNotFound(uint256 orderId);
    error WrongStatus(uint256 orderId, OrderStatus status);
    error NotAllowed(address account);
    error ZeroAmount();
    error OutOfStock(uint256 serviceId, uint32 available);
    error MonthlyCapExceeded(uint256 serviceId, uint256 cap, uint256 alreadySpent);
    error CoverageExceeded(uint256 maxAmount);
    error NoticeTooShort(uint64 earliestServiceDate);

    constructor(DWCToken token_, address admin) {
        token = token_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(HR_ROLE, admin);
    }

    // ───────────────────────────── Catalogo (HR) ─────────────────────────────

    function listService(Service calldata s) external onlyRole(HR_ROLE) returns (uint256 serviceId) {
        _services.push(s);
        serviceId = _services.length - 1;
        emit ServiceListed(serviceId, s.vendor, s.title, s.kind);
    }

    function updateService(uint256 serviceId, Service calldata s) external onlyRole(HR_ROLE) {
        _service(serviceId);
        _services[serviceId] = s;
        emit ServiceUpdated(serviceId);
    }

    // ───────────────────────────── Prezzo fisso ─────────────────────────────

    /// @param quantity      unità richieste (ignorato per i servizi a importo libero)
    /// @param amount        DWC da usare, solo per i servizi a importo libero
    /// @param receiptAmount importo dello scontrino, solo se il servizio ha una copertura massima
    /// @param serviceDate   data del servizio, solo se il servizio richiede preavviso
    function redeem(
        uint256 serviceId,
        uint32 quantity,
        uint256 amount,
        uint256 receiptAmount,
        uint64 serviceDate,
        string calldata details
    ) external returns (uint256 orderId) {
        Service storage s = _service(serviceId);
        if (!s.active) revert ServiceInactive(serviceId);
        if (s.kind != Kind.Fixed) revert WrongKind(serviceId);
        if (!token.canSpend(msg.sender)) revert NotAllowed(msg.sender);

        if (s.variableAmount) {
            quantity = 1;
        } else {
            amount = s.price * quantity;
        }
        if (amount == 0 || quantity == 0) revert ZeroAmount();

        _checkNotice(s, serviceDate);
        _checkCoverage(s, amount, receiptAmount);
        _takeStock(serviceId, s, quantity);
        _pay(serviceId, s, msg.sender, amount);

        orderId = _newOrder(serviceId, OrderStatus.InProgress, quantity, serviceDate, amount, receiptAmount, details);
        emit OrderPaid(orderId, amount);
    }

    // ───────────────────────────── Su preventivo ─────────────────────────────

    function requestQuote(uint256 serviceId, uint32 quantity, uint64 serviceDate, string calldata details)
        external
        returns (uint256 orderId)
    {
        Service storage s = _service(serviceId);
        if (!s.active) revert ServiceInactive(serviceId);
        if (s.kind != Kind.Quote) revert WrongKind(serviceId);
        if (!token.canSpend(msg.sender)) revert NotAllowed(msg.sender);
        if (quantity == 0) revert ZeroAmount();
        _checkNotice(s, serviceDate);

        orderId = _newOrder(serviceId, OrderStatus.Requested, quantity, serviceDate, 0, 0, details);
    }

    /// @notice HR o il fornitore verificano la fattibilità e fissano il prezzo in DWC.
    function setQuote(uint256 orderId, uint256 amount, string calldata note) external {
        Order storage o = _order(orderId);
        _onlyHrOrVendor(o.serviceId);
        if (o.status != OrderStatus.Requested && o.status != OrderStatus.Quoted) revert WrongStatus(orderId, o.status);
        if (amount == 0) revert ZeroAmount();
        o.status = OrderStatus.Quoted;
        o.amount = amount;
        o.note = note;
        emit OrderQuoted(orderId, amount, note);
    }

    /// @notice Il membro accetta il prezzo: solo ora i DWC vengono incassati.
    function acceptQuote(uint256 orderId) external {
        Order storage o = _order(orderId);
        if (o.member != msg.sender) revert NotAllowed(msg.sender);
        if (o.status != OrderStatus.Quoted) revert WrongStatus(orderId, o.status);
        Service storage s = _services[o.serviceId];

        _takeStock(o.serviceId, s, o.quantity);
        _pay(o.serviceId, s, msg.sender, o.amount);
        o.status = OrderStatus.InProgress;
        o.paidAt = uint64(block.timestamp);
        emit OrderPaid(orderId, o.amount);
    }

    /// @notice Il membro rinuncia prima di aver pagato.
    function withdrawRequest(uint256 orderId) external {
        Order storage o = _order(orderId);
        if (o.member != msg.sender) revert NotAllowed(msg.sender);
        if (o.status != OrderStatus.Requested && o.status != OrderStatus.Quoted) revert WrongStatus(orderId, o.status);
        o.status = OrderStatus.Cancelled;
        emit OrderClosed(orderId, OrderStatus.Cancelled, 0, "Ritirata dal membro");
    }

    /// @notice HR o il fornitore rifiutano una richiesta non ancora pagata.
    function rejectRequest(uint256 orderId, string calldata note) external {
        Order storage o = _order(orderId);
        _onlyHrOrVendor(o.serviceId);
        if (o.status != OrderStatus.Requested && o.status != OrderStatus.Quoted) revert WrongStatus(orderId, o.status);
        o.status = OrderStatus.Rejected;
        o.note = note;
        emit OrderClosed(orderId, OrderStatus.Rejected, 0, note);
    }

    // ───────────────────────────── Chiusura ─────────────────────────────

    /// @notice Il fornitore (o HR) conferma che il servizio è stato erogato: i DWC in custodia vengono bruciati.
    function markFulfilled(uint256 orderId) external {
        Order storage o = _order(orderId);
        _onlyHrOrVendor(o.serviceId);
        if (o.status != OrderStatus.InProgress) revert WrongStatus(orderId, o.status);
        o.status = OrderStatus.Fulfilled;
        token.burn(o.amount);
        emit OrderFulfilled(orderId, o.amount);
    }

    /// @notice HR annulla un ordine già pagato: DWC restituiti, posto e tetto mensile ripristinati.
    function cancelPaid(uint256 orderId, string calldata note) external onlyRole(HR_ROLE) {
        Order storage o = _order(orderId);
        if (o.status != OrderStatus.InProgress) revert WrongStatus(orderId, o.status);
        o.status = OrderStatus.Cancelled;
        o.note = note;

        Service storage s = _services[o.serviceId];
        if (s.limitedStock) s.stock += o.quantity;
        if (s.monthlyCap > 0) {
            uint256 month = DateLib.monthIndex(o.paidAt);
            uint256 spent = spentInMonth[o.member][o.serviceId][month];
            spentInMonth[o.member][o.serviceId][month] = spent > o.amount ? spent - o.amount : 0;
        }
        token.transfer(o.member, o.amount);
        emit OrderClosed(orderId, OrderStatus.Cancelled, o.amount, note);
    }

    // ───────────────────────────── Letture ─────────────────────────────

    function servicesCount() external view returns (uint256) {
        return _services.length;
    }

    function getService(uint256 serviceId) external view returns (Service memory) {
        return _service(serviceId);
    }

    function getServices() external view returns (Service[] memory) {
        return _services;
    }

    function ordersCount() external view returns (uint256) {
        return _orders.length;
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return _order(orderId);
    }

    function getOrders() external view returns (Order[] memory) {
        return _orders;
    }

    function ordersOf(address member) external view returns (uint256[] memory) {
        return _ordersOf[member];
    }

    // ───────────────────────────── Interni ─────────────────────────────

    function _service(uint256 serviceId) private view returns (Service storage) {
        if (serviceId >= _services.length) revert ServiceNotFound(serviceId);
        return _services[serviceId];
    }

    function _order(uint256 orderId) private view returns (Order storage) {
        if (orderId >= _orders.length) revert OrderNotFound(orderId);
        return _orders[orderId];
    }

    function _onlyHrOrVendor(uint256 serviceId) private view {
        if (!hasRole(HR_ROLE, msg.sender) && _services[serviceId].vendor != msg.sender) revert NotAllowed(msg.sender);
    }

    function _checkNotice(Service storage s, uint64 serviceDate) private view {
        if (s.minNoticeDays == 0) return;
        uint64 earliest = uint64(block.timestamp + uint256(s.minNoticeDays) * 1 days);
        if (serviceDate < earliest) revert NoticeTooShort(earliest);
    }

    function _checkCoverage(Service storage s, uint256 amount, uint256 receiptAmount) private view {
        if (s.maxCoverageBps == 0) return;
        uint256 maxAmount = (receiptAmount * s.maxCoverageBps) / BPS;
        if (amount > maxAmount) revert CoverageExceeded(maxAmount);
    }

    function _takeStock(uint256 serviceId, Service storage s, uint32 quantity) private {
        if (!s.limitedStock) return;
        if (quantity > s.stock) revert OutOfStock(serviceId, s.stock);
        s.stock -= quantity;
    }

    function _pay(uint256 serviceId, Service storage s, address member, uint256 amount) private {
        if (s.monthlyCap > 0) {
            uint256 month = DateLib.monthIndex(block.timestamp);
            uint256 spent = spentInMonth[member][serviceId][month];
            if (spent + amount > s.monthlyCap) revert MonthlyCapExceeded(serviceId, s.monthlyCap, spent);
            spentInMonth[member][serviceId][month] = spent + amount;
        }
        token.collect(member, amount);
    }

    function _newOrder(
        uint256 serviceId,
        OrderStatus status,
        uint32 quantity,
        uint64 serviceDate,
        uint256 amount,
        uint256 receiptAmount,
        string calldata details
    ) private returns (uint256 orderId) {
        _orders.push(
            Order({
                serviceId: serviceId,
                member: msg.sender,
                status: status,
                quantity: quantity,
                createdAt: uint64(block.timestamp),
                paidAt: status == OrderStatus.InProgress ? uint64(block.timestamp) : 0,
                serviceDate: serviceDate,
                amount: amount,
                receiptAmount: receiptAmount,
                details: details,
                note: ""
            })
        );
        orderId = _orders.length - 1;
        _ordersOf[msg.sender].push(orderId);
        emit OrderCreated(orderId, serviceId, msg.sender, status, amount);
    }
}
