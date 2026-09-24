import { expect, test } from '@playwright/test';
import { loadCredentials, loginAs } from './helpers/auth';

test.describe('Client portal — full UI smoke', () => {
  test.beforeEach(async ({ page }) => {
    const { client } = loadCredentials();
    await loginAs(page, client.email, client.password);
    await expect(page).toHaveURL(/\/client-portal/, { timeout: 20000 });
  });

  test('loads portal shell and main tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Conteúdo' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: 'Solicitações' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calendário' })).toBeVisible();
  });

  test('navigates Solicitações and opens new request dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Solicitações' }).click();
    await expect(page.getByRole('button', { name: /nova solicitação/i })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: /nova solicitação/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/título/i).first()).toBeVisible();
  });

  test('client cannot access staff dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/dashboard$/, { timeout: 10000 });
  });

  test('calendar tab loads without error banner', async ({ page }) => {
    await page.getByRole('button', { name: 'Calendário' }).click();
    await expect(page.getByText('Acesso não disponível')).toHaveCount(0);
  });
});
