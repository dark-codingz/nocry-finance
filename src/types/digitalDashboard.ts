// src/types/digitalDashboard.ts
export interface DigitalMonthSummary {
  spendCents: number;
  revenueCents: number;
  roiPct: number | null;      // null quando indeterminado
  cacCents: number | null;    // null quando indeterminado
  ticketCents: number | null; // null quando indeterminado
  hours: number;
  salesCount: number;
}

export interface OfferRankingRow {
  offerId: string;
  offerName: string;
  spendCents: number;
  revenueCents: number;
  profitCents: number;
  roiPct: number | null;
  salesCount: number;
  hours: number;
}

export interface DigitalDashboardData {
  summary: DigitalMonthSummary;
  topOffers: OfferRankingRow[];
}

// Defaults seguros para evitar undefined em runtime
export const EMPTY_DIGITAL_SUMMARY: DigitalMonthSummary = {
  spendCents: 0,
  revenueCents: 0,
  roiPct: null,
  cacCents: null,
  ticketCents: null,
  hours: 0,
  salesCount: 0,
};

export const EMPTY_DIGITAL_DATA: DigitalDashboardData = {
  summary: EMPTY_DIGITAL_SUMMARY,
  topOffers: [],
};
