module.exports = {
  testDir: './',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8000',
    headless: true,
    screenshot: 'on',
    video: 'retain-on-failure',
  },
};
