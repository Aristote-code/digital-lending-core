import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { DemoStore } from "./store";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Applications } from "./pages/Applications";
import { ApplicationWorkspace } from "./pages/application/Workspace";
import { Customer } from "./pages/Customer";
import { Approvals } from "./pages/Approvals";
import { Loans } from "./pages/Loans";
import { LoanDetail } from "./pages/LoanDetail";
import { Disbursements } from "./pages/Disbursements";
import { Collections } from "./pages/Collections";
import { CollectionCase } from "./pages/CollectionCase";
import { Compliance } from "./pages/Compliance";
import { Exceptions } from "./pages/Exceptions";
import { Complaints } from "./pages/Complaints";
import { Policy } from "./pages/Policy";
import { Executive } from "./pages/Executive";
import { HrVerification } from "./pages/HrVerification";

export function App() {
  return (
    <DemoStore>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/applications/:id" element={<ApplicationWorkspace />} />
          <Route path="/customers/:id" element={<Customer />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/loans/:id" element={<LoanDetail />} />
          <Route path="/finance/disbursements" element={<Disbursements />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<CollectionCase />} />
          <Route path="/compliance" element={<Compliance />} />
        <Route path="/exceptions" element={<Exceptions />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/policy" element={<Policy />} />
          <Route path="/executive" element={<Executive />} />
          <Route path="/verify-employment/:token" element={<HrVerification />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        <Toaster richColors position="bottom-right" />
      </BrowserRouter>
    </DemoStore>
  );
}
