/**
 * @title Chevron
 * @notice Disclosure arrow for anything that opens and closes in place: points
 * right when closed, rotates a quarter turn when open.
 * @dev Shared by the file tree and the git diff so both rotate identically; the
 * transition uses the global motion easing token.
 */
import "./Chevron.css";

export interface ChevronProps {
  /** Whether the thing it labels is open; rotates the arrow when true. */
  open: boolean;
  /** Arrow box in pixels. */
  size?: number;
}

export function Chevron({ open, size = 12 }: ChevronProps) {
  return (
    <svg
      className={`chevron${open ? " chevron--open" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
