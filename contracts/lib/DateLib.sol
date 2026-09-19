// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Calendario minimo (UTC). Algoritmi di BokkyPooBah's DateTime Library (MIT), ridotti all'essenziale.
library DateLib {
    uint256 private constant SECONDS_PER_DAY = 86400;
    int256 private constant OFFSET19700101 = 2440588;

    function daysFromDate(uint256 year, uint256 month, uint256 day) internal pure returns (uint256) {
        require(year >= 1970, "DateLib: year");
        int256 _year = int256(year);
        int256 _month = int256(month);
        int256 _day = int256(day);
        int256 __days = _day - 32075 + (1461 * (_year + 4800 + (_month - 14) / 12)) / 4
            + (367 * (_month - 2 - ((_month - 14) / 12) * 12)) / 12
            - (3 * ((_year + 4900 + (_month - 14) / 12) / 100)) / 4 - OFFSET19700101;
        return uint256(__days);
    }

    function daysToDate(uint256 _days) internal pure returns (uint256 year, uint256 month, uint256 day) {
        int256 __days = int256(_days);
        int256 L = __days + 68569 + OFFSET19700101;
        int256 N = (4 * L) / 146097;
        L = L - (146097 * N + 3) / 4;
        int256 _year = (4000 * (L + 1)) / 1461001;
        L = L - (1461 * _year) / 4 + 31;
        int256 _month = (80 * L) / 2447;
        int256 _day = L - (2447 * _month) / 80;
        L = _month / 11;
        _month = _month + 2 - 12 * L;
        _year = 100 * (N - 49) + _year + L;
        year = uint256(_year);
        month = uint256(_month);
        day = uint256(_day);
    }

    /// Primo istante dell'anno indicato.
    function yearStart(uint256 year) internal pure returns (uint256) {
        return daysFromDate(year, 1, 1) * SECONDS_PER_DAY;
    }

    /// Indice progressivo del mese di calendario (anno*12 + mese): serve per i tetti mensili.
    function monthIndex(uint256 timestamp) internal pure returns (uint256) {
        (uint256 year, uint256 month,) = daysToDate(timestamp / SECONDS_PER_DAY);
        return year * 12 + month;
    }
}
