import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://parley:parley@localhost:5432/parley",
  },
  strict: true,
  verbose: true,
});
