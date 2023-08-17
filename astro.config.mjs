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
  experimental: {
    assets: true,
    viewTransitions: true,
  },
  vite: {
    optimizeDeps: {
      exclude: ["astro-imagetools"],
    },
  },
  image: {
    service: sharpImageService(),
  },
});
