"use client";
import { PHOTOS_PATH } from "@/constants";
import { a, useInView, useSpring } from "@react-spring/web";
import { useGesture } from "@use-gesture/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import * as React from "react";
// @ts-expect-error
import { useViewTransition } from "use-view-transitions/react";
import { useGrid } from "./gridContext";
import ExportedImage from "next-image-export-optimizer";

const visible = 1;
function calcDiff(size: number, thumbSize: number) {
  const count = size / thumbSize;
  const diff = count - Math.floor(count);
  // const pxDiff = Math.round(diff * thumbSize);
  console.log({ count, diff, size });
  return {
    count: Math.floor(count),
    diff: Math.ceil(diff),
    pxDiff: diff * thumbSize,
  };
}

export const Grid = ({ items }: { items: string[] }) => {
  const { initialCoords, setInitialCoords, setActiveId, activeId } = useGrid();

  const gridRef = React.useRef(null);
  const thumbSizeRef = React.useRef(160);
  const [{ width, height, offset, pxDiff }, setDimensions] = React.useState({
    width: 0,
    height: 0,
    offset: 0,
    pxDiff: 0,
  });
  const [extraItemsCount, setExtraItemsCount] = React.useState(0);
  const [columns, setColumns] = React.useState(0);
  const itemsCount = items.length;
  const thumbSize = thumbSizeRef.current;

  React.useLayoutEffect(() => {
    const thumbSize = Math.round(
      window.innerWidth > 1000 ? window.innerWidth / 10 : window.innerWidth / 5
    );
    thumbSizeRef.current = thumbSize;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const {
      diff: extraColumns,
      count: _colCount,
      pxDiff,
    } = calcDiff(vw, thumbSize);
    const { diff: extraColumnshuh, count: desiredRows } = calcDiff(
      vh,
      thumbSize
    );

    // make horizontal plane greater than viewport width
    const colCount = Math.ceil(_colCount * 1.5);
    const actualRows = Math.ceil(itemsCount / colCount);
    const danglingCount =
      Math.ceil(itemsCount / colCount) - itemsCount / colCount;
    const danglingItems = Math.round(danglingCount * colCount);
    const rowsToFill = desiredRows + extraColumnshuh - actualRows;
    const anotherNumber = rowsToFill * colCount + danglingItems + desiredRows;
    console.log({
      extraColumns,
      colCount,
      desiredRows,
      actualRows,
      rowsToFill,
      danglingCount,
      extraColumnshuh,
      danglingItems,
      anotherNumber,
    });
    console.log(
      `${rowsToFill} * ${colCount + extraColumns} + ${danglingItems}`
    );
    const height = Math.max(desiredRows, actualRows) * thumbSize;
    const width = colCount * thumbSize;
    setDimensions({ width, height, offset: colCount - danglingItems, pxDiff });
    setColumns(colCount);
    setExtraItemsCount(anotherNumber);
  }, [itemsCount]);
  console.log({ height, width });

  // clone items if they don't fill a screen
  const allItems = React.useMemo(() => {
    let i1 = items; // shuffle([...items]);
    const multiples = extraItemsCount / itemsCount;
    console.log({ multiples, extraItemsCount, itemsCount });
    // create extra rows
    for (let i = 0; i < Math.ceil(multiples); i++) {
      i1 = i1.concat(items.slice(0, columns));
    }
    // fill in dangling columns
    i1 = i1.concat(items.slice(0, columns - offset));

    return i1;
  }, [items, extraItemsCount, itemsCount, columns, offset]);

  const wheelOffset = React.useRef(0);
  const dragOffset = React.useRef(0);
  const dragOffsetY = React.useRef(0);

  const frameCount = 4;
  const springs = Array.from({ length: frameCount });

  const prev = React.useRef([false, false]);
  const [spring, api2] = useSpring(() => ({
    x: initialCoords[0] || 0,
    y: initialCoords[1] || 0,
  }));

  const flipRef = React.useRef(false);
  const runSprings = React.useCallback(
    (
      y: number,
      dirY: number,
      down: boolean,
      x: number,
      dirX: number,
      vx: number,
      vy: number
    ) => {
      const xPos = (-y % width) + (-y > 0 ? -width : 0);
      const yPos = (-x % height) + (-x > 0 ? -height : 0);

      const adjustedXOffset = xPos - visible * -width;

      flipRef.current = xPos <= -width;

      api2.start({
        to: async (next, cancel) => {
          console.log({
            // y,
            adjustedXOffset,
            x,
            y,
            xPos,
            yPos,
          });
          if (!down) {
            const distanceToNextItemX =
              (Math.abs(xPos / thumbSize) -
                Math.floor(Math.abs(xPos / thumbSize))) *
              thumbSize;

            const distanceToNextItemY =
              (Math.abs(yPos / thumbSize) -
                Math.floor(Math.abs(yPos / thumbSize))) *
              thumbSize;
            console.log({
              velX:
                (dirY < 0 ? distanceToNextItemX : -distanceToNextItemX) * vx,
              m1:
                dirY < 0
                  ? Math.max(-width, xPos + distanceToNextItemX * vx)
                  : Math.max(-width, xPos + -distanceToNextItemX * vx),
              xPos,
              w: -width,
              d: -distanceToNextItemX * vx,
              T: xPos + distanceToNextItemX * vx,
            });
            await next({
              x:
                dirY < 0
                  ? xPos +
                    Math.min(distanceToNextItemX * vx, window.innerWidth / 3)
                  : xPos +
                    Math.max(
                      -distanceToNextItemX * vx,
                      -(window.innerWidth / 3)
                    ),
              y:
                yPos +
                (dirX < 0 ? distanceToNextItemY : -distanceToNextItemY) * vy,
            });
            return;
          }
          await next({
            x: xPos,
            y: yPos,
            immediate: down, // prev.current[0] || prev.current[1],
          });

          // if (prev.current[0] || prev.current[1]) {
          //   //   console.log("::", {
          //   //     x: xPos - -width,
          //   //     y: yPos - -height,
          //   //   });
          //   //   await next({
          //   //     x: prev.current[0] ? xPos - -width : xPos,
          //   //     y: prev.current[1] ? yPos - -height : yPos,
          //   //     immediate: false,
          //   //   });
          //   await next({
          //     x: prev.current[0] ? 0 : xPos,
          //     y: prev.current[1] ? 0 : yPos,
          //   });
          //   decayRef.current = 100;
          //   prev.current = [false, false];
          //   //   return;
          // }
          flipRef.current = false;
        },
        // from: {
        //   x: xPos,
        //   y: yPos ,
        // },
        config: {
          tension: 150,
          friction: 40,
        },
      });
      prev.current = [Math.abs(xPos) > width - 5, Math.abs(yPos) > height - 5];
    },
    [width, height, api2, thumbSize]
  );

  useGesture(
    {
      onDrag: ({
        event,
        down,
        offset: [x, y],
        direction: [dx, dy],
        memo,
        velocity: [vx, vy],
      }) => {
        // event.preventDefault();
        if (dx || dy) {
          dragOffset.current = -x;
          dragOffsetY.current = -y;
          runSprings(-x, -dx, down, -y, -dy, vx, vy);
        }
        // return -x % -width;
      },
      onWheel: ({
        event,
        down,
        offset: [x, y],
        direction: [dx, dy],
        velocity: [vx, vy],
      }) => {
        event.preventDefault();
        if (dy) {
          wheelOffset.current = y;
          runSprings(
            dragOffset.current + y,
            dy,
            true,
            dragOffsetY.current,
            0,
            vx,
            vy
          );
        }
      },
    },
    {
      target: gridRef,
      wheel: { eventOptions: { passive: false } },
      drag: {
        preventScroll: true,
        from: () => [spring.x.get(), spring.y.get()],
      },
    }
  );
  const router = useRouter();
  const [active, setActive] = React.useState("");
  const pathname = usePathname();
  const params = useParams();
  const [, startTransition] = React.useTransition();

  const promiseCallbacks = React.useRef<Record<
    "resolve" | "reject",
    (value: unknown) => void
  > | null>(null);

  // React.useLayoutEffect(() => {
  //   const cbr = promiseCallbacks.current;
  //   return () => {
  //     console.log("path change", pathname);
  //     if (cbr) {
  //       cbr.resolve("");
  //     }
  //   };
  // }, [pathname]);

  console.log({ pathname, params });
  const { startViewTransition } = useViewTransition();

  console.log({ activeId });
  const onNavigate = React.useCallback(
    (item: string, id: string) => () => {
      setInitialCoords([spring.x.get(), spring.y.get()]);
      setActiveId(id);
      // const img = document.getElementById(
      //   id
      // );
      // router.prefetch(`/photo/${item}`);
      // if (img) img.style.viewTransitionName = "full-image";
      startViewTransition(() => {
        // setActive(item);

        router.push(`/photo/${item}`);
        // if (img) img.style.viewTransitionName = "";
      });
    },
    [
      router,
      setActiveId,
      setInitialCoords,
      spring.x,
      spring.y,
      startViewTransition,
    ]
  );

  return (
    <div ref={gridRef} className={`relative`}>
      <div className="select-none pointer-events-none absolute h-screen inset-0 z-10 shadow-[inset_0_0_0_4px_white]" />
      <a.div
        className="grid-drag-component grid will-change-transform touch-none"
        style={{
          gridTemplateColumns: `repeat(${frameCount / 2}, ${width}px)`,
          gridTemplateRows: `repeat(${frameCount / 2}, ${height}px)`,
          // @ts-expect-error
          WebkitUserDrag: "none",
          x: spring.x,
          y: spring.y,
        }}
      >
        {springs.map((_, frameIndex) => (
          <GridContainer
            columns={columns}
            thumbSize={thumbSize}
            key={frameIndex}
          >
            {allItems.map((item, i) => (
              <GridThumb
                key={i}
                item={item}
                id={`${item}-${i}-${frameIndex}`}
                thumbSize={thumbSize}
                activeId={activeId}
                onNavigate={onNavigate}
              />
              // <button
              //   key={i}
              //   className="hover:opacity-90 hover:brightness-110 transition-all relative border-2 border-white"
              //   // style={{
              //   //   ...(active === item
              //   //     ? { gridColumn: "span 5", gridRow: "auto" }
              //   //     : {}),
              //   // }}
              //   onDoubleClick={async () => {
              //     setInitialCoords([spring.x.get(), spring.y.get()]);
              //     setActiveId(`${item}-${i}-${frameIndex}`);
              //     // const img = document.getElementById(
              //     //   `${item}-${i}-${frameIndex}`
              //     // );
              //     // router.prefetch(`/photo/${item}`);
              //     // if (img) img.style.viewTransitionName = "full-image";
              //     startViewTransition(() => {
              //       // setActive(item);

              //       router.push(`/photo/${item}`);
              //       // if (img) img.style.viewTransitionName = "";
              //     });
              //     // const transition = document.startViewTransition(() => {
              //     //   if (img) img.style.viewTransitionName = "full-image";
              //     //   // flushSync(() => {});
              //     //   router.push(`/photo/${item}`);
              //     //   return new Promise((resolve, reject) => {
              //     //     promiseCallbacks.current = {
              //     //       resolve: () => {
              //     //         // if (img) img.style.viewTransitionName = "";
              //     //         resolve("");
              //     //       },
              //     //       reject,
              //     //     };
              //     //   });
              //     // });
              //     // const transition = document.startViewTransition(() => {
              //     //   if (img) img.style.viewTransitionName = "full-image";
              //     //   router.push(`/photo/${item}`);
              //     //   return new Promise((res) => setTimeout(res, 1));
              //     // });

              //     // try {
              //     //   await transition.finished;
              //     // } finally {
              //     //   if (img) img.style.viewTransitionName = "";
              //     // }
              //   }}
              // >
              //   <span
              //     style={{
              //       viewTransitionName:
              //         activeId === `${item}-${i}-${frameIndex}`
              //           ? `full-image`
              //           : undefined,
              //     }}
              //   >
              //     {/* <span className="absolute text-white inset-2">{i}</span> */}
              //     <ExportedImage
              //       // priority={activeId === `${item}-${i}-${frameIndex}`}
              //       // placeholder={
              //       //   activeId === `${item}-${i}-${frameIndex}` ? "empty" : "blur"
              //       // }
              //       placeholder={"empty"}
              //       key={i}
              //       data-img={item}
              //       alt=""
              //       id={`${item}-${i}-${frameIndex}`}
              //       className="aspect-square object-cover select-none transition-all"
              //       style={{
              //         // @ts-expect-error
              //         WebkitUserDrag: "none",

              //         // ...(frameIndex >= frameCount / 2 && i === 0
              //         //   ? {
              //         //       gridColumnStart: offset + 1,
              //         //     }
              //         //   : {}),
              //         // ...(active === item
              //         //   ? { aspectRatio: "auto", width: "100%" }
              //         //   : {}),
              //       }}
              //       width={thumbSize}
              //       height={thumbSize}
              //       src={`${PHOTOS_PATH}/${item}`}
              //     />
              //   </span>
              // </button>
            ))}
          </GridContainer>
        ))}
        {/* <div
        className="grid w-full absolute inset-0"
        style={{
          gridTemplateColumns: `repeat(${columns + 1}, ${thumbSize}px)`,
        }}
      >
       
      </div> */}
      </a.div>
    </div>
  );
};

const GridContainer = ({
  children,
  columns,
  thumbSize,
}: React.PropsWithChildren<{ columns: number; thumbSize: number }>) => {
  // const [ref, inView] = useInView({ rootMargin: "200px" }); // @todo
  // console.log({ inView });
  return (
    <a.div
      // ref={ref}
      className="h-full grid w-full"
      style={{
        // x,
        // y,
        // @ts-expect-error
        WebkitUserDrag: "none",
        gridTemplateColumns: `repeat(${columns}, ${thumbSize}px)`,
        gridAutoRows: "max-content",
        // ...(frameIndex >= frameCount / 2
        //   ? { marginTop: -thumbSize }
        //   : {}),
        // ...(!inView ? { visibility: "hidden" } : {}),
      }}
    >
      {children}
    </a.div>
  );
};

const GridThumb = ({
  onNavigate,
  item,
  id,
  activeId,
  thumbSize,
}: {
  onNavigate: (item: string, id: string) => () => void;
  item: string;
  id: string;
  activeId: string | null;
  thumbSize: number;
}) => {
  const isActive = activeId === id;
  return (
    <button
      className="hover:opacity-90 hover:brightness-110 transition-all relative border-2 border-white"
      // style={{
      //   ...(active === item
      //     ? { gridColumn: "span 5", gridRow: "auto" }
      //     : {}),
      // }}
      onDoubleClick={onNavigate(item, id)}
    >
      <span
        style={{
          viewTransitionName: isActive ? `full-image` : undefined,
        }}
      >
        {/* <span className="absolute text-white inset-2">{i}</span> */}
        <ExportedImage
          // priority={isActive}
          // placeholder={
          //   isActive ? "empty" : "blur"
          // }
          placeholder={"empty"}
          alt=""
          id={id}
          className="aspect-square object-cover select-none transition-all"
          style={{
            // @ts-expect-error
            WebkitUserDrag: "none",

            // ...(frameIndex >= frameCount / 2 && i === 0
            //   ? {
            //       gridColumnStart: offset + 1,
            //     }
            //   : {}),
            // ...(active === item
            //   ? { aspectRatio: "auto", width: "100%" }
            //   : {}),
          }}
          width={thumbSize}
          height={thumbSize}
          src={`${PHOTOS_PATH}/${item}`}
        />
      </span>
    </button>
  );
};

function shuffle(array: any[]) {
  let currentIndex = array.length;
  let randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}
