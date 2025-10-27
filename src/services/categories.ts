// ============================================================================
// Services: Categorias (CRUD)
// ============================================================================
// PROPÓSITO:
// - Gerenciar categorias de despesas e receitas
// - Operações: Listar, Criar, Editar, Arquivar (soft delete)
// - Filtros: Tipo (expense/income/all), Busca por nome
//
// NOTA:
// - Usa soft delete (archived=true) ao invés de hard delete
// - Categorias arquivadas são filtradas por padrão
// - RLS garante que usuário só vê suas próprias categorias
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';

export type Category = {
  id: string;
  name: string;
  type: 'expense' | 'income';
  archived?: boolean | null;
  created_at?: string;
};

// ────────────────────────────────────────────────────────────────────────
// listCategories - Lista categorias (com filtros)
// ────────────────────────────────────────────────────────────────────────
export async function listCategories(opts?: {
  q?: string;
  type?: 'expense' | 'income' | 'all';
}) {
  const supabase = createSupabaseBrowser();

  let query = supabase
    .from('categories')
    .select('id, name, type, archived')
    .order('name');

  // Filtro por tipo
  if (opts?.type && opts.type !== 'all') {
    query = query.eq('type', opts.type);
  }

  // Filtro por nome (busca)
  if (opts?.q) {
    query = query.ilike('name', `%${opts.q}%`);
  }

  // Ignorar categorias arquivadas por padrão
  query = query.or('archived.is.null,archived.eq.false');

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as Category[];
}

// ────────────────────────────────────────────────────────────────────────
// createCategory - Cria nova categoria
// ────────────────────────────────────────────────────────────────────────
export async function createCategory(input: {
  name: string;
  type: 'expense' | 'income';
}) {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: input.name,
      type: input.type,
      archived: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

// ────────────────────────────────────────────────────────────────────────
// updateCategory - Atualiza categoria existente
// ────────────────────────────────────────────────────────────────────────
export async function updateCategory(
  id: string,
  input: { name: string; type: 'expense' | 'income' }
) {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase
    .from('categories')
    .update({
      name: input.name,
      type: input.type,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

// ────────────────────────────────────────────────────────────────────────
// archiveCategory - Arquiva categoria (soft delete)
// ────────────────────────────────────────────────────────────────────────
export async function archiveCategory(id: string) {
  const supabase = createSupabaseBrowser();

  // Soft delete: marca como arquivada
  const { error } = await supabase
    .from('categories')
    .update({ archived: true })
    .eq('id', id);

  if (error) throw error;
  return { archived: true };
}

// ────────────────────────────────────────────────────────────────────────
// NOTA: Hard delete não é recomendado pois categorias podem estar
// vinculadas a transações existentes. Use archiveCategory.
// ────────────────────────────────────────────────────────────────────────
