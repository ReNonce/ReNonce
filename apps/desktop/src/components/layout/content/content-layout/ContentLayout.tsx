/**
 * @title Content layout
 * @notice Three-column content area (left, center, right) with draggable
 * resizers between the columns.
 * @dev Resizing uses pointer capture on the resizer element, so pointer
 * move/up keep firing there even when the pointer leaves it. Widths are
 * clamped so the center column never collapses below `MIN_CENTER_WIDTH`.
 * `RESIZER_WIDTH` must stay in sync with `.content-layout__resizer` in the
 * stylesheet. Panel sizes are not persisted (yet); a hidden sidebar keeps its
 * width, so reopening restores the previous size. Sidebars animate through the
 * `Collapse` primitive; transitions are disabled while a resizer is dragged so
 * the panel tracks the pointer exactly.
 * @return The three-column content element.
 */
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Collapse } from "../../../animation/collapse/Collapse";
import { CenterLayout } from "../center-layout/CenterLayout";
import { LeftLayout } from "../left-layout/LeftLayout";
import { RightLayout } from "../right-layout/RightLayout";
import "./ContentLayout.css";

const MIN_PANEL_WIDTH = 160;
const MIN_CENTER_WIDTH = 320;
const RESIZER_WIDTH = 4;
const DEFAULT_LEFT_WIDTH = 240;
const DEFAULT_RIGHT_WIDTH = 280;

type ResizeSide = "left" | "right";

interface ResizeSession {
  side: ResizeSide;
  startX: number;
  startWidth: number;
}

export interface ContentLayoutProps {
  /** Shows the left panel (state owned by AppLayout). */
  leftSidebarOpen: boolean;
  /** Shows the right panel (state owned by AppLayout). */
  rightSidebarOpen: boolean;
}

/**
 * @notice Renders the three content columns and their resizers.
 * @param props.leftSidebarOpen Left panel visibility.
 * @param props.rightSidebarOpen Right panel visibility.
 * @return The content area element.
 */
export function ContentLayout({ leftSidebarOpen, rightSidebarOpen }: ContentLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ResizeSession | null>(null);
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [resizing, setResizing] = useState<ResizeSide | null>(null);

  useEffect(() => {
    if (resizing === null) {
      return;
    }
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [resizing]);

  const clampPanelWidth = (side: ResizeSide, value: number): number => {
    const container = containerRef.current;
    const otherWidth =
      side === "left" ? (rightSidebarOpen ? rightWidth : 0) : leftSidebarOpen ? leftWidth : 0;
    const resizers = (leftSidebarOpen ? 1 : 0) + (rightSidebarOpen ? 1 : 0);
    const available =
      container === null
        ? Number.POSITIVE_INFINITY
        : container.clientWidth - otherWidth - RESIZER_WIDTH * resizers - MIN_CENTER_WIDTH;
    const max = Math.max(available, MIN_PANEL_WIDTH);
    return Math.min(Math.max(value, MIN_PANEL_WIDTH), max);
  };

  const startResize =
    (side: ResizeSide) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      sessionRef.current = {
        side,
        startX: event.clientX,
        startWidth: side === "left" ? leftWidth : rightWidth,
      };
      setResizing(side);
    };

  const moveResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current;
    if (session === null) {
      return;
    }
    const delta = event.clientX - session.startX;
    const raw = session.side === "left" ? session.startWidth + delta : session.startWidth - delta;
    const width = clampPanelWidth(session.side, raw);
    if (session.side === "left") {
      setLeftWidth(width);
    } else {
      setRightWidth(width);
    }
  };

  const endResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (sessionRef.current === null) {
      return;
    }
    sessionRef.current = null;
    setResizing(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`content-layout${resizing !== null ? " content-layout--resizing" : ""}`}
    >
      <Collapse
        open={leftSidebarOpen}
        size={leftWidth + RESIZER_WIDTH}
        className="content-layout__sidebar"
      >
        <LeftLayout width={leftWidth} />
        <div
          className={`content-layout__resizer${resizing === "left" ? " content-layout__resizer--active" : ""}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize left panel"
          onPointerDown={startResize("left")}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      </Collapse>
      <CenterLayout />
      <Collapse
        open={rightSidebarOpen}
        size={rightWidth + RESIZER_WIDTH}
        className="content-layout__sidebar"
      >
        <div
          className={`content-layout__resizer${resizing === "right" ? " content-layout__resizer--active" : ""}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize right panel"
          onPointerDown={startResize("right")}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
        <RightLayout width={rightWidth} />
      </Collapse>
    </div>
  );
}
