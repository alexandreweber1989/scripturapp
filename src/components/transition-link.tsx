"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { navigationTypes } from "@/lib/transitions";

/** `next/link` that tags each navigation with its direction, so pages can animate accordingly. */
export default function Link({ transitionTypes, ...props }: ComponentProps<typeof NextLink>) {
  const pathname = usePathname();
  const href = typeof props.href === "string" ? props.href : (props.href.pathname ?? "");
  return <NextLink transitionTypes={transitionTypes ?? navigationTypes(pathname, href)} {...props} />;
}
