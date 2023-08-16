"use client";
import type { GridItem } from "@/api";
import { a, useInView, useSpring } from "@react-spring/web";
import { useGesture } from "@use-gesture/react";
import debounce from "lodash.debounce";
import React from "react";
import {
  activeId as $activeId,
  initialCoords as $initialCoords,
} from "./gridStore";

function calcDiff(size: number, thumbSize: number) {
  const count = size / thumbSize;
  return Math.ceil(count);
}

export const Grid = ({ items }: { items: GridItem[] }) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const initialCoords = React.useMemo(() => {
    return $initialCoords.get();
  }, []);

  const wheelOffset = React.useRef(0);
  const dragOffset = React.useRef([0, 0]);
  const gridRef = React.useRef(null);
  const thumbSizeRef = React.useRef(0);

  const frameCount = 4;
  const springs = Array.from({ length: frameCount });

  const [spring, api] = useSpring(() => ({
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
      if (el) {
        const { x, y } = el?.getBoundingClientRect?.() || {};
        const offsetX = (window.innerWidth - containerWidth) / 2;
        const offsetY = (window.innerHeight - containerHeight) / 2;

        api.start({
          x: initialCoords[0] + -x + offsetX,
          y: initialCoords[1] + -y + offsetY,
          config: { tension: 100 },
        });
      }
    },
    [api, containerHeight, containerWidth, initialCoords]
  );

  const focusItem = React.useCallback(() => {
    let el = document.querySelector<HTMLElement>(
      `[data-slug="${$activeId.get()}"]`
    );
    if (el) {
      // when we have the item name but not the full id, animate
      // into view the first occurence of that item
      animateToItem(el);
    } else {
      el = document.getElementById($activeId.get() ?? "");
    }
    el?.focus();
  }, [animateToItem]);

  const onLoad = React.useCallback(() => {
    focusItem();
  }, [focusItem]);

  React.useEffect(() => {
    document.addEventListener("astro:load", onLoad, { once: true });
    return () => document.removeEventListener("astro:load", onLoad);
  }, [onLoad]);

  const updateGrid = React.useCallback(() => {
    // container margin is 12rem (3rem below sm breakpoint)
    const rem = 16;

    let margin = window.innerWidth < 640 ? 3 * rem : 12 * rem;
    // portrait: (max-height: 480px) and (max-width: 960px)
    if (window.innerHeight < 480 && window.innerWidth < 960) {
      margin = 3 * rem;
    }

    const cw = window.innerWidth - margin;
    const ch = window.innerHeight - margin;

    const thumbSize = cw > 640 ? cw / 8 : cw / 4;
    thumbSizeRef.current = thumbSize;

    // make horizontal plane 1.5x greater than the container width
    const colCount = calcDiff(cw * 1.5, thumbSize);
    const rowCount = calcDiff(ch, thumbSize);

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

  const debouncedUpdateGrid = React.useCallback(debounce(updateGrid, 300), []);

  React.useEffect(() => {
    updateGrid();
  }, []);

  const resizeRef = React.useRef<ResizeObserver>();

  React.useEffect(() => {
    if (rootRef.current && !resizeRef.current) {
      resizeRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentBoxSize) {
            debouncedUpdateGrid();
          }
        }
      });
      resizeRef.current.observe(rootRef.current);
    }
  }, [containerWidth, debouncedUpdateGrid]);

  const cleanup = React.useCallback(() => {
    resizeRef.current?.disconnect();
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
          const distanceToNextItemX =
            (Math.abs(xPos / thumbSize) -
              Math.floor(Math.abs(xPos / thumbSize))) *
            thumbSize;

          const distanceToNextItemY =
            (Math.abs(yPos / thumbSize) -
              Math.floor(Math.abs(yPos / thumbSize))) *
            thumbSize;

          const xWithVelocity =
            dx < 0
              ? xPos + Math.min(distanceToNextItemX * vx, containerWidth / 2)
              : xPos +
                Math.max(-distanceToNextItemX * vx, -(containerWidth / 2));

          const yWithVelocity =
            dy < 0
              ? yPos + Math.min(distanceToNextItemY * vy, containerHeight / 2)
              : yPos +
                Math.max(-distanceToNextItemY * vy, -(containerHeight / 2));

          if (!down) {
            // this will do.
            const immX =
              dx < 0 ? xWithVelocity % width > 0 : xWithVelocity < -width;
            const immY =
              dy < 0 ? yWithVelocity % height > 0 : yWithVelocity < -height;
            await next({
              x: immX ? xPos : xWithVelocity % width,
              y: immY ? yPos : yWithVelocity % height,
              immediate: immX,
            });

            return;
          }

          await next({
            x: xPos,
            y: yPos,
            immediate: down,
          });
        },

        config: {
          tension: 150,
          friction: 40,
        },
      });
    },
    [width, height, api, thumbSize, containerWidth, containerHeight]
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
          dragOffset.current = [-x, -y];
          runSpring({ x: -x, y: -y, dx: -dx, dy: -dy, vx, vy, down });
        }
      },
      onWheel: ({
        event,
        offset: [, y],
        direction: [, dy],
        velocity: [vx, vy],
      }) => {
        event.preventDefault();
        if (dy) {
          wheelOffset.current = y;
          runSpring({
            x: dragOffset.current[0] + y,
            y: dragOffset.current[1],
            dx: -dy,
            dy: 0,
            vx,
            vy,
            down: true,
          });
        }
      },
    },
    {
      target: gridRef,
      wheel: { eventOptions: { passive: false } },
      drag: {
        filterTaps: true,
        tapsThreshold: 5,
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
      forceUpdate();
      cleanup();
    },
    [spring.x, spring.y, cleanup]
  );

  return (
    <div ref={rootRef} className="w-full h-full">
      <div
        ref={gridRef}
        className={`relative w-full h-full overflow-hidden touch-none`}
      >
        <a.div
          className="w-full h-full grid-drag-component grid will-change-transform select-none"
          style={{
            gridTemplateColumns: `repeat(${frameCount / 2}, ${width}px)`,
            gridTemplateRows: `repeat(${frameCount / 2}, ${height}px)`,
            // @ts-expect-error - not in csstype
            WebkitUserDrag: "none",
            x: spring.x,
            y: spring.y,
          }}
        >
          {springs.map((_, frameIndex) => (
            <GridContainer
              columns={columns}
              thumbSize={thumbSize}
              root={rootRef as unknown as React.MutableRefObject<HTMLElement>}
              key={frameIndex}
            >
              {allItems.map((item, i) => (
                <GridThumb
                  key={i}
                  html={frameIndex === 0 ? item.style + item.img : item.img}
                  name={item.name}
                  slug={item.slug}
                  id={`${item.slug}-${i}-${frameIndex}`}
                  active={$activeId.get() === `${item.slug}-${i}-${frameIndex}`}
                  onNavigate={onNavigate}
                />
              ))}
            </GridContainer>
          ))}
        </a.div>
      </div>
    </div>
  );
};

const GridContainer = ({
  children,
  columns,
  root,
  thumbSize,
}: React.PropsWithChildren<{
  columns: number;
  thumbSize: number;
  root: React.MutableRefObject<HTMLElement>;
}>) => {
  const [ref, isInView] = useInView({
    rootMargin: `20%`,
    once: true,
    root,
  });

  return (
    <a.div
      ref={ref}
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
        className={`${
          active ? "full-image" : ""
        } grid-thumb hover:opacity-80 transition-all relative outline-none 
        focus:z-10 focus:ring-[rgba(0,0,0,0.66)] focus:ring-offset-2 focus:rounded-sm 
        focus:overflow-hidden focus:ring-offset-white focus:ring-4`}
        href={`/photo/${slug}/`}
        onPointerDown={(e) => {
          e.preventDefault();
        }}
        id={id}
        data-slug={slug}
        onClick={onNavigate(id)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
);

GridThumb.displayName = "GridThumb";
