/**
 * @title Branch picker
 * @notice Branch chip for repository panels: a plain label when the repository
 * has a single branch, and a dropdown listing every local branch when it has
 * more than one — the checked-out one marked with a dot and not selectable.
 * @dev Shared by the history and the commit panel, so branch switching behaves
 * the same in both. The caller owns the checkout itself and its error handling.
 */
import { useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { GitBranch } from "../../../git/git";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import { ContextMenu } from "../../ui/context-menu/ContextMenu";
import type { ContextMenuItem } from "../../ui/context-menu/ContextMenu";
import "./BranchPicker.css";

export interface BranchPickerProps {
  /** Local branches; one or none renders a plain label. */
  branches: GitBranch[];
  /** Name of the checked-out branch. */
  current: string;
  /** Called with the branch the user picked; never the current one. */
  onSelect: (name: string) => void;
  /** Blocks interaction while a checkout is running. */
  busy?: boolean;
}

export function BranchPicker({
  branches,
  current,
  onSelect,
  busy = false,
}: BranchPickerProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  if (branches.length <= 1) {
    return (
      <span className="branch-picker" title={current}>
        <MaskIcon src="/assets/icons/git_branch.svg" size={14} />
        {current}
      </span>
    );
  }

  const items: ContextMenuItem[] = branches.map((branch) => ({
    id: branch.name,
    label: branch.current ? `• ${branch.name}` : branch.name,
    disabled: branch.current,
    onSelect: () => onSelect(branch.name),
  }));

  const openMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY });
  };

  return (
    <>
      <button
        type="button"
        className="branch-picker branch-picker--action"
        title={`${branches.length} branches — switch branch`}
        aria-haspopup="menu"
        disabled={busy}
        onClick={openMenu}
      >
        <MaskIcon src="/assets/icons/git_branch.svg" size={14} />
        {current}
        <MaskIcon src="/assets/icons/chevron_down.svg" size={10} />
      </button>

      {menu !== null && (
        <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />
      )}
    </>
  );
}
