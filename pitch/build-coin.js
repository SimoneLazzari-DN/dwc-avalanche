// Converte il simbolo del DWC da SVG a PNG (1024 px, sfondo trasparente) per l'app.
// La sorgente è web/public/brand/dwc-coin.svg: si modifica quella, poi si rilancia questo script.
// Uso:  cd pitch && node build-coin.js
const path = require("path");
const sharp = require("sharp");

const brand = path.join(__dirname, "..", "web", "public", "brand");

sharp(path.join(brand, "dwc-coin.svg"), { density: 72 })
  .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(brand, "dwc-coin.png"))
  .then((i) => console.log("Creato dwc-coin.png", i.width + "x" + i.height))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
