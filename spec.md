# Employee Dashboard

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- **Dashboard Overview Page**
  - Active employee count stat card
  - Issues & feedback section with bullet-point highlights per employee/category
  - Employee list/grid with quick-glance status

- **Employee Detail View** (tab/modal when an employee is selected)
  - Personal & role information
  - SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
  - Problems faced
  - Behavioral traits
  - Sales performance metric
  - Operational discipline score
  - Number of reviews received

- **Backend Data Model**
  - Employee record: name, role, department, status (active/inactive), join date
  - Performance data: sales score, operational discipline score, review count
  - SWOT: strengths[], weaknesses[], opportunities[], threats[]
  - Behavioral traits[]
  - Problems faced[]
  - Feedback/issues list with category and description

### Modify
- None

### Remove
- None

## Implementation Plan
1. Generate Motoko backend with Employee, Performance, SWOT, Feedback data models and CRUD queries
2. Build frontend dashboard with:
   - Overview stats (active count, issue highlights)
   - Employee list with selection
   - Employee detail panel/tab with all sub-sections (SWOT, traits, sales, ops, reviews)
3. Seed sample employees with realistic data for demonstration
4. Deploy
