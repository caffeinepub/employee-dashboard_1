# Employee Dashboard

## Current State

- AppSettingsContext persists branding/labels to localStorage on every `updateLabel()` call.
- OverviewPage shows two employee directories: one with first 10 active employees (raw `String(emp.joinDate)` — broken), and a second directory filtered by top-performer FIPL codes.
- EmployeeDetailPage sales chart includes records with `saleDate === 0n` (resulting in year 1970 appearing in chart filters and data).
- FeedbackPage CallingRecordsTab and CustomerReviewsTab have month/year filters but no employee name/FIPL filter.
- EditEmployeeModal, AddEmployeeModal, BulkUploadModal, and TopPerformersSection upload dialog have no password gate.

## Requested Changes (Diff)

### Add
- Password gate component (`PasswordGateDialog`) — a reusable modal that prompts for password (`FIPL@2016`) before allowing access. Once entered correctly, permission is cached in sessionStorage so user isn't asked again on same session.
- Employee filter dropdown (by FSE name/FIPL code) to CallingRecordsTab in FeedbackPage.
- Employee filter dropdown (by FSE name/FIPL code) to CustomerReviewsTab in FeedbackPage.

### Modify
- **OverviewPage.tsx**: Fix joining date display in the employee directory table — replace `String(emp.joinDate)` with a proper date format function that converts BigInt nanosecond timestamp → DD-MM-YYYY string.
- **OverviewPage.tsx**: Remove the second employee directory section (the one filtered by top-performer FIPL codes, ~lines 527–605). Keep only the first directory of 10 active employees.
- **EmployeeDetailPage.tsx**: Filter out any `SalesRecord` where `saleDate === 0n` or parsed year ≤ 1971 before building `salesChartData` and `lastMonthStats`. This removes year-1970 entries from charts and summaries.
- **EditEmployeeModal.tsx**: Wrap the edit button trigger (or the modal open action) with the PasswordGateDialog — user must enter `FIPL@2016` before the edit form opens.
- **AddEmployeeModal.tsx**: Wrap the add employee trigger with PasswordGateDialog.
- **BulkUploadModal.tsx**: Show PasswordGateDialog popup when user tries to open the bulk upload section.
- **TopPerformersSection.tsx**: Wrap the upload/edit action with PasswordGateDialog.
- **AppSettingsContext.tsx**: Confirm `saveSettings()` is called on every mutation (already the case; verify and add any missing calls for edge cases).

### Remove
- Second employee directory on OverviewPage (the grid of EmployeeCards filtered to match top-performer FIPL codes).

## Implementation Plan

1. Create a reusable `PasswordGateDialog` component that:
   - Takes `onSuccess` callback and `children` (the trigger element).
   - Shows a password input dialog on click.
   - Checks password === `FIPL@2016`.
   - On success, calls `onSuccess()` and caches approval in sessionStorage (key: `dash_pw_unlocked`) so it doesn't re-prompt in the same browser session.
   - Shows error message on wrong password.

2. In `OverviewPage.tsx`:
   - Create a `formatJoinDateFromBigInt(val: bigint | string | undefined): string` helper that converts BigInt nanoseconds → Date → `DD-MM-YYYY`.
   - Replace `String(emp.joinDate)` with this helper in the directory table.
   - Delete the second directory section (EmployeeCard grid filtered by top-performer FIPL codes).

3. In `EmployeeDetailPage.tsx`:
   - Before building `salesChartData`, filter `salesRecords` to exclude entries where `saleDate === 0n` or `new Date(Number(saleDate)/1_000_000).getFullYear() <= 1971`.

4. In `FeedbackPage.tsx`:
   - In `CallingRecordsTab`: add an employee dropdown filter (populated from unique FSE names in the records). Wire it to filter displayed records.
   - In `CustomerReviewsTab`: add an employee dropdown filter similarly.

5. Wrap open triggers with `PasswordGateDialog` in:
   - `EditEmployeeModal` (the edit icon/button that opens it)
   - `AddEmployeeModal` (the "Add Employee" button)
   - `BulkUploadModal` (the bulk upload button/trigger)
   - `TopPerformersSection` upload button
