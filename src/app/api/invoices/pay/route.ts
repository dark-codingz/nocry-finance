// ============================================================================
// /api/invoices/pay/route.ts - API para Pagar Faturas de Cartão
// ============================================================================
// PROPÓSITO:
// - Processar pagamentos de faturas de cartão
// - Validar usuário, valores e saldos
// - Criar registro em invoice_payments + transaction (saída de caixa)
// - Retornar novo saldo da fatura
//
// SEGURANÇA:
// - Server-side only
// - Valida autenticação (auth.uid())
// - Valida ownership (card e account pertencem ao usuário)
// - Valida valores (amount > 0, amount <= saldo_fatura)
//
// FLUXO:
// 1. Validar autenticação
// 2. Validar inputs
// 3. Buscar fatura atual (saldo aberto)
// 4. Validar amount <= saldo_fatura
// 5. Criar invoice_payment
// 6. Criar transaction (saída de caixa)
// 7. Retornar sucesso + novo saldo
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────
interface PayInvoiceRequest {
  card_id: string;
  amount_cents: number;
  source_account_id: string;
  paid_at: string; // YYYY-MM-DD
  notes?: string;
}

interface PayInvoiceResponse {
  success: boolean;
  message?: string;
  data?: {
    payment_id: string;
    transaction_id: string;
    new_balance_cents: number;
    total_charges_cents: number;
    total_payments_cents: number;
  };
  error?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/invoices/pay
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse<PayInvoiceResponse>> {
  try {
    // ──────────────────────────────────────────────────────────────────
    // 1. Autenticação
    // ──────────────────────────────────────────────────────────────────
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // 2. Parse e validação do body
    // ──────────────────────────────────────────────────────────────────
    const body: PayInvoiceRequest = await req.json();
    const { card_id, amount_cents, source_account_id, paid_at, notes } = body;

    // Validações básicas
    if (!card_id || !amount_cents || !source_account_id || !paid_at) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: card_id, amount_cents, source_account_id, paid_at' },
        { status: 400 }
      );
    }

    if (amount_cents <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Validar formato de data (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paid_at)) {
      return NextResponse.json(
        { success: false, error: 'Data inválida. Use formato YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // 3. Validar ownership do cartão
    // ──────────────────────────────────────────────────────────────────
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, name')
      .eq('id', card_id)
      .eq('user_id', user.id)
      .single();

    if (cardError || !card) {
      return NextResponse.json(
        { success: false, error: 'Cartão não encontrado ou não pertence ao usuário' },
        { status: 404 }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // 4. Validar ownership da conta de origem
    // ──────────────────────────────────────────────────────────────────
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', source_account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: 'Conta de origem não encontrada ou não pertence ao usuário' },
        { status: 404 }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // 5. Buscar saldo atual da fatura (via view card_invoices_with_payments)
    // ──────────────────────────────────────────────────────────────────
    const { data: invoice, error: invoiceError } = await supabase
      .from('card_invoices_with_payments')
      .select('balance_cents, total_charges_cents, total_payments_cents')
      .eq('card_id', card_id)
      .single();

    if (invoiceError) {
      return NextResponse.json(
        { success: false, error: `Erro ao buscar fatura: ${invoiceError.message}` },
        { status: 500 }
      );
    }

    if (!invoice || invoice.balance_cents <= 0) {
      return NextResponse.json(
        { success: false, error: 'Não há saldo aberto nesta fatura' },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // 6. Validar que amount_cents <= saldo_fatura
    // ──────────────────────────────────────────────────────────────────
    if (amount_cents > invoice.balance_cents) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Valor excede saldo da fatura (R$ ${(invoice.balance_cents / 100).toFixed(2)})` 
        },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // 7. Criar pagamento + transaction (TRANSAÇÃO ATÔMICA)
    // ──────────────────────────────────────────────────────────────────
    
    // 7a. Inserir invoice_payment
    const { data: payment, error: paymentError } = await supabase
      .from('invoice_payments')
      .insert({
        user_id: user.id,
        card_id,
        amount_cents,
        paid_at,
        source_account_id,
        notes: notes || null,
      })
      .select('id')
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, error: `Erro ao criar pagamento: ${paymentError?.message}` },
        { status: 500 }
      );
    }

    // 7b. Criar transaction (saída de caixa)
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'expense',
        account_id: source_account_id,
        card_id: null, // Pagamento NÃO tem card_id (é despesa direta na conta)
        category_id: null, // Sem categoria (ou criar categoria "Pagamento de Fatura")
        amount_cents,
        occurred_at: paid_at,
        description: notes || `Pagamento de fatura - ${card.name}`,
      })
      .select('id')
      .single();

    if (txError || !transaction) {
      // Rollback: deletar invoice_payment criado
      await supabase
        .from('invoice_payments')
        .delete()
        .eq('id', payment.id);

      return NextResponse.json(
        { success: false, error: `Erro ao criar transação: ${txError?.message}` },
        { status: 500 }
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // 8. Calcular novo saldo
    // ──────────────────────────────────────────────────────────────────
    const new_balance_cents = invoice.balance_cents - amount_cents;
    const new_total_payments_cents = (invoice.total_payments_cents || 0) + amount_cents;

    // ──────────────────────────────────────────────────────────────────
    // 9. Sucesso!
    // ──────────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Pagamento realizado com sucesso',
      data: {
        payment_id: payment.id,
        transaction_id: transaction.id,
        new_balance_cents,
        total_charges_cents: invoice.total_charges_cents,
        total_payments_cents: new_total_payments_cents,
      },
    });

  } catch (error: any) {
    console.error('[API /invoices/pay] Erro inesperado:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}

