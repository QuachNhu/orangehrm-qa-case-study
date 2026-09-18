import { test, expect, type Page } from '@playwright/test';
import { ADMIN_USER, PASSWORD } from '../utils/config';

/**
 * Hàm hỗ trợ chọn giá trị trong Dropdown custom của OrangeHRM
 * Giải quyết vấn đề locator thay đổi theo cấu trúc div:nth-child
 */
async function selectDropdown(page: Page, label: string, optionText: string) {
  const dropdown = page.locator('.oxd-input-group', { 
    has: page.locator(`label:text-is("${label}")`) 
  }).locator('.oxd-select-wrapper');
  
  await dropdown.click();
  // Đợi option xuất hiện và click chính xác
  await page.getByRole('option', { name: optionText, exact: true }).click();
}

test.describe('PIM - State Transition Employee Status', () => {
  // Tạo ID ngẫu nhiên để không bao giờ bị trùng dữ liệu khi chạy lại test
  const empId = `ST${Math.floor(Math.random() * 9000) + 1000}`;

  test.beforeEach(async ({ page }) => {
    // 1. Đăng nhập
    await page.goto('/web/index.php/auth/login');
    await page.getByPlaceholder('Username').fill(ADMIN_USER);
    await page.getByPlaceholder('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();
    
    // 2. Đi tới module PIM
    await page.getByRole('link', { name: 'PIM' }).click();
  });

  test('PIM_ST_FullFlow: S1 -> S2 -> S3 -> S2 (Lifecycle Management)', async ({ page }) => {
    
    // --- PIM_ST_01: TUYỂN DỤNG MỚI (S1 -> S2: Null to Active) ---
    await page.getByRole('link', { name: 'Add Employee' }).click();
    await page.getByPlaceholder('First Name').fill('State');
    await page.getByPlaceholder('Last Name').fill('Transition');
    
    const idInput = page.locator('.oxd-input-group', { hasText: 'Employee Id' }).locator('input');
    await idInput.clear();
    await idInput.fill(empId);
    
    await page.getByRole('button', { name: 'Save' }).click();
    // Xác nhận đã chuyển sang trang Personal Details (Trạng thái Active)
    await expect(page).toHaveURL(/.*viewPersonalDetails/);

    // --- PIM_ST_02: CẬP NHẬT HỒ SƠ (S2 -> S2: Active remains Active) ---
    await page.getByRole('link', { name: 'Job' }).click();
    await selectDropdown(page, 'Employment Status', 'Freelance');
    await selectDropdown(page, 'Sub Unit', 'Engineering');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.oxd-toast-content')).toContainText('Successfully Updated');

    // --- PIM_ST_03: SA THẢI NHÂN VIÊN (S2 -> S3: Active to Inactive) ---
    await page.getByRole('button', { name: 'Terminate Employment' }).click();
    
    // Xử lý Strict Mode tại ô Date và Dropdown trong Dialog
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('yyyy-mm-dd').fill('2026-01-01');
    await dialog.locator('.oxd-select-wrapper').click();
    await page.getByRole('option', { name: 'Retired' }).click();
    
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.oxd-toast-content')).toContainText('Successfully Updated');

    // --- KIỂM TRA TRẠNG THÁI S3 (Inactive) ---
    await page.getByRole('link', { name: 'Employee List' }).click();
    const searchId = page.locator('.oxd-input-group', { hasText: 'Employee Id' }).locator('input');
    await searchId.fill(empId);

    // 1. Kiểm tra Current Only -> Phải trống (Xử lý Strict Mode cho No Records Found)
    await selectDropdown(page, 'Include', 'Current Employees Only');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.locator('.orangehrm-horizontal-padding').getByText('No Records Found')).toBeVisible();

    // 2. Kiểm tra Past Only -> Phải thấy nhân viên (PIM_ST_05: Truy vấn hỗn hợp)
    await selectDropdown(page, 'Include', 'Past Employees Only');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('row', { name: new RegExp(empId) })).toBeVisible();

    // --- PIM_ST_04: TÁI TUYỂN DỤNG (S3 -> S2: Inactive to Active) ---
    // Click nút Edit (hình cây bút) trong bảng kết quả
    await page.locator('.oxd-table-cell-actions').getByRole('button').first().click();
    await page.getByRole('link', { name: 'Job' }).click();
    await page.getByRole('button', { name: 'Activate Employment' }).click();
    await expect(page.locator('.oxd-toast-content')).toContainText('Successfully Updated');

    // Xác minh cuối cùng: Nhân viên quay lại danh sách "Current Only"
    await page.getByRole('link', { name: 'Employee List' }).click();
    await page.locator('.oxd-input-group', { hasText: 'Employee Id' }).locator('input').fill(empId);
    await selectDropdown(page, 'Include', 'Current Employees Only');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('row', { name: new RegExp(empId) })).toBeVisible();
  });
});