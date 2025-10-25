// /src/services/digital.ts

// Propósito: Centralizar as interações com as tabelas do Supabase
// relacionadas ao módulo "Digital". Este arquivo é agnóstico de UI
// e garante que todas as mutações de dados sigam as regras de negócio.

// REGRAS DE NEGÓCIO E SEGURANÇA:
// 1. RLS (Row Level Security): Todas as funções que inserem dados exigem `userId`
//    para satisfazer a política de `user_id = auth.uid()` no banco de dados.
//    Sem isso, o Supabase retornaria um erro de permissão.
// 2. Valores Monetários: Todos os valores de dinheiro são tratados como `bigint`
//    no banco de dados e `number` (inteiro) aqui, representando centavos para
//    evitar imprecisões de ponto flutuante.
// 3. Formatos de Data:
//    - `sales.date` é `timestamptz` e espera uma string ISO completa.
//    - `spend_events.date` é `date` e espera uma string 'YYYY-MM-DD'.

import type { SupabaseClient } from '@supabase/supabase-js';

// NOTA SOBRE A PASSAGEM DE `userId`:
// Todas as funções que inserem dados recebem `userId` como um argumento explícito.
// Isso é crucial porque a Row Level Security (RLS) está ativada no banco de dados.
// A política de RLS `user_id = auth.uid()` exige que cada linha tenha um `user_id`
// correspondente ao do usuário autenticado para permitir a inserção. Sem isso,
// o banco de dados retornaria um erro de violação de política.

// TODO: Tornar os valores fixos ('Oferta Demo', 15900, etc.) parametrizáveis
// para que estas funções possam ser reutilizadas além da página de seeding.

/**
 * Cria uma nova oferta de demonstração para o usuário especificado.
 * @param supabase - A instância do cliente Supabase.
 * @param userId - O ID do usuário autenticado.
 * @returns O ID da oferta criada.
 */
export const createDemoOffer = async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from('offers')
    .insert({
      user_id: userId,
      name: 'Oferta Demo',
      status: 'active'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao criar oferta demo:', error);
    throw new Error('Não foi possível criar a oferta de demonstração.');
  }
  return data;
};

/**
 * Cria um novo evento de gasto de demonstração para uma oferta.
 * @param supabase - A instância do cliente Supabase.
 * @param userId - O ID do usuário autenticado.
 * @param offerId - O ID da oferta à qual o gasto está associado.
 * @returns O ID do evento de gasto criado.
 */
export const createDemoSpend = async (supabase: SupabaseClient, userId: string, offerId: string) => {
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const { data, error } = await supabase
      .from('spend_events')
      .insert({
        user_id: userId,
        offer_id: offerId,
        date: today,
        amount_cents: 15900,
        note: 'Gasto de demonstração',
      })
      .select('id')
      .single();
  
    if (error) {
        console.error('Erro ao criar gasto demo:', error);
        throw new Error('Não foi possível criar o gasto de demonstração.');
    }
    return data;
  };

/**
 * Cria um novo registro de venda de demonstração para uma oferta.
 * @param supabase - A instância do cliente Supabase.
 * @param userId - O ID do usuário autenticado.
 * @param offerId - O ID da oferta à qual a venda está associada.
 * @returns O ID da venda criada.
 */
export const createDemoSale = async (supabase: SupabaseClient, userId: string, offerId: string) => {
  const orderId = `SEED-${Date.now()}`;
  const { data, error } = await supabase
    .from('sales')
    .insert({
      user_id: userId,
      offer_id: offerId,
      date: new Date().toISOString(),
      amount_cents: 4900,
      status: 'approved',
      order_id: orderId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao criar venda demo:', error);
    throw new Error('Não foi possível criar a venda de demonstração.');
  }
  return data;
};

/**
 * Inicia uma nova sessão de trabalho para uma oferta.
 * @param supabase - A instância do cliente Supabase.
 * @param userId - O ID do usuário autenticado.
 * @param offerId - O ID da oferta.
 * @returns O ID da sessão de trabalho iniciada.
 */
export const startWorkSession = async (supabase: SupabaseClient, userId: string, offerId: string) => {
    const { data, error } = await supabase
        .from('work_sessions')
        .insert({
            user_id: userId,
            offer_id: offerId,
            started_at: new Date().toISOString(),
            note: 'Sessão de trabalho de demonstração'
        })
        .select('id')
        .single();

    if (error) {
        console.error('Erro ao iniciar sessão de trabalho demo:', error);
        throw new Error('Não foi possível iniciar a sessão de trabalho.');
    }
    return data;
}

/**
 * Finaliza uma sessão de trabalho existente.
 * @param supabase - A instância do cliente Supabase.
 * @param sessionId - O ID da sessão a ser finalizada.
 * @returns O ID da sessão de trabalho finalizada.
 */
export const endWorkSession = async (supabase: SupabaseClient, sessionId: string) => {
    const { data, error } = await supabase
        .from('work_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select('id')
        .single();
    
    if (error) {
        console.error('Erro ao finalizar sessão de trabalho demo:', error);
        throw new Error('Não foi possível finalizar a sessão de trabalho.');
    }
    return data;
}

// --- Funções Genéricas para Formulários ---

/**
 * Converte o valor de um input 'datetime-local' para uma string ISO 8601.
 * @param datetimeLocal - O valor do input (ex: '2024-10-23T15:30').
 * @returns A data e hora em formato ISO string (UTC).
 */
export const toISOFromLocal = (datetimeLocal: string): string => {
    if (!datetimeLocal) return '';
    return new Date(datetimeLocal).toISOString();
}

/**
 * Cria um novo registro de venda manual, validando as entradas.
 * Propaga o erro original do Supabase em caso de falha.
 * @param supabase A instância do cliente Supabase.
 * @param userId O ID do usuário autenticado.
 * @param p Os parâmetros da venda.
 */
export async function createSaleManual(
    supabase: SupabaseClient,
    userId: string,
    p: { offerId: string; dateISO: string; amountCents: number; status?: 'approved'|'refunded'|'chargeback' }
){
    if (!userId) throw new Error('Usuário não logado');
    if (!p.offerId) throw new Error('Selecione uma oferta');
    if (!p.dateISO) throw new Error('Data/hora obrigatória');
    if (!Number.isFinite(p.amountCents) || p.amountCents <= 0) throw new Error('Valor inválido');

    const { data, error } = await supabase
      .from('sales')
      .insert({
        user_id: userId,
        offer_id: p.offerId,
        date: p.dateISO,             // timestamptz
        amount_cents: p.amountCents, // bigint
        status: p.status ?? 'approved',
        order_id: `MAN-${Date.now()}`
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Cria um novo evento de gasto manual, validando as entradas.
 * Propaga o erro original do Supabase em caso de falha.
 * @param supabase A instância do cliente Supabase.
 * @param userId O ID do usuário autenticado.
 * @param p Os parâmetros do gasto.
 */
export async function createSpendManual(
    supabase: SupabaseClient,
    userId: string,
    p: { offerId: string; dateYMD: string; amountCents: number; note?: string }
){
    if (!userId) throw new Error('Usuário não logado');
    if (!p.offerId) throw new Error('Selecione uma oferta');
    if (!p.dateYMD) throw new Error('Data obrigatória (YYYY-MM-DD)');
    if (!Number.isFinite(p.amountCents) || p.amountCents <= 0) throw new Error('Valor inválido');

    const { data, error } = await supabase
      .from('spend_events')
      .insert({
        user_id: userId,
        offer_id: p.offerId,
        date: p.dateYMD,             // date
        amount_cents: p.amountCents,
        note: p.note ?? null
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Cria uma nova oferta para o usuário.
 * @param supabase A instância do cliente Supabase.
 * @param userId O ID do usuário autenticado.
 * @param p Os parâmetros da oferta.
 */
export async function createOffer(
    supabase: SupabaseClient,
    userId: string,
    p: { name: string; status?: 'active' | 'paused' }
) {
    if (!userId) throw new Error('Usuário não logado');
    if (!p.name || p.name.trim().length < 2) throw new Error('O nome da oferta é obrigatório');

    const { data, error } = await supabase
        .from('offers')
        .insert({
            user_id: userId,
            name: p.name.trim(),
            status: p.status ?? 'active',
        })
        .select('id')
        .single();
    
    if (error) throw new Error(`Erro ao criar oferta: ${error.message}`);
    return data;
}
