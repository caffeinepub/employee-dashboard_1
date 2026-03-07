# Employee Dashboard

## Current State
- Employees page uses a card grid layout (boxes) with minimal info per card
- Employee detail page shows all sections always visible: performance, SWOT, traits, problems, feedback, sales records (table), monthly sales summary (table), attendance records (table)
- No charts/graphs on employee detail
- Sales records and attendance records are always expanded/visible
- EmployeeCard shows name, role, department, status badge only

## Requested Changes (Diff)

### Add
- **Employee List view**: Replace card grid with a table/list showing columns: Avatar, Name, FIPL ID, Region, Joining Date, Sales (total amount), Attendance % (derived from lapses/days off), CES/Efficiency Score (composite of performance metrics), Category badge, Edit/Delete actions
- **Sales trend chart** on employee detail: A line chart showing monthly sales amount trend across the last 3-6 months (month-over-month comparison). Similar to the reference screenshot showing multiple years/periods as lines.
- **Attendance chart** on employee detail: A bar or line chart showing attendance lapses and days off per month.
- **Collapsible/dropdown Sales Records section**: Sales records table is hidden by default, revealed by clicking a dropdown toggle
- **Collapsible/dropdown Attendance Records section**: Attendance records table is hidden by default, revealed by clicking a dropdown toggle

### Modify
- **EmployeesPage**: Change from card grid to a rich table/list layout. Each row shows: avatar+name, FIPL ID, region, joining date, total sales amount (sum from sales records - shown as ₹Xk), attendance % (calculated as present days / working days, approximated from lapses count), efficiency/CES score (average of 5 performance params), FSE category badge, Edit+Delete action buttons
- **EmployeeDetailPage**: 
  - Sales Records section: wrap in a collapsible Accordion/Details component - hidden by default, expanded on click
  - Attendance Records section: wrap in a collapsible Accordion/Details component - hidden by default, expanded on click
  - Monthly Sales Summary table: replace with a line chart showing monthly sales trend
  - Add attendance chart (bar chart) showing lapses and days off per month

### Remove
- Card grid layout from EmployeesPage (replace entirely with list/table)

## Implementation Plan

1. **EmployeesPage.tsx**: Rebuild the employee display as a full-width table with columns matching the reference screenshot (Name+Avatar, FIPL ID, Region, Joining Date, Sales, Attendance %, CES Score, Category, Actions). Use recharts for mini progress bars or inline indicators. Fetch performance data per employee using `useAllEmployees` (already available). For sales totals and attendance, these aren't pre-aggregated in the list endpoint - show placeholder values or compute from available data. Since we don't have per-employee aggregates in the list query, show performance scores as the efficiency indicator.

2. **EmployeeDetailPage.tsx**:
   - Import `recharts` (already available via package.json likely) for LineChart and BarChart
   - Add `salesChartOpen` and `attendanceChartOpen` state (charts visible by default since they're informational)
   - Wrap "Sales Records" section in a collapsible with a toggle button (ChevronDown/Up icon)
   - Wrap "Attendance Records" section in a collapsible with a toggle button
   - Replace "Monthly Sales Summary" table with a LineChart showing monthly sales amounts
   - Add an attendance chart (BarChart) showing lapses and days off per month, also collapsible with the attendance section

3. The charts should be built using recharts which is already installed or needs to be added to package.json.
