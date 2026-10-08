import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { es } from '../../i18n/es';
import { CAPABILITY_IDS } from './capabilityCatalog';
import { DiagnosticsPage } from './DiagnosticsPage';

describe('DiagnosticsPage', () => {
  it('renders the main heading and the capability list', () => {
    render(<DiagnosticsPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: es.diagnostics.pageTitle,
      }),
    ).toBeInTheDocument();

    for (const id of CAPABILITY_IDS) {
      expect(screen.getByText(es.diagnostics.capabilities[id].label)).toBeInTheDocument();
      expect(screen.getByText(es.diagnostics.capabilities[id].description)).toBeInTheDocument();
    }
  });

  it('re-checks the capabilities and increments the interactive counter', async () => {
    const user = userEvent.setup();
    render(<DiagnosticsPage />);

    const counter = screen.getByTestId('check-counter');
    expect(counter).toHaveTextContent('0');

    const button = screen.getByRole('button', {
      name: es.diagnostics.recheck,
    });
    await user.click(button);

    expect(counter).toHaveTextContent('1');
  });
});
