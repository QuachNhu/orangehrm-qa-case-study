import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Tắt chạy song song để tránh xung đột dữ liệu OrangeHRM
  workers: 1,           // CHỈ CHẠY 1 trình duyệt tại một thời điểm để đảm bảo ổn định
  timeout: 90000,       // Tăng timeout lên 90s cho Firefox/Webkit thoải mái thời gian

  reporter: [
    ['list'], 
    ['html', { open: 'never' }]
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
    headless: true,      // QUAN TRỌNG: Chuyển sang true để máy không bị lag
    actionTimeout: 30000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});