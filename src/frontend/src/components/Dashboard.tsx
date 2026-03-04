import { useState } from "react";
import type { Employee } from "../backend.d.ts";
import { useAllEmployees } from "../hooks/useQueries";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import { EmployeesPage } from "./EmployeesPage";
import { OverviewPage } from "./OverviewPage";
import { SalesTrendsPage } from "./SalesTrendsPage";
import { SettingsPage } from "./SettingsPage";
import { Sidebar } from "./Sidebar";

export type View = "overview" | "employee" | "settings" | "sales" | "employees";

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
      />
      <main className="flex-1 overflow-auto">
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
        ) : null}
      </main>
    </div>
  );
}
