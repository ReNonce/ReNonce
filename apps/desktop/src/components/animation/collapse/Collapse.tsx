/**
 * @title Collapse
 * @notice Base animation primitive: animates a region open or closed along one
 * axis (sidebar slide, panel reveal) instead of snapping.
 * @dev Content stays mounted and is clipped via `overflow: hidden`, so panel
 * state (scroll position, widths) survives; while closed the region is `inert`
 * for pointer, keyboard, and assistive tech. Timing defaults to the shared
 * motion tokens (App.css); override per instance with `duration` or per
 * stylesheet with `--collapse-easing`. Consumers that resize
 * the region directly (e.g. while dragging a resizer) should disable the
 * transition for the duration of the drag — see
 * `.content-layout--resizing .content-layout__sidebar`.
 */
import type { ReactNode } from "react";
import "./Collapse.css";

export interface CollapseProps {
  /** Whether the region is expanded. */
  open: boolean;
  /** Expanded size in pixels along the collapse axis. */
  size: number;
  /** Axis the region collapses along. */
  orientation?: "horizontal" | "vertical";
  /** Optional animation override in milliseconds (defaults to the motion token). */
  duration?: number;
  /** Extra classes for the region (e.g. to scope transition overrides). */
  className?: string;
  /** The content that gets revealed. */
  children: ReactNode;
}

/**
 * @notice Renders a collapsible region.
 * @param props.open Expanded state.
 * @param props.size Expanded size in pixels.
 * @param props.orientation Collapse axis (default "horizontal").
 * @param props.duration Optional animation override in milliseconds.
 * @param props.className Extra classes for the region.
 * @param props.children Revealed content.
 * @return The collapsing region element.
 */
export function Collapse({
  open,
  size,
  orientation = "horizontal",
  duration,
  className,
  children,
}: CollapseProps) {
  return (
    <div
      className={`collapse collapse--${orientation}${className ? ` ${className}` : ""}`}
      style={{
        width: orientation === "horizontal" ? (open ? size : 0) : undefined,
        height: orientation === "vertical" ? (open ? size : 0) : undefined,
        transitionDuration: duration === undefined ? undefined : `${duration}ms`,
      }}
      inert={!open}
    >
      {children}
    </div>
  );
}
