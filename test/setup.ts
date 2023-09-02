import * as matchers from "@testing-library/jest-dom/matchers";
import type { EventType } from "@testing-library/react";
import { act, cleanup, createEvent } from "@testing-library/react";
import { configMocks } from "jsdom-testing-mocks";
import { afterEach, expect } from "vitest";

expect.extend(matchers);

beforeEach(() => {
  patchCreateEvent(createEvent);
});
afterEach(() => {
  cleanup();
});

configMocks({ act });

// https://github.com/pmndrs/use-gesture/blob/main/test/utils.tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function patchCreateEvent(createEvent: any) {
  // patching createEvent
  for (const key in createEvent) {
    if (key.indexOf("pointer") === 0) {
      const fn = createEvent[key.replace("pointer", "mouse")];
      if (!fn) continue;

      createEvent[key] = function (
        type: EventType,
        { pointerId = 1, pointerType = "mouse", ...rest } = {}
      ) {
        const event = fn(type, rest);
        event.pointerId = pointerId;
        event.pointerType = pointerType;
        const eventType = event.type;
        Object.defineProperty(event, "type", {
          get: function () {
            return eventType.replace("mouse", "pointer");
          },
        });
        return event;
      };
    }
  }
}
