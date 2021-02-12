import puppeteer, { SetCookie } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

function deleteUserDataDir(dirPath: string) {
  fs.rmdirSync(dirPath, {
    recursive: true,
    maxRetries: 5,
    retryDelay: 1000,
  });
}

export const print = async (url: string, cookies: SetCookie[]) => {
  let browser = null;
  let page = null;
  const userDataDir = path.resolve(`temp/puppeteer/${uuidv4()}`);

  try {
    browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox'],
      userDataDir
    });

    browser.on('disconnected', () => {
      deleteUserDataDir(userDataDir);
    });

    page = await browser.newPage();
    await page.setCookie(...cookies);
    await page.emulateMediaType('print');
    await page.goto(url, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4' });
    return pdf;
  } catch (error) {
    throw error;
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
    }

    if (browser && browser.isConnected()) {
      await browser.close();
    }
  }
}
