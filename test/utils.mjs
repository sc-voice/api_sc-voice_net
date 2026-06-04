import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import Utils from '../src/utils.mjs';

describe('utils', () => {
  it('assignTyped()', () => {
    const initial = {
      aString: 'init-string',
      aDate: new Date(2020, 2, 1),
      aBool: true,
      aNumber: 42,
      aInitial: 'initial',
    };
    const srcDate = new Date(2021, 3, 2);
    const src = {
      aString: 123,
      aDate: srcDate.toString(),
      aBool: 'false',
      aIgnore: 'ignore',
      aNumber: '123',
    };
    const dst = {};
    should.deepEqual(Utils.assignTyped(dst, src, initial), {
      aString: '123',
      aDate: srcDate,
      aBool: false,
      aNumber: 123,
    });
  });
});
