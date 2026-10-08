import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { APP_NAME } from './config/app';
import { es } from './i18n/es';
import App from './App';

describe('App', () => {
  it('mounts the router and shows the home page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: APP_NAME })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: es.app.mainNavigation })).toBeInTheDocument();
  });
});
