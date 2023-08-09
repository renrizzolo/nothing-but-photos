import { Grid } from "@/components/Grid";
import { PHOTOS_PATH } from "@/constants";
import { readdir } from "fs/promises";
import path from "path";

export type Item = {
  fileName: string;
  id: string;
};

export async function getItems() {
  const items = await readdir(path.resolve(`./public/${PHOTOS_PATH}`));
  return items.filter((p) => p.toLowerCase().endsWith("jpg"));
}
export default async function Home() {
  const items = await getItems();

  return (
    <main className="min-h-screen p-0">
      <Grid items={items} />
    </main>
  );
}
