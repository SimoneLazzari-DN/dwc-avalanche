# Slide del pitch

- `DWC-pitch.pptx` — le 9 slide (si aprono con PowerPoint; le note del relatore contengono una traccia del discorso)
- `DWC-pitch.pdf` — la stessa cosa in PDF, da caricare sul Builder Hub

## Aspetto

Palette DreamNet: bianco e nero; il rosso Avalanche è solo un accento (un dettaglio per slide).
Il logo DreamNet e il simbolo del DWC vengono letti da `web/public/brand/` (`dreamnet-logo.png`, `dreamnet-mark.png`, `dwc-coin.svg`).
Il simbolo del DWC si modifica in `dwc-coin.svg`; poi `node build-coin.js` rigenera `dwc-coin.png` (1024 px, sfondo trasparente) per l'app.

## Aggiornare gli indirizzi dei contratti (ultima slide)

Dopo la pubblicazione su Fuji esiste `deployments/fuji.json`: basta rigenerare, il segnaposto rosso
«INDIRIZZI DA INSERIRE DOPO LA PUBBLICAZIONE» viene sostituito dagli indirizzi veri.

```bash
cd pitch
npm install
node build-pitch.js
powershell -ExecutionPolicy Bypass -File export-pdf.ps1
```

`build-pitch.js` crea il PowerPoint; `export-pdf.ps1` usa PowerPoint (deve essere installato) per creare il PDF.
Se il file degli indirizzi sta altrove: `FUJI_DEPLOYMENT=percorso/fuji.json node build-pitch.js`.

Per controllare a occhio le slide, una per una, come immagini (in una cartella fuori dalla repo):
`powershell -ExecutionPolicy Bypass -File export-pdf.ps1 -PngDir C:\Temp\dwc-slide`
