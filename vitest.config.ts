import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors apps/web tsconfig "@/*" so client-crypto modules are importable in tests.
      "@/": fileURLToPath(new URL("./apps/web/", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
