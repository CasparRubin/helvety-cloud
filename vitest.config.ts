import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const webRoot = fileURLToPath(new URL("./apps/web", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors apps/web tsconfig "@/*" so client-crypto modules are importable in tests.
      "@": webRoot,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
