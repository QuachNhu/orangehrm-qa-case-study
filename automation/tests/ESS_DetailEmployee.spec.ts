import { test, expect, type Page } from '@playwright/test';
import { PASSWORD } from '../utils/config';
import rawTestData from './data/ESS_DetailEmployee.json';

type Action = {
  field: string;
  value: string;
  type?: string;
};

type TestCase = {
  id: string;
  desc: string;
  isValid: boolean;
  actions?: Action[];
  expectedError?: string;
  url?: string;
};

const testData = rawTestData as TestCase[];

const getFieldLocator = (page: Page, label: string) => {
  return page
    .locator('.oxd-input-group', {
      has: page.locator(`label:text-is("${label}")`)
    })
    .locator('input');
};

test.describe('My Info - Contact Details Full 42 Test Cases', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/web/index.php/auth/login');
    await page.getByPlaceholder('Username').fill('EMP001');
    await page.getByPlaceholder('Password').fill(PASSWORD);

    await page.locator('form').press('Enter');

    await page.waitForSelector('.oxd-topbar-header-title', {
    timeout: 10000});
});

  for (const data of testData) {
    test(`${data.id}: ${data.desc}`, async ({ page }) => {

      /* ===== CASE URL SAI ===== */
      if (data.url) {
        await page.goto(`/web/index.php/${data.url}`);
        await expect(page.locator('body'))
          .toContainText('No Records Found');
        return;
      }

      await page.getByRole('link', { name: 'My Info' }).click();
      await page.getByRole('link', { name: 'Contact Details' }).click();
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('.orangehrm-edit-employee-content')
      ).toBeVisible({ timeout: 15000 });

      /* ===== INPUT ACTIONS ===== */
      if (data.actions) {
        for (const action of data.actions) {
          const input = getFieldLocator(page, action.field);
          await input.click();
          await input.clear();
          if (action.value !== '') {
            await input.fill(action.value);
          }
        }
      }

      await page.locator('form')
        .getByRole('button', { name: 'Save' })
        .first()
        .click();

      /* ===== VERIFY ===== */
      if (data.isValid) {
        await expect(
          page.locator('.oxd-toast-content')
        ).toContainText('Successfully Updated', { timeout: 10000 });
      } else {
        if (data.expectedError) {
          await expect(
            page.locator('.oxd-input-field-error-message', {
              hasText: data.expectedError
            })
          ).toHaveCount(1);
        }
      }
    });
  }
});
