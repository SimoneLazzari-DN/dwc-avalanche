// Lato browser: portafoglio creato con l'email (non custodiale) e costi di rete pagati dalla cooperativa.
import { createThirdwebClient, defineChain, getContract, prepareContractCall } from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import type { AbiFunction, AbiParameter } from "abitype";
import deployment from "@/contracts/deployment.json";
import abis from "@/contracts/abis.json";
import type { Call } from "./actions";

export const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? "";
export const client = clientId ? createThirdwebClient({ clientId }) : null;

export const chain = deployment.chainId === 43113 ? avalancheFuji : defineChain({ id: deployment.chainId, rpc: "http://127.0.0.1:8545" });

export const wallets = [
  inAppWallet({
    auth: { options: ["email"] },
    smartAccount: { chain, sponsorGas: true },
  }),
];

const CONTRACT_NAMES = { token: "DWCToken", rules: "WelfareRules", market: "WelfareMarketplace" } as const;

export const explorerTx = (hash: string) =>
  deployment.chainId === 43113 ? `https://testnet.snowtrace.io/tx/${hash}` : `#${hash}`;
export const explorerAddress = (address: string) =>
  deployment.chainId === 43113 ? `https://testnet.snowtrace.io/address/${address}` : `#${address}`;

function convert(param: AbiParameter, value: unknown): unknown {
  const { type } = param;
  if (type.endsWith("]")) {
    const inner = { ...param, type: type.slice(0, type.lastIndexOf("[")) } as AbiParameter;
    return (value as unknown[]).map((v) => convert(inner, v));
  }
  if (type.startsWith("uint") || type.startsWith("int")) return BigInt(value as string | number);
  return value;
}

/// Trasforma una `Call` (JSON) nella transazione da firmare.
export function prepare(call: Call) {
  if (!client) throw new Error("Client ID thirdweb mancante");
  const name = CONTRACT_NAMES[call.contract];
  const abi = (abis as unknown as Record<string, AbiFunction[]>)[name];
  const fn = abi.find((x) => x.type === "function" && x.name === call.fn);
  if (!fn) throw new Error(`Funzione sconosciuta: ${call.fn}`);
  const contract = getContract({ client, chain, address: deployment.contracts[name] });
  const params = fn.inputs.map((input, i) => convert(input, call.args[i]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prepareContractCall({ contract, method: fn as any, params: params as any });
}
