import * as matchers from "@testing-library/jest-dom/matchers";
import { act, cleanup } from "@testing-library/react";
import { configMocks } from "jsdom-testing-mocks";
import { afterEach, beforeAll, expect, vi } from "vitest";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// fix jsdom missing pointer capture methods
beforeAll(() => {
  if (typeof window !== "undefined") {
    if (
      typeof Element !== "undefined" &&
      !Element.prototype.setPointerCapture
    ) {
      Element.prototype.setPointerCapture = vi.fn();
    }
    if (
      typeof Element !== "undefined" &&
      !Element.prototype.releasePointerCapture
    ) {
      Element.prototype.releasePointerCapture = vi.fn();
    }
  }
});

configMocks({ act });
