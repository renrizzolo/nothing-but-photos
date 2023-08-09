import fs from "fs";
import puppeteer from "puppeteer-core";
const imageDir = "./src/assets/";

// args from chrome-aws-lambda
const args = [
  "--allow-running-insecure-content",
  "--autoplay-policy=user-gesture-required",
  "--disable-component-update",
  "--disable-domain-reliability",
  "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process",
  "--disable-print-preview",
  "--disable-setuid-sandbox",
  "--disable-site-isolation-trials",
  "--disable-speech-api",
  "--disable-web-security",
  "--disk-cache-size=33554432",
  "--enable-features=SharedArrayBuffer",
  "--hide-scrollbars",
  "--ignore-gpu-blocklist",
  "--in-process-gpu",
  "--mute-audio",
  "--no-default-browser-check",
  "--no-pings",
  "--no-sandbox",
  "--no-zygote",
  "--use-gl=swiftshader",
  "--window-size=1920,1080",
  "--start-maximized",
];

const exePath =
  process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "linux"
    ? "/usr/bin/google-chrome"
    : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// const executable = fs.existsSync(exePath) ? exePath : chromium.executablePath;

//@TODO only run this if photos change
async function main() {
  try {
    // wait for preview server to start
    await new Promise((resolve) => setTimeout(() => resolve(), 1500));

    // Launch Chrome
    const browser = await puppeteer.launch({
      args,
      executablePath: exePath,
      // executablePath: executablePath(),
      headless: true,
      // The optimum size for OG images.
      defaultViewport: { height: 630, width: 1200 },
    });

    const page = await browser.newPage();
    //Allow JS.
    await page.setJavaScriptEnabled(true);
    page.goto("http://localhost:3000", {
      waitUntil: "load",
    });
    // need some extra delay for images to load
    await new Promise((resolve) => setTimeout(() => resolve(), 500));

    const buffer = await page.screenshot();
    fs.writeFileSync(`${imageDir}/og-image.png`, buffer);
    console.log(`wrote ${imageDir}/og-image.png`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    console.log("Something went wrong when generating the og image.");
    process.exit();
  }
}

main();
