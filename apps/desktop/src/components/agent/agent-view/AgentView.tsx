/**
 * @title Agent view
 * @notice Left panel's Agent view: the shared search row and section heading —
 * the same components the Files panel uses — over the body where agents will
 * live.
 * @dev The query is local state for now (there is nothing to filter yet), and
 * the body says so instead of showing an empty list. Because the field and the
 * heading are the shared primitives, this panel already reads exactly like
 * Files and only the list body is left to fill in.
 */
import { useState } from "react";
import { SearchField } from "../../ui/search-field/SearchField";
import { SectionHeading } from "../../ui/section-heading/SectionHeading";
import "./AgentView.css";

export function AgentView() {
  const [query, setQuery] = useState("");

  return (
    <div className="agent-view">
      <div className="agent-view__top">
        <SearchField
          value={query}
          onChange={setQuery}
          label="Search agents"
          binding="file.search"
        />
        <div className="agent-view__heading-row">
          <SectionHeading label="Agent" />
        </div>
      </div>

      <p className="agent-view__placeholder">
        {query === "" ? "Agent view coming soon." : `No agents match "${query}".`}
      </p>
    </div>
  );
}
