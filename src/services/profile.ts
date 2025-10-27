// ============================================================================
// Services: Profile
// ============================================================================
// PROPÓSITO:
// - Gerenciar perfil do usuário (username, full_name, avatar_url)
// - getMyProfile: Busca perfil do usuário autenticado
// - upsertMyProfile: Cria/atualiza perfil do usuário autenticado
//
// IMPORTANTE:
// - getMyProfile retorna objeto "em branco" se não existir (não quebra)
// - upsertMyProfile usa onConflict para criar ou atualizar (idempotente)
// - RLS garante que usuário só acessa seu próprio perfil
// ============================================================================

import { createSupabaseBrowser } from '@/lib/supabase/client';

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────
export type Profile = {
  id: string;  // ← Chave primária (UUID do usuário)
  username: string | null;
  full_name?: string | null;
  display_name?: string | null;  // ← Nome para exibição (prioridade)
  avatar_url?: string | null;
};

// ────────────────────────────────────────────────────────────────────────────
// getMyProfile - Busca perfil do usuário autenticado
// ────────────────────────────────────────────────────────────────────────────
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = createSupabaseBrowser();

  // Buscar usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Buscar perfil (maybeSingle não quebra se não existir)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;

  // Se não existir, retorna objeto "em branco" (hook decide criar se quiser)
  return (data ?? {
    id: user.id,
    username: null,
    full_name: null,
    display_name: null,
    avatar_url: null,
  }) as Profile;
}

// ────────────────────────────────────────────────────────────────────────────
// upsertMyProfile - Cria/atualiza perfil do usuário autenticado
// ────────────────────────────────────────────────────────────────────────────
export async function upsertMyProfile(input: {
  username?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}) {
  const supabase = createSupabaseBrowser();

  // Buscar usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // Preparar payload (sempre inclui id = user.id)
  const payload = { id: user.id, ...input };

  // Upsert (cria se não existir, atualiza se existir)
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

