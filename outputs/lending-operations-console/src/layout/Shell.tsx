import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Bell, ChevronRight, Command, Moon, PanelLeftClose, PanelLeftOpen, RefreshCcw, Search, Settings, Sun } from "lucide-react";
import { Avatar } from "../components/ui";
import { Modal, Popover } from "../components/overlays";
import { navFor, queueCount, roles } from "../lib/roles";
import { formatRwf } from "../lib/format";
import { useDemo } from "../store";
import type { DemoState, StaffRole } from "../types";

const QUICK_COMMANDS = [
  { label: "New application", hint: "Applications", path: "/applications" },
  { label: "Go to collections", hint: "Collections", path: "/collections" },
  { label: "View approvals", hint: "Approvals", path: "/approvals" },
  { label: "Open compliance alerts", hint: "Compliance", path: "/compliance" },
  { label: "Executive dashboard", hint: "Portfolio", path: "/executive" },
];

type Result = { label: string; hint: string; path: string };

function search(query: string, state: DemoState): Result[] {
  const term = query.trim().toLowerCase();
  if (!term) return QUICK_COMMANDS;

  const named = (id: string) => state.customers.find((customer) => customer.id === id)?.name ?? id;
  const matches = (...values: string[]) => values.some((value) => value.toLowerCase().includes(term));

  const results: Result[] = [
    ...state.applications.filter((item) => matches(item.id, named(item.customerId), item.product)).map((item) => ({ label: named(item.customerId), hint: item.id + " · " + item.stage, path: "/applications/" + item.id })),
    ...state.customers.filter((item) => matches(item.id, item.name, item.phone, item.employer)).map((item) => ({ label: item.name, hint: item.id + " · " + item.type, path: "/customers/" + item.id })),
    ...state.loans.filter((item) => matches(item.id, named(item.customerId))).map((item) => ({ label: item.id, hint: named(item.customerId) + " · " + formatRwf(item.principal, true), path: "/loans/" + item.id })),
    ...state.collections.filter((item) => matches(item.id, named(item.customerId), item.loanId)).map((item) => ({ label: named(item.customerId), hint: item.id + " · " + item.daysOverdue + " days overdue", path: "/collections/" + item.id })),
    ...QUICK_COMMANDS.filter((item) => matches(item.label)),
  ];

  return results.slice(0, 8);
}

const CRUMB_LABELS: Record<string, string> = {
  home: "Home", applications: "Applications", customers: "Customers", loans: "Loans", approvals: "Approvals",
  collections: "Collections", finance: "Finance", disbursements: "Disbursements", compliance: "Compliance", executive: "Executive",
};

function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useDemo();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const results = useMemo(() => search(query, state), [query, state]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Modal open={open} onClose={onClose} title="Jump to anything" description="Search people, applications, loans, and queues." wide>
      <div className="cmd-search">
        <Search size={17} />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type a name, ID, or command…"
          onKeyDown={(event) => event.key === "Enter" && results[0] && go(results[0].path)}
        />
      </div>
      <div className="cmd-list">
        {results.map((result) => (
          <button key={result.path + result.label} onClick={() => go(result.path)}>
            <Command size={16} />
            <span>
              <strong>{result.label}</strong>
              <small>{result.hint}</small>
            </span>
            <ArrowRight size={15} />
          </button>
        ))}
        {!results.length && <p className="cmd-empty">No matches for “{query}”.</p>}
      </div>
    </Modal>
  );
}

function Notifications() {
  const { state } = useDemo();
  const items = state.audit.slice(0, 5);
  return (
    <Popover label="Notifications" align="right" trigger={<Bell size={16} />}>
      <div className="popover-head">Recent activity</div>
      {items.map((event) => (
        <div className="popover-row" key={event.id}>
          <strong>{event.action}</strong>
          <small>
            {event.entityId} · {event.at}
          </small>
        </div>
      ))}
    </Popover>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useDemo();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("loc-theme") === "dark");
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("loc-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    addEventListener("keydown", onKeyDown);
    return () => removeEventListener("keydown", onKeyDown);
  }, []);

  const crumbs = location.pathname.split("/").filter(Boolean);
  const items = navFor(state.activeRole);

  return (
    <div className={"shell " + (collapsed ? "collapsed" : "")}>
      <header className="topbar">
        <Link to="/home" className="brand">
          <span className="mark">
            <i /><i /><i /><i />
          </span>
          <strong>Lending Operations Console</strong>
        </Link>
        <div className="top-actions">
          <button className="command" onClick={() => setCommandOpen(true)}>
            <Search size={15} />
            <span>Search applications, customers, loans...</span>
            <kbd>⌘ K</kbd>
          </button>
          <Notifications />
          <button className="icon-btn" onClick={() => setDark(!dark)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Avatar initials="MD" />
          <div className="profile">
            <strong>Marie</strong>
            <span>{state.activeRole}</span>
          </div>
        </div>
      </header>

      <aside className="sidebar">
        <button className="collapse" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          <span>Collapse</span>
        </button>
        <nav>
          {items.map((item) => {
            const count = queueCount(item.id, state);
            return (
              <NavLink key={item.id} to={item.path} className={({ isActive }) => "nav-link " + (isActive ? "active" : "")}>
                <item.icon size={17} />
                <span>{item.label}</span>
                {count > 0 && <small>{count}</small>}
              </NavLink>
            );
          })}
        </nav>
        <div className="side-bottom">
          <label>
            <span>Demo role</span>
            <select
              value={state.activeRole}
              onChange={(event) => {
                dispatch({ type: "SET_ROLE", role: event.target.value as StaffRole });
                toast.success("Now viewing as " + event.target.value);
              }}
            >
              {roles.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>
          <button
            className="nav-link"
            onClick={() => {
              dispatch({ type: "RESET" });
              toast.success("Demo data reset");
            }}
          >
            <RefreshCcw size={17} />
            <span>Reset demo data</span>
          </button>
          <Link className="nav-link" to="/login">
            <Settings size={17} />
            <span>Sign out</span>
          </Link>
        </div>
      </aside>

      <main className="main">
        <div className="crumbs">
          <Link to="/home">Home</Link>
          {crumbs.map((crumb, index) => (
            <span key={index}>
              <ChevronRight size={13} />
              {CRUMB_LABELS[crumb] ?? crumb.replaceAll("-", " ")}
            </span>
          ))}
        </div>
        {children}
      </main>

      <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
