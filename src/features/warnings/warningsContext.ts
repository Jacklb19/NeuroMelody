import { createContext, useContext } from 'react';
import { WarningsRegistry, browserStorage } from './warningsRegistry';

export const WarningsContext = createContext<WarningsRegistry>(
  new WarningsRegistry(browserStorage()),
);

export function useWarningsRegistry(): WarningsRegistry {
  return useContext(WarningsContext);
}
