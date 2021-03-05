import puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { PuppeteerCrash, PuppeteerBadRequest } from './error/pulpperatorError.mjs';

function deleteUserDataDir(dirPath) {
  fs.rmdirSync(dirPath, {
    recursive: true,
    maxRetries: 5,
    retryDelay: 1000,
  });
}

async function launchBrowser(userDataDir) {
  try {
    const browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox'],
      userDataDir
    });
    
    browser.on('disconnected', () => {
      deleteUserDataDir(userDataDir);
    });
    
    return browser;

  } catch (error) {
    if (error instanceof puppeteer.errors.TimeoutError) {
      throw new PuppeteerCrash('Puppeteer browser launch timeout');
    } else {
      throw new PuppeteerCrash('Puppeteer browser launch error');
    }
  }
}

async function launchPage(browser) {
  const page = await browser.newPage();

  page.on('error', () => {
    throw new PuppeteerCrash('Puppeteer launch page error');
  });

  return page;
}

async function goToPage(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
    return;
  } catch (error) {
    throw new PuppeteerBadRequest(error.message);
  }
}

export const print = async (url, cookies) => {
  let browser = null;
  let page = null;
  const userDataDir = path.resolve(`temp/puppeteer/${uuidv4()}`);

  try {
    browser = await launchBrowser(userDataDir);
    page = await launchPage(browser);

    await page.setCookie(...cookies);
    await page.emulateMediaType('print');
    await goToPage(page, url);

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
