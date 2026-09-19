# Roadmap — DWC su Avalanche · Blockchain Beach 2026

**Consegna: oggi, sabato 19 settembre, entro le 18:00** sul Builder Hub (repo GitHub + slide + extra).
**Track:** AI x Avalanche for real-world utility — *from intent to onchain action*.
**Partecipante:** Simone Lazzari, come B-Chainers Labs.

**L'idea in una frase:** il welfare di una cooperativa diventa trasparente e automatico — le regole del
regolamento vivono in uno smart contract, e un assistente AI trasforma una richiesta in parole semplici
(«vorrei 30 € di buoni pasto») in un'operazione verificabile su Avalanche.

Legenda: `[x]` fatto · `[ ]` da fare · **← QUI** dove siamo · 🙋 serve Simone

---

## Tappa 1 — Le regole su blockchain (contratti) ✅ 11:30
- [x] **DWCToken** — il punto welfare. Si scambia solo tra membri del network, si spende solo nel marketplace,
      non può uscire verso l'esterno. Chi lascia la coop conserva il saldo 6 mesi, poi si azzera.
- [x] **WelfareRules** — il regolamento a versioni: v1 marzo 2026 (storica), v2 luglio 2026 (in vigore).
      Una versione pubblicata non si modifica più. Accrediti: annuale (base soci + ruoli, pro-rata, part-time),
      attività extra a ore, classifiche commerciali, bonus HR. Sanzione disciplinare → bonus variabili sospesi.
- [x] **WelfareMarketplace** — prezzo fisso e su preventivo; DWC in custodia finché il fornitore conferma.
      Regole del catalogo fatte rispettare dal contratto: tetto mensile (Edenred 50), copertura massima
      dello scontrino (Sigma 50%), posti limitati, 7 giorni di preavviso.
- [x] 23 test automatici, tutti verdi

## Tappa 2 — Pubblicazione su Fuji (rete di prova) — obiettivo 12:00  **← QUI**
- [x] Script di pubblicazione con regolamento e catalogo già caricati
- [x] Prova della pubblicazione in locale
- [ ] 🙋 Caricare AVAX di prova sul portafoglio di pubblicazione (faucet Core)
- [ ] Pubblicazione su Fuji + indirizzi dei contratti nel README
- [ ] Verifica dei contratti sull'explorer (se avanza tempo)

## Tappa 3 — App web — obiettivo 14:30
- [ ] 🙋 Client ID thirdweb (accesso via email con portafoglio non custodiale, costi di rete pagati da noi)
- [ ] Accesso con email → portafoglio creato dietro le quinte
- [ ] **Il mio welfare:** saldo, entrate/uscite, scambio con un collega
- [ ] **Marketplace:** catalogo, riscatto a prezzo fisso, richiesta di preventivo, i miei ordini
- [ ] **Back-office HR:** membri e profili, accrediti (uno alla volta: annuale → extra → classifiche → bonus),
      preventivi da prezzare, uscita di un membro
- [ ] **Fornitore:** ordini da confermare come erogati
- [ ] **Regolamento:** le versioni e i loro parametri, letti dal contratto

## Tappa 4 — Assistente AI (il cuore del track) — obiettivo 16:00
- [ ] 🙋 Chiave API Anthropic nel file `web/.env.local`
- [ ] L'assistente legge dal contratto saldo, catalogo, tetti e regole
- [ ] Dalla richiesta in italiano prepara l'operazione giusta e la spiega; la persona conferma e firma
- [ ] Spiega i rifiuti («hai già usato 30 dei 50 DWC Edenred di questo mese»)
- [ ] Lato HR: «accredita 3 ore di baratto ad Anna per il sito del partner» → operazione pronta da firmare

## Tappa 5 — Consegna — obiettivo 17:30 (margine di 30 minuti)
- [ ] 3 persone di prova (dati finti) con un giro completo registrato sull'explorer
- [ ] README in inglese/italiano con problema, soluzione, architettura, indirizzi dei contratti
- [ ] 🙋 Repo GitHub pubblica (serve il tuo ok e l'account/organizzazione)
- [ ] Slide del pitch: problema e utente · prototipo · azione su Avalanche · perché è pronto per mainnet
- [ ] 🙋 Submission sul Builder Hub

## Se avanza tempo
- [ ] Saldi riservati con eERC (token cifrato di Avalanche)
- [ ] Impronta (hash) del PDF del regolamento dentro ogni versione
- [ ] Video demo di 2 minuti

## Dopo l'hackathon (se esce bene lo teniamo)
- [ ] Parere del commercialista sulla natura fiscale: il regolamento di marzo diceva «personali e incedibili»,
      ora i DWC si scambiano tra membri. Da chiarire prima di usarlo con dati veri.
- [ ] Decisione a verbale con Marco e PR sul gestionale DreamNet (il Modulo 6 cambia architettura)
- [ ] Privacy: con pochi membri, la combinazione dei ruoli può far riconoscere una persona anche senza nome.
      Per l'uso reale: rete Avalanche dedicata (L1) o saldi cifrati.
