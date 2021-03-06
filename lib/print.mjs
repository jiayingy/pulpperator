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

function sanitizePdfArgs(args = {}) {
  return {
    ...(args || {}),
    path: null
  };
}

async function goToPage(page, url) {
  try {
    await page.goto(url);
  } catch (error) {
    throw new PuppeteerBadRequest(`Puppeteer page goto error: ${error.message}`);
  }
}

async function generatePdf(page, printUrl, pdfOptions, pageMethods) {
  const pdfMethod = pageMethods.find(({ name }) => name === 'pdf');
  const pdfMethodArgs = pdfMethod?.args?.[0] || pdfOptions;

  const pdfArgs = sanitizePdfArgs(pdfMethodArgs);

  if (pageMethods.length === 0) {
    await goToPage(page, printUrl);
  }

  return page.pdf(pdfArgs);
}

async function callMethods(page, methods = []) {
  for (const method of methods) {
    if (method.name === 'pdf') {
      break;
    }

    try {
      await page[method.name](...(method.args || []));
    } catch (error) {
      throw new PuppeteerBadRequest(
        `Puppeteer bad request: ${error.message}`
      );
    }
  }
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
      throw new PuppeteerCrash(`Puppeteer browser launch timeout: ${error.message}`);
    } else {
      throw new PuppeteerCrash(`Puppeteer browser launch error: ${error.message}`);
    }
  }
}

async function launchPage(browser) {
  try {
    const page = await browser.newPage();
    return page;
  } catch (error) {
    throw new PuppeteerCrash(`Puppeteer launch page error: ${error.message}`);
  }
}

export const print = async (printUrl = '', pdfOptions = {}, pageMethods = []) => {
  let browser = null;
  let page = null;
  const userDataDir = path.resolve(`temp/puppeteer/${uuidv4()}`);

  try {
    browser = await launchBrowser(userDataDir);
    page = await launchPage(browser);

    await callMethods(page, pageMethods);
    return await generatePdf(page, printUrl, pdfOptions, pageMethods);
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
    }
    if (browser && browser.isConnected()) {
      await browser.close();
    }
  }
}
