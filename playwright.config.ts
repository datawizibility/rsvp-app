import { defineConfig } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/signin",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
