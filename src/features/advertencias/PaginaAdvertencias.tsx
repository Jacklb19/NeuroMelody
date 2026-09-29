import { useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTituloPagina } from '../../app/useTituloPagina';
import { useRegistroAdvertencias } from './contextoAdvertencias';
import { ADVERTENCIAS, TEXTO_CONFIRMACION } from './textoAdvertencias';

function destinoTrasAceptar(estado: unknown): string {
  if (typeof estado === 'object' && estado !== null && 'desde' in estado && typeof estado.desde === 'string') {
    return estado.desde;
  }
  return '/sesion';
}

export function PaginaAdvertencias(): React.JSX.Element {
  useTituloPagina('Antes de empezar');
  const registro = useRegistroAdvertencias();
  const navegar = useNavigate();
  // El estado de la navegación llega sin tipo: se valida en destinoTrasAceptar.
  const estado: unknown = useLocation().state;
  const [confirmado, setConfirmado] = useState(false);
  const casillaId = useId();

  const aceptar = (): void => {
    registro.aceptar(new Date());
    void navegar(destinoTrasAceptar(estado), { replace: true });
  };

  return (
    <>
      <h1 style={{ fontSize: 'var(--texto-2xl)', marginBottom: 'var(--espacio-4)' }}>Antes de empezar</h1>
      <ul style={{ display: 'grid', gap: 'var(--espacio-2)', marginBottom: 'var(--espacio-6)', paddingLeft: 'var(--espacio-6)' }}>
        {ADVERTENCIAS.map((texto) => (
          <li key={texto}>{texto}</li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 'var(--espacio-2)', alignItems: 'flex-start', marginBottom: 'var(--espacio-4)' }}>
        <input
          id={casillaId}
          type="checkbox"
          checked={confirmado}
          onChange={(evento) => {
            setConfirmado(evento.target.checked);
          }}
        />
        <label htmlFor={casillaId}>{TEXTO_CONFIRMACION}</label>
      </div>
      <button
        type="button"
        onClick={aceptar}
        disabled={!confirmado}
        style={{
          padding: 'var(--espacio-2) var(--espacio-4)',
          backgroundColor: 'var(--color-boton-fondo)',
          color: 'var(--color-boton-texto)',
          border: 'none',
          borderRadius: 'var(--radio-borde)',
          fontSize: 'var(--texto-base)',
          cursor: confirmado ? 'pointer' : 'not-allowed',
          opacity: confirmado ? 1 : 0.6,
        }}
      >
        Aceptar y continuar
      </button>
    </>
  );
}
