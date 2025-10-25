// /src/lib/supabaseClient.ts

// Propósito: Inicializar e exportar uma instância única do cliente Supabase.
// Este arquivo centraliza a configuração do Supabase, garantindo que a mesma instância
// seja usada em toda a aplicação, seja no lado do servidor ou do cliente.

import { createClient } from '@supabase/supabase-js';

// NOTA SOBRE AS CHAVES DE ACESSO:
// As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
// são públicas por design. Elas são seguras para serem expostas no lado do cliente
// porque o Supabase gerencia a segurança através do Row Level Security (RLS).
//
// Risco: Sem o RLS ativado, a chave anônima (anon key) daria acesso de leitura
// a qualquer tabela pública. A segurança real depende das políticas de RLS
// configuradas no seu banco de dados Supabase.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in the environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

