/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // reactStrictMode: false,
  images: {
    loader: "custom",
    imageSizes: [64, 256],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 300,
  },
  transpilePackages: ["next-image-export-optimizer"],
  env: {
    nextImageExportOptimizer_imageFolderPath: "public/images",
    nextImageExportOptimizer_exportFolderPath: "out",
    nextImageExportOptimizer_quality: 90,
    nextImageExportOptimizer_storePicturesInWEBP: false,
    nextImageExportOptimizer_exportFolderName: "optimized-images",

    // If you do not want to use blurry placeholder images, then you can set
    // nextImageExportOptimizer_generateAndUseBlurImages to false and pass
    // `placeholder="empty"` to all <ExportedImage> components.
    nextImageExportOptimizer_generateAndUseBlurImages: true,
  },
};

module.exports = nextConfig;
