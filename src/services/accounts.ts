// ============================================================================
// Services: Contas (CRUD)
// ============================================================================
// PROPÓSITO:
// - Gerenciar contas bancárias/carteiras
// - Operações: Listar, Criar, Editar, Arquivar (soft delete)
// - Filtros: Busca por nome
//
// NOTA:
// - Usa soft delete (archived=true) ao invés de hard delete
// - Contas arquivadas são filtradas por padrão
// - RLS garante que usuário só vê suas próprias contas
// ============================================================================

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type Account = {
  id: string;
  name: string;
  notes?: string | null;
  archived?: boolean | null;
  created_at?: string;
};

// ────────────────────────────────────────────────────────────────────────────
// listAccounts - Lista contas (com filtros)
// ────────────────────────────────────────────────────────────────────────────
export async function listAccounts(opts?: { q?: string }) {
  const supabase = createClientComponentClient();

  let query = supabase
    .from('accounts')
    .select('id, name, notes, archived')
    .or('archived.is.null,archived.eq.false') // Ignorar arquivadas
    .order('name');

  // Filtro por nome (busca)
  if (opts?.q) {
    query = query.ilike('name', `%${opts.q}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Account[];
}

// ────────────────────────────────────────────────────────────────────────────
// createAccount - Cria nova conta
// ────────────────────────────────────────────────────────────────────────────
export async function createAccount(input: {
  name: string;
  notes?: string | null;
}) {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      name: input.name,
      notes: input.notes ?? null,
      archived: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Account;
}

// ────────────────────────────────────────────────────────────────────────────
// updateAccount - Atualiza conta existente
// ────────────────────────────────────────────────────────────────────────────
export async function updateAccount(
  id: string,
  input: { name: string; notes?: string | null }
) {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: input.name,
      notes: input.notes ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Account;
}

// ────────────────────────────────────────────────────────────────────────────
// archiveAccount - Arquiva conta (soft delete)
// ────────────────────────────────────────────────────────────────────────────
export async function archiveAccount(id: string) {
  const supabase = createClientComponentClient();

  // Soft delete: marca como arquivada
  const { error } = await supabase
    .from('accounts')
    .update({ archived: true })
    .eq('id', id);

  if (error) throw error;
  return { archived: true };
}

// ────────────────────────────────────────────────────────────────────────────
// NOTA: Hard delete não é recomendado pois contas podem estar vinculadas
// a transações existentes. Use archiveAccount.
// ────────────────────────────────────────────────────────────────────────────



