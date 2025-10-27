// ============================================================================
// LaunchFixedMonth - Lançar Contas Fixas do Mês
// ============================================================================
// PROPÓSITO:
// - Formulário para lançar todas as contas fixas ativas de um mês
// - Operação idempotente: não duplica se já rodou
// - Usa RPC do Supabase (ou fallback para runFixedForMonth)
//
// FUNCIONAMENTO:
// - Usuário seleciona o mês (input type="month")
// - Ao confirmar, chama launchFixedForMonth(monthISO)
// - RPC executa lógica idempotente no banco
// - Atualiza last_run_month das contas fixas
//
// APÓS SALVAR:
// - Toast de sucesso
// - Invalida queries (transactions, finance-kpis)
// - Chama onSuccess (para fechar drawer)
//
// NOTA: Se RPC não existir, retorna mensagem amigável sugerindo
// usar runFixedForMonth existente.
// ============================================================================

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import * as finance from '@/services/finance';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function LaunchFixedMonth({ onSuccess }: { onSuccess?: () => void }) {
  const [monthISO, setMonthISO] = useState<string>(format(new Date(), 'yyyy-MM-01'));
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  // ──────────────────────────────────────────────────────────────────
  // Executar Lançamento
  // ──────────────────────────────────────────────────────────────────
  async function run() {
    setLoading(true);
    try {
      await finance.launchFixedForMonth({ monthISO });

      toast.success('Fixas lançadas com sucesso!');

      // Invalidar queries relevantes
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['finance-kpis'] });
      qc.invalidateQueries({ queryKey: ['recent-finance'] });
      qc.invalidateQueries({ queryKey: ['fixed-bills'] });

      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao lançar fixas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ════════════════════════════════════════════════════════════════
          Seletor de Mês
          ════════════════════════════════════════════════════════════════ */}
      <div>
        <label className="text-sm text-[#CACACA] block mb-1">
          Mês <span className="text-[#9F9D9D]">(dia 01 será usado)</span>
        </label>
        <input
          type="month"
          value={monthISO.slice(0, 7)} // YYYY-MM
          onChange={(e) => setMonthISO(`${e.target.value}-01`)}
          className="w-full rounded-lg bg-transparent border border-white/10 px-3 py-2 text-white focus:border-white/20 transition-colors"
          autoFocus
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Aviso de Segurança (Idempotente)
          ════════════════════════════════════════════════════════════════ */}
      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
        <p className="text-[#CACACA] text-sm">
          ✅ <strong>Operação segura:</strong> Se você já lançou fixas para este mês,
          nada será duplicado. O sistema verifica automaticamente.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          Preview (opcional - pode ser expandido)
          ════════════════════════════════════════════════════════════════
          TODO: Buscar e exibir lista de contas fixas que serão lançadas
          const { data: fixedBills } = useFixedBills();
          const toBeLaunched = fixedBills?.filter(fb => 
            fb.is_active && fb.last_run_month !== monthISO.slice(0,7)
          );
          ════════════════════════════════════════════════════════════════ */}

      {/* ════════════════════════════════════════════════════════════════
          Botão de Confirmação
          ════════════════════════════════════════════════════════════════ */}
      <button
        onClick={run}
        disabled={loading}
        className="w-full rounded-lg bg-[#D4AF37] text-black font-medium py-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {loading ? 'Processando…' : 'Lançar fixas do mês'}
      </button>
    </div>
  );
}


