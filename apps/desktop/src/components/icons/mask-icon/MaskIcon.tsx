/**
 * @title Mask icon
 * @notice Renders a collected SVG icon from `public/assets/icons/` in the
 * current text color.
 * @dev Library icons carry baked colors (black or light grays), so they cannot
 * be dropped in as `<img>` on theme surfaces. Using the file as a CSS mask
 * paints it with `currentColor` instead — the SVG stays a runtime asset (see
 * `public/assets/README.md`) and the icon follows the active theme.
 */
import type { CSSProperties } from "react";
import "./MaskIcon.css";

export interface MaskIconProps {
  /** Path under `public/`, e.g. "/assets/icons/agent.svg". */
  src: string;
  /** Rendered size in pixels (square). */
  size?: number;
  /** Extra classes for layout. */
  className?: string;
}

/**
 * @notice Renders the masked icon.
 * @param props.src Icon path used as the mask.
 * @param props.size Rendered size in pixels.
 * @param props.className Extra classes for layout.
 * @return The icon element.
 */
export function MaskIcon({ src, size = 16, className }: MaskIconProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
  };

  return (
    <span
      className={`mask-icon${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}
