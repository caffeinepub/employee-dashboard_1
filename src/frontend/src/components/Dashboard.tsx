import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Employee } from "../backend.d.ts";
import { useAllEmployees } from "../hooks/useQueries";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import { EmployeesPage } from "./EmployeesPage";
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
  const { data: employees = [] } = useAllEmployees();

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setView("employee");
  };

  const handleBackToOverview = () => {
    setView("overview");
    setSelectedEmployee(null);
  };

  const handleSettingsClick = () => {
    setView("settings");
    setSelectedEmployee(null);
  };

  const handleSalesTrendsClick = () => {
    setView("sales");
    setSelectedEmployee(null);
  };

  const handleEmployeesClick = () => {
    setView("employees");
    setSelectedEmployee(null);
  };

  const handleUploadsClick = () => {
    setView("uploads");
    setSelectedEmployee(null);
  };

  const handleFeedbackClick = () => {
    setView("feedback");
    setSelectedEmployee(null);
  };

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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={
              view === "employee"
                ? `employee-${selectedEmployee?.id?.toString() ?? "none"}`
                : view
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute inset-0 overflow-auto"
          >
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
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
