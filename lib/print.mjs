import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

function deleteUserDataDir(dirPath) {
  fs.rmdirSync(dirPath, {
    recursive: true,
    maxRetries: 5,
    retryDelay: 1000,
  });
}

export const print = async (url, cookies) => {
  const userDataDir = path.resolve(`temp/puppeteer/${uuidv4()}`);

  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox'],
    userDataDir
  });

  const page = await browser.newPage();
  await page.setCookie(...cookies);
  await page.goto(url, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4' });
  await page.close();
  await browser.close();

  setTimeout(() => deleteUserDataDir(userDataDir));

  return pdf;
}