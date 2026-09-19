// Genera le slide del pitch: pitch/DWC-pitch.pptx
// Uso:  cd pitch && npm install && node build-pitch.js
// Gli indirizzi dei contratti su Fuji vengono letti da deployments/fuji.json, se esiste;
// altrimenti nell'ultima slide resta un segnaposto ben visibile.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fi = require("react-icons/fi");

const BG = "F6F4EF";
const INK = "1C1B19";
const RED = "E84142";
const MUTED = "6B6862";
const CARD = "FFFFFF";
const BORDER = "E2DED3";
const TINT = "FCE4E4";
const HEAD = "Georgia";
const BODY = "Calibri";
const TOTAL = 8;
const REPO = "github.com/SimoneLazzari-DN/dwc-avalanche";

function readFuji() {
  const candidates = [
    process.env.FUJI_DEPLOYMENT,
    path.join(__dirname, "..", "deployments", "fuji.json"),
    // quando si lavora in un worktree (.claude/worktrees/<nome>/pitch) il file sta nella repo principale
    path.join(__dirname, "..", "..", "..", "..", "deployments", "fuji.json"),
  ].filter(Boolean);
  for (const f of candidates) {
    try {
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      if (j && j.contracts && j.chainId === 43113) return j.contracts;
    } catch {}
  }
  return null;
}

async function icon(Icon, color) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color: "#" + color, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10" x 5.625"
  pres.author = "Simone Lazzari — B-Chainers Labs";
  pres.title = "DWC — il welfare della cooperativa, con le regole su Avalanche";

  let n = 0;
  const newSlide = (notes) => {
    n++;
    const s = pres.addSlide();
    s.background = { color: BG };
    if (n > 1) {
      s.addText("DWC · B-Chainers Labs", { x: 0.6, y: 5.17, w: 4, h: 0.25, fontFace: BODY, fontSize: 9, color: MUTED, margin: 0, isTextBox: true });
      s.addText(`${n} / ${TOTAL}`, { x: 8.4, y: 5.17, w: 1, h: 0.25, fontFace: BODY, fontSize: 9, color: MUTED, align: "right", margin: 0, isTextBox: true });
    }
    if (notes) s.addNotes(notes);
    return s;
  };
  const kicker = (s, text) =>
    s.addText(text, { x: 0.6, y: 0.4, w: 8.8, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: RED, charSpacing: 2, margin: 0, isTextBox: true });
  const title = (s, text) =>
    s.addText(text, { x: 0.6, y: 0.7, w: 8.8, h: 0.75, fontFace: HEAD, fontSize: 28, bold: true, color: INK, margin: 0, valign: "middle", isTextBox: true });
  const card = (s, x, y, w, h, opts = {}) =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h, rectRadius: 0.08,
      fill: { color: opts.fill || CARD },
      line: opts.line || { color: BORDER, width: 0.75 },
    });
  const dot = async (s, x, y, d, Icon, bg = RED, fg = "FFFFFF") => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg, width: 0 } });
    const p = d * 0.27;
    s.addImage({ data: await icon(Icon, fg), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
  };
  const num = (s, x, y, d, label) =>
    s.addText(String(label), {
      shape: pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: RED }, line: { color: RED, width: 0 },
      fontFace: HEAD, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0,
    });
  const text = (s, t, o) => s.addText(t, { fontFace: BODY, color: INK, margin: 0, valign: "top", isTextBox: true, ...o });
  const bullets = (items, fontSize = 13) =>
    items.map((t, i) => ({ text: t, options: { bullet: { indent: 12 }, breakLine: i < items.length - 1, paraSpaceAfter: 6, fontSize } }));

  // ───────────────────────── 1 · Titolo
  {
    const s = newSlide(
      "Buongiorno, sono Simone Lazzari di B-Chainers Labs, il laboratorio blockchain della cooperativa DreamNet. " +
        "Vi presento DWC: il welfare della nostra cooperativa, con le regole scritte su Avalanche. " +
        "Un'idea semplice: la persona scrive cosa vuole, un assistente AI la trasforma in un'operazione verificabile sulla catena."
    );
    kicker(s, "TEAM1 HACKATHON · BLOCKCHAIN BEACH 2026");
    text(s, "DWC", { x: 0.6, y: 1.0, w: 5.2, h: 1.35, fontFace: HEAD, fontSize: 88, bold: true, color: RED, valign: "middle" });
    text(s, "Il welfare della cooperativa,\ncon le regole su Avalanche", { x: 0.6, y: 2.45, w: 5.4, h: 1.1, fontFace: HEAD, fontSize: 26, bold: true });
    text(s, "B-Chainers Labs · Simone Lazzari", { x: 0.6, y: 4.3, w: 5.4, h: 0.35, fontSize: 17, bold: true });
    text(s, "Track: AI x Avalanche for real-world utility · Pescara, 19 settembre 2026", { x: 0.6, y: 4.7, w: 5.6, h: 0.3, fontSize: 11, color: MUTED });

    // a destra: dalla richiesta all'azione
    const cx = 6.35, cw = 3.05;
    card(s, cx, 0.95, cw, 1.05);
    text(s, "LA PERSONA SCRIVE", { x: cx + 0.2, y: 1.07, w: cw - 0.4, h: 0.22, fontSize: 9, bold: true, color: MUTED, charSpacing: 1.5 });
    text(s, "«Vorrei 30 € di buoni pasto»", { x: cx + 0.2, y: 1.33, w: cw - 0.4, h: 0.55, fontFace: HEAD, fontSize: 15, italic: true, valign: "middle" });
    s.addImage({ data: await icon(fi.FiArrowDown, MUTED), x: cx + cw / 2 - 0.13, y: 2.1, w: 0.26, h: 0.26 });
    await dot(s, cx + 0.2, 2.47, 0.62, fi.FiMessageCircle);
    text(s, "Assistente AI", { x: cx + 0.97, y: 2.5, w: 2, h: 0.28, fontSize: 14, bold: true });
    text(s, "capisce, prepara, simula", { x: cx + 0.97, y: 2.78, w: 2, h: 0.26, fontSize: 11.5, color: MUTED });
    s.addImage({ data: await icon(fi.FiArrowDown, MUTED), x: cx + cw / 2 - 0.13, y: 3.2, w: 0.26, h: 0.26 });
    card(s, cx, 3.57, cw, 1.05, { fill: INK, line: { color: INK, width: 0 } });
    text(s, "SU AVALANCHE", { x: cx + 0.2, y: 3.69, w: cw - 0.4, h: 0.22, fontSize: 9, bold: true, color: "B9B5AB", charSpacing: 1.5 });
    text(s, "Un'operazione verificabile, firmata dalla persona", { x: cx + 0.2, y: 3.93, w: cw - 0.4, h: 0.6, fontSize: 13.5, bold: true, color: "FFFFFF", valign: "middle" });
  }

  // ───────────────────────── 2 · Problema e utente
  {
    const s = newSlide(
      "DreamNet è una cooperativa vera, con un piano welfare vero: ogni membro matura dei crediti, i DWC, che valgono un euro di potere d'acquisto " +
        "e si spendono in un catalogo di benefit: buoni pasto, visite mediche, soggiorni. " +
        "Oggi tutto questo vive in fogli Excel ed email: saldi aggiornati a mano, limiti controllati a memoria, " +
        "e nessuno può verificare che le regole siano applicate a tutti allo stesso modo."
    );
    kicker(s, "IL PROBLEMA E L'UTENTE");
    title(s, "Un welfare vero, gestito con Excel ed email");

    text(s, "DreamNet è una cooperativa vera, con un piano welfare vero: i DWC.", { x: 0.6, y: 1.75, w: 3.9, h: 0.75, fontSize: 16 });
    card(s, 0.6, 2.8, 3.9, 1.95, { fill: TINT, line: { color: TINT, width: 0 } });
    text(s, "1 DWC = 1 €", { x: 0.85, y: 3.0, w: 3.4, h: 0.75, fontFace: HEAD, fontSize: 38, bold: true, color: RED, valign: "middle" });
    text(s, "di valore d'acquisto, da spendere in buoni pasto, visite mediche, soggiorni, biglietti.", { x: 0.85, y: 3.8, w: 3.4, h: 0.8, fontSize: 13 });

    const rows = [
      [fi.FiEdit3, "Saldi tenuti a mano"],
      [fi.FiHelpCircle, "Limiti del catalogo controllati a memoria"],
      [fi.FiEyeOff, "Nessuno può verificare che le regole valgano per tutti allo stesso modo"],
    ];
    let y = 1.75;
    for (const [ic, label] of rows) {
      card(s, 5.0, y, 4.4, 0.9);
      await dot(s, 5.2, y + 0.19, 0.52, ic);
      text(s, label, { x: 5.92, y: y + 0.08, w: 3.3, h: 0.74, fontSize: 14.5, bold: true, valign: "middle" });
      y += 1.05;
    }
  }

  // ───────────────────────── 3 · Soluzione
  {
    const s = newSlide(
      "La soluzione in una frase: le regole del regolamento welfare diventano smart contract su Avalanche. Sono tre. " +
        "Il token è a circuito chiuso: si scambia solo tra membri, non può uscire, e scade sei mesi dopo l'uscita dalla cooperativa. " +
        "Il regolamento è a versioni immutabili: marzo 2026 e luglio 2026; cambiare le regole significa pubblicare una nuova versione. " +
        "Il marketplace gestisce servizi a prezzo fisso e su preventivo, e tiene i DWC in custodia finché il fornitore conferma l'erogazione."
    );
    kicker(s, "LA SOLUZIONE");
    title(s, "Le regole del welfare diventano il contratto");
    text(s, "Tre smart contract su Avalanche: stesse regole per tutti, verificabili da chiunque.", { x: 0.6, y: 1.5, w: 8.8, h: 0.35, fontSize: 15, color: MUTED });

    const cols = [
      [fi.FiRepeat, "Token a circuito chiuso", "DWCToken", ["Si scambia solo tra membri", "Non può uscire dal network", "Scade 6 mesi dopo l'uscita dalla coop"]],
      [fi.FiBookOpen, "Regolamento a versioni", "WelfareRules", ["Versioni immutabili: marzo 2026 → luglio 2026", "Ogni accredito ricorda la versione con cui è stato calcolato"]],
      [fi.FiShoppingBag, "Marketplace dei benefit", "WelfareMarketplace", ["Prezzo fisso e su preventivo", "DWC in custodia finché il fornitore conferma", "Tetti e limiti applicati dal contratto"]],
    ];
    let x = 0.6;
    for (const [ic, head, name, items] of cols) {
      card(s, x, 2.05, 2.8, 2.9);
      await dot(s, x + 0.22, 2.25, 0.55, ic);
      text(s, head, { x: x + 0.22, y: 2.92, w: 2.4, h: 0.3, fontSize: 15.5, bold: true });
      text(s, name, { x: x + 0.22, y: 3.22, w: 2.4, h: 0.24, fontFace: "Consolas", fontSize: 10, color: MUTED });
      text(s, bullets(items, 12.5), { x: x + 0.22, y: 3.55, w: 2.4, h: 1.3 });
      x += 3.0;
    }
  }

  // ───────────────────────── 4 · L'AI
  {
    const s = newSlide(
      "Qui entra l'AI, ed è il cuore della track: from intent to onchain action. " +
        "La persona scrive «vorrei 30 euro di buoni pasto». L'assistente, che è Claude, legge le regole direttamente dalla catena, " +
        "prepara l'operazione giusta e la simula sul contratto, senza eseguire nulla. " +
        "Se il contratto la rifiuterebbe, spiega perché in parole semplici: «hai già usato 30 dei 50 DWC di questo mese», e propone un'alternativa. " +
        "Se passa, compare il pulsante «Conferma e firma». L'AI non firma mai: firma sempre la persona."
    );
    kicker(s, "L'AI · FROM INTENT TO ONCHAIN ACTION");
    title(s, "Dalle parole all'operazione sulla catena");

    const steps = [
      "La persona scrive cosa vuole, in parole sue",
      "Claude legge le regole dalla catena e prepara l'operazione",
      "La simula sul contratto: non esegue nulla",
      "Spiega l'eventuale rifiuto, oppure propone «Conferma e firma»",
    ];
    let y = 1.7;
    steps.forEach((t, i) => {
      num(s, 0.6, y + 0.06, 0.42, i + 1);
      text(s, t, { x: 1.2, y, w: 3.7, h: 0.55, fontSize: 14, valign: "middle" });
      y += 0.67;
    });

    // finta chat
    card(s, 5.3, 1.65, 4.1, 2.6);
    text(s, "ESEMPIO", { x: 5.5, y: 1.76, w: 2, h: 0.2, fontSize: 9, bold: true, color: MUTED, charSpacing: 1.5 });
    s.addText("Vorrei 30 € di buoni pasto", {
      shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.12, x: 6.75, y: 2.02, w: 2.45, h: 0.42,
      fill: { color: INK }, line: { color: INK, width: 0 }, fontFace: BODY, fontSize: 12.5, color: "FFFFFF", align: "center", valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { rectRadius: 0.12, x: 5.5, y: 2.58, w: 3.3, h: 0.78, fill: { color: "EFECE4" }, line: { color: "EFECE4", width: 0 } });
    text(s, "Hai già usato 30 dei 50 DWC di questo mese. Ne ho preparati 20: confermi?", { x: 5.68, y: 2.58, w: 2.95, h: 0.78, fontSize: 12.5, valign: "middle" });
    s.addText("Conferma e firma", {
      shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.2, x: 5.5, y: 3.55, w: 1.9, h: 0.5,
      fill: { color: RED }, line: { color: RED, width: 0 }, fontFace: BODY, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0,
    });
    text(s, "← firma la persona", { x: 7.55, y: 3.55, w: 1.7, h: 0.5, fontSize: 11.5, color: MUTED, valign: "middle" });

    card(s, 0.6, 4.5, 8.8, 0.55, { fill: INK, line: { color: INK, width: 0 } });
    s.addImage({ data: await icon(fi.FiEdit2, "FFFFFF"), x: 0.85, y: 4.645, w: 0.26, h: 0.26 });
    text(s, [
      { text: "L'AI non firma mai. ", options: { bold: true, color: "FFFFFF" } },
      { text: "Firma la persona, dal suo portafoglio.", options: { color: "E9E6DE" } },
    ], { x: 1.3, y: 4.5, w: 7.9, h: 0.55, fontSize: 15, valign: "middle" });
  }

  // ───────────────────────── 5 · Zero attrito
  {
    const s = newSlide(
      "Tutto questo senza attrito. Si entra con l'email: il portafoglio, non custodiale, viene creato dietro le quinte. " +
        "I costi di rete li paga la cooperativa: il membro non vede mai AVAX né commissioni. " +
        "E la privacy: sulla catena non c'è nessun dato personale, solo indirizzi. La rubrica che collega nomi e indirizzi vive fuori, nei sistemi della cooperativa."
    );
    kicker(s, "ZERO ATTRITO");
    title(s, "Si usa come una normale app");

    const cols = [
      [fi.FiMail, "Accesso con l'email", "Nessuna frase segreta da custodire"],
      [fi.FiKey, "Portafoglio dietro le quinte", "Non custodiale, creato in automatico"],
      [fi.FiZap, "Costi di rete: paga la coop", "Il membro non vede mai AVAX né commissioni"],
    ];
    let x = 0.6;
    for (const [ic, head, sub] of cols) {
      card(s, x, 1.7, 2.8, 1.85);
      await dot(s, x + 0.22, 1.9, 0.55, ic);
      text(s, head, { x: x + 0.22, y: 2.58, w: 2.4, h: 0.3, fontSize: 14.5, bold: true });
      text(s, sub, { x: x + 0.22, y: 2.9, w: 2.4, h: 0.55, fontSize: 12.5, color: MUTED });
      x += 3.0;
    }

    card(s, 0.6, 3.8, 8.8, 1.1, { fill: INK, line: { color: INK, width: 0 } });
    await dot(s, 0.85, 4.06, 0.58, fi.FiShield);
    text(s, "Nessun dato personale sulla catena", { x: 1.68, y: 3.95, w: 7.5, h: 0.38, fontSize: 17, bold: true, color: "FFFFFF", valign: "middle" });
    text(s, "Solo indirizzi. La rubrica dei nomi vive fuori, nei sistemi della cooperativa.", { x: 1.68, y: 4.35, w: 7.5, h: 0.35, fontSize: 13.5, color: "E9E6DE", valign: "middle" });
  }

  // ───────────────────────── 6 · Demo
  {
    const s = newSlide(
      "Ecco cosa vedrete nella demo, con tre persone di prova. Uno: l'accredito annuale, calcolato dal regolamento in vigore. " +
        "Due: buoni Edenred oltre il tetto mensile, rifiutati dal contratto e spiegati dall'AI. " +
        "Tre: un weekend su preventivo: richiesta, prezzo, accettazione, erogazione, con i DWC bruciati alla fine. " +
        "Quattro: uno scambio tra colleghi, e un tentativo verso un estraneo che il contratto blocca. " +
        "Ogni passo ha la sua prova sull'explorer di Fuji."
    );
    kicker(s, "LA DEMO");
    title(s, "Cosa vedrete tra poco");

    const steps = [
      ["Accredito annuale", "Calcolato dal regolamento in vigore"],
      ["Il cappello, dal vivo", "Una collega lo chiede all'assistente dal suo telefono, conferma e firma"],
      ["Consegna confermata", "Il banco conferma: i DWC in custodia vengono bruciati"],
      ["Oltre il tetto", "80 € di buoni pasto: il contratto rifiuterebbe, l'AI spiega e propone 50"],
    ];
    let x = 0.6;
    steps.forEach(([head, sub], i) => {
      card(s, x, 1.7, 2.05, 2.45);
      text(s, String(i + 1), { x: x + 0.2, y: 1.8, w: 1, h: 0.7, fontFace: HEAD, fontSize: 40, bold: true, color: RED, valign: "middle" });
      text(s, head, { x: x + 0.2, y: 2.55, w: 1.68, h: 0.6, fontSize: 14, bold: true });
      text(s, sub, { x: x + 0.2, y: 3.17, w: 1.68, h: 0.9, fontSize: 11.5, color: MUTED });
      x += 2.25;
    });

    card(s, 0.6, 4.35, 8.8, 0.62, { fill: TINT, line: { color: TINT, width: 0 } });
    s.addImage({ data: await icon(fi.FiSearch, RED), x: 0.85, y: 4.52, w: 0.28, h: 0.28 });
    text(s, [
      { text: "Ogni passo ha la sua prova ", options: { bold: true } },
      { text: "sull'explorer di Fuji, la rete di prova di Avalanche." },
    ], { x: 1.3, y: 4.35, w: 7.9, h: 0.62, fontSize: 14.5, valign: "middle" });
  }

  // ───────────────────────── 7 · Perché Avalanche · mainnet
  {
    const s = newSlide(
      "Perché Avalanche è essenziale e non decorativa: le regole SONO il contratto. Circuito chiuso e scadenza a sei mesi li applica il codice, non un amministratore, " +
        "e l'AI non può promettere ciò che il contratto rifiuterebbe. " +
        "Perché è pronto per mainnet: il circuito chiuso significa niente mercato secondario, l'emissione avviene solo con un ruolo autorizzato, " +
        "non ci sono dati personali, e ci sono 23 test automatici. " +
        "Prossimi passi: una rete Avalanche dedicata, una L1, per il network della cooperativa, e saldi cifrati con eERC."
    );
    kicker(s, "PERCHÉ AVALANCHE · PRONTO PER MAINNET");
    title(s, "Avalanche è essenziale, non decorativa");

    card(s, 0.6, 1.65, 4.3, 2.3);
    await dot(s, 0.8, 1.82, 0.46, fi.FiLink);
    text(s, "Perché è essenziale", { x: 1.4, y: 1.82, w: 3.3, h: 0.46, fontSize: 16, bold: true, valign: "middle" });
    text(s, bullets([
      "Le regole SONO il contratto: ognuno può verificare il proprio accredito",
      "Circuito chiuso e scadenza applicati dal codice, non da un amministratore",
      "L'AI non può promettere ciò che il contratto rifiuterebbe",
    ], 12.5), { x: 0.85, y: 2.42, w: 3.85, h: 1.45 });

    card(s, 5.1, 1.65, 4.3, 2.3);
    await dot(s, 5.3, 1.82, 0.46, fi.FiCheckCircle);
    text(s, "Pronto per mainnet", { x: 5.9, y: 1.82, w: 3.3, h: 0.46, fontSize: 16, bold: true, valign: "middle" });
    text(s, bullets([
      "Circuito chiuso = niente mercato secondario",
      "Emissione solo con ruolo autorizzato",
      "Nessun dato personale sulla catena",
      "23 test automatici sui tre contratti",
    ], 12.5), { x: 5.35, y: 2.42, w: 3.85, h: 1.45 });

    card(s, 0.6, 4.12, 8.8, 0.88, { fill: INK, line: { color: INK, width: 0 } });
    text(s, "PROSSIMI PASSI", { x: 0.85, y: 4.12, w: 1.6, h: 0.88, fontSize: 10, bold: true, color: "B9B5AB", charSpacing: 1.5, valign: "middle" });
    s.addImage({ data: await icon(fi.FiArrowRight, RED), x: 2.45, y: 4.43, w: 0.26, h: 0.26 });
    text(s, [
      { text: "Rete Avalanche dedicata (L1)", options: { bold: true, color: "FFFFFF" } },
      { text: " per il network della cooperativa", options: { color: "E9E6DE" } },
    ], { x: 2.85, y: 4.12, w: 3.6, h: 0.88, fontSize: 13, valign: "middle" });
    s.addImage({ data: await icon(fi.FiArrowRight, RED), x: 6.6, y: 4.43, w: 0.26, h: 0.26 });
    text(s, [
      { text: "Saldi cifrati", options: { bold: true, color: "FFFFFF" } },
      { text: " con eERC", options: { color: "E9E6DE" } },
    ], { x: 7.0, y: 4.12, w: 2.3, h: 0.88, fontSize: 13, valign: "middle" });
  }

  // ───────────────────────── 8 · Chiusura
  {
    const fuji = readFuji();
    const s = newSlide(
      "Il codice è pubblico su GitHub, i contratti sono su Fuji. Grazie: adesso vi faccio vedere la demo dal vivo."
    );
    kicker(s, "GRAZIE");
    title(s, "Ora la demo dal vivo");

    await dot(s, 0.6, 1.8, 0.5, fi.FiCode);
    text(s, "CODICE PUBBLICO", { x: 1.27, y: 1.78, w: 3.4, h: 0.22, fontSize: 9, bold: true, color: MUTED, charSpacing: 1.5 });
    text(s, REPO, { x: 1.27, y: 2.02, w: 3.7, h: 0.3, fontSize: 12, bold: true, hyperlink: { url: "https://" + REPO } });

    await dot(s, 0.6, 2.95, 0.5, fi.FiUsers);
    text(s, "CONTATTI", { x: 1.27, y: 2.93, w: 3.4, h: 0.22, fontSize: 9, bold: true, color: MUTED, charSpacing: 1.5 });
    text(s, "B-Chainers Labs\nDreamNet Soc. Coop.", { x: 1.27, y: 3.15, w: 3.4, h: 0.6, fontSize: 14.5, bold: true });
    text(s, "Simone Lazzari · www.dream-net.it", { x: 1.27, y: 3.8, w: 3.4, h: 0.3, fontSize: 12.5, color: MUTED });

    const names = ["DWCToken", "WelfareRules", "WelfareMarketplace"];
    card(s, 5.0, 1.7, 4.4, 3.1, fuji ? {} : { fill: "FFFFFF", line: { color: RED, width: 2, dashType: "dash" } });
    text(s, "CONTRATTI SU FUJI · C-CHAIN · CHAIN ID 43113", { x: 5.25, y: 1.88, w: 3.9, h: 0.22, fontSize: 9, bold: true, color: MUTED, charSpacing: 1 });
    if (!fuji) {
      text(s, "INDIRIZZI DA INSERIRE DOPO LA PUBBLICAZIONE", { x: 5.25, y: 2.2, w: 3.9, h: 0.75, fontSize: 17, bold: true, color: RED, valign: "middle" });
    }
    let y = fuji ? 2.3 : 3.1;
    const step = fuji ? 0.8 : 0.52;
    for (const name of names) {
      text(s, name, { x: 5.25, y, w: 3.9, h: 0.26, fontSize: 13, bold: true });
      if (fuji) text(s, fuji[name] || "—", { x: 5.25, y: y + 0.28, w: 3.95, h: 0.26, fontFace: "Consolas", fontSize: 10.5, color: MUTED });
      else text(s, "0x…", { x: 7.6, y, w: 1.55, h: 0.26, fontFace: "Consolas", fontSize: 12, color: RED, align: "right" });
      y += step;
    }
  }

  const out = path.join(__dirname, "DWC-pitch.pptx");
  await pres.writeFile({ fileName: out });
  console.log("Creato", out, readFuji() ? "(con gli indirizzi di Fuji)" : "(segnaposto: deployments/fuji.json non trovato)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
