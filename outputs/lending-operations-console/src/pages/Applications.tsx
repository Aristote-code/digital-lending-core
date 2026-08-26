import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Filter, MoreHorizontal, Search } from "lucide-react";
import { Shell } from "../layout/Shell";
import { PageHead, Tabs } from "../components/ui";
import { DataTable } from "../components/DataTable";
import { applicationColumns } from "../components/columns";
import { Popover } from "../components/overlays";
import { useDemo } from "../store";
import type { ApplicationStage } from "../types";

const TABS = ["All", "New", "Verification", "Credit Review", "Approval", "Completed"] as const;
const OWNERS = ["All", "Marie", "Christine", "Jean-Paul"];
const RISKS = ["All", "Low", "Medium", "High"];

function inTab(stage: ApplicationStage, tab: string) {
  if (tab === "All") return true;
  if (tab === "Completed") return ["Approved", "Rejected", "Disbursed"].includes(stage);
  return stage === tab;
}

export function Applications() {
  const { state } = useDemo();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<string>("All");
  const [risk, setRisk] = useState("All");
  const [owner, setOwner] = useState("All");

  const rows = state.applications.filter((application) => {
    const customer = state.customers.find((item) => item.id === application.customerId);
    const haystack = (customer?.name ?? "") + application.id + application.product;
    return (
      haystack.toLowerCase().includes(query.toLowerCase()) &&
      (risk === "All" || risk === application.risk) &&
      (owner === "All" || owner === application.assigned) &&
      inTab(application.stage, tab)
    );
  });

  const columns = applicationColumns(state, [
    {
      key: "menu",
      header: "",
      render: (row) => (
        <Popover align="right" label="Row actions" trigger={<MoreHorizontal size={16} />}>
          {(close) => (
            <>
              <button className="popover-item" onClick={() => { close(); navigate("/applications/" + row.id); }}>View application</button>
              <button className="popover-item" onClick={() => { close(); navigate("/customers/" + row.customerId); }}>View customer</button>
              <button className="popover-item" onClick={() => { close(); toast.success("Assigned to Marie"); }}>Assign to me</button>
              <button className="popover-item" onClick={() => { close(); navigate("/applications/" + row.id + "?tab=Documents"); }}>Request information</button>
              <button className="popover-item" onClick={() => { close(); toast.success("Export queued"); }}>Export</button>
            </>
          )}
        </Popover>
      ),
    },
  ]);

  const activeFilters = [risk !== "All" && risk, owner !== "All" && owner].filter(Boolean).length;

  return (
    <Shell>
      <div className="page full">
        <PageHead
          title="Applications"
          description="Review and move applications through verification, credit, and approval."
          actions={<button className="btn primary" onClick={() => toast("Intake form is out of scope for this prototype")}>New application</button>}
        />
        <div className="toolbar">
          <div className="searchbox">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search borrower or application ID…" aria-label="Search applications" />
          </div>
          <Popover
            label="Filters"
            trigger={
              <>
                <Filter size={14} />
                Filters
                {activeFilters > 0 && <em className="filter-count">{activeFilters}</em>}
              </>
            }
          >
            <div className="popover-head">Risk band</div>
            {RISKS.map((item) => (
              <button key={item} className={"popover-item " + (risk === item ? "selected" : "")} onClick={() => setRisk(item)}>
                {item}
              </button>
            ))}
            <div className="popover-head">Owner</div>
            {OWNERS.map((item) => (
              <button key={item} className={"popover-item " + (owner === item ? "selected" : "")} onClick={() => setOwner(item)}>
                {item}
              </button>
            ))}
          </Popover>
          {activeFilters > 0 && (
            <button className="btn small" onClick={() => { setRisk("All"); setOwner("All"); }}>
              Clear filters
            </button>
          )}
          <span>{rows.length} results</span>
        </div>
        <Tabs items={TABS} active={tab} onClick={setTab} />
        <section className="surface table-surface">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            empty={{ title: "No applications match", text: query || activeFilters ? "Try clearing the search or filters." : "This queue is empty." }}
          />
        </section>
      </div>
    </Shell>
  );
}
