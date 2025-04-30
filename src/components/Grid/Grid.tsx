import type { GridItem } from "@/api";
import type { Controller, OnChange, SpringValue } from "@react-spring/web";
import { a, useInView, useSpring } from "@react-spring/web";
import { useGesture } from "@use-gesture/react";
import debounce from "lodash.debounce";
import React from "react";
import {
  activeId as $activeId,
  initialCoords as $initialCoords,
} from "./gridStore";

import "./grid.css";

const useServerCompatibleEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

type SpringVal = { x: number; y: number };

// there are 4 clones in a 2x2 grid
const frameCount = 4;
const clones = Array.from({ length: frameCount });

export const Grid = ({ items }: { items: GridItem[] }) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const initialCoords = React.useMemo(() => {
    return $initialCoords.get();
  }, []);

  const gridRef = React.useRef(null);
  const thumbSizeRef = React.useRef(0);

  const [spring, api] = useSpring<SpringVal>(() => ({
    x: initialCoords[0] || 0,
    y: initialCoords[1] || 0,
  }));

  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const [
    { width, height, columns, rows, containerWidth, containerHeight },
    setDimensions,
  ] = React.useState({
    width: 0,
    height: 0,
    columns: 0,
    rows: 0,
    containerWidth: 0,
    containerHeight: 0,
  });

  const itemsCount = items.length;
  const thumbSize = thumbSizeRef.current;

  const animateToItem = React.useCallback(
    (el?: HTMLElement) => {
      return new Promise((resolve) => {
        if (el && containerWidth) {
          const { x, y } = el?.getBoundingClientRect?.() || {};
          const offsetX = (window.innerWidth - containerWidth) / 2;
          const offsetY = (window.innerHeight - containerHeight) / 2;

          api.start({
            to: async (next) => {
              await next({
                x: initialCoords[0] + -x + offsetX,
                y: initialCoords[1] + -y + offsetY,
              });
            },
            onRest: resolve,
          });
        }
      });
    },
    [api, containerHeight, containerWidth, initialCoords]
  );

  const focusItem = React.useCallback(async () => {
    let el = $activeId.get()
      ? document.querySelector<HTMLElement>(`[data-slug="${$activeId.get()}"]`)
      : null;
    if (el) {
      // when we have the item name but not the full id, animate
      // into view the first occurence of that item
      // await the animation so focus() doesn't
      // cause the browser to scroll the container to the element
      // when it's out of view
      await animateToItem(el);
    } else {
      el = $activeId.get() ? document.getElementById($activeId.get()!) : null;
    }
    console.log("focusItem", el, $activeId.get());
    el?.focus();
  }, [animateToItem]);

  const didFocusItemRef = React.useRef(false);

  useServerCompatibleEffect(() => {
    if (didFocusItemRef.current) return;
    // focus the previously selected item on mount
    setTimeout(() => {
      focusItem();
      didFocusItemRef.current = true;
    }, 100);
  }, [focusItem]);

  const updateGrid = React.useCallback(() => {
    const [cw, ch] = getContainerSize();
    const thumbSize = getThumbSize(cw);

    thumbSizeRef.current = thumbSize;

    // make horizontal plane 1.5x greater than the container width
    const colCount = Math.ceil((cw * 1.5) / thumbSize);
    const rowCount = Math.ceil(ch / thumbSize);

    const height = rowCount * thumbSize;
    const width = colCount * thumbSize;

    setDimensions({
      width,
      height,
      containerWidth: cw,
      containerHeight: ch,
      columns: colCount,
      rows: rowCount,
    });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateGrid = React.useCallback(debounce(updateGrid, 300), [
    updateGrid,
  ]);

  const isUpdateRef = React.useRef(false);

  useServerCompatibleEffect(() => {
    updateGrid();
  }, [updateGrid]);

  const resizeRef = React.useRef<ResizeObserver>();

  useServerCompatibleEffect(() => {
    if (rootRef.current && !resizeRef.current) {
      resizeRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          // just to prevent firing update twice on mount
          if (!isUpdateRef.current) {
            isUpdateRef.current = true;
            return;
          }
          if (entry.contentBoxSize) {
            debouncedUpdateGrid();
          }
        }
      });
      resizeRef.current.observe(rootRef.current);
    }
  }, [containerWidth, debouncedUpdateGrid]);

  React.useEffect(() => {
    return () => {
      resizeRef.current?.disconnect();
      resizeRef.current = undefined;
    };
  }, []);

  // clone items if they don't fill a screen
  const allItems = React.useMemo(() => {
    let i1 = items;

    if (itemsCount === 0) return items;
    const gridTotal = columns * rows;

    while (i1.length < gridTotal) {
      i1 = i1.concat(
        items.map((item) => ({ ...item, style: "" })).slice(0, itemsCount)
      );
    }
    if (i1.length > gridTotal) {
      i1 = i1.slice(0, gridTotal - i1.length);
    }

    return i1;
  }, [columns, items, itemsCount, rows]);

  const onDragEnd: (
    decayX: number,
    decayY: number,
    dy: number,
    dx: number,
    isNested: boolean,
    didExceedY: boolean,
    didExceedX: boolean
  ) => OnChange<SpringValue<SpringVal>, Controller<SpringVal>> =
    React.useCallback(
      (decayX, decayY, dy, dx, isNested, didExceedY, didExceedX) => {
        return ({ value: { x: xVal, y: yVal } }) => {
          const exceedsY = dy < 0 ? yVal % height > 0 : yVal < -height;
          const exceedsX = dx < 0 ? xVal % width > 0 : xVal < -width;

          if (exceedsY || exceedsX) {
            const xFlip = dx > 0 ? 0 : -width;
            const yFlip = dy > 0 ? 0 : -height;
            const remainderY = dy < 0 ? decayY - height : decayY - -height;
            const remainderX = dx < 0 ? decayX - width : decayX - -width;
            // immediately flip to the opposite side if we have exceeded the
            // frame boundary in this animation frame
            api.set({
              x: exceedsX ? xFlip : xVal,
              y: exceedsY ? yFlip : yVal,
            });
            // start a new animation to avoid throwing an error
            // for interrupting the current one
            api.start({
              to: async (nxt) => {
                await nxt({
                  y:
                    exceedsY || didExceedY
                      ? remainderY
                      : isNested
                      ? yVal
                      : decayY,
                  x:
                    exceedsX || didExceedX
                      ? remainderX
                      : isNested
                      ? xVal
                      : decayX,
                  // If we don't recursively check for exceeding the boundary,
                  // it's possible to have a decay that e.g exceeds Y boundary initally,
                  // but then exceeds X boundary *in this nested animation*

                  // we recurse 1 level only as MAX_DECAY
                  // will never allow exceeding more than 1 frame boundary
                  onChange: isNested
                    ? undefined
                    : onDragEnd(
                        decayX,
                        decayY,
                        dy,
                        dx,
                        true,
                        exceedsY,
                        exceedsX
                      ),
                });
              },
            });
          }
        };
      },
      [api, height, width]
    );

  const MAX_DECAY_X = containerWidth / 2;
  const MAX_DECAY_Y = containerHeight / 2;

  const runSpring = React.useCallback(
    ({
      x,
      y,
      dx,
      dy,
      vx,
      vy,
      down,
    }: {
      x: number;
      y: number;
      dx: number;
      dy: number;
      vx: number;
      vy: number;
      down: boolean;
    }) => {
      const xPos = (-x % width) + (-x > 0 ? -width : 0);
      const yPos = (-y % height) + (-y > 0 ? -height : 0);

      api.start({
        to: async (next) => {
          if (down) {
            await next({
              x: xPos,
              y: yPos,
              immediate: true,
            });
          }

          // when letting go of the drag, use the velocity to create some decay animation
          if (!down) {
            const decayX = xPos + Math.min(thumbSize * vx, MAX_DECAY_X) * -dx;
            const decayY = yPos + Math.min(thumbSize * vy, MAX_DECAY_Y) * -dy;

            await next({
              x: decayX,
              y: decayY,
              onChange: onDragEnd(decayX, decayY, dy, dx, false, false, false),
            });

            return;
          }
        },

        config: {
          tension: 150,
          friction: 40,
        },
      });
    },
    [width, height, api, thumbSize, MAX_DECAY_X, MAX_DECAY_Y, onDragEnd]
  );

  useGesture(
    {
      onDrag: ({
        event,
        down,
        offset: [x, y],
        direction: [dx, dy],
        velocity: [vx, vy],
        tap,
      }) => {
        if (tap) event.preventDefault();
        if (dx || dy) {
          runSpring({ x: -x, y: -y, dx: -dx, dy: -dy, vx, vy, down });
        }
      },
      onWheel: ({
        event,
        movement: [, wheelY],
        direction: [, wheelDy],
        velocity: [, wheelVy],
        ctrlKey,
        memo,
      }) => {
        event.preventDefault();
        if (wheelDy) {
          // save the current position
          // so we can use it to calculate the new position
          if (!memo) {
            memo = { x: -spring.x.get(), y: -spring.y.get(), ctrlKey };
          }

          // move vertically when ctrlKey is pressed
          if (ctrlKey) {
            runSpring({
              x: memo.x,
              y: -wheelY + memo.y,
              dx: 0,
              dy: -wheelDy,
              vx: 0,
              vy: wheelVy,
              down: true,
            });
            // move horizontally
          } else {
            runSpring({
              x: -wheelY + memo.x,
              y: memo.y,
              dx: -wheelDy,
              dy: 0,
              vx: wheelVy,
              vy: 0,
              down: true,
            });
          }
        }

        return memo;
      },
    },
    {
      target: gridRef,
      wheel: {
        eventOptions: { passive: false },
        axis: "y",
      },
      drag: {
        filterTaps: true,
        tapsThreshold: 5,
        eventOptions: { passive: false },
        from: () => [spring.x.get(), spring.y.get()],
      },
    }
  );

  const onNavigate = React.useCallback(
    (id: string) => () => {
      $initialCoords.set([spring.x.get(), spring.y.get()]);
      $activeId.set(id);
      // force update because subscribing to nanostores is
      // creating some kind of memory leak
      // (this guarantees the new activeId will be set for the outgoing
      // view-transition)
      forceUpdate();
    },
    [spring.x, spring.y]
  );

  return (
    <div ref={rootRef} data-testid="grid-root" className="w-full h-full">
      <div
        ref={gridRef}
        data-testid="grid-drag"
        className={`relative w-full h-full overflow-hidden touch-none`}
        aria-label="Photo grid"
      >
        {thumbSize ? (
          <a.div
            data-testid="grid-animatable"
            className="w-full h-full grid will-change-transform select-none"
            style={{
              gridTemplateColumns: `repeat(${frameCount / 2}, ${width}px)`,
              gridTemplateRows: `repeat(${frameCount / 2}, ${height}px)`,
              // @ts-expect-error - not in csstype
              WebkitUserDrag: "none",
              x: spring.x,
              y: spring.y,
            }}
          >
            {clones.map((_, frameIndex) => (
              <GridContainer
                columns={columns}
                thumbSize={thumbSize}
                root={rootRef as unknown as React.MutableRefObject<HTMLElement>}
                key={frameIndex}
                index={frameIndex}
              >
                {allItems.map((item, i) => (
                  <GridThumb
                    key={`${item.slug}-${i}-${frameIndex}`}
                    html={frameIndex === 0 ? item.style + item.img : item.img}
                    name={item.name}
                    slug={item.slug}
                    id={`${item.slug}-${i}-${frameIndex}`}
                    active={
                      $activeId.get() === `${item.slug}-${i}-${frameIndex}`
                    }
                    onNavigate={onNavigate}
                  />
                ))}
              </GridContainer>
            ))}
          </a.div>
        ) : (
          <LoadingIndicator />
        )}
      </div>
    </div>
  );
};

const GridContainer = ({
  children,
  columns,
  root,
  index,
  thumbSize,
}: React.PropsWithChildren<{
  columns: number;
  thumbSize: number;
  root: React.MutableRefObject<HTMLElement>;
  index: number;
}>) => {
  const [ref, isInView] = useInView({
    rootMargin: `20%`,
    once: true,
    root,
  });

  return (
    <a.div
      ref={ref}
      data-testid={`grid-container-${index}`}
      className="h-full grid w-full"
      style={{
        // @ts-expect-error - not in csstype
        WebkitUserDrag: "none",
        gridTemplateColumns: `repeat(${columns}, ${thumbSize}px)`,
        gridAutoRows: "max-content",
      }}
    >
      {isInView ? children : null}
    </a.div>
  );
};

const GridThumb = React.memo(
  ({
    onNavigate,
    slug,
    html,
    id,
    active,
  }: {
    onNavigate: (id: string) => () => void;
    name: string;
    slug: string;
    active: boolean;
    html: string;
    id: string;
  }) => {
    return (
      <a
        className={`${active ? "full-image " : ""}grid-item-anchor`}
        href={`/photo/${slug}/`}
        onPointerDown={(e) => {
          e.preventDefault();
        }}
        data-testid={id}
        id={id}
        data-slug={slug}
        onClick={onNavigate(id)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
);

GridThumb.displayName = "GridThumb";

const CIRCLE_SIZE = 50;
const LoadingIndicator = () => (
  <div className="flex items-center justify-center w-full h-full text-stone-200 dark:text-stone-800">
    <svg
      width={CIRCLE_SIZE}
      height={CIRCLE_SIZE}
      className="fill-current animate-ping"
    >
      <circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={CIRCLE_SIZE / 2} />
      <circle
        className="stroke-stone-100 dark:stroke-stone-600"
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={20}
      />
      <circle
        className="fill-stone-100 dark:fill-stone-600"
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={10}
      />
    </svg>
  </div>
);

/**
 * Get the thumbnail size to display
 * based on the current window width/height
 *
 * The value is a division of the containerWidth
 * so that the thumbs are flush with the edge of the grid
 */
export const getThumbSize = (containerWidth: number) => {
  let thumbSize =
    containerWidth > 640 ? containerWidth / 8 : containerWidth / 4;
  if (window.innerHeight < 480 && window.innerWidth < 960) {
    thumbSize = containerWidth / 6;
  }
  return thumbSize;
};

/**
 * Get the container size based on the current window width/height
 */
export const getContainerSize = () => {
  // container margin is 12rem (3rem below sm breakpoint)
  const rem = 16;

  let margin = window.innerWidth < 640 ? 4 * rem : 12 * rem;
  // portrait: (max-height: 480px) and (max-width: 960px)
  if (window.innerHeight < 480 && window.innerWidth < 960) {
    margin = 4 * rem;
  }

  const cw = window.innerWidth - margin;
  const ch = window.innerHeight - margin;
  return [cw, ch];
};
