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
import { BorrowerDashboard } from "./pages/borrower/Dashboard";
import { BorrowerApply } from "./pages/borrower/Apply";
import { BorrowerOffer } from "./pages/borrower/Offer";
import { BorrowerDocuments } from "./pages/borrower/Documents";
import { BorrowerLoan } from "./pages/borrower/MyLoan";
import { BorrowerPay } from "./pages/borrower/Pay";
import { BorrowerSupport } from "./pages/borrower/Support";
import { BorrowerProfile } from "./pages/borrower/Profile";

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

          {/* Borrower portal — same state, different audience and device. */}
          <Route path="/my" element={<BorrowerDashboard />} />
          <Route path="/my/apply" element={<BorrowerApply />} />
          <Route path="/my/offer/:id" element={<BorrowerOffer />} />
          <Route path="/my/documents" element={<BorrowerDocuments />} />
          <Route path="/my/loan" element={<BorrowerLoan />} />
          <Route path="/my/pay/:id" element={<BorrowerPay />} />
          <Route path="/my/support" element={<BorrowerSupport />} />
          <Route path="/my/profile" element={<BorrowerProfile />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        <Toaster richColors position="bottom-right" />
      </BrowserRouter>
    </DemoStore>
  );
}
