"use client";
import React, { useEffect } from "react";
// @ts-expect-error
import { useViewTransition } from "use-view-transitions/react";

export const TransitionProvder = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { startViewTransition } = useViewTransition();

  useEffect(() => {
    window.onpopstate = function () {
      startViewTransition(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
};
