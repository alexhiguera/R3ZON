import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` lanza error al importarse fuera de un server bundle de Next;
      // en Vitest lo redirigimos a un stub vacío.
      "server-only": path.resolve(__dirname, "./tests/_mocks/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
