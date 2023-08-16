import * as React from "react";
import { activeId } from "@/components/Grid/gridStore";

const Link = ({
  children,
  ...rest
}: React.PropsWithChildren<{ href: string; onClick?: () => void }>) => (
  <a
    {...rest}
    className="select-none px-3 py-1.5 inline-flex rounded-sm text-sm transition-colors self-start hover:bg-stone-100 dark:hover:bg-stone-800"
  >
    {children}
  </a>
);

export const NavLinks = ({
  prev,
  next,
  current,
}: {
  prev?: string;
  next?: string;
  current: string;
}) => {
  const handleNavigate = (action: "back" | "next" | "prev") => {
    const anchor = document.querySelector<HTMLAnchorElement>(
      `[data-${action}]`
    );
    anchor?.click?.();
  };

  const handleKeys = (e: KeyboardEvent) => {
    // simulate browser navigation because Astro doesn't have a
    // router we can use programmatically
    if (e.key === "Escape") {
      handleNavigate("back");
    }
    if (e.key === "ArrowLeft" && prev) {
      handleNavigate("prev");
    }
    if (e.key === "ArrowRight" && next) {
      handleNavigate("next");
    }
  };

  const handleCleanup = (clearActiveItem: boolean = false) => {
    document.removeEventListener("keydown", handleKeys);
    clearActiveItem && activeId.set(null);
  };

  React.useEffect(() => {
    // make the current page active if it wasn't
    // already set from the grid.
    // cases:
    // - after prev/next navigation
    // - when directly browsing to a /photo/:name route
    if (current && !activeId.get()) {
      activeId.set(current);
    }
  }, [current]);

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeys);
    return () => {
      // this wont't fire
      document.removeEventListener("keydown", handleKeys);
    };
  }, []);

  return (
    <>
      <Link href="/" data-back onClick={() => handleCleanup(false)}>
        Return
      </Link>
      <div className="ml-auto flex gap-2">
        {prev && (
          <Link
            href={`/photo/${prev}/`}
            data-prev
            onClick={() => handleCleanup(true)}
          >
            Prev
          </Link>
        )}
        {next && (
          <Link
            href={`/photo/${next}/`}
            data-next
            onClick={() => handleCleanup(true)}
          >
            Next
          </Link>
        )}
      </div>
    </>
  );
};

export default NavLinks;
