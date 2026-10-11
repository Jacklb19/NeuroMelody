import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { es } from './i18n/es';
import App from './App';

describe('App', () => {
  it('mounts the router and shows the landing page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: es.landing.hero.title })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: es.landing.navigationLabel })).toBeInTheDocument();
  });
});
