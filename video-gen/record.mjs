import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_HTML = process.env.INPUT_HTML || path.resolve(
  'C:/Users/Felipe/Downloads/mascote-investor-video (2).html'
);
const OUTPUT_MP4 = process.env.OUTPUT_MP4 || path.resolve(__dirname, 'mascote-investor.mp4');
const WIDTH = parseInt(process.env.WIDTH || '1920', 10);
const HEIGHT = parseInt(process.env.HEIGHT || '1080', 10);
const FPS = parseInt(process.env.FPS || '30', 10);
const DURATION_SECONDS = parseInt(process.env.DURATION || '120', 10);

const fileUrl = 'file:///' + INPUT_HTML.replace(/\\/g, '/').replace(/^\/+/, '');

console.log('Opening:', fileUrl);
console.log('Output:', OUTPUT_MP4);
console.log(`Recording ${DURATION_SECONDS}s at ${WIDTH}x${HEIGHT}@${FPS}fps`);

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--allow-file-access-from-files',
    '--autoplay-policy=no-user-gesture-required',
    `--window-size=${WIDTH},${HEIGHT}`,
  ],
  defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
page.on('console', msg => {
  if (msg.type() === 'error') console.log('[page-error]', msg.text());
});
page.on('pageerror', err => console.log('[pageerror]', err.message));

await page.goto(fileUrl, { waitUntil: 'load', timeout: 60_000 });

// Aguarda o bundler desempacotar e o stage host receber conteúdo
console.log('Waiting for bundle unpack...');
await page.waitForFunction(
  () => {
    const host = document.getElementById('stage-host');
    const thumb = document.getElementById('__bundler_thumbnail');
    const hasContent = host && host.childElementCount > 0;
    const thumbnailGone = !thumb || thumb.style.display === 'none' || thumb.offsetHeight === 0;
    return hasContent || thumbnailGone;
  },
  { timeout: 60_000, polling: 250 }
);
console.log('Bundle unpacked. Waiting 1.5s for first frame to settle...');
await new Promise(r => setTimeout(r, 1500));

// Configurar recorder
const recorder = new PuppeteerScreenRecorder(page, {
  followNewTab: false,
  fps: FPS,
  videoFrame: { width: WIDTH, height: HEIGHT },
  videoCrf: 18, // alta qualidade
  videoCodec: 'libx264',
  videoPreset: 'medium',
  videoBitrate: 4000,
  aspectRatio: '16:9',
});

console.log('Starting recording...');
await recorder.start(OUTPUT_MP4);

// Tenta detectar fim do walkthrough via "video-finished" sinalizado pelo DOM.
// Se não houver, grava tempo fixo.
const endPromise = (async () => {
  await page.waitForFunction(
    () => {
      const flag = document.body?.dataset?.videoFinished;
      const ended = window.__MASCOTE_VIDEO_FINISHED__;
      return flag === 'true' || ended === true;
    },
    { timeout: DURATION_SECONDS * 1000, polling: 500 }
  ).catch(() => null);
})();
const timerPromise = new Promise(r => setTimeout(r, DURATION_SECONDS * 1000));
await Promise.race([endPromise, timerPromise]);

console.log('Stopping recorder...');
await recorder.stop();

await browser.close();
console.log('\n✓ MP4 salvo em:', OUTPUT_MP4);
