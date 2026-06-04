import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { logger } = require('log-instance');
const ContentUpdater = require('../src/content-updater.cjs');
const SuttaStore = require('../src/sutta-store.cjs');

const LANG = 'en';
const LOCAL = path.join(__dirname, '..', 'local');
const ROOT = path.join(LOCAL, 'suttas');
const MAXRESULTS = 5;
const SC_STAGING = 'http://staging.suttacentral.net/api';
const PRODUCTION = 'http://suttacentral.net/api';

logger.logLevel = 'warn';

describe('content-updater', () => {
  it('constructor(opts)', () => {
    var updater = new ContentUpdater();
    expect(updater.isInitialized).toBe(false);
  });
  it('initialize() initializes ContentUpdater', async () => {
    var updater = new ContentUpdater();
    var resInit = await updater.initialize();
    should(updater.suttaStore).instanceOf(SuttaStore);
    expect(updater.suttaStore.isInitialized).toBe(true);
    expect(updater.isInitialized).toBe(true);
  });
  it('update() updates content', async () => {
    var updater = await new ContentUpdater().initialize();
    var resUpdate = await updater.update();
    var name = `ContentUpdater.update()`;
    expect(resUpdate).toMatchObject({
      name,
    });
    var actions = 1;
    expect(resUpdate.task).toMatchObject({
      name,
      actionsDone: actions,
      actionsTotal: actions,
      isActive: false,
      summary: `Update completed`,
    });
  });
});
