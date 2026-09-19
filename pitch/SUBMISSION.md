# Builder Hub submission — copy & paste

## Project name
DWC — Cooperative Welfare on Avalanche

## Tagline / short description (max ~150 characters)
An AI assistant turns "I'd like €30 of meal vouchers" into a verified on-chain action, under welfare rules enforced by smart contracts on Avalanche.

## Full description
**The problem.** DreamNet is a real Italian worker cooperative with a real welfare plan: members earn DWC (Dreamnet Welfare Coin, 1 DWC = €1 of purchasing value) according to a written regulation and spend them on a benefit catalogue — meal vouchers, medical visits, stays, tickets. Today all of this lives in spreadsheets and e-mails: balances are kept by hand, catalogue limits are checked from memory, and nobody can verify that the rules are applied the same way to everyone.

**The solution.** We turned the regulation into three smart contracts on Avalanche, and put an AI assistant in front of them.

- **DWCToken** — a closed-loop ERC-20: minted only by the rules engine, transferable only between registered members, spendable only in the marketplace. It cannot leave the network, so it cannot be listed or cashed out. When a member leaves, the balance stays spendable for 6 months, then anyone can trigger the burn.
- **WelfareRules** — the regulation as immutable, versioned parameters (v1 March 2026, v2 July 2026 in force). Changing the rules means publishing a new version; every credit records the version it was computed with. Annual accrual (pro-rata, part-time, cumulative roles), hourly credit for unpaid "social barter" work, sales-ranking prizes, HR bonuses, disciplinary suspension.
- **WelfareMarketplace** — fixed-price and quote-based services. DWC are held in escrow and burned only when the vendor confirms delivery. Monthly caps, maximum share of a receipt, minimum notice and limited stock are enforced on-chain — "first come, first served" is simply block order.

**From intent to on-chain action.** A member writes what they want in plain Italian. The assistant (Claude) reads balance, catalogue and rules from the chain, prepares the correct contract call and **dry-runs it against the contract** from the member's address. If the contract would revert, the custom error is decoded and explained ("you've already used 30 of this month's 50 DWC — I prepared 20 instead"). If the simulation passes, the member gets a one-click "Confirm and sign" card. The AI never signs: the person does, with a non-custodial wallet created from their e-mail, gas sponsored (ERC-4337). HR gets additional AI tools only if their address holds `HR_ROLE` on-chain.

**Why Avalanche is essential.** The rules *are* the contract: members can verify their accrual against the published regulation version; the closed circuit and the 6-month expiry are enforced by code, not by an administrator; the AI is grounded by the chain and cannot promise what the contract would reject. No personal data is on-chain — only addresses; the name directory lives off-chain.

**Mainnet readiness.** Closed loop (no secondary market), role-gated minting, no personal data on-chain, sponsored gas, 23 automated tests. Next steps: a dedicated Avalanche L1 for the cooperative network and eERC encrypted balances.

**Live at the event.** Real co-op members log in from their phones with their e-mail and buy a Blockchain Beach cap with DWC by asking the assistant; the desk confirms delivery and the escrowed DWC are burned — every step verifiable on the Fuji explorer.

## Track
AI x Avalanche for real-world utility

## Tech stack
Solidity 0.8.24 · OpenZeppelin 5 · Hardhat · Avalanche Fuji C-Chain · Next.js 16 · TypeScript · ethers v6 · thirdweb in-app wallets (e-mail login, ERC-4337 smart accounts, sponsored gas) · Claude API (tool use)

## Links
- GitHub: https://github.com/SimoneLazzari-DN/dwc-avalanche
- Slides: `pitch/DWC-pitch.pdf` in the repo (upload the same file)
- DWCToken: https://testnet.snowtrace.io/address/0xD27985aAC8FB91c0d6a73d329bDCe0707Df0A81C
- WelfareRules: https://testnet.snowtrace.io/address/0x25b80Ef7C77FD7C9812Da69DD4271612b5fb642a
- WelfareMarketplace: https://testnet.snowtrace.io/address/0x6D7F0f1dB66B299057542ee89E1ddB22E24746d9
- Annual accrual computed by the on-chain regulation: https://testnet.snowtrace.io/tx/0xbecb88e00a072fa1446afe55c2b091bb3db921c2819fcf7d715d84671c63567f
- Cap purchased through the AI assistant: https://testnet.snowtrace.io/tx/0xf26cea6eb5f2fa350713eace2c56d8e6887f7c8dbdaba924590124b609b30061

## Team
Simone Lazzari — B-Chainers Labs (DreamNet Soc. Coop.)
