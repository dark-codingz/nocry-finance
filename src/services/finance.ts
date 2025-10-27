// /src/services/finance.ts

// Propósito: Centralizar as interações com as tabelas do Supabase
// relacionadas ao módulo de "Finanças Pessoais".
//
// REGRAS DE NEGÓCIO E SEGURANÇA:
// 1. Funções Puras: Todas as funções são puras, recebendo a instância do
//    cliente Supabase e o `userId` como parâmetros. Elas não usam hooks.
// 2. RLS (Row Level Security): Todas as inserções incluem `user_id` para
//    satisfazer as políticas de segurança do banco de dados.
// 3. Valores Monetários: Todos os valores são tratados como inteiros (centavos).
// 4. Validação: Parâmetros são validados no início de cada função para garantir
//    a integridade dos dados antes da inserção.
// 5. Modelagem de Transferência: Uma transferência entre contas é modelada
//    como duas transações separadas (uma de saída, uma de entrada) ligadas
//    pelo mesmo `transfer_group_id`.
// 6. Regra XOR: Despesas e receitas devem estar associadas a uma conta (`account_id`)
//    OU a um cartão (`card_id`), mas nunca a ambos. A validação XOR é feita aqui.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateTransactionInput } from '@/types/transactions';
import { createSupabaseBrowser } from '@/lib/supabase/client';

const emptyToNull = <T extends string | null | undefined>(v: T) =>
  (v === "" || v === undefined ? null : v);

// --- Funções do Onboarding (Mantidas para compatibilidade) ---

/**
 * Cria uma nova conta para o usuário.
 */
export async function createAccount(
  supabase: SupabaseClient,
  userId: string,
  p: { name: string; initialBalanceCents: number }
) {
  if (!userId) throw new Error('Usuário não logado');
  if (!p.name) throw new Error('O nome da conta é obrigatório');
  const { data, error } = await supabase.from('accounts').insert({ user_id: userId, name: p.name, initial_balance_cents: p.initialBalanceCents }).select('id').single();
  if (error) throw new Error(`Erro ao criar conta: ${error.message}`);
  return data;
}

/**
 * Cria um novo cartão de crédito para o usuário.
 */
export async function createCard(
  supabase: SupabaseClient,
  userId: string,
  p: { name: string; limitCents: number; closingDay: number; dueDay: number }
) {
  if (!userId) throw new Error('Usuário não logado');
  if (!p.name) throw new Error('O nome do cartão é obrigatório');
  const { data, error } = await supabase.from('cards').insert({ user_id: userId, name: p.name, limit_cents: p.limitCents, closing_day: p.closingDay, due_day: p.dueDay }).select('id').single();
  if (error) throw new Error(`Erro ao criar cartão: ${error.message}`);
  return data;
}

/**
 * Cria uma despesa fixa (fixed_bill).
 * Regras:
 * - Valores em centavos (bigint).
 * - Exigir exatamente um destino: accountId XOR cardId.
 * - `dayOfMonth` entre 1 e 31.
 * - RLS: sempre enviar `user_id`.
 */
export async function createFixedBill(
  supabase: SupabaseClient,
  userId: string,
  params: {
    name: string;
    amountCents: number;     // sempre > 0 (centavos)
    dayOfMonth: number;      // 1..31
    accountId?: string | null;
    cardId?: string | null;
    isActive?: boolean;      // default true
  }
) {
  const { name, amountCents, dayOfMonth } = params;
  const accountId = emptyToNull(params.accountId);
  const cardId = emptyToNull(params.cardId);
  const isActive = params.isActive ?? true;

  if (!userId) throw new Error("userId obrigatório.");
  if (!name || !name.trim()) throw new Error("Nome da fixa é obrigatório.");
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("Valor inválido (centavos).");
  }
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error("Dia do mês deve estar entre 1 e 31.");
  }
  // XOR: exatamente um destino (conta OU cartão)
  const hasAccount = !!accountId;
  const hasCard = !!cardId;
  if (hasAccount === hasCard) {
    throw new Error("Informe conta OU cartão (apenas um).");
  }

  const { data, error } = await supabase
    .from("fixed_bills")
    .insert([
      {
        user_id: userId,
        name,
        amount_cents: amountCents,
        day_of_month: dayOfMonth,
        account_id: accountId,
        card_id: cardId,
        is_active: isActive,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// --- Novas Funções de CRUD Financeiro ---

type TransactionPayload = {
    occurredAt: string; // Formato 'YYYY-MM-DD'
    amountCents: number;
    accountId?: string;
    cardId?: string;
    categoryId?: string;
    description?: string;
};

/**
 * Cria uma transação genérica (despesa, receita ou transferência).
 * 
 * IMPORTANTE:
 * - input.amount: sempre em centavos (number)
 * - input.occurredAt: Date object (será convertido para YYYY-MM-DD)
 * - Validações XOR são feitas aqui (account vs card)
 * 
 * RETORNA:
 * - Para expense/income: objeto da transação criada
 * - Para transfer: array com 2 transações (origem e destino)
 * 
 * @param supabase - Cliente Supabase
 * @param userId - ID do usuário autenticado
 * @param input - Dados da transação (já validados pelo Zod)
 * @returns Transação(ões) criada(s)
 */
export async function createTransaction(
  supabase: SupabaseClient,
  userId: string,
  input: CreateTransactionInput
) {
  if (!userId) throw new Error('Usuário não logado');
  if (!input.amount || input.amount <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }

  // Converter Date para string YYYY-MM-DD
  const occurredAtStr = input.occurredAt.toISOString().split('T')[0];

  // ═══════════════════════════════════════════════════════════════════
  // CASO 1: Transferência (2 linhas na tabela)
  // ═══════════════════════════════════════════════════════════════════
  if (input.type === 'transfer') {
    if (!input.accountId || !input.transferToAccountId) {
      throw new Error('Transferência requer conta de origem e destino');
    }
    if (input.accountId === input.transferToAccountId) {
      throw new Error('Contas de origem e destino devem ser diferentes');
    }

    // Gerar transfer_group_id único
    const transferGroupId = crypto.randomUUID();

    // Linha 1: Saída da conta de origem
    const { data: outData, error: outError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'transfer',
        occurred_at: occurredAtStr,
        amount_cents: input.amount,
        account_id: input.accountId,
        card_id: null,
        category_id: null,
        description: input.description ?? null,
        transfer_group_id: transferGroupId,
      })
      .select()
      .single();

    if (outError) throw new Error(`Erro ao criar saída da transferência: ${outError.message}`);

    // Linha 2: Entrada na conta de destino
    const { data: inData, error: inError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'transfer',
        occurred_at: occurredAtStr,
        amount_cents: input.amount,
        account_id: input.transferToAccountId,
        card_id: null,
        category_id: null,
        description: input.description ?? null,
        transfer_group_id: transferGroupId,
      })
      .select()
      .single();

    if (inError) throw new Error(`Erro ao criar entrada da transferência: ${inError.message}`);

    return [outData, inData];
  }

  // ═══════════════════════════════════════════════════════════════════
  // CASO 2: Despesa ou Receita (1 linha na tabela)
  // ═══════════════════════════════════════════════════════════════════
  const accountId = emptyToNull(input.accountId);
  const cardId = emptyToNull(input.cardId);

  // Validação XOR: account OU card (um ou outro, não ambos)
  const hasAccount = !!accountId;
  const hasCard = !!cardId;
  if (hasAccount === hasCard) {
    throw new Error('Selecione uma conta OU um cartão (não ambos)');
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: input.type,
      occurred_at: occurredAtStr,
      amount_cents: input.amount,
      account_id: accountId,
      card_id: cardId,
      category_id: emptyToNull(input.categoryId),
      description: input.description ?? null,
      transfer_group_id: null,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar transação: ${error.message}`);

  return data;
}

/**
 * Cria uma nova transação de despesa.
 * Retornamos a linha criada para permitir refresh otimista da UI.
 */
export async function createExpense(supabase: SupabaseClient, userId: string, p: TransactionPayload) {
    if (!userId) throw new Error('Usuário não logado');
    if (!p.occurredAt) throw new Error('A data da despesa é obrigatória.');
    if (!p.amountCents || p.amountCents <= 0) throw new Error('O valor da despesa deve ser positivo.');
    
    const accountId = emptyToNull(p.accountId);
    const cardId = emptyToNull(p.cardId);

    const hasAccount = !!accountId;
    const hasCard = !!cardId;
    if (hasAccount === hasCard) {
        throw new Error("Selecione conta OU cartão (apenas um).");
    }

    const { data, error } = await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            type: 'expense',
            occurred_at: p.occurredAt,
            amount_cents: p.amountCents,
            account_id: accountId,
            card_id: cardId,
            category_id: emptyToNull(p.categoryId),
            description: p.description ?? null,
        })
        .select()
        .single();

    if (error) throw new Error(`Erro ao criar despesa: ${error.message}`);
    return data;
}

/**
 * Cria uma nova transação de receita.
 * Retornamos a linha criada para permitir refresh otimista da UI.
 */
export async function createIncome(supabase: SupabaseClient, userId: string, p: TransactionPayload) {
    if (!userId) throw new Error('Usuário não logado');
    if (!p.occurredAt) throw new Error('A data da receita é obrigatória.');
    if (!p.amountCents || p.amountCents <= 0) throw new Error('O valor da receita deve ser positivo.');

    const accountId = emptyToNull(p.accountId);
    const cardId = emptyToNull(p.cardId);

    if (!accountId) throw new Error('A receita deve estar associada a uma conta.');
    if (cardId) throw new Error('Uma receita não pode ser associada a um cartão de crédito.');

    const { data, error } = await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            type: 'income',
            occurred_at: p.occurredAt,
            amount_cents: p.amountCents,
            account_id: accountId,
            category_id: emptyToNull(p.categoryId),
            description: p.description ?? null,
        })
        .select()
        .single();
        
    if (error) throw new Error(`Erro ao criar receita: ${error.message}`);
    return data;
}

/**
 * Cria uma transferência entre duas contas, gerando duas transações.
 * Retornamos ambas as linhas criadas para permitir refresh otimista da UI.
 */
export async function createTransfer(
    supabase: SupabaseClient, 
    userId: string, 
    p: { fromAccountId: string, toAccountId: string, amountCents: number, occurredAt: string, description?: string }
) {
    if (!userId) throw new Error('Usuário não logado');
    if (!p.amountCents || p.amountCents <= 0) throw new Error('O valor da transferência deve ser positivo.');

    const fromId = emptyToNull(p.fromAccountId);
    const toId = emptyToNull(p.toAccountId);

    if (!fromId || !toId) throw new Error("Informe as duas contas.");
    if (fromId === toId) throw new Error("Contas de origem e destino devem ser diferentes.");

    const transferGroupId = crypto.randomUUID();

    // Inserção da perna de SAÍDA
    const { data: out, error: outError } = await supabase.from('transactions').insert({
        user_id: userId,
        type: 'transfer' as const,
        account_id: fromId,
        amount_cents: p.amountCents,
        occurred_at: p.occurredAt,
        description: p.description,
        transfer_group_id: transferGroupId,
    }).select().single();

    if (outError) throw new Error(`Erro na saída da transferência: ${outError.message}`);

    // Inserção da perna de ENTRADA
    const { data: inn, error: innError } = await supabase.from('transactions').insert({
        user_id: userId,
        type: 'transfer' as const,
        account_id: toId,
        amount_cents: p.amountCents,
        occurred_at: p.occurredAt,
        description: p.description,
        transfer_group_id: transferGroupId,
    }).select().single();
    
    if (innError) {
        // TODO: Idealmente, deveríamos deletar a transação de saída aqui para consistência (ou usar uma transaction)
        throw new Error(`Erro na entrada da transferência: ${innError.message}`);
    }

    return { out, inn };
}

/**
 * Lista as transações de um determinado período para o usuário logado, com filtros.
 */
export async function listMonthTransactions(
    supabase: SupabaseClient,
    userId: string,
    p: { 
        firstDay: string, 
        lastDay: string,
        accountId?: string | null,
        cardId?: string | null,
        categoryId?: string | null,
    }
) {
    if (!userId) throw new Error('Usuário não logado');

    let query = supabase
        .from('transactions')
        .select(`
            id, type, amount_cents, occurred_at, description,
            account_id, card_id, category_id, created_at,
            accounts(name), cards(name), categories(name, type)
        `)
        .eq('user_id', userId)
        .gte('occurred_at', p.firstDay)
        .lte('occurred_at', p.lastDay);

    // Aplica filtros dinamicamente
    if (p.accountId) {
        query = query.eq('account_id', p.accountId);
    }
    if (p.cardId) {
        query = query.eq('card_id', p.cardId);
    }
    if (p.categoryId) {
        query = query.eq('category_id', p.categoryId);
    }

    const { data, error } = await query
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Erro ao listar transações: ${error.message}`);
    
    console.log('[listMonthTransactions] range', p.firstDay, p.lastDay, 'filters', { accountId: p.accountId, cardId: p.cardId, categoryId: p.categoryId }, 'rows', data?.length);
    return data ?? [];
}

// ═══════════════════════════════════════════════════════════════════════
// Funções Simplificadas para Formulários da Carteira
// ═══════════════════════════════════════════════════════════════════════

/**
 * createSimpleTransaction - Versão simplificada para formulários
 * 
 * Cria uma transação (despesa ou receita) sem conversões de tipo.
 * Recebe valores já em centavos e strings ISO.
 * 
 * REGRAS:
 * - account_id XOR card_id (exatamente um deve ser fornecido)
 * - category_id obrigatória
 * - amount_cents > 0
 * - occurred_at em formato ISO (YYYY-MM-DD)
 */
export async function createSimpleTransaction(input: {
  type: 'expense' | 'income';
  amount_cents: number;
  occurred_at: string; // YYYY-MM-DD
  description?: string | null;
  account_id?: string | null;
  card_id?: string | null;
  category_id: string;
}) {
  const supabase = createSupabaseBrowser();
  
  // Validações básicas
  if (input.amount_cents <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }
  if (!input.category_id) {
    throw new Error('Categoria é obrigatória');
  }
  
  // Validação XOR: conta OU cartão
  const hasAccount = !!input.account_id;
  const hasCard = !!input.card_id;
  if (hasAccount === hasCard) {
    throw new Error('Escolha conta OU cartão (não ambos)');
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      type: input.type,
      amount_cents: input.amount_cents,
      occurred_at: input.occurred_at,
      description: input.description || null,
      account_id: input.account_id || null,
      card_id: input.card_id || null,
      category_id: input.category_id,
      transfer_group_id: null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * transfer - Cria uma transferência entre contas
 * 
 * Modela transferência como 2 transações vinculadas por transfer_group_id:
 * - Linha 1: Saída da conta origem (type='expense' para compatibilidade)
 * - Linha 2: Entrada na conta destino (type='income' para compatibilidade)
 * 
 * NOTA: Usa type 'expense'/'income' ao invés de 'transfer' para melhor
 * compatibilidade com os cálculos de KPIs existentes.
 */
export async function transfer(input: {
  from_account_id: string;
  to_account_id: string;
  amount_cents: number;
  occurred_at: string; // YYYY-MM-DD
  description?: string | null;
}) {
  const supabase = createSupabaseBrowser();

  // Validações
  if (input.amount_cents <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }
  if (input.from_account_id === input.to_account_id) {
    throw new Error('Origem e destino devem ser diferentes');
  }

  // Gerar transfer_group_id único
  const transferGroupId = crypto.randomUUID();

  const baseRow = {
    transfer_group_id: transferGroupId,
    occurred_at: input.occurred_at,
    description: input.description || null,
    category_id: null,
    card_id: null,
  };

  // Linha 1: Saída (expense)
  const outRow = {
    ...baseRow,
    type: 'expense' as const,
    amount_cents: input.amount_cents,
    account_id: input.from_account_id,
  };

  // Linha 2: Entrada (income)
  const inRow = {
    ...baseRow,
    type: 'income' as const,
    amount_cents: input.amount_cents,
    account_id: input.to_account_id,
  };

  // Inserir ambas as transações
  const { error } = await supabase
    .from('transactions')
    .insert([outRow, inRow]);

  if (error) throw error;

  return { transfer_group_id: transferGroupId };
}

/**
 * launchFixedForMonth - Lança contas fixas do mês (idempotente)
 * 
 * Executa RPC que lança todas as contas fixas ativas do mês.
 * Operação é idempotente: se já rodou no mês, não duplica.
 * 
 * TODO: Implementar RPC no banco ou usar serviço existente.
 * Por ora, apenas chama RPC que deve existir no Supabase.
 */
export async function launchFixedForMonth(opts: { monthISO: string }) {
  const supabase = createSupabaseBrowser();

  // Tenta chamar RPC (assumindo que existe)
  const { data, error } = await supabase.rpc('launch_fixed_for_month', {
    p_month: opts.monthISO,
  });

  if (error) {
    // Se RPC não existir, retorna mensagem amigável
    if (error.code === '42883') {
      throw new Error(
        'Função launch_fixed_for_month não encontrada no banco. Implementar RPC ou usar runFixedForMonth.'
      );
    }
    throw error;
  }

  return data;
}

// NOTA: Se a RPC não existir, use a função runFixedForMonth existente:
// import { runFixedForMonth } from './fixedBills';
// export async function launchFixedForMonth(opts: { monthISO: string }) {
//   const supabase = createSupabaseBrowser();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error('Usuário não autenticado');
//   return runFixedForMonth(supabase, user.id, opts.monthISO);
// }
