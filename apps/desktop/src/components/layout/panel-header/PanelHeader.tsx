/**
 * @title Panel header
 * @notice Per-panel top bar: a thin band above a content panel's scrolling
 * area, styled like the app top bar (single bottom border).
 * @dev Every content panel renders its own header, so the bars never span
 * across panels — the resizers keep them apart. Panel titles, tabs, or actions
 * belong in here.
 */
import type { ReactNode } from "react";
import "./PanelHeader.css";

export interface PanelHeaderProps {
  /** Header content (title, tabs, actions, …). */
  children?: ReactNode;
}

/**
 * @notice Renders a panel header.
 * @param props.children Header content.
 * @return The panel header element.
 */
export function PanelHeader({ children }: PanelHeaderProps) {
  return <header className="panel-header">{children}</header>;
}
