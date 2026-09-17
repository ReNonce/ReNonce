/**
 * @title Commit avatar
 * @notice Round author badge for the history list: initials on a tint of one
 * palette color, chosen from the author's email.
 * @dev Offline by design — the hue comes from the theme's ANSI palette, so
 * avatars stay consistent with the active theme and no network request (or CSP
 * allowance) is needed. Swapping in real Gravatar/GitHub photos later only
 * touches this component.
 */
import { avatarSlot, initials } from "../../../git/present";
import "./CommitAvatar.css";

export interface CommitAvatarProps {
  /** Author display name. */
  name: string;
  /** Author email; the color seed, so one person keeps one color. */
  email: string;
  /** Diameter in pixels. */
  size?: number;
}

export function CommitAvatar({ name, email, size = 28 }: CommitAvatarProps) {
  const slot = avatarSlot(email === "" ? name : email);

  return (
    <span
      className="commit-avatar"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `var(--ansi-${slot}-soft)`,
        color: `var(--ansi-${slot})`,
        fontSize: `${Math.round(size * 0.42)}px`,
      }}
      title={`${name} <${email}>`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
