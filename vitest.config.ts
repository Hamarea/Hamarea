import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Tests unitaires de la logique métier PURE (pricing autoritaire, coupons,
 * frais de port). Environnement node : aucune dépendance DOM/React requise.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
