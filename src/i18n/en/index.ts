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
import { session } from './session';
import { signal } from './signal';
import { summary } from './summary';
import { warnings } from './warnings';

/**
 * English dictionary, one module per area. It must match the `Messages` type
 * (the shape of the Spanish one): same keys and functions.
 */
export const en = {
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
  cloud,
  diagnostics,
  account,
  privacy,
};
