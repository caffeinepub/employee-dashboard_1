# Employee Dashboard

## Current State

A full-stack employee dashboard with:
- Overview page: employee grid with active count, feedback highlights
- Employee detail page: SWOT, performance scores, behavioral traits, problems, feedback
- Add Employee form (full detail), Bulk Upload via CSV, Add Feedback form
- Delete employee (with confirmation dialog) on card and detail page
- Inline status change (Active / Inactive / On Hold) on card and detail page
- Backend functions: initialize, getAllEmployees, getActiveEmployeeCount, getEmployeeDetails, getAllFeedback, getFeedbackByEmployee, addEmployee, addFeedback, bulkAddEmployees, deleteEmployee, updateEmployeeStatus

## Requested Changes (Diff)

### Add
- `updateEmployee(id, input: EmployeeFullInput): async Bool` backend function to update all fields of an existing employee (info, performance, SWOT, traits, problems)
- "Edit" button on the employee detail page that opens a pre-filled form (same structure as Add Employee) with all current values. On save, call `updateEmployee` and refresh the detail view.

### Modify
- Employee detail page: add an Edit button (pencil icon or "Edit Employee" label) that opens a modal/drawer with all editable fields pre-populated
- The edit form should cover: name, role, department, joinDate, avatar initials, salesScore, opsScore, reviewCount, strengths, weaknesses, opportunities, threats, traits, problems

### Remove
- Nothing removed

## Implementation Plan

1. Add `updateEmployee(id: EmployeeId, input: EmployeeFullInput): async Bool` to `main.mo` — updates employee info, performance, swot, traits, problems for the given id. Returns false if not found.
2. Regenerate `backend.d.ts` with the new function.
3. Frontend: on the employee detail page, add an "Edit Employee" button. Clicking it opens a modal or slide-over pre-filled with all current employee data. On submit, call `updateEmployee` and reload the detail.
