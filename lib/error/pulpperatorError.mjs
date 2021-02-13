export class PulpperatorError extends Error {}

export class PulpperatorBadRequest extends PulpperatorError {}

export class PulpperatorCrash extends PulpperatorError {}

/** Puppeteer error */
export class PuppeteerBadRequest extends PulpperatorBadRequest {}

export class PuppeteerCrash extends PulpperatorCrash {}