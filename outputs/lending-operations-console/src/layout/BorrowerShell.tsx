import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { CircleUser, FileText, Home, LifeBuoy, Moon, Sun, WalletCards } from "lucide-react";
import { Select } from "../components/Select";
import { useDemo } from "../store";

const TABS = [
  { path: "/my", label: "Home", icon: Home, end: true },
  { path: "/my/loan", label: "My loan", icon: WalletCards, end: false },
  { path: "/my/documents", label: "Documents", icon: FileText, end: false },
  { path: "/my/support", label: "Support", icon: LifeBuoy, end: false },
  { path: "/my/profile", label: "Profile", icon: CircleUser, end: false },
];

/**
 * The borrower portal. Deliberately a different shell from the operations
 * console: borrowers are on phones, so this is mobile-first with a bottom tab
 * bar, and it never shows internal vocabulary — no risk grades, no
 * classifications, no officer names.
 */
export function BorrowerShell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useDemo();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem("loc-theme") === "dark");
  const customer = state.customers.find((item) => item.id === state.borrowerId);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("loc-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="borrower">
      <header className="borrower-top">
        <Link to="/my" className="brand">
          <span className="mark">
            <i /><i /><i /><i />
          </span>
          <strong>Lending</strong>
        </Link>
        <div className="borrower-top-actions">
          <label className="borrower-switch">
            <span>Viewing as</span>
            <Select
              value={state.borrowerId}
              label="Borrower"
              options={state.customers.slice(0, 6).map((item) => ({ value: item.id, label: item.name }))}
              onChange={(id) => dispatch({ type: "SET_BORROWER", customerId: id })}
            />
          </label>
          <button className="icon-btn" onClick={() => setDark(!dark)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="icon-btn" onClick={() => navigate("/login")} aria-label="Sign out">
            <CircleUser size={16} />
          </button>
        </div>
      </header>

      <nav className="borrower-tabs" aria-label="Sections">
        {TABS.map((tab) => (
          <NavLink key={tab.path} to={tab.path} end={tab.end} className={({ isActive }) => "borrower-tab " + (isActive ? "active" : "")}>
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="borrower-main">
        <div className="borrower-inner">
          {customer && <p className="borrower-greeting">Hello, {customer.name.split(" ")[0]}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
