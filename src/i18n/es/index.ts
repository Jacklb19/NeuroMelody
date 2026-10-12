import { acquisition } from './acquisition';
import { account } from './account';
import { adaptation } from './adaptation';
import { app } from './app';
import { audio } from './audio';
import { cloud } from './cloud';
import { common } from './common';
import { diagnostics } from './diagnostics';
import { history } from './history';
import { home } from './home';
import { landing } from './landing';
import { plan } from './plan';
import { privacy } from './privacy';
import { progress } from './progress';
import { records } from './records';
import { report } from './report';
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
  landing,
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
  progress,
  report,
  cloud,
  diagnostics,
  account,
  privacy,
};
