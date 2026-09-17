/**
 * @title Docs view
 * @notice Right panel's Docs view: the section heading, with the documentation
 * itself still to come.
 * @dev The heading is the whole view for now — it fixes the panel's row rule so
 * the column does not read as empty. Whatever the docs turn into (a readme, a
 * page list, shortcuts) hangs under this row, and the panel may end up a menu
 * rather than a list, so nothing here assumes a shape yet.
 */
import { SectionHeading } from "../../ui/section-heading/SectionHeading";
import "./DocsView.css";

export function DocsView() {
  return (
    <div className="docs-view">
      <div className="docs-view__heading">
        <SectionHeading label="Docs" />
      </div>
    </div>
  );
}
