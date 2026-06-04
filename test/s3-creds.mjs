import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import tmp from 'tmp';
import { logger, LogInstance } from 'log-instance';
import { AwsConfig } from 'say-again';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const S3Creds = require('../src/s3-creds.cjs');

const LOCAL = path.join(__dirname, '..', 'local');
const TESTCONFIG = path.join(__dirname, 'data', 'aws-creds.json');

describe('s3-creds', () => {
  it('default ctor', () => {
    const creds = new S3Creds();
    should(creds.awsConfig).instanceOf(AwsConfig);
    should(creds.awsConfig.sayAgain.Bucket).equal('say-again.sc-voice');
  });

  it('custom ctor', () => {
    const creds = new S3Creds({ configPath: TESTCONFIG });
    should(creds.awsConfig).properties({
      region: 'us-west-1',
      secretAccessKey: 'test-shared-secretAccessKey',
      accessKeyId: 'test-shared-accessKeyId',
    });
    should(creds.awsConfig.polly).properties({
      region: 'us-west-1',
      secretAccessKey: 'test-polly-secretAccessKey',
      accessKeyId: 'test-polly-accessKeyId',
      signatureVersion: 'v4',
      apiVersion: '2016-06-10',
    });
    should(creds.awsConfig.s3).properties({
      endpoint: 'https://s3.us-west-1.amazonaws.com',
      region: 'us-west-1',
      secretAccessKey: 'test-s3-secretAccessKey',
      accessKeyId: 'test-s3-accessKeyId',
    });
    should(creds.awsConfig.Bucket).equal('sc-voice-vsm');
    should.deepEqual(creds.awsConfig.sayAgain, {
      Bucket: 'say-again.sc-voice',
    });
  });

  it('obfuscated() => *****1234', () => {
    const creds = new S3Creds({ configPath: TESTCONFIG });
    const obfuscated = creds.obfuscated();
    should(obfuscated.polly).properties({
      region: 'us-west-1',
      secretAccessKey: '**********************sKey',
      accessKeyId: '******************eyId',
      signatureVersion: 'v4',
      apiVersion: '2016-06-10',
    });
    should(obfuscated.s3).properties({
      endpoint: 'https://s3.us-west-1.amazonaws.com',
      region: 'us-west-1',
      secretAccessKey: '*******************sKey',
      accessKeyId: '***************eyId',
    });
    should(obfuscated.Bucket).equal('sc-voice-vsm');
  });
});
