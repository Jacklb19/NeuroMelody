import { expect, test } from './fixtures';
import { ROUTES } from '../src/config/routes';
import { es } from '../src/i18n/es';

const { worlds, instrument, ambience } = es.plan;

test('a sound world sets the sound of the plan and colours the session (ADR-64)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(ROUTES.plan);

  await page.getByRole('radio', { name: worlds.names.city_rain, exact: true }).check();
  // The world is its three choices: they show as chosen below it.
  await expect(page.getByRole('radio', { name: instrument.names.piano, exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: ambience.names.rain, exact: true })).toBeChecked();
  await expect(page.getByText(worlds.chosen(worlds.names.city_rain))).toBeVisible();

  // Changing one of them by hand leaves every world, and says so.
  await page.getByRole('radio', { name: ambience.names.sea, exact: true }).check();
  await expect(page.getByRole('radio', { name: worlds.names.city_rain, exact: true })).not.toBeChecked();
  await expect(page.getByText(worlds.custom)).toBeVisible();

  await page.getByRole('radio', { name: worlds.names.deep_space, exact: true }).check();
  await page.getByRole('button', { name: es.plan.continueToSession }).first().click();
  // The plan only navigates after the click; the warnings must be on screen before their checkbox is looked for.
  await expect(page.getByRole('heading', { name: es.warnings.pageTitle, exact: true })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await expect(page.locator('.session-page')).toHaveAttribute('data-world', 'deep_space');
  await page.getByRole('button', { name: es.session.slides.withoutPulse }).click();
  await expect(page.getByText(worlds.chosen(worlds.names.deep_space))).toBeVisible();
  expect(errors).toEqual([]);
});
