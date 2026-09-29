import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renderiza el título, el panel de adquisición y el diagnóstico en un único main', () => {
    render(<App />);

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'NeuroMelody' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /fuente de señal/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /diagnóstico de la plataforma/i }),
    ).toBeInTheDocument();
  });
});
