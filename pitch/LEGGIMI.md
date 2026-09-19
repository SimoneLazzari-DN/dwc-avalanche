# Slide del pitch

- `DWC-pitch.pptx` — le 8 slide (si aprono con PowerPoint; le note del relatore contengono una traccia del discorso)
- `DWC-pitch.pdf` — la stessa cosa in PDF, da caricare sul Builder Hub

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
