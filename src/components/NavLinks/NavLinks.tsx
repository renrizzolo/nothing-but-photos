import * as React from "react";
import { activeId } from "@/components/Grid/gridStore";
import { getSlugFromItemId } from "@/slug";

const Link = ({
  children,
  ...rest
}: React.PropsWithChildren<{ href: string; onClick?: () => void }>) => (
  <a
    {...rest}
    className="select-none py-1 inline-flex rounded-sm text-sm transition-colors self-start border-b border-b-transparent hover:text-stone-400 dark:hover:bg-stone-800"
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

  const handleKeys = React.useCallback(
    (e: KeyboardEvent) => {
      // simulate browser navigation because Astro doesn't have a
      // router we can use programmatically
      // TODO - https://docs.astro.build/en/guides/view-transitions/#trigger-navigation
      if (e.key === "Escape") {
        handleNavigate("back");
      }
      if (e.key === "ArrowLeft" && prev) {
        handleNavigate("prev");
      }
      if (e.key === "ArrowRight" && next) {
        handleNavigate("next");
      }
    },
    [next, prev]
  );

  const handleCleanup = (clearActiveItem: boolean = false) => {
    document.removeEventListener("keydown", handleKeys);
    clearActiveItem && activeId.set(null);
  };

  React.useEffect(() => {
    // make the current page active
    // cases:
    // - after prev/next navigation
    // - when directly browsing to a /photo/:name route
    // - when using the browser back button
    const id = activeId.get();

    const activeIsCurrent = id !== null && getSlugFromItemId(id) === current;

    if ((current && !activeId.get()) || !activeIsCurrent) {
      activeId.set(current);
    }
  }, [current]);

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeys);

    return () => {
      document.removeEventListener("keydown", handleKeys);
    };
  }, [handleKeys]);

  return (
    <>
      <Link href="/" data-back onClick={() => handleCleanup(false)}>
        Return
      </Link>
      <div className="ml-auto flex gap-4">
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
