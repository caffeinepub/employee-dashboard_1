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
  // Use Google Sheets as the authoritative employee source for the sidebar
  const { data: employees = [] } = useGoogleSheetEmployees();

  const handleSelectEmployee = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setView("employee");
  }, []);

  const handleBackToOverview = useCallback(() => {
    setView("overview");
    setSelectedEmployee(null);
  }, []);

  const handleSettingsClick = useCallback(() => {
    setView("settings");
    setSelectedEmployee(null);
  }, []);

  const handleSalesTrendsClick = useCallback(() => {
    setView("sales");
    setSelectedEmployee(null);
  }, []);

  const handleEmployeesClick = useCallback(() => {
    setView("employees");
    setSelectedEmployee(null);
  }, []);

  const handleUploadsClick = useCallback(() => {
    setView("uploads");
    setSelectedEmployee(null);
  }, []);

  const handleFeedbackClick = useCallback(() => {
    setView("feedback");
    setSelectedEmployee(null);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        employees={employees}
        selectedEmployee={selectedEmployee}
        currentView={view}
        onSelectEmployee={handleSelectEmployee}
        onOverviewClick={handleBackToOverview}
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
            className="page-enter min-h-full"
          >
            <ErrorBoundary>
              {view === "overview" ? (
                <OverviewPage onSelectEmployee={handleSelectEmployee} />
              ) : view === "employee" && selectedEmployee ? (
                <EmployeeDetailPage
                  employee={selectedEmployee}
                  onBack={handleBackToOverview}
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
