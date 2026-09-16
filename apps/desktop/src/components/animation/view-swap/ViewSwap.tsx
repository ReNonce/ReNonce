/**
 * @title ViewSwap
 * @notice Base animation primitive: whichever view becomes active widens out of
 * the center, and the view it replaces stays put until it is covered.
 * @dev Every view stays mounted, so its state (panel widths, scroll) survives
 * and returning is instant. Swaps are symmetric — opening and closing show the
 * same motion: the incoming layer takes the top layer and transitions its
 * `clip-path` from a center line to full size, while the outgoing layer holds
 * its size for one duration and then disappears behind it (a 0 ms transition
 * with a delay). Inactive layers are already clipped, so a swap can never flash
 * an un-clipped frame; the reveal is a clip (never a size change), so content
 * does not reflow and no measuring is needed. Inactive layers are `inert`.
 * Timing comes from the shared motion tokens set in App.css
 * (`--motion-duration` / `--motion-easing`).
 */
import type { ReactNode } from "react";
import "./ViewSwap.css";

export interface ViewSwapView {
  /** Stable key used to select the view. */
  key: string;
  /** Content of the view. */
  content: ReactNode;
}

export interface ViewSwapProps {
  /** Key of the view that should be visible. */
  activeKey: string;
  /** Views stacked in the same slot; all stay mounted. */
  views: ViewSwapView[];
}

/**
 * @notice Renders stacked views, widening the active one out of the center.
 * @param props.activeKey Key of the visible view.
 * @param props.views Views to stack.
 * @return The view stack element.
 */
export function ViewSwap({ activeKey, views }: ViewSwapProps) {
  const activeIndex = Math.max(
    views.findIndex((view) => view.key === activeKey),
    0,
  );

  return (
    <div className="view-swap">
      {views.map((view, index) => {
        const active = index === activeIndex;
        return (
          <div
            key={view.key}
            className="view-swap__layer"
            data-active={active}
            inert={!active}
          >
            {view.content}
          </div>
        );
      })}
    </div>
  );
}
