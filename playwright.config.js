import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4317",
    viewport: { width: 1440, height: 960 },
  },
  webServer: {
    command: "node backend/app.js",
    url: "http://127.0.0.1:4317/api/health",
    reuseExistingServer: false,
    env: {
      PORT: "4317",
      DB_PATH: "backend/data/e2e.db",
      UPLOAD_DIR: "backend/uploads/e2e",
    },
  },
});
