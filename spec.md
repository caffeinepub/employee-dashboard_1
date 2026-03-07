# Employee Dashboard

## Current State
The sidebar (`Sidebar.tsx`) is a fixed `w-64` aside element. It contains a logo, nav buttons (Overview, Sales Trends, Feedback, Uploads, Employees, Settings), a scrollable employee list, and a footer. The `Dashboard.tsx` renders it beside the main content area in a `flex min-h-screen` container.

## Requested Changes (Diff)

### Add
- A collapse/expand toggle button on the sidebar (e.g. a `ChevronLeft`/`ChevronRight` icon button pinned to the sidebar edge)
- Collapsed state: sidebar shrinks to icon-only width (`w-16`), showing only icons for each nav item with tooltips on hover
- Collapsed state hides: logo text/tagline, nav labels, employee list, and footer text
- In collapsed state the logo area shows only the icon/initials
- A `useState` for `collapsed` inside Sidebar (or lifted to Dashboard if needed)

### Modify
- `Sidebar.tsx`: add `collapsed` state, animate width transition, conditionally render labels/employee list/footer text
- `Dashboard.tsx`: no structural changes needed; sidebar manages its own collapsed state internally
- All nav buttons in collapsed mode show only the icon, centered, with a `Tooltip` showing the label on hover
- The employee list section is hidden when collapsed
- The toggle button is always visible

### Remove
- Nothing removed

## Implementation Plan
1. Add `collapsed` boolean state to `Sidebar.tsx`
2. Animate sidebar width: `w-64` expanded → `w-16` collapsed, with `transition-all duration-200`
3. Add a toggle button (absolutely positioned or at the bottom of the nav) using `ChevronLeft`/`ChevronRight`
4. In collapsed mode: hide all text labels (nav, logo tagline, footer), hide the employee scroll list
5. In collapsed mode: center icons in nav buttons, wrap each in a `Tooltip` showing the label
6. Logo area: show only the image when expanded; show initials/icon when collapsed
7. Settings button at bottom: same icon-only treatment
8. Ensure `data-ocid` markers are applied to the toggle button
