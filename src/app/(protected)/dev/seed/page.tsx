// /src/app/dev/seed/page.tsx
'use client';

// Propósito: Fornecer uma interface de desenvolvimento para popular o banco de dados
// com dados de demonstração rapidamente.
// ESTA PÁGINA NÃO DEVE ESTAR ACESSÍvel EM PRODUÇÃO.
// É protegida por uma variável de ambiente e só funciona para usuários autenticados,
// pois as inserções dependem do `userId` para satisfazer as políticas de RLS.

import { useState } from 'react';
import Link from 'next/link';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import * as digitalService from '@/services/digital';

export default function SeedPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const userId = session?.user.id || null;

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastOfferId, setLastOfferId] = useState<string | null>(null);
  const [activeWorkSession, setActiveWorkSession] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_DEV_TOOLS !== 'true') {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="text-center bg-red-100 p-8 rounded-lg">
                <h1 className="text-xl font-bold">Ferramenta Desativada</h1>
                <p className="mt-2">Esta ferramenta está desativada. Configure NEXT_PUBLIC_DEV_TOOLS="true" para usar.</p>
            </div>
        </main>
    );
  }

  if (!session || !userId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center bg-yellow-100 p-8 rounded-lg">
          <h1 className="text-xl font-bold">Acesso Negado</h1>
          <p className="mt-2">Você precisa estar logado para usar as ferramentas de desenvolvimento.</p>
          <Link href="/login" className="text-blue-500 hover:underline mt-4 inline-block">
            Ir para a página de Login
          </Link>
        </div>
      </main>
    );
  }

  const handleServiceCall = async (serviceFn: () => Promise<any>, successMessage: string) => {
    setFeedback(null);
    try {
      const result = await serviceFn();
      setFeedback({ type: 'success', message: `${successMessage}\n${JSON.stringify(result, null, 2)}` });
      return result;
    } catch (error: any) {
      setFeedback({ type: 'error', message: `Falha: ${error.message}` });
    }
  };

  const handleCreateOffer = async () => {
    // A RLS exige que `userId` seja passado para a inserção. Se a sessão
    // não existir, o Supabase retornaria um erro 401/403.
    if (!userId) { alert('Sessão de usuário não encontrada!'); return; }
    const result = await handleServiceCall(() => digitalService.createDemoOffer(supabase, userId), 'Oferta criada com sucesso!');
    if (result) setLastOfferId(result.id);
  };
  
  const handleCreateSpend = async () => {
    if (!userId || !lastOfferId) { alert('Crie uma oferta primeiro e garanta que está logado!'); return; }
    await handleServiceCall(() => digitalService.createDemoSpend(supabase, userId, lastOfferId), 'Gasto registrado!');
  };

  const handleCreateSale = async () => {
    if (!userId || !lastOfferId) { alert('Crie uma oferta primeiro e garanta que está logado!'); return; }
    await handleServiceCall(() => digitalService.createDemoSale(supabase, userId, lastOfferId), 'Venda registrada!');
  };

  const handleToggleWorkSession = async () => {
    if (!userId || !lastOfferId) { alert('Crie uma oferta primeiro e garanta que está logado!'); return; }
    if(activeWorkSession) {
        // `endWorkSession` não precisa de `userId` pois a RLS do update usa o `id` da sessão,
        // e a política garante que só o dono pode alterá-la.
        await handleServiceCall(() => digitalService.endWorkSession(supabase, activeWorkSession), 'Sessão finalizada!');
        setActiveWorkSession(null);
    } else {
        const result = await handleServiceCall(() => digitalService.startWorkSession(supabase, userId, lastOfferId), 'Sessão iniciada!');
        if (result) setActiveWorkSession(result.id);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Ferramentas de Dev (Seed)</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={handleCreateOffer} className="p-4 bg-blue-500 text-white rounded hover:bg-blue-600">1. Criar Oferta Demo</button>
          <button onClick={handleCreateSpend} className="p-4 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400" disabled={!lastOfferId}>2. Registrar Gasto Demo</button>
          <button onClick={handleCreateSale} className="p-4 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400" disabled={!lastOfferId}>3. Registrar Venda Demo</button>
          <button onClick={handleToggleWorkSession} className={`p-4 text-white rounded disabled:bg-gray-400 ${activeWorkSession ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`} disabled={!lastOfferId}>
            {activeWorkSession ? '4. Encerrar Sessão' : '4. Iniciar Sessão'}
          </button>
        </div>

        {feedback && (
          <div className={`mt-8 p-4 rounded ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <h2 className="font-bold">{feedback.type === 'success' ? 'Sucesso!' : 'Erro!'}</h2>
            <pre className="text-sm mt-2 whitespace-pre-wrap">{feedback.message}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
