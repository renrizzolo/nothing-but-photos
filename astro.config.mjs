import react from "@astrojs/react";
import { astroImageTools } from "astro-imagetools";
import { defineConfig, sharpImageService } from "astro/config";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [
    astroImageTools,
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    optimizeDeps: {
      exclude: ["astro-imagetools"],
    },
    test: {
      // only include src so we don't run
      // e2e tests via vitest - we do that with npx playwright
      include: ["./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    },
  },
  build: {
    inlineStylesheets: "auto",
  },
  image: {
    service: sharpImageService(),
  },
});
