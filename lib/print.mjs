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

let browser = null;
let page = null;

let methods = [];
let options = {};
let url = '';

  if (hasMethods) {
    for (const method of methods) { 
      const args = method.args || [];
      try {
        await classObj[method.name](...args);
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

async function launchPage(browser, pageOptions) {
  const page = await browser.newPage();

  page.on('error', () => {
    throw new PuppeteerCrash('Puppeteer launch page error');
  });
  
  if (pageOptions) {
    await callMethods(page, pageOptions.methods || []);
  }

  return page;
}

export const print = async (printUrl = '', pdfOptions = {}, pageMethods = []) => {
  url = printUrl;
  options = pdfOptions;
  methods = pageMethods;
  const userDataDir = path.resolve(`temp/puppeteer/${uuidv4()}`);

  try {
    browser = await launchBrowser(userDataDir);
    page = await launchPage();
    
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
