import { chromium } from "playwright-core";

const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = "http://localhost:3000";
const OUT = "/home/user/BallondOr/scratch-shots";

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({
  viewport: { width: 1180, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

async function shoot(path, file, prep) {
  try {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(700);
    if (prep) await prep();
    await page.waitForTimeout(1200); // laisse les charts se rendre
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    console.log("OK →", file);
  } catch (e) {
    console.log("FAIL", file, e.message);
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true }).catch(() => {});
  }
}

await shoot("/", "1-classement.png");
await shoot("/players/692984", "2-fiche-dembele.png");
await shoot("/compare", "3-comparateur.png", async () => {
  const noms = ["Kylian Mbappé", "Lamine Yamal", "Harry Kane", "Lionel Messi"];
  await page
    .getByRole("button", { name: "Michael Olise", exact: true })
    .click()
    .catch(() => {});
  for (const n of noms) {
    await page
      .getByRole("button", { name: n, exact: true })
      .click()
      .catch((e) => console.log("  skip", n, e.message));
  }
  await page.waitForTimeout(700);
});
await shoot("/bareme", "4-bareme.png");

await browser.close();
console.log("done");
