import { test, expect, type Page } from '@playwright/test';
import { ADMIN_USER, PASSWORD } from '../utils/config';
// Import dữ liệu từ file JSON
import pairwiseData from './data/PIM_SearchEmployee-data.json';

// --- HÀM HELPER: XỬ LÝ DROPDOWN (Support Firefox & Webkit) ---
async function selectDropdown(page: Page, label: string, optionText: string) {
  // Tìm input group dựa trên Label
  const dropdownGroup = page.locator('.oxd-input-group', { has: page.locator(`label:text-is("${label}")`) });
  const dropdownSelector = dropdownGroup.locator('.oxd-select-wrapper');

  // 1. Scroll và Click để mở dropdown
  // Firefox đôi khi không click được nếu element bị che khuất, scrollIntoViewIfNeeded giúp giải quyết việc này
  await dropdownSelector.scrollIntoViewIfNeeded();
  await dropdownSelector.click();

  // 2. Chờ Option xuất hiện (Explicit Wait)
  // Sử dụng role 'option' để đảm bảo tính truy cập (Accessibility)
  const option = page.getByRole('option', { name: optionText, exact: true });
  await option.waitFor({ state: 'visible', timeout: 5000 });
  
  // 3. Chọn Option
  await option.click();
}

test.describe('PIM - Search Employee Pairwise Testing', () => {

  test.beforeEach(async ({ page }) => {
    // Pre-condition: Đăng nhập và vào trang PIM
    await page.goto('/web/index.php/auth/login');
    await page.getByPlaceholder('Username').fill(ADMIN_USER);
    await page.getByPlaceholder('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();
    
    await page.getByRole('link', { name: 'PIM' }).click();
    
    // Checkpoint: Đảm bảo bảng dữ liệu đã tải xong (Spinner biến mất)
    await expect(page.locator('.oxd-table-loader')).not.toBeVisible();
  });

  // --- VÒNG LẶP SINH TEST CASE TỰ ĐỘNG ---
  for (const data of pairwiseData) {
    test(`${data.id}: Search ${data.jobTitle} | ${data.subUnit} | ${data.empStatus}`, async ({ page }) => {
      
      // 1. Reset form về trạng thái mặc định
      await page.getByRole('button', { name: 'Reset' }).click();
      
      // 2. Điền dữ liệu tìm kiếm (Data Driven)
      await selectDropdown(page, 'Job Title', data.jobTitle);
      await selectDropdown(page, 'Sub Unit', data.subUnit);
      await selectDropdown(page, 'Employment Status', data.empStatus);
      await selectDropdown(page, 'Include', data.include);

      // 3. Thực hiện tìm kiếm
      await page.getByRole('button', { name: 'Search' }).click();

      // 4. Verify kết quả (Result Assertion)
      const resultLabel = page.locator('.orangehrm-horizontal-padding > .oxd-text').first();
      await expect(resultLabel).toBeVisible({ timeout: 10000 });
      
      // Log kết quả ra console để tiện theo dõi
      const countText = await resultLabel.innerText();
      console.log(`[${data.id}] Status: PASS - Found: ${countText}`);
    });
  }
});