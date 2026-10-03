import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import AdminNavbar from "../components/AdminNavbar";

import AdminDashboard from "./AdminDashboard";
import AdminWorkers from "./AdminWorkers";
import AdminEmployers from "./AdminEmployers";
import AdminTransactions from "./AdminTransactions";
import AdminAIVerification from "./AdminAIVerification";
import AdminFraudDetection from "./AdminFraudDetection";
import AdminTrustSafety from "./AdminTrustSafety";
import AdminJobs from "./AdminJobs";
import AdminApplications from "./AdminApplications";
import AdminNotifications from "./AdminNotifications";
import AdminReports from "./AdminReports";
import AdminSettings from "./AdminSettings";

import "../styles/admin.css";

const PAGE_ROUTES = {
  "Dashboard": "/admin/dashboard",
  "Workers": "/admin/workers",
  "Employers": "/admin/employers",
  "Transactions": "/admin/transactions",
  "AI Verification": "/admin/ai-verification",
  "Fraud Detection": "/admin/fraud-detection",
  "Trust & Safety": "/admin/trust-safety",
  "Jobs": "/admin/jobs",
  "Applications": "/admin/applications",
  "Notifications": "/admin/notifications",
  "Reports & Analytics": "/admin/reports",
  "Settings": "/admin/settings",
};

const getPageFromPath = (path) => {
  if (!path) return "Dashboard";
  const lower = path.toLowerCase();
  if (lower.includes("transactions")) return "Transactions";
  if (lower.includes("workers")) return "Workers";
  if (lower.includes("employers")) return "Employers";
  if (lower.includes("ai-verification") || lower.includes("verification")) return "AI Verification";
  if (lower.includes("fraud")) return "Fraud Detection";
  if (lower.includes("trust") || lower.includes("safety")) return "Trust & Safety";
  if (lower.includes("jobs")) return "Jobs";
  if (lower.includes("applications")) return "Applications";
  if (lower.includes("notifications")) return "Notifications";
  if (lower.includes("reports") || lower.includes("analytics")) return "Reports & Analytics";
  if (lower.includes("settings")) return "Settings";
  return "Dashboard";
};

const AdminLayout = ({ onLogout }) => {
  const [activePage, setActivePage] = useState(() => {
    return getPageFromPath(typeof window !== "undefined" ? window.location.pathname : "");
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [workerFilter, setWorkerFilter] = useState("all");
  const [navParams, setNavParams] = useState({});

  const handleNavigate = (page, params = {}) => {
    if (page === "Workers" && !params.filter) setWorkerFilter("all");
    setNavParams(params);
    setActivePage(page);
    const targetUrl = PAGE_ROUTES[page] || "/admin/dashboard";
    if (typeof window !== "undefined" && window.location.pathname !== targetUrl) {
      window.history.pushState({ page, params }, "", targetUrl);
    }
  };

  const navigateToWorkersWithFilter = (filterType) => {
    setWorkerFilter(filterType);
    handleNavigate("Workers", { filter: filterType });
  };

  useEffect(() => {
    const onPopState = () => {
      const currentPage = getPageFromPath(window.location.pathname);
      setActivePage(currentPage);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <AdminDashboard
            setActivePage={handleNavigate}
            searchQuery={searchQuery}
            navigateToWorkersWithFilter={navigateToWorkersWithFilter}
          />
        );

      case "Workers":
        return (
          <AdminWorkers
            setActivePage={handleNavigate}
            initialFilter={navParams.filter || workerFilter}
            initialWorkerId={navParams.selectedWorkerId}
          />
        );

      case "Employers":
        return (
          <AdminEmployers
            setActivePage={handleNavigate}
            initialEmployerId={navParams.selectedEmployerId}
            initialFilter={navParams.filter}
          />
        );

      case "Transactions":
        return (
          <AdminTransactions
            setActivePage={handleNavigate}
            initialTxnId={navParams.selectedTxnId}
            initialJobId={navParams.selectedJobId}
          />
        );

      case "AI Verification":
        return <AdminAIVerification setActivePage={handleNavigate} />;

      case "Fraud Detection":
        return (
          <AdminFraudDetection
            setActivePage={handleNavigate}
            initialAlertId={navParams.selectedAlertId}
          />
        );

      case "Trust & Safety":
        return (
          <AdminTrustSafety
            setActivePage={handleNavigate}
            initialSection={navParams.section}
            initialIssueId={navParams.selectedIssueId}
          />
        );

      case "Jobs":
        return (
          <AdminJobs
            setActivePage={handleNavigate}
            initialJobId={navParams.selectedJobId}
            initialFilter={navParams.filter}
            initialSearch={navParams.search}
          />
        );

      case "Applications":
        return (
          <AdminApplications
            setActivePage={handleNavigate}
            initialAppId={navParams.selectedAppId}
            initialJobId={navParams.selectedJobId}
            initialStatusFilter={navParams.filter}
            initialSearch={navParams.search}
          />
        );

      case "Notifications":
        return <AdminNotifications setActivePage={handleNavigate} />;

      case "Reports & Analytics":
        return <AdminReports setActivePage={handleNavigate} />;

      case "Settings":
        return <AdminSettings setActivePage={handleNavigate} />;

      default:
        return (
          <AdminDashboard
            setActivePage={handleNavigate}
            searchQuery={searchQuery}
            navigateToWorkersWithFilter={navigateToWorkersWithFilter}
          />
        );
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar
        activePage={activePage}
        setActivePage={handleNavigate}
        onLogout={onLogout}
      />

      <main className="admin-main">
        <AdminNavbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activePage={activePage}
          setActivePage={handleNavigate}
        />

        {renderPage()}
      </main>
    </div>
  );
};

export default AdminLayout;