import { test, expect, type Page } from '@playwright/test';
import { ADMIN_USER, PASSWORD } from '../utils/config';
import path from 'path';
// Import file dữ liệu JSON
import testData from './data/PIM_AddEmployee-data.json';

// --- CÁC HÀM HELPER (GIỮ NGUYÊN) ---
async function login(page: Page) {
  await page.goto('/web/index.php/auth/login');
  await page.getByPlaceholder('Username').fill(ADMIN_USER);
  await page.getByPlaceholder('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
}

async function navigateToAddEmployee(page: Page) {
  await page.getByRole('link', { name: 'PIM' }).click();
  await page.getByRole('link', { name: 'Add Employee' }).click();
  await expect(page.getByRole('textbox', { name: 'First Name' })).toBeVisible();
}

// Hàm lấy locator lỗi dựa trên vị trí (Field)
// Hàm lấy locator lỗi đã được tối ưu hóa
const getErrorLocator = (page: Page, field: string) => {
  switch (field) {
    case 'Employee Id':
      return page.locator('.oxd-input-group', { hasText: 'Employee Id' })
                 .locator('.oxd-input-field-error-message');
    
    // --- SỬA ĐOẠN NÀY CHO TÊN ---
    case 'First Name':
      return page.locator('.oxd-input-group')
                 .filter({ has: page.locator('input[name="firstName"]') }) 
                 .locator('.oxd-input-field-error-message');

    case 'Middle Name':
      // FIX LỖI TC09: Tìm group chứa input có name="middleName"
      return page.locator('.oxd-input-group')
                 .filter({ has: page.locator('input[name="middleName"]') })
                 .locator('.oxd-input-field-error-message');

    case 'Last Name':
      return page.locator('.oxd-input-group')
                 .filter({ has: page.locator('input[name="lastName"]') })
                 .locator('.oxd-input-field-error-message');
    // ----------------------------

    case 'Photo':
      return page.locator('.oxd-input-group').locator('.oxd-input-field-error-message');
    default:
      throw new Error(`Unknown field: ${field}`);
  }
};

test.describe('PIM - Add Employee (Data Driven Testing)', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToAddEmployee(page);
  });

  // --- VÒNG LẶP QUA DỮ LIỆU ---
  for (const data of testData) {
    test(`${data.id}: ${data.desc}`, async ({ page }) => {
      
      // 1. ĐIỀN DỮ LIỆU (ACTIONS)
      await page.getByRole('textbox', { name: 'First Name' }).fill(data.firstName);
      await page.getByRole('textbox', { name: 'Last Name' }).fill(data.lastName);
      if (data.middleName) {
        await page.getByRole('textbox', { name: 'Middle Name' }).fill(data.middleName);
      }

      // Xử lý Employee ID
      const idInput = page.locator('.oxd-input-group', { hasText: 'Employee Id' }).locator('input');
      await idInput.clear();
      
      if (data.empId === "AUTO_GEN") {
        const randomID = `EMP${Math.floor(Math.random() * 10000)}`;
        await idInput.fill(randomID);
      } else if (data.empId !== "") {
        await idInput.fill(data.empId);
      }
      // Nếu data.empId == "" thì để trống như đã clear bên trên

      // Xử lý Upload ảnh (nếu có trong data)
      if (data.photo) {
        await page.locator('input[type="file"]').setInputFiles(path.resolve(__dirname, `data/${data.photo}`));
      }

      // Click Save
      await page.getByRole('button', { name: 'Save' }).click();

      // 2. KIỂM TRA KẾT QUẢ (ASSERTIONS)
      if (data.isValid) {
        // Trường hợp hợp lệ (Positive Test)
        await expect(page.locator('.oxd-toast-content')).toContainText('Successfully Saved', { timeout: 10000 });
        await expect(page).toHaveURL(/.*viewPersonalDetails/, { timeout: 10000 });
      } else {
        // Trường hợp không hợp lệ (Negative Test)
        if (data.errorField && data.errorMessage) {
           const errorLocator = getErrorLocator(page, data.errorField);
           await expect(errorLocator).toContainText(data.errorMessage);
        }
      }
    });
  }
});