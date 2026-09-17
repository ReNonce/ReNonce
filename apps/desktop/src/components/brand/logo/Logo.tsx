/**
 * @title ReNonce logo
 * @notice Renders an official ReNonce brand asset for the requested variant.
 * @dev The artwork is white: `icon` is the opaque black square (safe on any
 * background); `icon-only`, `lockup`, and `wordmark` are transparent, so
 * `Logo.css` inverts them to the theme's text colour while the resolved mode is
 * light — a render-time tint, the files are never edited. SVGs are served from
 * `public/assets/brand/`; never recolor, stretch, or swap in JPGs (see the
 * brand README).
 */
import "./Logo.css";

/** The four official brand variants. */
export type LogoVariant = "icon" | "icon-only" | "lockup" | "wordmark";

const BRAND_SRC: Record<LogoVariant, string> = {
  icon: "/assets/brand/ReNonce-Icon-1024x1024/ReNonce-Icon-1024x1024.svg",
  "icon-only": "/assets/brand/ReNonce-Icon-only-1024x1024/ReNonce-Icon-only-1024x1024.svg",
  lockup: "/assets/brand/ReNonce-icon-type/ReNonce-icon-type.svg",
  wordmark: "/assets/brand/ReNonce-Type/ReNonce-Type.svg",
};

export interface LogoProps {
  /** Brand variant to render. */
  variant?: LogoVariant;
  /** Rendered height in pixels; width follows the artwork ratio. */
  size?: number;
  /** Alt text for assistive tech. */
  alt?: string;
  /** Extra classes for layout. */
  className?: string;
}

/**
 * @notice Renders the brand asset as an image.
 * @param props.variant Brand variant (default "icon", the opaque square).
 * @param props.size Rendered height in px; width scales automatically.
 * @param props.alt Alt text, defaults to "ReNonce".
 * @param props.className Extra classes for layout.
 * @return The brand asset as an `<img>` element.
 */
export function Logo({ variant = "icon", size, alt = "ReNonce", className }: LogoProps) {
  const transparent = variant !== "icon";

  return (
    <img
      src={BRAND_SRC[variant]}
      alt={alt}
      height={size}
      className={`logo${transparent ? " logo--transparent" : ""}${className === undefined ? "" : ` ${className}`}`}
      draggable={false}
    />
  );
}
