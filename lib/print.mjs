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

function clearPdfArgsPath(args = {}) {
  if (args) {
    return { ...args, path: null };
  }
  return {};
}

async function generatePdf() {
  let pdfArgs = {};
  let hasMethods = methods && methods.length;
  let hasPdfMethod = false;

  if (hasMethods) {
    hasPdfMethod = methods.find(method => method.name === 'pdf');
  }

  if (hasPdfMethod) {
    const pdfMethodIndex = methods.findIndex(method => method.name === 'pdf')
    pdfArgs = methods[pdfMethodIndex].args;
  } else {
    if (url) {
      await page.goto({ url: url })
      pdfArgs = options;
    }
  }

  pdfArgs = clearPdfArgsPath(pdfArgs);
  return page.pdf(pdfArgs);
}

function filterMethods() {
  const pdfMethodIndex = methods.findIndex(method => method.name === 'pdf');
  let filteredMethods = methods;

  if (pdfMethodIndex >= 0) {
    filteredMethods = methods.slice(0, pdfMethodIndex);
  }

  return filteredMethods;
}

async function callMethods(methods = []) {
  for (const method of methods) { 
    const args = method.args || [];
    try {
      await page[method.name](...args);
    } catch (error) {
      throw new PuppeteerBadRequest(`Puppeteer bad request: ${error.message}`);
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

async function launchPage() {
  const page = await browser.newPage();

  page.on('error', () => {
    throw new PuppeteerCrash('Puppeteer launch page error');
  });
  
  const filteredMethods = filterMethods(); 
  await callMethods(filteredMethods);

  return page;
}

export const print = async (printUrl = '', pdfOptions = {}, pageMethods = []) => {
  const userDataDir = path.resolve(`temp/puppeteer/${uuidv4()}`);

  try {
    let browser = await launchBrowser(userDataDir);
    let page = await launchPage(browser);

    const pdf = await generatePdf();
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
