# Roadmap — DWC su Avalanche · Blockchain Beach 2026

**Consegna: oggi, sabato 19 settembre, entro le 16:00** (obiettivo nostro; la chiusura ufficiale è alle 18:00) sul Builder Hub.
**Cosa si consegna:** link alla repo GitHub + slide del pitch + eventuali extra (video, link).
**Track:** AI x Avalanche for real-world utility — *from intent to onchain action*.
**Partecipante:** Simone Lazzari, come B-Chainers Labs.
**Repo pubblica:** https://github.com/SimoneLazzari-DN/dwc-avalanche

**L'idea in una frase:** il welfare di una cooperativa diventa trasparente e automatico — le regole del
regolamento vivono in uno smart contract, e un assistente AI trasforma una richiesta in parole semplici
(«vorrei 30 € di buoni pasto») in un'operazione verificabile su Avalanche.

**Come valutano** (dalla pagina dell'evento): utilità del problema · qualità del prototipo · rilevanza
dell'integrazione con Avalanche · readiness su mainnet · chiarezza della demo.

Legenda: `[x]` fatto · `[ ]` da fare · **← QUI** dove siamo · 🙋 serve Simone

---

## Tappa 1 — Le regole su blockchain (contratti) ✅
- [x] **DWCToken** — si scambia solo tra membri del network, si spende solo nel marketplace, non può uscire
      verso l'esterno. Chi lascia la coop conserva il saldo 6 mesi, poi si azzera.
- [x] **WelfareRules** — il regolamento a versioni: v1 marzo 2026 (storica), v2 luglio 2026 (in vigore).
      Accrediti: annuale (base soci + ruoli, pro-rata, part-time), attività extra a ore, classifiche, bonus HR.
- [x] **WelfareMarketplace** — prezzo fisso e su preventivo; DWC in custodia finché il fornitore conferma.
      Tetto mensile (Edenred 50), copertura massima dello scontrino (Sigma 50%), posti limitati, 7 giorni di preavviso.
- [x] 23 test automatici, tutti verdi

## Tappa 2 — App web ✅ (in locale)
- [x] **Assistente AI**: capisce la richiesta → prepara l'operazione → la simula sul contratto → se il contratto
      la rifiuterebbe spiega perché, altrimenti mostra «Conferma e firma»
- [x] **Il mio welfare:** saldo, entrate/uscite con link alla prova sull'explorer, scambio con un collega
- [x] **Marketplace:** catalogo con le regole in chiaro, riscatto, richiesta di preventivo, i miei ordini
- [x] **Risorse Umane:** membri e profili, accrediti (annuale, extra, bonus, classifiche), sanzioni, uscite,
      preventivi da prezzare, assegnazione dei fornitori
- [x] **Fornitore:** ordini da confermare come erogati · **Regolamento:** le versioni lette dal contratto
- [x] Repo pubblica su GitHub, controllata: nessuna chiave, nessun dato vero

## Tappa 3 — Accensione su Fuji ✅ (tranne l'ultimo punto)
- [x] AVAX di prova sul portafoglio di pubblicazione (wallet MetaMask di prova, solo testnet)
- [x] Chiave API Anthropic e Client ID thirdweb in `web/.env.local`
- [x] Contratti pubblicati su Fuji, regolamento v1+v2 e catalogo caricati, indirizzi nel README
- [x] Assistente AI provato contro Fuji (risponde in ~7 secondi, spiega i rifiuti del contratto)
- [x] Nel catalogo: **Cappello Blockchain Beach 2026** — 20 DWC, 10 pezzi, chi prima arriva
- [x] Primo accesso di Simone con l'email → indirizzo → ruolo HR
- [x] Costi di rete sponsorizzati: funzionano (piano B pronto: `NEXT_PUBLIC_SPONSOR_GAS=false` + `scripts/fund.js`)

## Tappa 4 — Sistema pronto per persone vere — obiettivo 14:00
- [x] App raggiungibile dai telefoni delle colleghe con un indirizzo https pubblico (tunnel verso il PC di Simone)
      + dominio aggiunto agli *Allowed domains* di thirdweb
- [x] Giro di collaudo di Simone come HR: membro → profilo → accredito annuale (2.700 DWC) → cappello comprato tramite l'assistente AI
- [ ] Conferma della consegna del cappello (DWC bruciati)  **← QUI**
- [x] Messaggio con le istruzioni passo passo per le tre colleghe (accesso con email; niente AVAX da procurarsi
      se la sponsorizzazione funziona)
- [ ] Le tre colleghe accedono → HR le aggiunge al network, imposta il profilo, fa l'accredito annuale
      (i nomi restano SOLO nella rubrica locale, mai nella repo né sulla catena)

## Tappa 5 — Prova generale della presentazione — obiettivo 15:00
- [ ] Scaletta cronometrata (3-4 minuti): problema → soluzione → demo dal vivo → perché Avalanche / mainnet
- [ ] **Momento live:** una collega chiede all'assistente «vorrei il cappello di Blockchain Beach» dal suo telefono →
      conferma e firma → il saldo scende → HR/fornitore conferma la consegna → DWC bruciati → prova sull'explorer
- [ ] Secondo momento: richiesta oltre una regola (es. Edenred oltre il tetto) → l'AI spiega il rifiuto del contratto
- [ ] Prova completa almeno una volta con le persone vere, sugli stessi dispositivi e sulla stessa rete dell'evento
- [ ] Piano di riserva se la rete dell'aula cade: hotspot del telefono; se cade tutto: schermate/video registrati durante la prova
- [ ] Tab dell'explorer già aperti sui tre contratti; saldo AVAX del portafoglio di servizio controllato

## Tappa 6 — Consegna — entro le 16:00
- [ ] Slide del pitch (sessione separata) riviste e unite alla repo
- [ ] README aggiornato con i link alle transazioni della demo
- [ ] 🙋 Submission sul Builder Hub (repo + slide)

## Se avanza tempo
- [x] Logo DreamNet e personalizzazione dell'area personale
- [ ] Verifica dei contratti sull'explorer · impronta (hash) del PDF del regolamento in ogni versione
- [ ] Saldi riservati con eERC · video demo di 2 minuti

## Dopo l'hackathon (se esce bene lo teniamo)
- [ ] Parere del commercialista: il regolamento di marzo diceva «personali e incedibili», ora i DWC si scambiano
      tra membri. Da chiarire prima di usarlo con dati veri.
- [ ] Decisione a verbale con Marco e PR sul gestionale DreamNet (il Modulo 6 cambia architettura)
- [ ] Privacy: con pochi membri la combinazione dei ruoli può far riconoscere una persona anche senza nome.
      Per l'uso reale: rete Avalanche dedicata (L1) o saldi cifrati.
