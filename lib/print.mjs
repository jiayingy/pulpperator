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

async function callMethods(page, methods = []) {
  for (const method of methods) {
    if (method.name === 'pdf') {
      return page.pdf(...(method.args || []));
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

function normalizePdfMethod (pdfOptions, pageMethods) {
  const pdfMethodIndex = pageMethods.findIndex(({ name }) => name === 'pdf');
  if (pdfMethodIndex >= 0) {

    if (!pageMethods[pdfMethodIndex].args?.[0]) {
      pageMethods[pdfMethodIndex].args = pageMethods[pdfMethodIndex].args || [];
      pageMethods[pdfMethodIndex].args[0] = pdfOptions;
    }

    return pageMethods.slice(0, pdfMethodIndex + 1);
  }

  return [...pageMethods, {
    name: 'pdf',
    args: [pdfOptions],
  }];
}

function normalizePageMethods(printUrl, pdfOptions, pageMethods) {
  const normalizedPageMethods = normalizePdfMethod(pdfOptions, pageMethods);
  const methodsLength = normalizedPageMethods.length;
  const pdfMethodIndex = methodsLength - 1;

  normalizedPageMethods[pdfMethodIndex].args[0] = sanitizePdfArgs(normalizedPageMethods[pdfMethodIndex].args[0]);

  const gotoMethod = pageMethods.find(({ name }) => name === 'goto');
  if (!gotoMethod) {
    if (!printUrl) {
      throw new PuppeteerBadRequest('No URL provided');
    }

    return [
      ...normalizedPageMethods.slice(0, methodsLength - 1),
      {
        name: 'goto',
        args: [printUrl]
      },
      normalizedPageMethods[pdfMethodIndex],
    ]
  }
  return normalizedPageMethods;
}

export const print = async (printUrl = '', pdfOptions = {}, pageMethods = []) => {
  let browser = null;
  let page = null;
  const userDataDir = path.resolve(`temp/puppeteer/${uuidv4()}`);

  try {
    browser = await launchBrowser(userDataDir);
    page = await launchPage(browser);

    const normalizedPageMethods = normalizePageMethods(printUrl, pdfOptions, pageMethods);
    return await callMethods(page, normalizedPageMethods);
  } finally {
    if (page && !page.isClosed()) {
      await page.close();
    }
    if (browser && browser.isConnected()) {
      await browser.close();
    }
  }
}
