import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { homeFor } from "../lib/roles";
import { useDemo } from "../store";
import type { StaffRole } from "../types";

const ENTRY_ROLES: StaffRole[] = ["Loan Officer", "Credit Manager", "Finance", "Collections", "Compliance", "CEO"];

export function Login() {
  const navigate = useNavigate();
  const { dispatch } = useDemo();

  const enterAs = (role: StaffRole) => {
    dispatch({ type: "SET_ROLE", role });
    navigate(homeFor(role));
  };

  return (
    <div className="login">
      <section>
        <div className="login-logo">
          <span className="mark">
            <i /><i /><i /><i />
          </span>
          <div>
            <strong>Lending Operations Console</strong>
            <small>Secure staff access</small>
          </div>
        </div>
        <h1>Welcome back</h1>
        <p>Sign in to manage lending operations and customer cases.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate("/home");
          }}
        >
          <label>
            Email
            <input defaultValue="marie@lending.rw" />
          </label>
          <label>
            Password
            <input type="password" defaultValue="prototype" />
          </label>
          <button className="btn primary">
            Sign in <ArrowRight size={15} />
          </button>
        </form>
        <div className="or">
          <span>or continue as</span>
        </div>
        <div className="role-grid">
          {ENTRY_ROLES.map((role) => (
            <button key={role} onClick={() => enterAs(role)}>
              {role}
            </button>
          ))}
        </div>
        <small className="prototype">Prototype environment · No real customer data</small>
      </section>
    </div>
  );
}
