import type { GetImageResult, ImageMetadata } from "astro";
// @ts-expect-error no types
import type { ImgHTMLData } from "astro-imagetools";
//@ts-expect-error no types
import { renderImg as _renderImg } from "astro-imagetools/api";
// @ts-expect-error no types
import type TRenderImg from "astro-imagetools/api/renderImg";
import { getImage } from "astro:assets";
import exifReader from "exif-reader";
import { statSync } from "fs";
import kebabCase from "lodash.kebabcase";
import path from "path";
import sharp from "sharp";
// import Color from "color";

export type Item = {
  // file name excluding extension
  name: string;
  slug: string;
  ogImage: GetImageResult;
  large: ImgHTMLData;
  thumb: ImgHTMLData;
  aspect: number;
  info: {
    Camera?: string;
    "Capture Date"?: string;
  };
  metadata: {
    Lens?: string;
    "F Stop"?: number | string;
    ISO?: number | string;
    "Shutter Speed"?: string;
  };
  // exif capture date OR file time
  _captureDate: Date;
};

export type GridItem = {
  name: string;
  slug: string;
  img: string;
  style: string;
};

// creates all the responsive images & metadata for thumbs + full size
export async function getItems(): Promise<Item[]> {
  const renderImg: typeof TRenderImg = _renderImg;

  // sharp rotates images based on exif orientation.
  // usually this is corrected by adding .rotate() in the sharp pipeline,
  // but we don't have access to it
  const getRotationFromOrientation = (orientation: number) => {
    if ([6, 5].includes(orientation)) return 90;
    if ([8, 7].includes(orientation)) return -90;
    if ([3, 4].includes(orientation)) return 180;
    return 0;
  };

  const getNormalSize = ({
    width,
    height,
    orientation,
  }: {
    width?: number;
    height?: number;
    orientation?: number;
  }) => {
    return (orientation || 0) >= 5
      ? { width: height, height: width }
      : { width, height };
  };

  try {
    const comps = import.meta.glob<ImageMetadata>("../assets/photos/*.*", {
      import: "default",
    });

    const files = await Promise.all(
      Object.keys(comps).map(async (c) => {
        const { name, ext, base } = path.parse(c);

        const time = statSync(
          path.resolve(process.cwd(), `src/assets/photos/${base}`)
        ).mtime.getTime();
        let img;
        // return filename in a way that works with Vite
        switch (ext) {
          case ".jpg":
            img = (await import(`../assets/photos/${name}.jpg`)).default;
            break;
          case ".png":
            img = (await import(`../assets/photos/${name}.png`)).default;
            break;
          default:
            throw new Error(
              `Unsupported image extension: ${ext}. Only .jpg and .png are supported.`
            );
        }

        const ogImage = await getImage({
          src: img,
          width: 1200,
          height: 630,
          quality: 60,
          format: "png",
        });

        const sh = sharp(`./src/assets/photos/${base}`);
        const meta = await sh.metadata();
        // @TODO need a cacheing mechanism because this is really slow.
        // const { dominant } = await sh.stats();
        // const color = Color(dominant);
        // const [h, s, l] = color.hsl().array();

        const exif = meta.exif ? exifReader(meta.exif) : null;

        // use the capture date, fall back to the modifty date (when film was scanned, probably)
        const exifDate =
          exif?.Photo?.DateTimeOriginal ??
          exif?.Photo?.DateTimeDigitized ??
          exif?.Image?.DateTime;

        const imageInfo: Item["info"] = {
          // Make: exif?.image?.Make,
          // Model: exif?.image?.Model,
          Camera: exif?.Image?.Make
            ? `${exif?.Image?.Make} ${exif?.Image?.Model}`
            : undefined,
          "Capture Date": exifDate
            ? new Date(exifDate).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })
            : undefined,
        };

        const imageMeta: Item["metadata"] = {
          // Make: exif?.image?.Make,
          // Model: exif?.image?.Model,
          Lens: exif?.Photo?.LensModel
            ? `${exif?.Photo?.LensModel}`?.split("\u0000")?.[0]
            : undefined,
          "F Stop": exif?.Photo?.FNumber,
          ISO: exif?.Photo?.ISOSpeedRatings,
          "Shutter Speed": exif?.Photo?.ExposureTime
            ? `1/${Math.round(1 / Number(exif.Photo.ExposureTime))}`
            : undefined,
        };

        const makeModel = exif?.Image?.Make
          ? `${exif?.Image?.Make} ${exif?.Image?.Model}`
          : "unknown camera";

        const date = exifDate
          ? `${new Date(exifDate).toLocaleDateString("en-GB")}`
          : "unknown date";
        const alt = `Photograph taken with ${makeModel} on ${date}`;

        const { width, height } = getNormalSize(meta);
        const aspect = (width || 1) / (height || 1);

        const opt = await renderImg({
          src: `/src/assets/photos/${base}`,
          alt,
          format: "webp",
          aspect,
          rotate: getRotationFromOrientation(meta.orientation || 0),
          layout: "fill",
          objectFit: "contain",
          loading: "eager",
          sizes: `(min-width: 1440px) 1440px,
            (min-width: 1280px) 1280px,
            (min-width: 1024px) 1024px,
            (min-width: 320px) 640px,
            90vw`,
          breakpoints: [640, 1024, 1280, 1550],
          placeholder: "blurred",
        });

        const thumbOpt = await renderImg({
          src: `/src/assets/photos/${base}`,
          alt,
          format: "webp",
          rotate: getRotationFromOrientation(meta.orientation || 0),
          layout: "fill",
          objectFit: "cover",
          quality: 65,
          loading: "auto",
          aspect: 1,
          sizes: `(min-width: 2000px) 296px,
            (min-width: 1440px) 216px,
            (min-width: 768px) 156px,
            calc(25vw - 4rem)
            `,
          breakpoints: [156, 216, 296],
          placeholder: "blurred",
        });
        console.log(name, kebabCase(name.toLowerCase()));
        const item = {
          large: opt,
          thumb: thumbOpt,
          name,
          slug: kebabCase(name.toLowerCase()),
          aspect,
          ogImage,
          info: imageInfo,
          metadata: imageMeta,
          _captureDate: new Date(exifDate ?? time),
        } satisfies Item;
        return item;
      })
    );
    return files
      .sort((a, b) => Number(b._captureDate) - Number(a._captureDate))
      .sort(
        (a, b) =>
          // put the photos without exif capture date to the back
          Number(!!b.info["Capture Date"]) - Number(!!a.info["Capture Date"])
      );
  } catch (error) {
    throw new Error(`${error}
		could not find any photos in ./src/assets/**.*`);
  }
}
