import * as fs from 'fs';
import puppeteer, { type LaunchOptions } from 'puppeteer';

const COMMON_BROWSER_PATHS = process.platform === 'win32'
  ? [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Chromium\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
    ]
  : process.platform === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ]
    : [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
      ];

function isExistingExecutable(candidate: string | undefined): candidate is string {
  return !!candidate && fs.existsSync(candidate);
}

export function resolvePuppeteerExecutablePath(): string | undefined {
  const envCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    process.env.CHROME_EXECUTABLE_PATH,
  ];

  for (const candidate of envCandidates) {
    if (isExistingExecutable(candidate)) {
      return candidate;
    }
  }

  let defaultExecutablePath: string | undefined;
  try {
    defaultExecutablePath = puppeteer.executablePath();
  } catch {
    defaultExecutablePath = undefined;
  }

  if (isExistingExecutable(defaultExecutablePath)) {
    return defaultExecutablePath;
  }

  for (const candidate of COMMON_BROWSER_PATHS) {
    if (isExistingExecutable(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function buildPuppeteerLaunchOptions(): LaunchOptions {
  const executablePath = resolvePuppeteerExecutablePath();

  return {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...(executablePath ? { executablePath } : {}),
  };
}