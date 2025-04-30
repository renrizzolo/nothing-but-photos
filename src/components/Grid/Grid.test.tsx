import "@testing-library/jest-dom";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import {
  mockIntersectionObserver,
  mockResizeObserver,
} from "jsdom-testing-mocks";
import React from "react";
import { vi } from "vitest";
import { Grid, getContainerSize, getThumbSize } from "./Grid";
const io = mockIntersectionObserver();
const ro = mockResizeObserver();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("innerWidth", 1920);
  vi.stubGlobal("innerHeight", 1080);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const WIDTH_MULTIPLIER = 1.5;

const getExpectedItemsCount = () => {
  const [containerWidth, containerHeight] = getContainerSize();
  const thumbSize = getThumbSize(containerWidth);
  const expectedColumns = Math.ceil(
    (containerWidth * WIDTH_MULTIPLIER) / thumbSize
  );
  const expectedRows = Math.ceil(containerHeight / thumbSize);
  return expectedColumns * expectedRows;
};

const mockItems: React.ComponentProps<typeof Grid>["items"] = [
  {
    name: "a",
    img: `<img src="" alt="A Photo"/>`,
    slug: "a-slug",
    style: "",
  },
];

test("it renders when empty", () => {
  render(<Grid items={[]} />);
  expect(screen.getByTestId("grid-drag")).toBeInTheDocument();
  expect(screen.getByTestId("grid-animatable")).toBeInTheDocument();
});

test("it renders the correct amount of items for desktop", () => {
  render(<Grid items={mockItems} />);
  ro.mockElementSize(screen.getByTestId("grid-root"), {
    contentBoxSize: { blockSize: 1080 },
  });
  vi.runAllTicks();
  io.enterNode(screen.getByTestId("grid-container-0"));

  expect(screen.getAllByAltText("A Photo")).toHaveLength(
    getExpectedItemsCount()
  );
});
test("it renders the correct amount of items for desktop (large)", () => {
  vi.stubGlobal("innerWidth", 2560);
  vi.stubGlobal("innerHeight", 1440);
  render(<Grid items={mockItems} />);
  io.enterNode(screen.getByTestId("grid-container-0"));
  expect(screen.getAllByAltText("A Photo")).toHaveLength(
    getExpectedItemsCount()
  );
});

test("it renders the correct amount of items for mobile", () => {
  vi.stubGlobal("innerWidth", 375);
  vi.stubGlobal("innerHeight", 667);
  render(<Grid items={mockItems} />);
  io.enterNode(screen.getByTestId("grid-container-0"));
  expect(screen.getAllByAltText("A Photo")).toHaveLength(
    getExpectedItemsCount()
  );
});

test("it renders the correct amount of items for mobile (landscape)", () => {
  vi.stubGlobal("innerWidth", 667);
  vi.stubGlobal("innerHeight", 375);
  render(<Grid items={mockItems} />);
  io.enterNode(screen.getByTestId("grid-container-0"));
  expect(screen.getAllByAltText("A Photo")).toHaveLength(
    getExpectedItemsCount()
  );
});

test("it is draggable", async () => {
  render(<Grid items={mockItems} />);

  // trigger the intersection observer for the frame (useInView())
  io.enterNode(screen.getByTestId("grid-container-0"));
  expect(screen.getByTestId("a-slug-0-0")).toBeInTheDocument();

  const [containerWidth, containerHeight] = getContainerSize();

  const width = containerWidth * WIDTH_MULTIPLIER;
  const height = containerHeight;
  console.log({ width, height });
  expect(screen.getByTestId("grid-animatable")).toHaveStyle({
    transform: "none",
  });

  io.leaveNode(screen.getByTestId("grid-container-0"));
  io.enterNode(screen.getByTestId("grid-container-1"));
  vi.runAllTimers();

  const tapThreshold = 5;
  drag(screen.getByTestId("grid-drag"), {
    x: width + tapThreshold,
    y: 0,
  });

  console.log("1");
  expect(screen.getByTestId("a-slug-0-1")).toBeInTheDocument();
  vi.runAllTimers();

  console.log(screen.getByTestId("grid-animatable").style.transform);
  expect(screen.getByTestId("grid-animatable")).toHaveStyle({
    transform: `translate3d(-${width}px,0,0)`,
  });

  console.log("3");
  await drag(screen.getByTestId("grid-drag"), {
    x: 300 + tapThreshold,
    y: -300 - 5,
  });
  vi.runAllTimers();

  expect(screen.getByTestId("grid-animatable")).toHaveStyle({
    transform: `translate3d(${-width + 300}px,-300px,0)`,
  });
});

const drag = async (el: Element, to: { x: number; y: number }) => {
  const coords = {
    clientX: 0,
    clientY: 0,
  };

  const down = createEvent.pointerDown(el, {
    ...coords,
    buttons: 1,
  });
  fireEvent(el, down);
  const toParams = {
    clientX: to.x,
    clientY: to.y,
    buttons: 1,
  };
  const move = createEvent.pointerMove(el, toParams);

  fireEvent(el, move);

  const up = createEvent.pointerUp(el, toParams);
  fireEvent(el, up);
};
