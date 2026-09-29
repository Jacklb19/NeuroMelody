import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTituloPagina } from '../../app/useTituloPagina';
import { NIVELES, NIVEL_CALIBRACION } from '../audio/motor/niveles';
import { DURACIONES_MIN, DURACION_POR_OMISION_MIN } from './plan';

/**
 * Plan de sesión (HU-07, RF-18). En el S3 solo se elige la duración; la
 * propuesta de objetivos con el modelo de lenguaje llega en el S6.
 */
export function PaginaPlan(): React.JSX.Element {
  useTituloPagina('Plan de sesión');
  const [duracion, setDuracion] = useState(DURACION_POR_OMISION_MIN);
  const navegar = useNavigate();

  return (
    <>
      <h1 style={{ fontSize: 'var(--texto-2xl)', marginBottom: 'var(--espacio-4)' }}>Plan de sesión</h1>
      <fieldset style={{ border: 'none', marginBottom: 'var(--espacio-6)' }}>
        <legend style={{ marginBottom: 'var(--espacio-2)', fontWeight: 'var(--peso-destacado)' }}>
          Duración de la sesión
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--espacio-4)' }}>
          {DURACIONES_MIN.map((minutos) => (
            <label key={minutos} style={{ display: 'flex', gap: 'var(--espacio-1)', alignItems: 'center' }}>
              <input
                type="radio"
                name="duracion"
                value={minutos}
                checked={duracion === minutos}
                onChange={() => {
                  setDuracion(minutos);
                }}
              />
              {minutos} minutos
            </label>
          ))}
        </div>
      </fieldset>

      <section aria-label="Resumen del plan" style={{ marginBottom: 'var(--espacio-6)' }}>
        <p>
          Duración: <strong>{duracion} minutos</strong>.
        </p>
        <p style={{ color: 'var(--color-texto-secundario)' }}>
          La música empieza en el nivel {NIVELES[NIVEL_CALIBRACION].nombre} durante los primeros 3
          minutos, mientras se toma la referencia de tu señal.
        </p>
      </section>

      <button
        type="button"
        onClick={() => {
          void navegar(`/sesion?duracion=${String(duracion)}`);
        }}
        style={{
          padding: 'var(--espacio-2) var(--espacio-4)',
          backgroundColor: 'var(--color-boton-fondo)',
          color: 'var(--color-boton-texto)',
          border: 'none',
          borderRadius: 'var(--radio-borde)',
          fontSize: 'var(--texto-base)',
          cursor: 'pointer',
        }}
      >
        Continuar a la sesión
      </button>
    </>
  );
}
