// "use client";
import { getItems } from "@/app/page";
import { Link } from "@/components/Link";
import { PHOTOS_PATH } from "@/constants";
import ExportedImage from "next-image-export-optimizer";

// async function getItem(id: string) {
//   const items = await readdir(path.resolve(`./public/${PHOTOS_PATH}`));
//   return items.find((p) => p === id);
// }

export default function Page({ params }: { params: { id: string } }) {
  const item = params.id;

  if (!item) return "Not found :(";
  return (
    <section>
      <Link href="/" className="z-10 relative">
        Back
      </Link>
      <div className="full-image absolute inset-0">
        <ExportedImage
          src={`${PHOTOS_PATH}/${item}`}
          // width="1500"
          // height="1000"
          fill
          className="object-contain"
          loading="eager"
          alt=""
        />
      </div>
    </section>
  );
}

export const generateStaticParams = async () => {
  const items = await getItems();

  return items.map((item) => ({
    id: item,
  }));
};
