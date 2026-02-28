import { useState } from "react";
import type { Employee } from "../backend.d.ts";
import { useAllEmployees } from "../hooks/useQueries";
import { EmployeeDetailPage } from "./EmployeeDetailPage";
import { OverviewPage } from "./OverviewPage";
import { Sidebar } from "./Sidebar";

export function Dashboard() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [view, setView] = useState<"overview" | "employee">("overview");
  const { data: employees = [] } = useAllEmployees();

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setView("employee");
  };

  const handleBackToOverview = () => {
    setView("overview");
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
      />
      <main className="flex-1 overflow-auto">
        {view === "overview" ? (
          <OverviewPage onSelectEmployee={handleSelectEmployee} />
        ) : selectedEmployee ? (
          <EmployeeDetailPage
            employee={selectedEmployee}
            onBack={handleBackToOverview}
          />
        ) : null}
      </main>
    </div>
  );
}
