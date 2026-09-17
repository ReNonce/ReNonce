/**
 * @title Audit view
 * @notice Right panel's Audit view: the section heading, with the audit itself
 * still to come.
 * @dev The heading is the whole view for now — it fixes the panel's row rule so
 * the column does not read as empty. Whatever the audit turns into (checks,
 * findings, a report) hangs under this row, and the panel may end up a menu
 * rather than a list, so nothing here assumes a shape yet.
 */
import { SectionHeading } from "../../ui/section-heading/SectionHeading";
import "./AuditView.css";

export function AuditView() {
  return (
    <div className="audit-view">
      <div className="audit-view__heading">
        <SectionHeading label="Audit" />
      </div>
    </div>
  );
}
