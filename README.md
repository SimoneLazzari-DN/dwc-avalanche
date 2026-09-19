# DWC — cooperative welfare, with the rules on Avalanche

**Team1 Hackathon @ Blockchain Beach 2026 · track: AI x Avalanche for real-world utility**
Built in one day by Simone Lazzari — [B-Chainers Labs](https://www.dream-net.it) (DreamNet Soc. Coop.)

> *From intent to onchain action.* A co-op member writes **"vorrei 30 € di buoni pasto"**. An AI assistant reads the
> welfare rules from the smart contracts, prepares the right operation, **simulates it against the contract**, explains
> any refusal in plain Italian ("hai già usato 30 dei 50 DWC di questo mese") and hands the member a one-click,
> gas-free transaction to sign with a wallet created from their email.

## The problem

DreamNet is a real worker cooperative with a real welfare plan: every member earns **DWC (Dreamnet Welfare Coin,
1 DWC = 1 € of purchasing value)** according to a written regulation — base credit for members, credit per role,
hourly credit for unpaid "social barter" work, sales-ranking prizes — and spends it on a benefit catalogue (meal
vouchers, medical visits, stays, tickets). Today this lives in **spreadsheets and e-mails**: balances are maintained
by hand, catalogue limits are checked by memory, and nobody can verify that the rules were applied the same way to everyone.

## The solution

| Layer | What it does |
|---|---|
| **`DWCToken`** | ERC-20 with a closed circuit: minted only by the rules engine, transferable **only between registered members**, spendable only in the marketplace. It cannot leave the network, so it cannot be listed or cashed out. When a member leaves, the balance stays spendable for 6 months, then **anyone** can trigger the burn — the rule is in the contract, not in someone's goodwill. |
| **`WelfareRules`** | The regulation as **immutable, versioned parameters** (v1 = March 2026, v2 = July 2026, in force). Changing the rules means publishing a new version; every credit records the version it was computed with. Annual accrual (pro-rata on start date, halved for part-time operational roles, cumulative roles), hourly barter credit, ranking prizes, HR bonuses, disciplinary suspension of variable bonuses. |
| **`WelfareMarketplace`** | Fixed-price and **quote-based** services. DWC are held in escrow and burned only when the vendor confirms delivery; refunded on cancellation. Catalogue rules are enforced on-chain: monthly cap per person, maximum share of a receipt payable in DWC, minimum notice, limited stock — *first come, first served* is simply block order. |
| **AI assistant** (Claude) | Turns a request in plain language into the correct contract call. It never signs: every tool call is **dry-run against the chain** (`eth_call` from the member's address); custom errors are decoded and explained; successful simulations become a "Confirm and sign" card. HR gets extra tools only if the address holds `HR_ROLE` on-chain. |
| **Wallet** | Non-custodial in-app wallet created from an e-mail, ERC-4337 smart account, **sponsored gas**: members never see seed phrases, AVAX or gas. |

**Privacy by design:** nothing personal is on-chain — only addresses. The name ↔ address directory lives off-chain
(here a local file; in production the co-op's own PostgreSQL). This repo contains **synthetic test people only**.

## Why Avalanche is essential, not decorative

- The **rules are the contract**: members can verify their accrual against the published regulation version.
- **Closed-loop transfers and the 6-month expiry** are enforced by `_update`, not by an admin.
- The AI is *grounded* by the chain: it cannot promise what the contract would revert.
- Mainnet readiness: closed circuit (no secondary market), role-gated minting, no personal data, gas sponsored.
  Natural next step: a dedicated **Avalanche L1** for the co-op network and **eERC** encrypted balances.

## Contracts on Fuji (C-Chain, chainId 43113)

<!-- DEPLOYMENTS -->
_Addresses are written here after deployment._
<!-- /DEPLOYMENTS -->

## Run it

```bash
npm install
npx hardhat test                                   # 23 tests
npx hardhat run scripts/deploy.js --network fuji   # needs DEPLOYER_PRIVATE_KEY in .env (throw-away testnet key)

cd web
npm install
# web/.env.local: ANTHROPIC_API_KEY=…  NEXT_PUBLIC_THIRDWEB_CLIENT_ID=…
npm run dev
```

After the first e-mail login, grant HR to that address: `HR_ADDRESS=0x… npx hardhat run scripts/grant-hr.js --network fuji`.

## Repo map

- `contracts/` — the three contracts + a minimal date library · `test/` — the rules, as executable examples
- `scripts/lib/regolamento.js` — both regulation versions, as parameters
- `web/src/lib/actions.ts` — every signable operation, shared by the UI buttons **and** the AI tools
- `web/src/app/api/assistant/route.ts` — the agent loop: tools → simulation → proposal
- `ROADMAP.md` — the day, step by step (Italian)

MIT licensed.
