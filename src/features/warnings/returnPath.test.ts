import { describe, expect, it } from 'vitest';
import { sessionPath } from '../../config/routes';
import { DEFAULT_RETURN_PATH, returnPathFrom, warningsReturnState } from './returnPath';

describe('returnPathFrom', () => {
  it('returns to the page stored by warningsReturnState', () => {
    expect(returnPathFrom(warningsReturnState(sessionPath(30)))).toBe(sessionPath(30));
  });

  it.each([null, undefined, 'text', {}, { from: 42 }])('falls back to the default for %j', (state) => {
    expect(returnPathFrom(state)).toBe(DEFAULT_RETURN_PATH);
  });
});
