import { memo, useCallback, useState } from "react";
import type { Employee } from "../backend.d.ts";
import { useGoogleSheetEmployees } from "../hooks/useGoogleSheetData";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import { EmployeesPage } from "./EmployeesPage";
import { ErrorBoundary } from "./ErrorBoundary";
import { FeedbackPage } from "./FeedbackPage";
import { OverviewPage } from "./OverviewPage";
import { SalesTrendsPage } from "./SalesTrendsPage";
import { SettingsPage } from "./SettingsPage";
import { Sidebar } from "./Sidebar";
import { UploadsPage } from "./UploadsPage";

export type View =
  | "overview"
  | "employee"
  | "settings"
  | "sales"
  | "employees"
  | "uploads"
  | "feedback";

export function Dashboard() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [view, setView] = useState<View>("overview");
  const [viewHistory, setViewHistory] = useState<View[]>([]);

  // Use Google Sheets as the authoritative employee source for the sidebar
  const { data: employees = [] } = useGoogleSheetEmployees();

  const navigateTo = useCallback(
    (newView: View, employee?: Employee) => {
      setViewHistory((prev) => [...prev, view]);
      setView(newView);
      if (employee) setSelectedEmployee(employee);
    },
    [view],
  );

  const handleBack = useCallback(() => {
    if (viewHistory.length === 0) {
      setView("overview");
      return;
    }
    const prev = viewHistory[viewHistory.length - 1];
    setViewHistory((h) => h.slice(0, -1));
    setView(prev);
  }, [viewHistory]);

  const handleSelectEmployee = useCallback(
    (employee: Employee) => {
      navigateTo("employee", employee);
    },
    [navigateTo],
  );

  const handleOverviewClick = useCallback(() => {
    setViewHistory([]);
    setView("overview");
  }, []);

  const handleSettingsClick = useCallback(
    () => navigateTo("settings"),
    [navigateTo],
  );
  const handleSalesTrendsClick = useCallback(
    () => navigateTo("sales"),
    [navigateTo],
  );
  const handleEmployeesClick = useCallback(
    () => navigateTo("employees"),
    [navigateTo],
  );
  const handleUploadsClick = useCallback(
    () => navigateTo("uploads"),
    [navigateTo],
  );
  const handleFeedbackClick = useCallback(
    () => navigateTo("feedback"),
    [navigateTo],
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar
        employees={employees}
        selectedEmployee={selectedEmployee}
        currentView={view}
        onSelectEmployee={handleSelectEmployee}
        onOverviewClick={handleOverviewClick}
        onSettingsClick={handleSettingsClick}
        onSalesTrendsClick={handleSalesTrendsClick}
        onEmployeesClick={handleEmployeesClick}
        onUploadsClick={handleUploadsClick}
        onFeedbackClick={handleFeedbackClick}
      />
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-auto">
          <div
            key={
              view === "employee"
                ? `employee-${selectedEmployee?.fiplCode ?? "none"}`
                : view
            }
            className="min-h-full page-transition"
          >
            <ErrorBoundary>
              {view === "overview" ? (
                <OverviewPage onSelectEmployee={handleSelectEmployee} />
              ) : view === "employee" && selectedEmployee ? (
                <EmployeeDetailPage
                  employee={selectedEmployee}
                  onBack={handleBack}
                />
              ) : view === "settings" ? (
                <SettingsPage />
              ) : view === "sales" ? (
                <SalesTrendsPage />
              ) : view === "employees" ? (
                <EmployeesPage onSelectEmployee={handleSelectEmployee} />
              ) : view === "uploads" ? (
                <UploadsPage />
              ) : view === "feedback" ? (
                <FeedbackPage />
              ) : null}
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}

export default memo(Dashboard);
