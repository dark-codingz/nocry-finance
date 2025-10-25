// ============================================================================
// Services: Loans (Empréstimos)
// ============================================================================
// PROPÓSITO:
// - Gerenciar empréstimos (criar, listar, atualizar config)
// - Registrar eventos (desembolso, aporte, pagamento, juros)
// - Aplicar juros automáticos do período via RPC
// - Quitar/fechar empréstimos
// ============================================================================

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoanEventType, LOAN_EVENT_TYPES } from '@/domain/loans/eventTypes';

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────
export type Loan = {
  id: string;
  person_name: string;
  started_at: string; // YYYY-MM-DD
  notes?: string | null;
  interest_mode: 'none' | 'simple' | 'compound_monthly' | 'exact'; // ✅ Inclui 'exact'
  interest_rate_bps: number;
  interest_exact_cents?: number; // ✅ Novo campo (opcional para retro-compatibilidade)
  last_interest_applied_at?: string | null;
  status: 'active' | 'closed' | 'archived';
  created_at?: string;
};

export type LoanSummary = Loan & {
  principal_cents: number; // Total emprestado
  paid_cents: number; // Total recebido
  interest_cents: number; // Total de juros
  balance_cents: number; // Saldo devedor
};

export type LoanEvent = {
  id: string;
  loan_id: string;
  type: LoanEventType; // ✅ Usa tipo centralizado
  amount_cents: number;
  occurred_at: string; // YYYY-MM-DD
  notes?: string | null;
  created_at?: string;
};

export type LoanEventInput = {
  loan_id: string;
  type: LoanEventType; // ✅ Usa tipo centralizado
  amount_cents: number;
  occurred_at: string;
  notes?: string | null;
};

// ────────────────────────────────────────────────────────────────────────────
// listLoans - Listar empréstimos com saldos
// ────────────────────────────────────────────────────────────────────────────
export async function listLoans(filters: {
  status?: 'all' | 'active' | 'closed';
  q?: string;
}) {
  const supabase = createClientComponentClient();

  let query = supabase
    .from('loans_summary')
    .select('*')
    .order('created_at', { ascending: false });

  // Filtro por status
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  // Busca por nome da pessoa
  if (filters.q && filters.q.trim()) {
    query = query.ilike('person_name', `%${filters.q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as LoanSummary[];
}

// ────────────────────────────────────────────────────────────────────────────
// listLoanEvents - Listar eventos/extrato de um empréstimo
// ────────────────────────────────────────────────────────────────────────────
export async function listLoanEvents(loan_id: string) {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase
    .from('loan_events')
    .select('id, loan_id, type, amount_cents, occurred_at, notes, created_at')
    .eq('loan_id', loan_id)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as LoanEvent[];
}

// ────────────────────────────────────────────────────────────────────────────
// createLoan - Criar novo empréstimo
// ────────────────────────────────────────────────────────────────────────────
export async function createLoan(input: {
  person_name: string;
  principal_cents: number;
  started_at: string;
  notes?: string | null;
  interest_mode?: 'none' | 'simple' | 'compound_monthly';
  interest_rate_bps?: number;
}) {
  const supabase = createClientComponentClient();

  // 1) Criar registro do empréstimo
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .insert({
      person_name: input.person_name,
      started_at: input.started_at,
      notes: input.notes ?? null,
      interest_mode: input.interest_mode ?? 'none',
      interest_rate_bps: input.interest_rate_bps ?? 0,
    })
    .select()
    .single();

  if (loanError) throw loanError;

  // 2) Criar evento inicial de desembolso
  const { error: eventError } = await supabase.from('loan_events').insert({
    loan_id: loan.id,
    type: LOAN_EVENT_TYPES.DISBURSEMENT, // ✅ Usa constante
    amount_cents: input.principal_cents,
    occurred_at: input.started_at,
    notes: 'Desembolso inicial',
  });

  if (eventError) throw eventError;

  return loan as Loan;
}

// ────────────────────────────────────────────────────────────────────────────
// topupLoan - Novo aporte (empréstimo adicional)
// ────────────────────────────────────────────────────────────────────────────
export async function topupLoan(input: LoanEventInput) {
  const supabase = createClientComponentClient();
  const { error } = await supabase.from('loan_events').insert(input);
  if (error) throw error;
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// repayLoan - Registrar pagamento recebido
// ────────────────────────────────────────────────────────────────────────────
export async function repayLoan(input: LoanEventInput) {
  const supabase = createClientComponentClient();
  const { error } = await supabase.from('loan_events').insert(input);
  if (error) throw error;
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// addInterest - Adicionar juros manual (ou presente)
// ────────────────────────────────────────────────────────────────────────────
export async function addInterest(input: LoanEventInput) {
  const supabase = createClientComponentClient();
  const { error } = await supabase.from('loan_events').insert(input);
  if (error) throw error;
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// applyInterestPeriod - Aplicar juros automáticos do período via RPC
// ────────────────────────────────────────────────────────────────────────────
export async function applyInterestPeriod(loan_id: string, untilISO: string) {
  const supabase = createClientComponentClient();

  const { error } = await supabase.rpc('apply_monthly_interest', {
    p_loan_id: loan_id,
    p_until: untilISO,
  });

  if (error) throw error;
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// closeLoan - Quitar/fechar empréstimo
// ────────────────────────────────────────────────────────────────────────────
export async function closeLoan(input: { id: string }) {
  const supabase = createClientComponentClient();

  const { error } = await supabase
    .from('loans')
    .update({ status: 'closed' })
    .eq('id', input.id);

  if (error) throw error;
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────────────
// updateLoanConfig - Atualizar configuração do empréstimo
// ────────────────────────────────────────────────────────────────────────────
export async function updateLoanConfig(
  id: string,
  input: Partial<{
    person_name: string;
    notes: string | null;
    interest_mode: 'none' | 'simple' | 'compound_monthly' | 'exact'; // ✅ Inclui 'exact'
    interest_rate_bps: number;
    interest_exact_cents: number; // ✅ Novo campo
  }>
) {
  const supabase = createClientComponentClient();

  const { error } = await supabase.from('loans').update(input).eq('id', id);

  if (error) throw error;
  return { ok: true };
}
