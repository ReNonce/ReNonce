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
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./Collapse.css";

export interface CollapseProps {
  /** Whether the region is expanded. */
  open: boolean;
  /**
   * Expanded size in pixels along the collapse axis. Omit for content-sized
   * regions (vertical only): the natural height is measured and animated.
   */
  size?: number;
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
 * @param props.size Expanded size in pixels; omit to size to the content.
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
  const isAuto = size === undefined;
  const contentRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);

  // Auto mode: track the content's natural height so opening animates to the
  // real size and later edits (a longer diff, a wrapped line) stay covered.
  useLayoutEffect(() => {
    if (!isAuto) {
      return;
    }
    const node = contentRef.current;
    if (node === null) {
      return;
    }
    const update = () => setMeasured(node.scrollHeight);
    update();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isAuto]);

  const extent = open ? (size ?? measured) : 0;

  return (
    <div
      className={`collapse collapse--${orientation}${isAuto ? " collapse--auto" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={{
        width: orientation === "horizontal" ? extent : undefined,
        height: orientation === "vertical" ? extent : undefined,
        transitionDuration: duration === undefined ? undefined : `${duration}ms`,
      }}
      inert={!open}
    >
      {isAuto ? (
        <div className="collapse__content" ref={contentRef}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
