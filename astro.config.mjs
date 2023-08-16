import react from "@astrojs/react";
import { astroImageTools } from "astro-imagetools";
import { defineConfig, sharpImageService } from "astro/config";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [astroImageTools, react(), tailwind()],
  experimental: {
    assets: true,
    viewTransitions: true,
  },
  image: {
    service: sharpImageService(),
  },
});