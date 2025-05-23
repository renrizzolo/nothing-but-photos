import { getItemId } from "@/slug";
import { test, expect, type ViewportSize } from "@playwright/test";
import { baseURL } from "playwright.config";
//  TODO - we shouldn't need to manually set this to the first 2 photos
const photos = ["seoul-dscf-2385", "fujikawaguchiko-dscf-2100"];

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

const getBoundingBoxForViewport = (
  viewport: ViewportSize | null,
  bb: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null
) => {
  const desktop = {
    ...bb,
    // this is 0, 0 relative to the grid
    x: 96,
    y: 96,
  };

  if (!viewport) {
    return desktop;
  }

  if (viewport.width < 1200) {
    return {
      ...bb,
      // this is 0, 0 relative to the grid
      x: 32,
      y: 32,
    };
  }
  return desktop;
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
    await page.waitForTimeout(500);
    await expect(item).toBeFocused();

    const bb = await item.boundingBox();
    expect(bb).toStrictEqual(getBoundingBoxForViewport(viewport, bb));
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
    await page.waitForTimeout(500);
    await expect(item).toBeFocused();

    const bb = await item.boundingBox();
    expect(bb).toStrictEqual(getBoundingBoxForViewport(viewport, bb));
  });
});
