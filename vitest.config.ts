/// <reference types="vitest" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  // @ts-expect-error TODO fix types
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
  },
});
