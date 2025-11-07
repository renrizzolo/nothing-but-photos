import { getItemId } from "@/slug";
import { test, expect, type ViewportSize } from "@playwright/test";
import { baseURL } from "playwright.config";
//  TODO - we shouldn't need to manually set this to the first 2 photos
const photos = ["singapore-dscf-4238", "taipei-dscf-4232"];

// Note this correlates to focus:scale-95 in grid.css
const focusedScaleFactor = 0.95;

const margin = {
  desktop: 96,
  mobile: 32,
};

const testSelectors = [
  getItemId({
    slug: photos[0],
    index: 0,
    frameIndex: 0,
  }),
  getItemId({
    slug: photos[1],
    index: 1,
    frameIndex: 0,
  }),
];

// this isn't 100% accurate due to the css scale transform
const getBoundingBoxForViewport = (
  viewport: ViewportSize | null,
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null
) => {
  if (!boundingBox) {
    throw new Error("No bounding box");
  }

  if (!viewport) {
    throw new Error("No viewport");
  }

  // TODO - viewport width is not always accurate, so we can't guarantee this is correct
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const gridWidth = getGridWidth(viewport);

  const scaledItemOffset =
    (boundingBox.width / focusedScaleFactor - boundingBox.width) / 2;

  //
  const desktop = {
    // width: gridWidth / 8 - scaledItemOffset * 2,
    // height: gridWidth / 8 - scaledItemOffset * 2,
    ...boundingBox,
    // this is 0, 0 relative to the grid
    x: margin.desktop + scaledItemOffset,
    y: margin.desktop + scaledItemOffset,
  };

  if (viewport.width < 640) {
    // 4 columns on mobile
    return {
      // width: gridWidth / 4 - scaledItemOffset * 2,
      // height: gridWidth / 4 - scaledItemOffset * 2,
      ...boundingBox,
      // this is 0, 0 relative to the grid
      x: margin.mobile + scaledItemOffset,
      y: margin.mobile + scaledItemOffset,
    };
  }

  return desktop;
};

const getGridWidth = (viewport: ViewportSize | null) => {
  if (!viewport) {
    throw new Error("No viewport");
  }

  if (viewport.width < 640) {
    return viewport.width - margin.mobile * 2;
  }

  return viewport.width - margin.desktop * 2;
};

test.describe("Smoke tests", () => {
  test("index correctly populates", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Nothing But Photos");
    await expect(
      page.getByRole("heading", { name: "Nothing But Photos" })
    ).toBeVisible();
    // if this many images are loaded, hopefully they all are.
    await page.getByRole("img").nth(12).waitFor({ state: "visible" });
    // this number changes based on the viewport
    expect((await page.getByRole("img").all()).length).toBeGreaterThanOrEqual(
      48
    );
  });

  test("thumb goes to correct slug", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId(testSelectors[0]).waitFor({ state: "visible" });
    await page.getByTestId(testSelectors[0]).click();
    await page.getByTestId(photos[0]).waitFor({ state: "visible" });
    expect(page.url()).toMatch(`/photo/${photos[0]}/`);
  });

  test("thumb is focused on return", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId(testSelectors[1]).waitFor({ state: "visible" });
    await page.getByTestId(testSelectors[1]).click();

    await page.getByTestId(photos[1]).waitFor({ state: "visible" });

    expect(page.url()).toMatch(`/photo/${photos[1]}/`);

    await page.getByText("Return").click();

    await page.getByTestId(testSelectors[1]).waitFor({ state: "visible" });

    expect(page.url()).toEqual(`${baseURL}/`);
    await page.getByTestId(testSelectors[1]).waitFor({ state: "visible" });
    await expect(page.getByTestId(testSelectors[1])).toBeFocused();
  });

  test("thumb is focused and animated to on return", async ({
    page,
    viewport,
  }) => {
    await page.goto("/");
    await page.getByTestId(testSelectors[0]).waitFor({ state: "visible" });
    await page.getByTestId(testSelectors[0]).click();
    await page.waitForLoadState("networkidle");

    await page.getByText("Next").click();
    await page.waitForLoadState("networkidle");
    await page.getByTestId(photos[1]).waitFor({ state: "visible" });

    expect(page.url()).toMatch(`/photo/${photos[1]}/`);

    await page.getByText("Return").click();
    await page.waitForLoadState("networkidle");
    const item = page.getByTestId(testSelectors[1]);

    await item.waitFor({ state: "visible" });
    expect(page.url()).toEqual(`${baseURL}/`);

    // wait for effect timeout
    // TODO this is flaky
    await page.waitForLoadState("networkidle");

    const handle = await item.elementHandle();
    await handle?.waitForElementState("stable");

    await expect(item).toBeFocused();

    const boundingBox = await item.boundingBox();
    const expectedBoundingBox = getBoundingBoxForViewport(
      viewport,
      boundingBox
    );

    expect(boundingBox?.width).toBeCloseTo(expectedBoundingBox.width, 1);
    expect(boundingBox?.height).toBeCloseTo(expectedBoundingBox.height, 1);
    expect(boundingBox?.x).toBeCloseTo(expectedBoundingBox.x, 1);
    expect(boundingBox?.y).toBeCloseTo(expectedBoundingBox.y, 1);
  });

  test("thumb is focused and animated to on return when starting on a photo", async ({
    page,
    viewport,
  }) => {
    await page.goto(`/photo/${photos[1]}/`);
    await page.getByTestId(photos[1]).waitFor({ state: "visible" });

    await page.getByText("Return").click();

    const item = page.getByTestId(testSelectors[1]);
    await item.waitFor({ state: "visible" });

    // wait for effect timeout
    // TODO this is flaky
    await page.waitForLoadState("networkidle");

    const handle = await item.elementHandle();
    await handle?.waitForElementState("stable");
    await expect(item).toBeFocused();

    const boundingBox = await item.boundingBox();
    const expectedBoundingBox = getBoundingBoxForViewport(
      viewport,
      boundingBox
    );

    expect(boundingBox?.width).toBeCloseTo(expectedBoundingBox.width, 1);
    expect(boundingBox?.height).toBeCloseTo(expectedBoundingBox.height, 1);
    expect(boundingBox?.x).toBeCloseTo(expectedBoundingBox.x, 1);
    expect(boundingBox?.y).toBeCloseTo(expectedBoundingBox.y, 1);
  });
});
