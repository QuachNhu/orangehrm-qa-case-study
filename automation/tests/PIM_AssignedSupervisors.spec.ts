import { test, expect, type Page } from '@playwright/test';
import { ADMIN_USER, PASSWORD } from '../utils/config';

// --- CÁC HÀM HỖ TRỢ (HELPERS) ---

async function login(page: Page, user: string = ADMIN_USER, pass: string = PASSWORD) {
  await page.goto('/web/index.php/auth/login');
  await page.getByPlaceholder('Username').fill(user);
  await page.getByPlaceholder('Password').fill(pass);
  await page.getByRole('button', { name: 'Login' }).click();
}

/**
 * Helper: Điền form (Đã Fix timeout cho Firefox)
 */
async function fillAndSelectSupervisor(page: Page, keyword: string) {
  // .first() để chọn ô input đầu tiên tìm thấy (tránh lỗi strict mode)
  const hintInput = page.getByPlaceholder('Type for hints...').first();
  
  await hintInput.waitFor({ state: 'visible', timeout: 10000 });

  await hintInput.click();
  await hintInput.press('ControlOrMeta+a');
  await hintInput.press('Backspace');

  await hintInput.pressSequentially(keyword, { delay: 100 });
  await page.waitForTimeout(2500); 

  const dropdown = page.locator('.oxd-autocomplete-dropdown');
  await dropdown.waitFor({ state: 'visible', timeout: 5000 });

  const firstOption = dropdown.getByRole('option').first();
  await expect(firstOption).toBeVisible();
  await firstOption.click();

  await expect(dropdown).toBeHidden();
}

async function selectReportingMethod(page: Page, method: string) {
  const dropdown = page.locator('.oxd-select-wrapper').first();
  await dropdown.click();
  await page.getByRole('option', { name: method, exact: true }).click();
}

async function goToReportTo(page: Page, empId: string) {
  await page.getByRole('link', { name: 'PIM' }).click();
  const searchInput = page.locator('.oxd-input-group', { hasText: 'Employee Id' }).locator('input');
  await searchInput.clear();
  await searchInput.fill(empId);
  await page.getByRole('button', { name: 'Search' }).click();
  
  await page.locator('.oxd-table-loader').waitFor({ state: 'hidden' }).catch(() => {});
  
  await page.getByRole('row', { name: empId }).first().click();
  await page.getByRole('link', { name: 'Report-to' }).click();
}

async function cleanupSupervisors(page: Page) {
  const supervisorTable = page.locator('.orangehrm-container').first();
  
  if (await page.getByRole('alert').first().isVisible()) return;
  if (await supervisorTable.getByText('No Records Found').isVisible()) return;

  const deleteButtons = supervisorTable.locator('.oxd-table-cell-actions .oxd-icon.bi-trash');
  while (await deleteButtons.count() > 0) {
    await deleteButtons.first().click();
    await page.getByRole('button', { name: 'Yes, Delete' }).click();
    await page.locator('.oxd-toast').waitFor({ state: 'hidden' });
    if (await supervisorTable.getByText('No Records Found').isVisible()) break;
  }
}

// --- BỘ TEST CASES ---

test.describe('PIM - Assigned Supervisors Decision Table Testing', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToReportTo(page, 'EMP001');
    await cleanupSupervisors(page);
  });

  // TC01
  test('PIM_RT_01: Success - Direct Supervisor', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).first().click();
    
    await fillAndSelectSupervisor(page, 'EMP002');
    await selectReportingMethod(page, 'Direct');

    await page.getByRole('button', { name: 'Save' }).click();
    
    const supervisorTable = page.locator('.orangehrm-container').first();
    await expect(supervisorTable).toContainText(/EMP002|Brycen/); 
    await expect(supervisorTable).toContainText('Direct');
  });

  // TC02
  test('PIM_RT_02: Success - Indirect Supervisor', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).first().click();
    await fillAndSelectSupervisor(page, 'EMP004');
    await selectReportingMethod(page, 'Indirect');
    await page.getByRole('button', { name: 'Save' }).click();

    const supervisorTable = page.locator('.orangehrm-container').first();
    await expect(supervisorTable).toContainText(/EMP004|Sanford/);
    await expect(supervisorTable).toContainText('Indirect');
  });

  // TC03
  test('PIM_RT_03: Fail - Duplicate Supervisor', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).first().click();
    await fillAndSelectSupervisor(page, 'EMP002');
    await selectReportingMethod(page, 'Direct');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.locator('.oxd-toast').waitFor({ state: 'hidden' });

    await page.getByRole('button', { name: 'Add' }).first().click();
    await fillAndSelectSupervisor(page, 'EMP002');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Invalid')).toBeVisible();
  });

  // TC04
  test('PIM_RT_04: Fail - Self Reporting', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).first().click();
    
    const hintInput = page.getByPlaceholder('Type for hints...').first();
    await hintInput.waitFor({ state: 'visible' });
    await hintInput.pressSequentially('EMP001', { delay: 100 });
    
    const dropdown = page.locator('.oxd-autocomplete-dropdown');
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });
    await expect(dropdown.getByText('No Records Found')).toBeVisible();
    
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Invalid')).toBeVisible();
  });

  // TC05
  test('PIM_RT_05: Fail - Inactive Supervisor', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).first().click();
    
    const hintInput = page.getByPlaceholder('Type for hints...').first();
    await hintInput.waitFor({ state: 'visible' });
    await hintInput.pressSequentially('EMP003', { delay: 100 });
    
    const dropdown = page.locator('.oxd-autocomplete-dropdown');
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });
    await expect(dropdown.getByText('No Records Found')).toBeVisible();
    
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Invalid')).toBeVisible();
  });

  // ✅ TC06 ĐÃ SỬA: Check nút Add không tồn tại (An toàn hơn check Alert)
  test('PIM_RT_06: Fail - No Authority', async ({ page }) => {
    // 1. Lấy URL Admin đang xem
    const protectedUrl = page.url();

    // 2. Logout
    await page.locator('.oxd-userdropdown-tab').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    
    // 3. Login User thường
    await login(page, 'EMP019', PASSWORD);

    // 4. Vào link Admin
    await page.goto(protectedUrl);

    // 5. Verify: Nút Add không được phép hiển thị
    // Đây là cách check Negative Test chuẩn nhất
    await expect(page.getByRole('button', { name: 'Add' })).not.toBeVisible();
  });

  // TC07
  test('PIM_RT_07: Success - Multiple Supervisors', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).first().click();
    await fillAndSelectSupervisor(page, 'EMP002');
    await selectReportingMethod(page, 'Direct');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.locator('.oxd-toast').waitFor({ state: 'hidden' });

    await page.getByRole('button', { name: 'Add' }).first().click();
    await fillAndSelectSupervisor(page, 'EMP004');
    await selectReportingMethod(page, 'Indirect');
    await page.getByRole('button', { name: 'Save' }).click();

    const supervisorTable = page.locator('.orangehrm-container').first();
    await expect(supervisorTable.locator('.oxd-table-card')).toHaveCount(2);
  });
});