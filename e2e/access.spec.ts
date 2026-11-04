import { expect, test } from '@playwright/test';
import { ROUTES } from '../src/config/routes';
import { es } from '../src/i18n/es';

// Without the signed-in fixture: a visitor who never signed in on this browser (ADR-57).

test('sends a visitor without an account to sign in from any screen of the app', async ({ page }) => {
  for (const route of [ROUTES.app, ROUTES.plan, ROUTES.history, ROUTES.account]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${ROUTES.login}$`));
    await expect(page.getByRole('heading', { level: 1, name: es.account.login.title })).toBeVisible();
    await expect(page.getByRole('navigation', { name: es.app.mainNavigation })).toHaveCount(0);
  }
});

test('keeps the landing and privacy public, with the way in', async ({ page }) => {
  await page.goto(ROUTES.home);
  await expect(page.getByRole('heading', { level: 1, name: es.landing.hero.title })).toBeVisible();
  await page.goto(ROUTES.privacy);
  await expect(page.getByRole('heading', { level: 1, name: es.privacy.pageTitle })).toBeVisible();
  await expect(page.getByRole('link', { name: es.app.signIn })).toHaveAttribute('href', ROUTES.login);
});
