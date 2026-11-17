import { expect, test } from './fixtures';
import { E2E_API_URL } from './accountServices';
import { ROUTES } from '../src/config/routes';
import { es } from '../src/i18n/es';

const copy = es.plan.compose;
const TEXT = 'Hoy me siento mal, estoy estudiando y quiero relajarme unos 30 minutos';
const COMPOSED = { goal: 'relax', duration_minutes: 30, world: 'city_rain', mode: 'adaptive', note: 'Media hora de piano tranquilo con lluvia.', generated: true, model: 'e2e' };

test('the language model composes the plan from what the person writes, and the session opens with it (ADR-68)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sent: unknown[] = [];
  await page.route(`${E2E_API_URL}/v1/plans/compose`, async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: COMPOSED });
  });
  await page.goto(ROUTES.plan);

  const field = page.getByRole('textbox', { name: copy.question });
  await expect(page.getByRole('button', { name: copy.send })).toHaveCount(0);
  await field.fill(TEXT);
  await page.getByRole('button', { name: copy.send }).click();

  const proposal = page.getByRole('region', { name: `${copy.resultTitle}: ${es.plan.worlds.names.city_rain}` });
  await expect(proposal).toBeVisible();
  await expect(proposal.getByText(copy.generatedMark)).toBeVisible();
  await expect(proposal.getByText(COMPOSED.note)).toBeVisible();
  expect(sent).toEqual([{ consent: true, text: TEXT, local_hour: expect.any(Number), locale: 'es' }]);

  await proposal.getByRole('button', { name: copy.use }).click();
  // The usual way into a session stays: warnings first, then the pulse.
  await expect(page.getByRole('heading', { name: es.warnings.pageTitle, exact: true })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: es.warnings.accept }).click();
  await expect(page.locator('.session-page')).toHaveAttribute('data-world', 'city_rain');
  const query = new URL(page.url()).searchParams;
  expect(query.get('duration')).toBe('30');
  expect(query.get('goals')).toBe('relax');
  expect(errors).toEqual([]);
});

test('when the plan cannot be composed, the screen says so and the manual plan stays', async ({ page }) => {
  await page.route(`${E2E_API_URL}/v1/plans/compose`, route => route.fulfill({ status: 429, json: { code: 'rate_limited' } }));
  await page.goto(ROUTES.plan);

  await page.getByRole('textbox', { name: copy.question }).fill('algo tranquilo');
  await page.getByRole('textbox', { name: copy.question }).press('Enter');

  await expect(page.getByText(copy.failed(es.cloud.errors.rate_limited))).toBeVisible();
  await expect(page.getByRole('button', { name: es.plan.continueToSession }).first()).toBeEnabled();
  await expect(page.getByRole('textbox', { name: copy.question })).toHaveValue('algo tranquilo');
});
