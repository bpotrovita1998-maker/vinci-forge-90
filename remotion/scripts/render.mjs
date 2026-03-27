import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "main",
  puppeteerInstance: browser,
});

// Render transparent WebM (VP9 + alpha)
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "vp9",
  imageFormat: "png",
  pixelFormat: "yuva420p",
  outputLocation: "/mnt/documents/countdown-spinner-4k-transparent.webm",
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
});
console.log("WebM done!");

// Render transparent ProRes 4444 (.mov)
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "prores",
  proResProfile: "4444",
  imageFormat: "png",
  pixelFormat: "yuva444p10le",
  outputLocation: "/mnt/documents/countdown-spinner-4k-transparent.mov",
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
});
console.log("ProRes done!");

await browser.close({ silent: false });
console.log("Done! Both files rendered.");
