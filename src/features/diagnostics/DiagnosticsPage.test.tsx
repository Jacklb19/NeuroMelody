import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { DiagnosticsPage } from './DiagnosticsPage';

describe('DiagnosticsPage', () => {
  it('renders the main heading and the capability list', () => {
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

  it('re-checks the capabilities and increments the interactive counter', async () => {
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
