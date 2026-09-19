// Traduce in italiano semplice i rifiuti dei contratti (custom error → frase).
import { Interface } from "ethers";
import abis from "@/contracts/abis.json";

const MESSAGES: Record<string, string> = {
  AlreadyMember: "Questa persona è già nel network: non serve aggiungerla di nuovo.",
  NotActiveMember: "Questa persona non è un membro attivo del network.",
  SenderNotAllowed: "Chi invia non può farlo: non è un membro attivo (chi è uscito può solo spendere nel marketplace).",
  RecipientNotAllowed: "Il destinatario non fa parte del network: i DWC circolano solo tra i membri.",
  NotExited: "Questa persona non risulta uscita dalla cooperativa.",
  GraceNotOver: "I 6 mesi dall'uscita non sono ancora passati: il saldo non si può azzerare.",
  AlreadyAccrued: "L'accredito annuale di quest'anno è già stato fatto per questa persona.",
  NothingToAccrue: "Con questo profilo non matura nessun credito annuale.",
  ProfileMissing: "Manca il profilo: salvalo prima sul contratto (passo 3).",
  UnknownRole: "Uno dei ruoli scelti non esiste nel regolamento in vigore.",
  NoHourlyRate: "Per il livello di questa persona il regolamento non prevede una tariffa oraria.",
  RankingAlreadyAwarded: "I premi di questa classifica sono già stati accreditati.",
  BonusSuspended: "I bonus variabili di questa persona sono sospesi.",
  ServiceInactive: "Questo servizio non è attivo.",
  WrongKind: "Questo servizio non si acquista in questo modo (prezzo fisso / su preventivo).",
  WrongStatus: "L'ordine non è nello stato giusto per questa operazione (forse è già stata fatta).",
  NotAllowed: "Non hai il permesso per questa operazione, oppure non sei ancora un membro attivo.",
  ZeroAmount: "Indica una quantità o un importo maggiore di zero.",
  OutOfStock: "Pezzi esauriti.",
  MonthlyCapExceeded: "Superi il tetto mensile previsto per questo servizio.",
  CoverageExceeded: "I DWC possono coprire solo una parte dello scontrino: riduci l'importo.",
  NoticeTooShort: "Serve più preavviso rispetto alla data del servizio.",
  ERC20InsufficientBalance: "Saldo DWC insufficiente.",
  AccessControlUnauthorizedAccount: "Questa operazione è riservata a chi ha il ruolo giusto (es. Risorse Umane).",
};

const bySelector = new Map<string, string>();
for (const abi of Object.values(abis as Record<string, unknown[]>)) {
  new Interface(abi as never).forEachError((e) => bySelector.set(e.selector.toLowerCase(), e.name));
}

export function explainError(error: unknown): string {
  const raw = String((error as { message?: string })?.message ?? error);
  const selector = raw.match(/0x[0-9a-fA-F]{8}/)?.[0]?.toLowerCase();
  const name = (selector && bySelector.get(selector)) || Object.keys(MESSAGES).find((k) => raw.includes(k));
  if (name) return MESSAGES[name] ?? `Il contratto ha rifiutato l'operazione (${name}).`;
  if (/user (rejected|denied)|cancel/i.test(raw)) return "Operazione annullata.";
  if (/paymaster|sponsor/i.test(raw)) return "Problema con i costi di rete sponsorizzati: avvisa Simone.";
  return raw.slice(0, 200);
}
