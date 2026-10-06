import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { DiagnosticsPage } from './DiagnosticsPage';

describe('DiagnosticoPage', () => {
  it('renderiza el título principal y la lista de capacidades', () => {
    render(<DiagnosticsPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /diagnóstico de la plataforma/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/aislamiento de origen cruzado/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/soporte de web workers/i)).toBeInTheDocument();
    expect(screen.getByText(/soporte de webassembly/i)).toBeInTheDocument();
  });

  it('permite reevaluar las capacidades e incrementa el contador interactivo', async () => {
    const user = userEvent.setup();
    render(<DiagnosticsPage />);

    const counter = screen.getByTestId('check-counter');
    expect(counter).toHaveTextContent('0');

    const button = screen.getByRole('button', {
      name: /reevaluar capacidades/i,
    });
    await user.click(button);

    expect(counter).toHaveTextContent('1');
  });
});
