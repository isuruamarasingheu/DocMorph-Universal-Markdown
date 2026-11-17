import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer-core';

/** Maximum number of pages rendering at the same time across the whole process. */
const MAX_CONCURRENT_PAGES = Math.max(1, Number(process.env.MAX_CONCURRENT_RENDERS) || 2);

interface BrowserPoolState {
  browserPromise: Promise<Browser> | null;
  profileDir: string | null;
  active: number;
  waiters: Array<() => void>;
}

// Cached on globalThis so Next.js dev hot-reloads don't leak Chrome processes.
const g = globalThis as typeof globalThis & { __docmorphBrowserPool?: BrowserPoolState };
const pool: BrowserPoolState =
  g.__docmorphBrowserPool ?? (g.__docmorphBrowserPool = { browserPromise: null, profileDir: null, active: 0, waiters: [] });

async function acquireSlot(): Promise<void> {
  if (pool.active < MAX_CONCURRENT_PAGES) {
    pool.active++;
    return;
  }
  await new Promise<void>((resolve) => pool.waiters.push(resolve));
  // The releasing caller handed its slot directly to us, so `active` is unchanged.
}

function releaseSlot(): void {
  const next = pool.waiters.shift();
  if (next) {
    next();
  } else {
    pool.active--;
  }
}

function resetBrowser(): void {
  pool.browserPromise = null;
  if (pool.profileDir) {
    fs.rm(pool.profileDir, { recursive: true, force: true }, () => {});
    pool.profileDir = null;
  }
}

async function getBrowser(): Promise<Browser> {
  if (!pool.browserPromise) {
    const browserPath = findSystemBrowser();
    if (!browserPath) {
      throw new Error('No system Chrome or Edge browser found');
    }
    const profileDir = path.join(os.tmpdir(), `docmorph_chrome_${process.pid}_${Date.now()}`);
    pool.profileDir = profileDir;
    pool.browserPromise = puppeteer
      .launch({
        executablePath: browserPath,
        userDataDir: profileDir,
        headless: true,
        args: [
          // Containers usually lack the kernel features Chrome's sandbox needs; opt in explicitly.
          ...(process.env.CHROME_NO_SANDBOX === 'true' ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--no-first-run',
        ],
      })
      .then((browser) => {
        browser.on('disconnected', () => {
          if (pool.profileDir === profileDir) resetBrowser();
        });
        return browser;
      })
      .catch((err) => {
        resetBrowser();
        throw err;
      });
  }
  return pool.browserPromise;
}

/** Closes the shared browser (used by scripts and tests so the process can exit). */
export async function closeSharedBrowser(): Promise<void> {
  const pending = pool.browserPromise;
  if (!pending) return;
  const browser = await pending.catch(() => null);
  resetBrowser();
  if (browser) await browser.close().catch(() => {});
}

export interface WithPageOptions {
  /**
   * Lock the page down for rendering untrusted HTML: JavaScript disabled and every
   * network request blocked except inline `data:` URLs. Defaults to true.
   */
  untrusted?: boolean;
}

/**
 * Runs `fn` with a fresh page from a shared headless browser, limited to
 * MAX_CONCURRENT_PAGES concurrent pages process-wide.
 */
export async function withBrowserPage<T>(fn: (page: Page) => Promise<T>, options: WithPageOptions = {}): Promise<T> {
  const untrusted = options.untrusted ?? true;
  await acquireSlot();
  let page: Page | undefined;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    if (untrusted) {
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (url.startsWith('data:') || url === 'about:blank') {
          request.continue().catch(() => {});
        } else {
          request.abort('blockedbyclient').catch(() => {});
        }
      });
    }
    return await fn(page);
  } finally {
    if (page) await page.close().catch(() => {});
    releaseSlot();
  }
}

/**
 * Searches known system paths for Chrome or Edge across Windows, macOS, and Linux
 */
export function findSystemBrowser(): string | null {
  // Check explicit environment variables first
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const platform = os.platform();

  if (platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    for (const p of winPaths) {
      if (p && fs.existsSync(p)) return p;
    }
  } else if (platform === 'darwin') {
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const p of macPaths) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    // Linux
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
    ];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  return null;
}
