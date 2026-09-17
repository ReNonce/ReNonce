/**
 * @title Folder icon
 * @notice Explorer icon for a folder, picked by folder name and swapped to the
 * open variant while the folder is expanded.
 * @dev Unlike `MaskIcon`, these files ship baked colours — Catppuccin paints each
 * folder kind with its own accent (see `public/assets/icons/folder_icons/`) — so
 * they render as an image and are never recoloured by the theme.
 */
import { folderIconSrc } from "./folder-icons";
import "./FolderIcon.css";

export interface FolderIconProps {
  /** Folder basename shown in the tree, e.g. "src" or ".github". */
  name: string;
  /** Whether the folder is open, which shows the open artwork. */
  expanded?: boolean;
  /** Rendered size in pixels (square). */
  size?: number;
  /** Extra classes for layout. */
  className?: string;
}

/**
 * @notice Renders the folder icon.
 * @param props.name Folder basename used to pick the artwork.
 * @param props.expanded Whether the folder is expanded.
 * @param props.size Rendered size in pixels.
 * @param props.className Extra classes for layout.
 * @return The icon element.
 */
export function FolderIcon({ name, expanded = false, size = 16, className }: FolderIconProps) {
  return (
    <img
      className={`folder-icon${className ? ` ${className}` : ""}`}
      src={folderIconSrc(name, expanded)}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
