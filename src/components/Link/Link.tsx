"use client";
import NextLink, { LinkProps as NextLinkProps } from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
// @ts-expect-error
import { useViewTransition } from "use-view-transitions/react";

type AnchorProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof NextLinkProps
>;

interface LinkProps extends AnchorProps, NextLinkProps {
  children: React.ReactNode;
}

export const Link: React.FC<LinkProps> = ({ onClick, ...props }) => {
  const router = useRouter();
  const { startViewTransition, transitionState } = useViewTransition();

  const [, startTransition] = React.useTransition();
  const transitionRef = React.useRef<boolean>();
  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // doesn't work
    onClick?.(e);
    startViewTransition(() => {
      transitionRef.current = false;
      // startTransition(() => {
      router.push(props.href.toString());
      // });
    });
    transitionRef.current = true;
  };

  return <NextLink {...props} onClick={handleLinkClick} />;
};
