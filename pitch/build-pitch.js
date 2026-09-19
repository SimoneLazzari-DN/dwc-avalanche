// Genera le slide del pitch: pitch/DWC-pitch.pptx
// Uso:  cd pitch && npm install && node build-pitch.js
// Palette DreamNet: bianco e nero. Il rosso Avalanche è solo un accento (un dettaglio per slide).
// Loghi e simbolo del DWC vengono letti da web/public/brand/.
// Gli indirizzi dei contratti su Fuji vengono letti da deployments/fuji.json, se esiste;
// altrimenti nell'ultima slide resta un segnaposto ben visibile.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fi = require("react-icons/fi");

const BG = "FFFFFF";
const INK = "111111";
const RED = "E84142"; // solo accento
const MUTED = "5F5F5F";
const SOFT = "F3F3F3";
const BORDER = "D9D9D9";
const ONDARK = "D0D0D0";
const FONT = "Segoe UI";
const MONO = "Consolas";
const TOTAL = 9;
const REPO = "github.com/SimoneLazzari-DN/dwc-avalanche";
const BRAND = path.join(__dirname, "..", "web", "public", "brand");

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

// Immagine del marchio: ritagliata dai margini vuoti, con le proporzioni vere (mai deformata).
async function brandImage(file, { trim = true, width = 1200 } = {}) {
  let img = sharp(path.join(BRAND, file));
  if (trim) img = sharp(await img.trim().toBuffer());
  const { data, info } = await img.resize({ width }).png().toBuffer({ resolveWithObject: true });
  return { data: "image/png;base64," + data.toString("base64"), ratio: info.width / info.height };
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10" x 5.625"
  pres.author = "Simone Lazzari — B-Chainers Labs";
  pres.title = "DWC — il welfare della cooperativa, con le regole su Avalanche";

  const LOGO = await brandImage("dreamnet-logo.png");
  const MARK = await brandImage("dreamnet-mark.png", { width: 400 });
  const COIN = {
    data: "image/png;base64," + (await sharp(path.join(BRAND, "dwc-coin.svg")).resize(1024, 1024).png().toBuffer()).toString("base64"),
    ratio: 1,
  };
  // mette un'immagine data l'altezza: la larghezza segue le proporzioni vere
  const place = (s, img, x, y, h) => s.addImage({ data: img.data, x, y, w: h * img.ratio, h });

  let n = 0;
  const newSlide = (notes) => {
    n++;
    const s = pres.addSlide();
    s.background = { color: BG };
    if (n > 1) {
      s.addShape(pres.shapes.LINE, { x: 0.6, y: 5.08, w: 8.8, h: 0, line: { color: BORDER, width: 0.75 } });
      place(s, MARK, 0.6, 5.17, 0.31);
      s.addText("DWC · B-Chainers Labs · DreamNet Soc. Coop.", { x: 1.0, y: 5.19, w: 5, h: 0.27, fontFace: FONT, fontSize: 9.5, color: MUTED, margin: 0, valign: "middle", isTextBox: true });
      s.addText(`${n} / ${TOTAL}`, { x: 8.4, y: 5.19, w: 1, h: 0.27, fontFace: FONT, fontSize: 9.5, color: MUTED, align: "right", valign: "middle", margin: 0, isTextBox: true });
    }
    if (notes) s.addNotes(notes);
    return s;
  };
  const redLine = (s, x, y, w = 0.55) =>
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.045, fill: { color: RED }, line: { color: RED, width: 0 } });
  // intestazione: l'accento rosso è la lineetta, tranne dove il rosso sta già nei numeri
  const header = (s, kicker, titleText, { line = true } = {}) => {
    if (line) redLine(s, 0.6, 0.36);
    s.addText(kicker, { x: 0.6, y: 0.46, w: 8.8, h: 0.28, fontFace: FONT, fontSize: 11, bold: true, color: MUTED, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText(titleText, { x: 0.6, y: 0.74, w: 8.8, h: 0.7, fontFace: FONT, fontSize: 29, bold: true, color: INK, margin: 0, valign: "middle", isTextBox: true });
  };
  const card = (s, x, y, w, h, opts = {}) =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h, rectRadius: 0.08,
      fill: { color: opts.fill || BG },
      line: opts.line || { color: BORDER, width: 1 },
    });
  const dark = (s, x, y, w, h) => card(s, x, y, w, h, { fill: INK, line: { color: INK, width: 0 } });
  const soft = (s, x, y, w, h) => card(s, x, y, w, h, { fill: SOFT, line: { color: SOFT, width: 0 } });
  const dot = async (s, x, y, d, Icon, bg = INK, fg = "FFFFFF") => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg, width: 0 } });
    const p = d * 0.27;
    s.addImage({ data: await icon(Icon, fg), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
  };
  const text = (s, t, o) => s.addText(t, { fontFace: FONT, color: INK, margin: 0, valign: "top", isTextBox: true, ...o });
  const bullets = (items, fontSize = 13) =>
    items.map((t, i) => ({ text: t, options: { bullet: { indent: 12 }, breakLine: i < items.length - 1, paraSpaceAfter: 5, fontSize } }));

  // ───────────────────────── 1 · Copertina
  {
    const s = newSlide(
      "Buongiorno, sono Simone Lazzari di B-Chainers Labs, il laboratorio blockchain della cooperativa DreamNet. " +
        "Vi presento DWC, il Dreamnet Welfare Coin: il welfare della nostra cooperativa, con le regole scritte su Avalanche. " +
        "Un'idea semplice: la persona scrive cosa vuole, un assistente AI la trasforma in un'operazione verificabile sulla catena."
    );
    text(s, "TEAM1 HACKATHON · BLOCKCHAIN BEACH 2026", { x: 0.6, y: 0.5, w: 5.2, h: 0.28, fontSize: 11, bold: true, color: MUTED, charSpacing: 2 });
    text(s, "DWC", { x: 0.6, y: 0.85, w: 5, h: 1.35, fontSize: 92, bold: true, valign: "middle" });
    text(s, "Dreamnet Welfare Coin", { x: 0.6, y: 2.2, w: 5, h: 0.35, fontSize: 16, color: MUTED, valign: "middle" });
    redLine(s, 0.6, 2.72, 0.9);
    text(s, "Il welfare della cooperativa,\ncon le regole su Avalanche", { x: 0.6, y: 2.9, w: 5.3, h: 1.0, fontSize: 25, bold: true });
    text(s, "B-Chainers Labs · Simone Lazzari", { x: 2.55, y: 4.42, w: 3.6, h: 0.32, fontSize: 15, bold: true, valign: "middle" });
    text(s, "Track: AI x Avalanche for real-world utility\nPescara, 19 settembre 2026", { x: 2.55, y: 4.76, w: 3.6, h: 0.45, fontSize: 10.5, color: MUTED });
    place(s, LOGO, 0.6, 4.4, 0.8);

    place(s, COIN, 5.95, 0.75, 3.55);
    text(s, "1 DWC = 1 € di valore d'acquisto", { x: 5.95, y: 4.5, w: 3.55, h: 0.35, fontSize: 14, bold: true, align: "center", valign: "middle" });
  }

  // ───────────────────────── 2 · Problema e utente
  {
    const s = newSlide(
      "DreamNet è una cooperativa vera, con un piano welfare vero: ogni membro matura dei crediti, i DWC, che valgono un euro di potere d'acquisto " +
        "e si spendono in un catalogo di benefit: buoni pasto, visite mediche, soggiorni. " +
        "Oggi tutto questo vive in fogli Excel ed email: saldi aggiornati a mano, limiti controllati a memoria, " +
        "e nessuno può verificare che le regole siano applicate a tutti allo stesso modo."
    );
    header(s, "IL PROBLEMA E L'UTENTE", "Un welfare vero, gestito con Excel ed email");

    text(s, "DreamNet è una cooperativa vera, con un piano welfare vero: i DWC.", { x: 0.6, y: 1.7, w: 3.9, h: 0.8, fontSize: 17 });
    soft(s, 0.6, 2.75, 3.9, 2.05);
    place(s, COIN, 0.85, 2.98, 1.15);
    text(s, "1 DWC = 1 €", { x: 2.15, y: 2.98, w: 2.3, h: 1.15, fontSize: 25, bold: true, valign: "middle", wrap: false });
    text(s, "da spendere in buoni pasto, visite mediche, soggiorni, biglietti.", { x: 0.85, y: 4.22, w: 3.45, h: 0.5, fontSize: 13 });

    const rows = [
      [fi.FiEdit3, "Saldi tenuti a mano"],
      [fi.FiHelpCircle, "Limiti del catalogo controllati a memoria"],
      [fi.FiEyeOff, "Nessuno può verificare che le regole valgano per tutti"],
    ];
    let y = 1.7;
    for (const [ic, label] of rows) {
      card(s, 5.0, y, 4.4, 0.92);
      await dot(s, 5.2, y + 0.2, 0.52, ic);
      text(s, label, { x: 5.92, y: y + 0.08, w: 3.3, h: 0.76, fontSize: 15.5, bold: true, valign: "middle" });
      y += 1.09;
    }
  }

  // ───────────────────────── 3 · Soluzione
  {
    const s = newSlide(
      "La soluzione in una frase: le regole del regolamento welfare diventano smart contract su Avalanche. Sono tre. " +
        "Il token è a circuito chiuso: si scambia solo tra membri e non può uscire. " +
        "Il regolamento è a versioni immutabili ed è lui che emette i DWC. " +
        "Il marketplace gestisce servizi a prezzo fisso e su preventivo, fa rispettare tetti e limiti, e tiene i DWC in custodia finché il fornitore conferma l'erogazione."
    );
    header(s, "LA SOLUZIONE", "Le regole del welfare diventano il contratto");
    text(s, "Tre smart contract su Avalanche: stesse regole per tutti, verificabili da chiunque.", { x: 0.6, y: 1.48, w: 8.8, h: 0.35, fontSize: 15, color: MUTED });

    const cols = [
      [fi.FiRepeat, "Il token", "DWCToken", ["Circuito chiuso: solo tra membri", "Non può uscire dal network"]],
      [fi.FiBookOpen, "Il regolamento", "WelfareRules", ["Versioni immutabili", "Calcola ed emette i DWC"]],
      [fi.FiShoppingBag, "Il catalogo benefit", "WelfareMarketplace", ["Prezzo fisso o su preventivo", "Tetti e limiti applicati dal contratto"]],
    ];
    let x = 0.6;
    for (const [ic, head, name, items] of cols) {
      card(s, x, 2.0, 2.8, 2.85);
      await dot(s, x + 0.22, 2.18, 0.55, ic);
      text(s, head, { x: x + 0.22, y: 2.85, w: 2.4, h: 0.34, fontSize: 17, bold: true, valign: "middle" });
      text(s, name, { x: x + 0.22, y: 3.19, w: 2.4, h: 0.26, fontFace: MONO, fontSize: 10.5, color: MUTED, valign: "middle" });
      text(s, bullets(items, 13.5), { x: x + 0.22, y: 3.58, w: 2.4, h: 1.2 });
      x += 3.0;
    }
  }

  // ───────────────────────── 4 · Perché blockchain (1): emissione automatica
  {
    const s = newSlide(
      "Primo motivo per cui serve la blockchain: i DWC si emettono da soli. " +
        "La formula è quella del regolamento: credito base dei soci, più credito di ruolo, più attività extra, più bonus commerciali, più altri bonus. " +
        "Il contratto guarda il profilo della persona: se è socio, che ruoli ricopre, se è part-time, da quando è entrata; conta le ore di baratto sociale, " +
        "le classifiche commerciali e i bonus, e crea i DWC direttamente nel suo portafoglio. Nessun calcolo a mano, nessun foglio Excel. " +
        "Un esempio vero, già su Fuji: 500 di base più 2.200 di ruoli, 2.700 DWC in una sola transazione."
    );
    header(s, "PERCHÉ IN BLOCKCHAIN · 1", "I DWC si emettono da soli: calcola il contratto");
    text(s, "Nessun calcolo a mano, nessun foglio Excel: la formula del regolamento la applica il codice.", { x: 0.6, y: 1.48, w: 8.8, h: 0.35, fontSize: 15, color: MUTED });

    const parts = [
      ["Credito base soci", "socio o non socio"],
      ["Credito ruolo", "ruoli, part-time, data di ingresso"],
      ["Attività extra", "ore di baratto sociale"],
      ["Bonus commerciali", "classifiche trimestrali e annuali"],
      ["Altri bonus", "produttività, sfide, eventi"],
    ];
    const bw = 1.52, gap = 0.3;
    let x = 0.6;
    parts.forEach(([head, sub], i) => {
      card(s, x, 2.0, bw, 1.72);
      text(s, head, { x: x + 0.12, y: 2.1, w: bw - 0.24, h: 0.68, fontSize: 15, bold: true, valign: "middle" });
      text(s, sub, { x: x + 0.12, y: 2.82, w: bw - 0.24, h: 0.82, fontSize: 12, color: MUTED });
      if (i < parts.length - 1) text(s, "+", { x: x + bw, y: 2.0, w: gap, h: 1.72, fontSize: 22, bold: true, align: "center", valign: "middle" });
      x += bw + gap;
    });

    dark(s, 0.6, 3.92, 8.8, 1.0);
    place(s, COIN, 0.82, 4.04, 0.76);
    text(s, "= DWC creati (mint) dal contratto, nel portafoglio della persona", { x: 1.8, y: 4.0, w: 7.45, h: 0.42, fontSize: 16.5, bold: true, color: "FFFFFF", valign: "middle" });
    text(s, "Esempio vero su Fuji: 500 base + 2.200 ruoli = 2.700 DWC, in una sola transazione", { x: 1.8, y: 4.42, w: 7.45, h: 0.36, fontSize: 13, color: ONDARK, valign: "middle" });
  }

  // ───────────────────────── 5 · Perché blockchain (2): regole eque
  {
    const s = newSlide(
      "Secondo motivo: le regole sono uguali per tutti, e lo garantisce la catena, non la buona volontà di qualcuno. " +
        "Il regolamento è a versioni immutabili: la uno di marzo 2026, la due di luglio 2026. Per cambiare le regole se ne pubblica una nuova, quella vecchia resta lì. " +
        "Ogni accredito ricorda la versione con cui è stato calcolato, e chiunque può verificarlo. " +
        "Nemmeno l'amministratore può emettere fuori dalle regole senza lasciare traccia: ogni emissione è un evento pubblico, con la sua causale. " +
        "E poi: circuito chiuso, quindi niente mercato secondario; scadenza a sei mesi dall'uscita applicata dal codice; DWC in custodia e bruciati alla consegna del servizio."
    );
    header(s, "PERCHÉ IN BLOCKCHAIN · 2", "Stesse regole per tutti: lo garantisce la catena");

    const cells = [
      [fi.FiUsers, "Stesse regole per tutti", "Il calcolo lo fa il codice, uguale per ogni persona"],
      [fi.FiLock, "Versioni immutabili", "v1 marzo 2026 → v2 luglio 2026: per cambiare se ne pubblica una nuova"],
      [fi.FiClock, "Ogni accredito ha memoria", "Ricorda la versione del regolamento con cui è stato calcolato"],
      [fi.FiEye, "Chiunque può verificare", "Nemmeno l'amministratore emette fuori dalle regole senza lasciare traccia"],
    ];
    for (let i = 0; i < cells.length; i++) {
      const [ic, head, sub] = cells[i];
      const x = 0.6 + (i % 2) * 4.5;
      const y = 1.62 + Math.floor(i / 2) * 1.14;
      card(s, x, y, 4.3, 1.02);
      await dot(s, x + 0.18, y + 0.25, 0.52, ic);
      text(s, head, { x: x + 0.88, y: y + 0.1, w: 3.3, h: 0.32, fontSize: 15.5, bold: true, valign: "middle" });
      text(s, sub, { x: x + 0.88, y: y + 0.43, w: 3.3, h: 0.52, fontSize: 12, color: MUTED });
    }

    dark(s, 0.6, 3.95, 8.8, 1.0);
    const strip = [
      ["Circuito chiuso", "Solo tra membri: non esce, niente mercato secondario"],
      ["Scade a 6 mesi dall'uscita", "Lo applica il codice, non una persona"],
      ["Custodia, poi bruciati", "I DWC spesi si bruciano alla consegna"],
    ];
    strip.forEach(([head, sub], i) => {
      const x = 0.85 + i * 2.88;
      text(s, head, { x, y: 4.03, w: 2.5, h: 0.32, fontSize: 14, bold: true, color: "FFFFFF", valign: "middle" });
      text(s, sub, { x, y: 4.36, w: 2.5, h: 0.52, fontSize: 11.5, color: ONDARK });
    });
  }

  // ───────────────────────── 6 · Integrato al gestionale
  {
    const s = newSlide(
      "Terzo punto: non è un'isola. Il welfare è un modulo del gestionale DreamNet, quello con cui gestiamo risorse umane, commesse e bonus commerciali. " +
        "Ruoli e ore arrivano dal gestionale; emissione e spesa dei DWC avvengono sulla catena; l'AI fa da interfaccia in linguaggio naturale. " +
        "Sulla catena non c'è nessun dato personale, solo indirizzi: i nomi restano nel gestionale. " +
        "Per onestà: nel prototipo di oggi i profili li carica Risorse Umane dall'app; il collegamento diretto col gestionale è il passo di produzione."
    );
    header(s, "INTEGRATO E AUTOMATIZZATO", "Un modulo del gestionale DreamNet");

    const cw = 2.5, step = 3.15, cy = 1.65, ch = 2.15;
    // 1 gestionale
    card(s, 0.6, cy, cw, ch);
    await dot(s, 0.8, cy + 0.18, 0.55, fi.FiDatabase);
    text(s, "Il gestionale", { x: 0.8, y: cy + 0.84, w: cw - 0.4, h: 0.3, fontSize: 17, bold: true, valign: "middle", wrap: false });
    text(s, "Risorse umane, commesse, bonus commerciali: da qui arrivano ruoli e ore", { x: 0.8, y: cy + 1.2, w: cw - 0.4, h: 0.85, fontSize: 12.5, color: MUTED });
    // 2 catena
    dark(s, 0.6 + step, cy, cw, ch);
    place(s, COIN, 0.8 + step, cy + 0.16, 0.6);
    text(s, "Avalanche", { x: 0.8 + step, y: cy + 0.84, w: cw - 0.4, h: 0.3, fontSize: 17, bold: true, color: "FFFFFF", valign: "middle", wrap: false });
    text(s, "I contratti: emissione e spesa dei DWC, secondo il regolamento", { x: 0.8 + step, y: cy + 1.2, w: cw - 0.4, h: 0.85, fontSize: 12.5, color: ONDARK });
    // 3 AI
    card(s, 0.6 + 2 * step, cy, cw, ch);
    await dot(s, 0.8 + 2 * step, cy + 0.18, 0.55, fi.FiMessageCircle);
    text(s, "L'assistente AI", { x: 0.8 + 2 * step, y: cy + 0.84, w: cw - 0.4, h: 0.3, fontSize: 17, bold: true, valign: "middle", wrap: false });
    text(s, "L'interfaccia: si chiede in parole semplici, anche dal telefono", { x: 0.8 + 2 * step, y: cy + 1.2, w: cw - 0.4, h: 0.85, fontSize: 12.5, color: MUTED });
    // frecce
    for (const ax of [0.6 + cw, 0.6 + step + cw]) {
      s.addImage({ data: await icon(fi.FiArrowRight, INK), x: ax + (step - cw) / 2 - 0.19, y: cy + ch / 2 - 0.19, w: 0.38, h: 0.38 });
    }

    soft(s, 0.6, 4.0, 8.8, 0.58);
    s.addImage({ data: await icon(fi.FiShield, INK), x: 0.82, y: 4.15, w: 0.28, h: 0.28 });
    text(s, [
      { text: "Nessun dato personale sulla catena: ", options: { bold: true } },
      { text: "solo indirizzi. I nomi restano nel gestionale." },
    ], { x: 1.28, y: 4.0, w: 8.0, h: 0.58, fontSize: 14, valign: "middle" });
    text(s, "Oggi, nel prototipo: i profili li carica Risorse Umane dall'app. In produzione arrivano dal gestionale.", { x: 0.6, y: 4.68, w: 8.8, h: 0.28, fontSize: 10.5, italic: true, color: MUTED, valign: "middle" });
  }

  // ───────────────────────── 7 · L'AI
  {
    const s = newSlide(
      "Qui entra l'AI, ed è il cuore della track: from intent to onchain action. " +
        "La persona scrive «vorrei 30 euro di buoni pasto». L'assistente, che è Claude, legge le regole direttamente dalla catena, " +
        "prepara l'operazione giusta e la simula sul contratto, senza eseguire nulla. " +
        "Se il contratto la rifiuterebbe, spiega perché in parole semplici: «hai già usato 30 dei 50 DWC di questo mese», e propone un'alternativa. " +
        "Se passa, compare il pulsante «Conferma e firma». L'AI non firma mai: firma sempre la persona. " +
        "E senza attrito: si entra con l'email, il portafoglio nasce dietro le quinte, i costi di rete li paga la cooperativa."
    );
    header(s, "L'AI · FROM INTENT TO ONCHAIN ACTION", "Dalle parole all'operazione sulla catena", { line: false });

    const steps = [
      "La persona scrive cosa vuole, in parole sue",
      "Claude legge le regole dalla catena e prepara l'operazione",
      "La simula sul contratto: non esegue nulla",
      "Spiega il rifiuto, oppure propone «Conferma e firma»",
    ];
    let y = 1.62;
    steps.forEach((t, i) => {
      text(s, String(i + 1), { x: 0.6, y, w: 0.5, h: 0.58, fontSize: 28, bold: true, color: RED, valign: "middle" });
      text(s, t, { x: 1.15, y, w: 3.85, h: 0.58, fontSize: 14.5, valign: "middle" });
      y += 0.64;
    });

    // finta chat
    card(s, 5.3, 1.62, 4.1, 2.5);
    text(s, "ESEMPIO", { x: 5.5, y: 1.72, w: 2, h: 0.2, fontSize: 9, bold: true, color: MUTED, charSpacing: 1.5 });
    s.addText("Vorrei 30 € di buoni pasto", {
      shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.12, x: 6.6, y: 1.98, w: 2.6, h: 0.42,
      fill: { color: INK }, line: { color: INK, width: 0 }, fontFace: FONT, fontSize: 12.5, color: "FFFFFF", align: "center", valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { rectRadius: 0.12, x: 5.5, y: 2.52, w: 3.45, h: 0.8, fill: { color: SOFT }, line: { color: SOFT, width: 0 } });
    text(s, "Hai già usato 30 dei 50 DWC di questo mese. Ne ho preparati 20: confermi?", { x: 5.66, y: 2.52, w: 3.15, h: 0.8, fontSize: 12.5, valign: "middle" });
    s.addText("Conferma e firma", {
      shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.2, x: 5.5, y: 3.48, w: 1.95, h: 0.48,
      fill: { color: INK }, line: { color: INK, width: 0 }, fontFace: FONT, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0,
    });
    text(s, "← firma la persona", { x: 7.6, y: 3.48, w: 1.7, h: 0.48, fontSize: 11.5, color: MUTED, valign: "middle" });

    dark(s, 0.6, 4.3, 8.8, 0.65);
    s.addImage({ data: await icon(fi.FiEdit2, "FFFFFF"), x: 0.85, y: 4.49, w: 0.27, h: 0.27 });
    text(s, [
      { text: "L'AI non firma mai: firma la persona. ", options: { bold: true, color: "FFFFFF" } },
      { text: "Si entra con l'email, i costi di rete li paga la coop.", options: { color: ONDARK } },
    ], { x: 1.3, y: 4.3, w: 8.0, h: 0.65, fontSize: 14, valign: "middle" });
  }

  // ───────────────────────── 8 · Demo
  {
    const s = newSlide(
      "Ecco cosa vedrete nella demo. Uno: l'accredito annuale, calcolato dal regolamento in vigore, non da me. " +
        "Due: una collega, dal suo telefono, chiede all'assistente AI il cappello di Blockchain Beach, conferma e firma. " +
        "Tre: il banco conferma la consegna, e i DWC che erano in custodia vengono bruciati. " +
        "Quattro: una richiesta oltre il tetto, 80 euro di buoni pasto: il contratto la rifiuterebbe, l'AI spiega il limite di 50 al mese e corregge. " +
        "Ogni passo ha la sua prova sull'explorer di Fuji."
    );
    header(s, "LA DEMO", "Cosa vedrete tra poco", { line: false });

    const steps = [
      ["Accredito annuale", "Calcolato dal regolamento in vigore, non a mano"],
      ["Il cappello, dal telefono", "Una collega chiede all'assistente AI il cappello di Blockchain Beach"],
      ["Consegna confermata", "Il banco conferma: i DWC in custodia vengono bruciati"],
      ["Oltre il tetto mensile", "80 € di buoni pasto: l'AI spiega il limite di 50 al mese e corregge"],
    ];
    let x = 0.6;
    steps.forEach(([head, sub], i) => {
      card(s, x, 1.62, 2.05, 2.55);
      text(s, String(i + 1), { x: x + 0.2, y: 1.7, w: 1, h: 0.7, fontSize: 40, bold: true, color: RED, valign: "middle" });
      text(s, head, { x: x + 0.2, y: 2.42, w: 1.7, h: 0.62, fontSize: 15, bold: true });
      text(s, sub, { x: x + 0.2, y: 3.1, w: 1.7, h: 1.0, fontSize: 12.5, color: MUTED });
      x += 2.25;
    });

    soft(s, 0.6, 4.35, 8.8, 0.6);
    s.addImage({ data: await icon(fi.FiSearch, INK), x: 0.85, y: 4.51, w: 0.28, h: 0.28 });
    text(s, [
      { text: "Ogni passo ha la sua prova ", options: { bold: true } },
      { text: "sull'explorer di Fuji, la rete di prova di Avalanche." },
    ], { x: 1.3, y: 4.35, w: 7.9, h: 0.6, fontSize: 14.5, valign: "middle" });
  }

  // ───────────────────────── 9 · Chiusura
  {
    const fuji = readFuji();
    const s = newSlide(
      "Il codice è pubblico su GitHub, i tre contratti sono su Fuji, con 23 test automatici. " +
        "È pensato per mainnet: circuito chiuso, emissione solo con un ruolo autorizzato, nessun dato personale sulla catena. " +
        "Prossimi passi: una rete Avalanche dedicata, una L1, per il network della cooperativa, e saldi cifrati con eERC. " +
        "Grazie: adesso vi faccio vedere la demo dal vivo."
    );
    header(s, "GRAZIE", "Ora la demo dal vivo");

    place(s, LOGO, 0.6, 1.68, 0.95);
    text(s, "B-Chainers Labs · DreamNet Soc. Coop.", { x: 0.6, y: 2.82, w: 4.2, h: 0.32, fontSize: 14.5, bold: true, valign: "middle" });
    text(s, "Simone Lazzari · www.dream-net.it", { x: 0.6, y: 3.14, w: 4.2, h: 0.3, fontSize: 12.5, color: MUTED, valign: "middle" });
    text(s, "CODICE PUBBLICO", { x: 0.6, y: 3.62, w: 4.2, h: 0.22, fontSize: 9, bold: true, color: MUTED, charSpacing: 1.5 });
    text(s, REPO, { x: 0.6, y: 3.84, w: 4.3, h: 0.32, fontSize: 12.5, bold: true, valign: "middle", hyperlink: { url: "https://" + REPO } });

    const names = ["DWCToken", "WelfareRules", "WelfareMarketplace"];
    card(s, 5.0, 1.62, 4.4, 2.62, fuji ? {} : { line: { color: RED, width: 2, dashType: "dash" } });
    text(s, "CONTRATTI SU FUJI · C-CHAIN · CHAIN ID 43113", { x: 5.25, y: 1.76, w: 3.9, h: 0.22, fontSize: 9, bold: true, color: MUTED, charSpacing: 1 });
    if (!fuji) {
      text(s, "INDIRIZZI DA INSERIRE DOPO LA PUBBLICAZIONE", { x: 5.25, y: 2.0, w: 3.9, h: 0.6, fontSize: 15, bold: true, color: RED, valign: "middle" });
    }
    let y = fuji ? 2.1 : 2.7;
    const stepY = fuji ? 0.7 : 0.48;
    for (const name of names) {
      text(s, name, { x: 5.25, y, w: 3.9, h: 0.27, fontSize: 13.5, bold: true, valign: "middle" });
      if (fuji) text(s, fuji[name] || "—", { x: 5.25, y: y + 0.28, w: 4.05, h: 0.26, fontFace: MONO, fontSize: 10.5, color: MUTED, valign: "middle" });
      else text(s, "0x…", { x: 7.6, y, w: 1.55, h: 0.27, fontFace: MONO, fontSize: 12, color: MUTED, align: "right" });
      y += stepY;
    }

    dark(s, 0.6, 4.4, 8.8, 0.55);
    text(s, "PROSSIMI PASSI", { x: 0.85, y: 4.4, w: 1.6, h: 0.55, fontSize: 10, bold: true, color: ONDARK, charSpacing: 1.5, valign: "middle" });
    s.addImage({ data: await icon(fi.FiArrowRight, "FFFFFF"), x: 2.45, y: 4.555, w: 0.24, h: 0.24 });
    text(s, "Rete Avalanche dedicata (L1)", { x: 2.8, y: 4.4, w: 3.2, h: 0.55, fontSize: 13.5, bold: true, color: "FFFFFF", valign: "middle" });
    s.addImage({ data: await icon(fi.FiArrowRight, "FFFFFF"), x: 6.15, y: 4.555, w: 0.24, h: 0.24 });
    text(s, "Saldi cifrati con eERC", { x: 6.5, y: 4.4, w: 2.8, h: 0.55, fontSize: 13.5, bold: true, color: "FFFFFF", valign: "middle" });
  }

  if (n !== TOTAL) throw new Error(`TOTAL (${TOTAL}) non corrisponde al numero di slide (${n})`);
  const out = path.join(__dirname, "DWC-pitch.pptx");
  await pres.writeFile({ fileName: out });
  console.log("Creato", out, readFuji() ? "(con gli indirizzi di Fuji)" : "(segnaposto: deployments/fuji.json non trovato)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
