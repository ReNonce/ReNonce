/**
 * @title Section heading
 * @notice Panel section label: uppercase, letter-spaced, muted, with a hairline
 * running from the text to the right edge of its row.
 * @dev Shared so every panel's section label reads exactly the same — the Files,
 * history, and agent panels all use it.
 */
import "./SectionHeading.css";

export interface SectionHeadingProps {
  /** Label text; the styling uppercases it. */
  label: string;
}

export function SectionHeading({ label }: SectionHeadingProps) {
  return (
    <h2 className="section-heading">
      {label}
      <span className="section-heading__divider" aria-hidden="true" />
    </h2>
  );
}
