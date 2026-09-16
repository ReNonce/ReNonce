/**
 * @title ReNonce logo
 * @notice Renders an official ReNonce brand asset for the requested variant.
 * @dev The artwork is white: `icon` is the opaque black square (safe on any
 * background); `icon-only`, `lockup`, and `wordmark` are transparent and must
 * only appear on dark backgrounds — a dev-only warning fires when a light
 * variant is active. SVGs are served from `public/assets/brand/`; never
 * recolor, stretch, or swap in JPGs (see the brand README).
 */
import { useTheme } from "../../../theme/useTheme";

/** The four official brand variants. */
export type LogoVariant = "icon" | "icon-only" | "lockup" | "wordmark";

const BRAND_SRC: Record<LogoVariant, string> = {
  icon: "/assets/brand/ReNonce-Icon-1024x1024/ReNonce-Icon-1024x1024.svg",
  "icon-only": "/assets/brand/ReNonce-Icon-only-1024x1024/ReNonce-Icon-only-1024x1024.svg",
  lockup: "/assets/brand/ReNonce-icon-type/ReNonce-icon-type.svg",
  wordmark: "/assets/brand/ReNonce-Type/ReNonce-Type.svg",
};

const warnedVariants = new Set<LogoVariant>();

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
  const { theme, resolvedMode } = useTheme();

  // White transparent artwork disappears on light backgrounds; the opaque
  // "icon" variant and dark-only themes are always fine.
  const lightVariantActive = resolvedMode === "light" && theme.variants.light !== undefined;

  if (import.meta.env.DEV && lightVariantActive && variant !== "icon" && !warnedVariants.has(variant)) {
    warnedVariants.add(variant);
    console.warn(
      `[ReNonce] <Logo variant="${variant}"> is white transparent artwork on a light background — ` +
        'use variant="icon" or place it on a dark surface.',
    );
  }

  return (
    <img
      src={BRAND_SRC[variant]}
      alt={alt}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
