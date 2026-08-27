import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Filter, Search, X } from "lucide-react";
import { Shell } from "../layout/Shell";
import { PageHead, Tabs } from "../components/ui";
import { DataTable } from "../components/DataTable";
import { applicationColumns } from "../components/columns";
import { ApplicationDrawer } from "../components/RecordDrawer";
import { DropdownMenu, MenuItem, MenuLabel, MenuSeparator, Popover } from "../components/overlays";
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
  const [peekId, setPeekId] = useState<string | null>(null);

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
        <DropdownMenu label={"Actions for " + row.id}>
          {(close) => (
            <>
              <MenuLabel>Application</MenuLabel>
              <MenuItem onSelect={() => { close(); setPeekId(row.id); }}>Preview</MenuItem>
              <MenuItem onSelect={() => { close(); navigate("/applications/" + row.id); }}>Open workspace</MenuItem>
              <MenuItem onSelect={() => { close(); navigate("/customers/" + row.customerId); }}>View customer</MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={() => { close(); toast.success("Assigned to Marie"); }}>Assign to me</MenuItem>
              <MenuItem onSelect={() => { close(); navigate("/applications/" + row.id + "?tab=Documents"); }}>Request information</MenuItem>
              <MenuItem onSelect={() => { close(); toast.success("Export queued"); }}>Export</MenuItem>
            </>
          )}
        </DropdownMenu>
      ),
    },
  ]);

  const filters = [risk !== "All" && { label: "Risk: " + risk, clear: () => setRisk("All") }, owner !== "All" && { label: "Owner: " + owner, clear: () => setOwner("All") }].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <Shell>
      <div className="page full">
        <PageHead
          title="Applications"
          description="Review and move applications through verification, credit, and approval."
          actions={<button className="btn primary" onClick={() => toast("Intake is handled in the borrower app, which is out of scope for this prototype")}>New application</button>}
        />

        <Tabs items={TABS} active={tab} onClick={setTab} />

        <div className="filter-bar">
          <div className="searchbox">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search borrower or application ID…" aria-label="Search applications" />
          </div>
          <Popover label="Filter applications" size="sm" trigger={<><Filter size={14} />Filter</>}>
            <MenuLabel>Risk band</MenuLabel>
            {RISKS.map((item) => (
              <button key={item} className={"menu-item " + (risk === item ? "selected" : "")} onClick={() => setRisk(item)}>
                {item}
              </button>
            ))}
            <MenuSeparator />
            <MenuLabel>Owner</MenuLabel>
            {OWNERS.map((item) => (
              <button key={item} className={"menu-item " + (owner === item ? "selected" : "")} onClick={() => setOwner(item)}>
                {item}
              </button>
            ))}
          </Popover>
          {filters.map((filter) => (
            <button className="filter-chip" key={filter.label} onClick={filter.clear}>
              {filter.label}
              <X size={12} />
            </button>
          ))}
          <span className="filter-count-label">{rows.length} of {state.applications.length}</span>
        </div>

        <section className="surface table-surface">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            onRowClick={(row) => setPeekId(row.id)}
            empty={{ title: "No applications match", text: query || filters.length ? "Try clearing the search or filters." : "This queue is empty." }}
          />
        </section>
      </div>

      <ApplicationDrawer id={peekId} onClose={() => setPeekId(null)} />
    </Shell>
  );
}
