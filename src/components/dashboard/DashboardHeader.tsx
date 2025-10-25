// src/components/dashboard/DashboardHeader.tsx
// ============================================================================
// Header Estático do Dashboard
// ============================================================================
//
// ESTRUTURA:
// - Header estático no topo (rola com a página)
// - Título + subtítulo à esquerda
// - Filtros De/Até à direita (chips com glass)
//
// SINCRONIZAÇÃO:
// - Lê from/to da URL ao montar (via searchParams)
// - Atualiza URL quando store muda (via router.replace)
// - Store Zustand (useDateRange) é a fonte da verdade
//
// RESPONSIVIDADE:
// - Filtros de data ficam responsivos (flex-wrap)
// - Layout limpo e simples
//
// FUTURO:
// - Adicionar dropdown com presets (Hoje, Esta Semana, etc.)
// - Avatar do usuário à direita
// - Notificações/atalhos
// ============================================================================

'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import { useDateRange } from '@/stores/dateRange';
import { useMyProfile } from '@/hooks/useMyProfile';
import type { Profile } from '@/services/profile';
import { Calendar, ArrowRight } from 'lucide-react';

export default function DashboardHeader() {
  const { from, to, setRange } = useDateRange();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const { data: profile, error, isLoading } = useMyProfile();

  // ─────────────────────────────────────────────────────────────────────
  // Nome de exibição: username > full_name > display_name > email > "Membro"
  // Com fallback robusto para evitar undefined
  // ─────────────────────────────────────────────────────────────────────
  const displayName =
    profile?.username?.trim() ||
    profile?.full_name?.trim() ||
    profile?.display_name?.trim() ||
    session?.user?.email?.split('@')[0] ||
    'Membro';

  // ─────────────────────────────────────────────────────────────────────
  // ⚠️ HIDRATAÇÃO DA URL REMOVIDA
  // ─────────────────────────────────────────────────────────────────────
  // Agora é feita por DateRangeBootstrapper (componente separado)
  // que hidrata o store da URL uma única vez e limpa os parâmetros.
  //
  // Benefícios:
  // - URL limpa (sem ?from=...&to=...)
  // - Filtro funcional (via store com persist)
  // - Permite compartilhar links com filtros (hidrata na primeira montagem)
  // ─────────────────────────────────────────────────────────────────────
  
  // ─────────────────────────────────────────────────────────────────────
  // ⚠️ SINCRONIZAÇÃO COM URL REMOVIDA
  // ─────────────────────────────────────────────────────────────────────
  // Filtro agora vive APENAS no store Zustand (com persist localStorage).
  // Mudanças nos filtros atualizam apenas o store, não a URL.
  // ─────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 pt-5 pb-4">
      <div className="flex items-start justify-between">
        <div>
            <h1 className="text-white text-2xl md:text-3xl font-semibold">
                Bem-vindo de volta, {displayName}
              </h1>
          <p className="text-[13px] md:text-base text-[#9F9D9D] mb-3">
            Gerencie Seu imperio Financeiro Aqui
          </p>
        </div>

        {/* Chips De/Até com glass */}
        <div className="flex items-center gap-3">
          <div className="glass rounded-xl2 px-4 py-2 border border-white/10 text-[#CACACA] flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden />
            <input
              aria-label="De"
              type="date"
              value={from ?? ''}
              onChange={(e) => setRange({ from: e.target.value || null })}
              className="bg-transparent outline-none text-sm"
            />
          </div>
          <ArrowRight className="text-[#CACACA] opacity-70" />
          <div className="glass rounded-xl2 px-4 py-2 border border-white/10 text-[#CACACA] flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden />
            <input
              aria-label="Até"
              type="date"
              value={to ?? ''}
              onChange={(e) => setRange({ to: e.target.value || null })}
              className="bg-transparent outline-none text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

