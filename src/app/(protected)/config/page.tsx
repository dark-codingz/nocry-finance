// /src/app/config/page.tsx
'use client';

// Propósito: Exibir a página de configurações e diagnósticos do sistema.
// Esta página verifica o status da conexão com o Supabase para garantir
// que o ambiente está configurado corretamente.

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

// NOTA SOBRE O HEALTHCHECK SEGURO:
// 1. Conectividade: `supabase.auth.getSession()` funciona como um "ping" seguro.
//    Se a URL e a chave anônima estiverem corretas, ele responderá sem erro,
//    confirmando a comunicação básica.
//
// 2. Acesso a Dados: Uma consulta `HEAD` à tabela `offers` testa se as políticas
//    de RLS estão funcionando como esperado. Uma resposta 401/403 (não autorizado)
//    é um SUCESSO para um usuário anônimo, pois confirma que a RLS está bloqueando
//    o acesso. Consultar tabelas internas do sistema (ex: pg_stat_activity) com
//    a chave anônima é uma prática insegura e deve ser evitada.

type Status = 'pending' | 'success' | 'error';

export default function ConfigPage() {
  const supabase = useSupabaseClient();
  const [connectivity, setConnectivity] = useState<Status>('pending');
  const [dataAccess, setDataAccess] = useState<Status>('pending');
  const [dataAccessMessage, setDataAccessMessage] = useState('Verificando...');

  useEffect(() => {
    const checkConnectivity = async () => {
      const { error } = await supabase.auth.getSession();
      setConnectivity(error ? 'error' : 'success');
    };

    const checkDataAccess = async () => {
      try {
        const { error, status, count } = await supabase
          .from('offers')
          .select('id', { head: true, count: 'exact' });

        if (error && ![401, 403, 406].includes(status)) throw error;

        if ([401, 403].includes(status)) {
            setDataAccessMessage('Bloqueado (RLS ativa)');
        } else {
            setDataAccessMessage(`OK (${count ?? 0} registros)`);
        }
        setDataAccess('success');
      } catch (error) {
        setDataAccess('error');
        setDataAccessMessage('Falhou');
      }
    };

    checkConnectivity();
    checkDataAccess();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const StatusIndicator = ({ status, message }: { status: Status, message?: string }) => {
    if (status === 'success') return <span className="text-green-500 font-bold">{message || 'OK ✓'}</span>;
    if (status === 'error') return <span className="text-red-500 font-bold">{message || 'Falhou ✗'}</span>;
    return <span className="text-gray-500">{message || 'Verificando...'}</span>;
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-2xl font-semibold mb-8">Configurações e Diagnósticos</h1>
      <div className="w-full max-w-md p-6 bg-white border border-gray-200 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-4">Status dos Serviços</h2>
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <span>Conectividade Supabase:</span>
                <StatusIndicator status={connectivity} message={connectivity === 'success' ? 'Conectado ✓' : 'Falhou ✗'} />
            </div>
            <div className="flex justify-between items-center">
                <span>Acesso à tabela 'offers':</span>
                <StatusIndicator status={dataAccess} message={dataAccessMessage} />
            </div>
        </div>
      </div>
      <div className="w-full max-w-md mt-6">
        <button
            onClick={handleSignOut}
            className="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
            Sair (Logout)
        </button>
      </div>
    </main>
  );
}
