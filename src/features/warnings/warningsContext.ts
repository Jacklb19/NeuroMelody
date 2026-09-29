import { createContext, useContext } from 'react';
import { RegistroAdvertencias, almacenDelNavegador } from './warningsRegistry';

export const ContextoAdvertencias = createContext<RegistroAdvertencias>(
  new RegistroAdvertencias(almacenDelNavegador()),
);

export function useRegistroAdvertencias(): RegistroAdvertencias {
  return useContext(ContextoAdvertencias);
}
