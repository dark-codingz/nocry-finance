// ============================================================================
// Componente: DevWarning
// ============================================================================
// PROPÓSITO:
// - Exibir aviso de "Em Desenvolvimento" para usuários não-admin
// - Usado em páginas que ainda estão sendo desenvolvidas
//
// DESIGN:
// - Card centralizado com ícone de construção
// - Fundo escuro (glass effect)
// - Mensagem amigável e botão para voltar ao dashboard
// ============================================================================

'use client';

import { Construction } from 'lucide-react';
import Link from 'next/link';

export default function DevWarning() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="glass rounded-2xl border border-white/10 p-8 max-w-md w-full text-center">
        {/* Ícone */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center">
            <Construction className="w-10 h-10 text-[#D4AF37]" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-semibold text-white mb-3">
          Em Desenvolvimento
        </h1>

        {/* Descrição */}
        <p className="text-[#CACACA] text-sm leading-relaxed mb-6">
          Esta funcionalidade está sendo desenvolvida e ainda não está disponível para uso.
          Agradecemos sua compreensão!
        </p>

        {/* Botão */}
        <Link
          href="/"
          className="inline-block w-full rounded-xl px-6 py-3 bg-[#D4AF37] text-black font-medium hover:opacity-90 transition-opacity"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}




