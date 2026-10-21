# Global Care – OPD → IPD Conversion Monitoring System

Modern React + TypeScript web application for monitoring Outpatient to Inpatient conversion rates.

## Hospital
**Global Care** (Canlubang)

## Features
- **Dashboard** – KPIs, conversion rate gauge, top physicians, recent admissions
- **Admission Log** – Full CRUD table with search & filters + Add/Edit modal form
- **Physician Performance Summary** – Auto-calculated conversion rates per physician
- Consistent sidebar with official logo on every page
- Data persisted in browser `localStorage`

## Tech Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)
- date-fns

## How to Run

```bash
cd opd-ipd-monitor
npm install
npm run dev
```

Then open the URL shown in the terminal (usually http://localhost:5173).

## Conversion Rate Formula
```
Conversion Rate (%) = (Actual OPD Admissions ÷ Total OPD Consultations) × 100
```

## Project Structure
```
src/
  components/
    Sidebar.tsx          # Consistent sidebar (logo + Global Care + Canlubang)
    Dashboard.tsx
    AdmissionLog.tsx
    PhysicianSummary.tsx
    AdmissionForm.tsx    # Modal form
  hooks/
    useAdmissions.ts     # State + localStorage + calculations
  types/
    index.ts
```
