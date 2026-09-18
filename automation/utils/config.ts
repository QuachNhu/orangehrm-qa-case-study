// Thông tin đăng nhập OrangeHRM local — có thể ghi đè bằng biến môi trường
export const ADMIN_USER = process.env.ORANGEHRM_ADMIN_USER ?? 'admin';
export const PASSWORD = process.env.ORANGEHRM_PASSWORD ?? 'Admin@12345';
