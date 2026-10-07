import { acquisition } from './acquisition';
import { adaptation } from './adaptation';
import { app } from './app';
import { audio } from './audio';
import { common } from './common';
import { diagnostics } from './diagnostics';
import { history } from './history';
import { home } from './home';
import { plan } from './plan';
import { records } from './records';
import { session } from './session';
import { signal } from './signal';
import { summary } from './summary';
import { warnings } from './warnings';

/**
 * Spanish dictionary, one module per area. Its shape is the `Messages` type:
 * any other language must provide the same keys and functions.
 */
export const es = {
  common,
  app,
  home,
  warnings,
  plan,
  session,
  acquisition,
  signal,
  audio,
  adaptation,
  records,
  summary,
  history,
  diagnostics,
};
