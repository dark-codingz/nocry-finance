// src/types/financeDashboard.ts

export interface PFMonthSummary {
  totalExpenseCents: number;
  totalIncomeCents: number;
  netCents: number;
  fixedBillsThisMonthCents: number;
  budgetCents: number;
}

export interface InvoiceRow {
  card_id: string;
  card_name: string;
  amount_cents: number;
  cycle_start: string; // ISO date
  cycle_end: string;   // ISO date
  due_date: string;    // ISO date
  days_to_due: number;
}

export interface NextFixedBill {
  name: string;
  amountCents: number;
  dateISO: string; // ISO date (yyyy-mm-dd)
}

export interface FinanceDashboardData {
  summary: PFMonthSummary;
  invoices: InvoiceRow[];
  nextBill: NextFixedBill | null;
}

export const EMPTY_FINANCE_SUMMARY: PFMonthSummary = {
    totalExpenseCents: 0,
    totalIncomeCents: 0,
    netCents: 0,
    fixedBillsThisMonthCents: 0,
    budgetCents: 0,
};

export const EMPTY_FINANCE_DATA: FinanceDashboardData = {
    summary: EMPTY_FINANCE_SUMMARY,
    invoices: [],
    nextBill: null,
};
