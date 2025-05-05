export const getItemId = ({
  slug,
  index,
  frameIndex,
}: {
  slug: string;
  index: number;
  frameIndex: number;
}): string => {
  return `${slug}:${index}-${frameIndex}`;
};

export const getSlugFromItemId = (itemId: string): string => {
  return itemId.split(":")?.[0];
};
