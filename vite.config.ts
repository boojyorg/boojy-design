/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Coverage is configured once at the root and spans both projects below.
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**"],
    },
    projects: [
      {
        // The shell + wiring tests: jsdom, where the engine no-ops (getContext stubbed).
        extends: true,
        test: {
          name: "dom",
          globals: true,
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          css: true,
          include: ["tests/**/*.test.{ts,tsx}"],
          exclude: ["tests/pixel/**"],
        },
      },
      {
        // Real-canvas pixel tests: node env, NO setup file (so getContext is NOT stubbed),
        // using @napi-rs/canvas for an actual 2D context.
        extends: true,
        test: {
          name: "node",
          globals: true,
          environment: "node",
          include: ["tests/pixel/**/*.test.ts"],
        },
      },
    ],
  },
})
