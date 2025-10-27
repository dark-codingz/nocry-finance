// /src/lib/supabaseBrowserClient.ts
'use client';

// Propósito: Wrapper para o cliente Supabase no navegador.
// DEPRECATED: Use diretamente @/lib/supabase/client ao invés deste arquivo.
// Mantido apenas para compatibilidade com código legado.

import { createSupabaseBrowser } from '@/lib/supabase/client';

// Re-exporta o cliente moderno (@supabase/ssr)
export const createSupabaseBrowserClient = createSupabaseBrowser;
