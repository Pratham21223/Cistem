import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl = "postgresql://cistem:cistem@localhost:5432/cistem";

try {
  process.loadEnvFile();
} catch {
  // .env is optional; deployment environments provide variables directly.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
  },
});
