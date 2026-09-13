import type { CSSProperties } from "react";

import type { RoughPath } from "@/engine/rough";
import { cn } from "@/lib/utils";

type RoughSvgProps = {
  width: number;
  height: number;
  paths: RoughPath[];
  /** Tailwind stroke utility, e.g. `stroke-stroke` or `stroke-edge-event`. */
  className?: string;
  strokeDasharray?: string;
  style?: CSSProperties;
};

/**
 * Renders pre-generated rough.js outline paths. Geometry comes from `engine/rough.ts`;
 * colors are applied with CSS classes so tokens (and dark mode) never bake into the paths.
 */
export function RoughSvg({
  width,
  height,
  paths,
  className,
  strokeDasharray,
  style,
}: RoughSvgProps) {
  return (
    <svg
      aria-hidden
      width="100%"
      height="100%"
      viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={style}
    >
      {paths.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill="none"
          strokeWidth={path.strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("stroke-current", className)}
        />
      ))}
    </svg>
  );
}
