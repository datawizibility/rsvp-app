import { execSync } from "child_process";
import "dotenv/config";

export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    return;
  }
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
