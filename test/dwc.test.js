const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ROLES, LEVELS, publishRegolamento } = require("../scripts/lib/regolamento");

const dwc = (n) => ethers.parseEther(String(n));
const DAY = 24 * 60 * 60;
const JAN_2020 = Date.UTC(2020, 0, 1) / 1000;

// Persone di prova, tutte finte:
// Anna  — socia, Amministratore + Responsabile di Sezione + Operatore Senior
// Bruno — non socio, Operatore Junior part-time
// Carla — non socia, stagista
async function deploy() {
  const [hr, anna, bruno, carla, vendor, outsider] = await ethers.getSigners();

  const token = await ethers.deployContract("DWCToken", [hr.address]);
  const rules = await ethers.deployContract("WelfareRules", [token.target, hr.address]);
  const market = await ethers.deployContract("WelfareMarketplace", [token.target, hr.address]);
  await token.grantRole(await token.MINTER_ROLE(), rules.target);
  await token.grantRole(await token.OPERATOR_ROLE(), market.target);

  await publishRegolamento(rules);

  for (const m of [anna, bruno, carla]) await token.addMember(m.address);
  await rules.setProfile(anna.address, true, false, JAN_2020, LEVELS.SENIOR, [ROLES.AMMINISTRATORE, ROLES.RESP_SEZIONE, ROLES.OP_SENIOR]);
  await rules.setProfile(bruno.address, false, true, JAN_2020, LEVELS.JUNIOR, [ROLES.OP_JUNIOR]);
  await rules.setProfile(carla.address, false, false, JAN_2020, LEVELS.STAGISTA, [ROLES.STAGISTA]);

  const year = new Date((await time.latest()) * 1000).getUTCFullYear();
  return { token, rules, market, hr, anna, bruno, carla, vendor, outsider, year };
}

const service = (vendor, over = {}) => ({
  vendor: vendor.address,
  title: "Servizio",
  description: "",
  kind: 0,
  active: true,
  variableAmount: false,
  limitedStock: false,
  stock: 0,
  price: dwc(100),
  monthlyCap: 0,
  maxCoverageBps: 0,
  minNoticeDays: 0,
  ...over,
});

describe("Regolamento a versioni", () => {
  it("pubblica marzo (v1) e luglio (v2): in vigore c'è luglio", async () => {
    const { rules } = await loadFixture(deploy);
    expect(await rules.versionsCount()).to.equal(2);
    expect(await rules.currentVersion()).to.equal(2);
    expect((await rules.getRole(1, ROLES.PRESIDENTE)).creditSocio).to.equal(1500);
    expect((await rules.getRole(2, ROLES.RESP_SEZIONE)).creditNonSocio).to.equal(350);
  });

  it("una versione pubblicata non si modifica più", async () => {
    const { rules } = await loadFixture(deploy);
    await expect(rules.setBaseCredit(2, 9999, 9999)).to.be.revertedWithCustomError(rules, "VersionAlreadyPublished");
  });

  it("solo chi approva il regolamento può creare versioni", async () => {
    const { rules, anna } = await loadFixture(deploy);
    await expect(rules.connect(anna).createVersion("x", "", ethers.ZeroHash, 0)).to.be.reverted;
  });
});

describe("Accrediti", () => {
  it("accredito annuale: base soci + ruoli cumulati (Anna = 500 + 1000 + 700 + 500)", async () => {
    const { token, rules, anna, year } = await loadFixture(deploy);
    await rules.accrueAnnual(anna.address, year);
    expect(await token.balanceOf(anna.address)).to.equal(dwc(2700));
  });

  it("part-time: il ruolo operativo si dimezza (Bruno = 125 / 2)", async () => {
    const { token, rules, bruno, year } = await loadFixture(deploy);
    await rules.accrueAnnual(bruno.address, year);
    expect(await token.balanceOf(bruno.address)).to.equal(dwc(62.5));
  });

  it("non si accredita due volte lo stesso anno", async () => {
    const { rules, anna, year } = await loadFixture(deploy);
    await rules.accrueAnnual(anna.address, year);
    await expect(rules.accrueAnnual(anna.address, year)).to.be.revertedWithCustomError(rules, "AlreadyAccrued");
  });

  it("pro-rata: chi entra a metà anno matura circa la metà", async () => {
    const { token, rules, carla, year } = await loadFixture(deploy);
    const midYear = Date.UTC(year, 6, 2) / 1000;
    await rules.setProfile(carla.address, false, false, midYear, LEVELS.STAGISTA, [ROLES.STAGISTA]);
    const [, , bps] = await rules.previewAnnual(carla.address, year);
    expect(bps).to.be.within(4950, 5050);
    await rules.accrueAnnual(carla.address, year);
    expect(await token.balanceOf(carla.address)).to.be.within(dwc(24.5), dwc(25.5));
  });

  it("attività extra: ore × tariffa (Senior socia 70/h, Junior non socio 15/h)", async () => {
    const { token, rules, anna, bruno } = await loadFixture(deploy);
    await rules.creditExtraActivity(anna.address, 90, "Baratto — sito partner");
    await rules.creditExtraActivity(bruno.address, 120, "Progetto interno");
    expect(await token.balanceOf(anna.address)).to.equal(dwc(105));
    expect(await token.balanceOf(bruno.address)).to.equal(dwc(30));
  });

  it("classifica trimestrale 250/150/50, una sola volta per periodo", async () => {
    const { token, rules, anna, bruno, carla, year } = await loadFixture(deploy);
    const winners = [anna.address, bruno.address, carla.address];
    await rules.creditRanking(year, 3, winners);
    expect(await token.balanceOf(anna.address)).to.equal(dwc(250));
    expect(await token.balanceOf(carla.address)).to.equal(dwc(50));
    await expect(rules.creditRanking(year, 3, winners)).to.be.revertedWithCustomError(rules, "RankingAlreadyAwarded");
  });

  it("con una sanzione disciplinare i bonus variabili decadono", async () => {
    const { token, rules, anna, bruno, year } = await loadFixture(deploy);
    await rules.setBonusSuspended(bruno.address, true);
    await expect(rules.creditRanking(year, 0, [anna.address, bruno.address, ethers.ZeroAddress]))
      .to.emit(rules, "BonusForfeited");
    expect(await token.balanceOf(bruno.address)).to.equal(0);
    await expect(rules.creditBonus(bruno.address, dwc(10), "Fantasanremo")).to.be.revertedWithCustomError(rules, "BonusSuspended");
  });

  it("solo HR può accreditare", async () => {
    const { rules, anna } = await loadFixture(deploy);
    await expect(rules.connect(anna).creditBonus(anna.address, dwc(1000), "auto-regalo")).to.be.reverted;
  });
});

describe("Circolazione del token", () => {
  it("si scambia tra membri del network, non verso l'esterno", async () => {
    const { token, rules, anna, bruno, outsider } = await loadFixture(deploy);
    await rules.creditBonus(anna.address, dwc(100), "test");
    await token.connect(anna).transfer(bruno.address, dwc(40));
    expect(await token.balanceOf(bruno.address)).to.equal(dwc(40));
    await expect(token.connect(anna).transfer(outsider.address, dwc(1))).to.be.revertedWithCustomError(token, "RecipientNotAllowed");
  });

  it("chi esce: niente scambi, saldo valido 6 mesi, poi chiunque può farlo azzerare", async () => {
    const { token, rules, anna, bruno, outsider } = await loadFixture(deploy);
    await rules.creditBonus(bruno.address, dwc(100), "test");
    await token.markExit(bruno.address);

    await expect(token.connect(bruno).transfer(anna.address, dwc(1))).to.be.revertedWithCustomError(token, "SenderNotAllowed");
    await expect(rules.creditBonus(bruno.address, dwc(1), "dopo l'uscita")).to.be.revertedWithCustomError(token, "NotActiveMember");
    await expect(token.connect(outsider).sweepExited(bruno.address)).to.be.revertedWithCustomError(token, "GraceNotOver");

    await time.increase(181 * DAY);
    await token.connect(outsider).sweepExited(bruno.address);
    expect(await token.balanceOf(bruno.address)).to.equal(0);
  });
});

describe("Marketplace", () => {
  it("prezzo fisso: incassa in custodia, brucia all'erogazione", async () => {
    const { token, rules, market, anna, vendor } = await loadFixture(deploy);
    await rules.creditBonus(anna.address, dwc(300), "test");
    await market.listService(service(vendor));

    await market.connect(anna).redeem(0, 2, 0, 0, 0, "");
    expect(await token.balanceOf(anna.address)).to.equal(dwc(100));
    expect(await token.balanceOf(market.target)).to.equal(dwc(200));

    await market.connect(vendor).markFulfilled(0);
    expect(await token.balanceOf(market.target)).to.equal(0);
    expect(await token.totalSupply()).to.equal(dwc(100));
  });

  it("saldo insufficiente → bloccato", async () => {
    const { market, anna, vendor } = await loadFixture(deploy);
    await market.listService(service(vendor));
    await expect(market.connect(anna).redeem(0, 1, 0, 0, 0, "")).to.be.reverted;
  });

  it("buoni Edenred: tetto di 50 DWC al mese per persona", async () => {
    const { rules, market, anna, vendor } = await loadFixture(deploy);
    await rules.creditBonus(anna.address, dwc(500), "test");
    await market.listService(service(vendor, { variableAmount: true, price: 0, monthlyCap: dwc(50) }));

    await market.connect(anna).redeem(0, 0, dwc(30), 0, 0, "");
    await expect(market.connect(anna).redeem(0, 0, dwc(30), 0, 0, "")).to.be.revertedWithCustomError(market, "MonthlyCapExceeded");
    await market.connect(anna).redeem(0, 0, dwc(20), 0, 0, "");

    await time.increase(32 * DAY);
    await market.connect(anna).redeem(0, 0, dwc(50), 0, 0, "");
  });

  it("buoni Sigma: i DWC coprono al massimo il 50% dello scontrino", async () => {
    const { rules, market, anna, vendor } = await loadFixture(deploy);
    await rules.creditBonus(anna.address, dwc(500), "test");
    await market.listService(service(vendor, { variableAmount: true, price: 0, maxCoverageBps: 5000 }));

    await expect(market.connect(anna).redeem(0, 0, dwc(60), dwc(100), 0, "")).to.be.revertedWithCustomError(market, "CoverageExceeded");
    await market.connect(anna).redeem(0, 0, dwc(50), dwc(100), 0, "");
  });

  it("biglietti: posti limitati (chi prima arriva) e 7 giorni di preavviso", async () => {
    const { rules, market, anna, bruno, vendor } = await loadFixture(deploy);
    await rules.creditBonus(anna.address, dwc(500), "test");
    await rules.creditBonus(bruno.address, dwc(500), "test");
    await market.listService(service(vendor, { price: dwc(20), limitedStock: true, stock: 3, minNoticeDays: 7 }));
    const now = await time.latest();

    await expect(market.connect(anna).redeem(0, 1, 0, 0, now + 3 * DAY, "")).to.be.revertedWithCustomError(market, "NoticeTooShort");
    await market.connect(anna).redeem(0, 2, 0, 0, now + 10 * DAY, "");
    await expect(market.connect(bruno).redeem(0, 2, 0, 0, now + 10 * DAY, "")).to.be.revertedWithCustomError(market, "OutOfStock");
    await market.connect(bruno).redeem(0, 1, 0, 0, now + 10 * DAY, "");
  });

  it("su preventivo: richiesta → prezzo → accettazione → incasso → erogazione", async () => {
    const { token, rules, market, anna, vendor } = await loadFixture(deploy);
    await rules.creditBonus(anna.address, dwc(500), "test");
    await market.listService(service(vendor, { kind: 1, price: 0 }));

    await market.connect(anna).requestQuote(0, 1, 0, "Pernottamento, 2 notti");
    expect(await token.balanceOf(anna.address)).to.equal(dwc(500)); // niente incasso finché non accetta
    await expect(market.connect(anna).acceptQuote(0)).to.be.revertedWithCustomError(market, "WrongStatus");

    await market.setQuote(0, dwc(180), "Disponibile");
    await market.connect(anna).acceptQuote(0);
    expect(await token.balanceOf(anna.address)).to.equal(dwc(320));

    await market.connect(vendor).markFulfilled(0);
    expect((await market.getOrder(0)).status).to.equal(4);
  });

  it("su preventivo: solo il richiedente può accettare; il membro può ritirarsi", async () => {
    const { rules, market, anna, bruno, vendor } = await loadFixture(deploy);
    await rules.creditBonus(anna.address, dwc(500), "test");
    await market.listService(service(vendor, { kind: 1, price: 0 }));
    await market.connect(anna).requestQuote(0, 1, 0, "");
    await market.connect(vendor).setQuote(0, dwc(100), "");
    await expect(market.connect(bruno).acceptQuote(0)).to.be.revertedWithCustomError(market, "NotAllowed");
    await market.connect(anna).withdrawRequest(0);
    expect((await market.getOrder(0)).status).to.equal(6);
  });

  it("annullamento di un ordine pagato: rimborso, posto e tetto ripristinati", async () => {
    const { token, rules, market, anna, vendor } = await loadFixture(deploy);
    await rules.creditBonus(anna.address, dwc(100), "test");
    await market.listService(service(vendor, { price: dwc(50), limitedStock: true, stock: 1, monthlyCap: dwc(50) }));

    await market.connect(anna).redeem(0, 1, 0, 0, 0, "");
    await market.cancelPaid(0, "Evento annullato");
    expect(await token.balanceOf(anna.address)).to.equal(dwc(100));
    expect((await market.getService(0)).stock).to.equal(1);
    await market.connect(anna).redeem(0, 1, 0, 0, 0, "");
  });

  it("chi non è membro non compra; chi è uscito spende ancora per 6 mesi", async () => {
    const { token, rules, market, bruno, vendor, outsider } = await loadFixture(deploy);
    await rules.creditBonus(bruno.address, dwc(200), "test");
    await market.listService(service(vendor));
    await expect(market.connect(outsider).redeem(0, 1, 0, 0, 0, "")).to.be.revertedWithCustomError(market, "NotAllowed");

    await token.markExit(bruno.address);
    await market.connect(bruno).redeem(0, 1, 0, 0, 0, "");
    await time.increase(181 * DAY);
    await expect(market.connect(bruno).redeem(0, 1, 0, 0, 0, "")).to.be.revertedWithCustomError(market, "NotAllowed");
  });

  it("solo il fornitore del servizio (o HR) conferma l'erogazione", async () => {
    const { rules, market, anna, bruno, vendor } = await loadFixture(deploy);
    await rules.creditBonus(anna.address, dwc(100), "test");
    await market.listService(service(vendor));
    await market.connect(anna).redeem(0, 1, 0, 0, 0, "");
    await expect(market.connect(bruno).markFulfilled(0)).to.be.revertedWithCustomError(market, "NotAllowed");
  });
});
