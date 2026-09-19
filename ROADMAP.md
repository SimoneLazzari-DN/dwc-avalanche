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

## Tappa 3 — Accensione su Fuji — obiettivo 13:00  **← QUI**
- [ ] 🙋 **AVAX di prova** sul portafoglio di pubblicazione `0x341315c8a74F57Fc18c2c0DB00449e73aFf11B15`
      (coupon dagli organizzatori → https://core.app/tools/testnet-faucet, oppure faucet del Builder Hub con Core Wallet)
- [ ] 🙋 **Chiave API Anthropic** in `web/.env.local`
- [ ] 🙋 **Client ID thirdweb** in `web/.env.local` (dominio consentito: `localhost:3000`)
- [ ] Pubblicazione dei contratti su Fuji + indirizzi nel README
- [ ] 🙋 Primo accesso con la tua email → mi dici l'indirizzo che compare → ti do il ruolo HR

## Tappa 4 — Giro completo con 3 persone finte — obiettivo 14:30
- [ ] Anna (socia, Amministratore + Resp. Sezione + Senior), Bruno (non socio, Junior part-time), Carla (stagista)
- [ ] Accredito annuale → ore di baratto → buoni Edenred oltre il tetto (rifiuto spiegato dall'AI) → dentro il tetto
- [ ] Weekend su preventivo: richiesta → prezzo → accettazione → erogazione (DWC bruciati)
- [ ] Scambio tra colleghi + tentativo verso un estraneo (bloccato dal contratto)
- [ ] Rifinitura di quello che non convince

## Tappa 5 — Consegna — obiettivo 15:30 (margine di 30 minuti)
- [ ] Slide del pitch: problema e utente · demo · l'azione su Avalanche · perché è pronto per mainnet
- [ ] README aggiornato con indirizzi e link alle transazioni della demo
- [ ] 🙋 Submission sul Builder Hub (repo + slide)

## Se avanza tempo
- [ ] Logo DreamNet e personalizzazione dell'area personale (🙋 mandami il file del logo)
- [ ] Verifica dei contratti sull'explorer · impronta (hash) del PDF del regolamento in ogni versione
- [ ] Saldi riservati con eERC · video demo di 2 minuti

## Dopo l'hackathon (se esce bene lo teniamo)
- [ ] Parere del commercialista: il regolamento di marzo diceva «personali e incedibili», ora i DWC si scambiano
      tra membri. Da chiarire prima di usarlo con dati veri.
- [ ] Decisione a verbale con Marco e PR sul gestionale DreamNet (il Modulo 6 cambia architettura)
- [ ] Privacy: con pochi membri la combinazione dei ruoli può far riconoscere una persona anche senza nome.
      Per l'uso reale: rete Avalanche dedicata (L1) o saldi cifrati.
