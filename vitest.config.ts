import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/platform", import.meta.url)),
    },
  },
  test: {
    exclude: ["e2e/**", "**/node_modules/**", "**/.next/**"],
    include: ["**/*.{test,spec}.ts"],
    passWithNoTests: true,
  },
});
