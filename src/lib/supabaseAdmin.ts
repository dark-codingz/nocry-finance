// /src/lib/supabaseAdmin.ts

// Propósito: Criar uma instância do cliente Supabase para uso EXCLUSIVO no lado
// do servidor (Server-Side), utilizando a chave de serviço (service_role).

import { createClient } from '@supabase/supabase-js'

// NOTA DE SEGURANÇA CRÍTICA:
// 1. Chave de Serviço (Service Role Key):
//    - Esta chave bypassa TODAS as políticas de Row Level Security (RLS).
//    - Concede acesso total de administrador ao seu banco de dados.
//
// 2. Uso Exclusivo no Servidor:
//    - A chave `SUPABASE_SERVICE_ROLE` NUNCA deve ser exposta no lado do cliente.
//    - Este cliente só pode ser usado em ambientes server-side (rotas de API,
//      Server Actions, etc.), onde o `process.env` não é acessível pelo navegador.
//
// 3. Responsabilidade de Segurança:
//    - Ao usar este cliente, a aplicação se torna responsável por garantir a
//      segurança e a lógica de permissão. Por exemplo, em uma rota de webhook,
//      a validação da assinatura do webhook é o que garante que a operação é legítima.
//      Em um sistema multi-usuário, você seria responsável por filtrar os dados
//      pelo `user_id` correto manualmente.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase URL or Service Role Key are not defined in environment variables.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);



