"use client";

// ============================================================================
// Sidebar - NoCry Finance (Ajustada ao Mock Dourado)
// ============================================================================
// Propósito: Navegação lateral colapsável com ícones em quadradinhos.
//
// DESIGN (Fiel ao Mock):
// - Cada item NÃO tem fundo na linha inteira
// - Apenas o quadradinho do ícone (40x40px) tem fundo
// - Item ativo: ícone bg-nocry-gold (#D4AF37), ícone white, label white
// - Item inativo: ícone bg-nocry-goldDark (#3E371D), ícone #CACACA, label #CACACA
// - Hover: ilumina levemente o fundo do ícone (bg-[#4a3f22])
//
// ESTADOS:
// - Colapsada (padrão): 72px de largura, mostra apenas ícones
// - Expandida (hover): 264px de largura, mostra ícones + labels
//
// ACESSIBILIDADE:
// - aria-current="page" no item ativo
// - Focus visível com ring dourado
// ============================================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LineChart,
  Gift,
  Landmark,
  Wallet,
  Bitcoin,
  Shield,
  User,
  Settings,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Tipos
// ============================================================================

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}

interface NavSection {
  title?: string;
  items: Omit<NavItemProps, 'active'>[];
}

// ============================================================================
// Configuração de Navegação
// ============================================================================

const navigation: NavSection[] = [
  {
    items: [
      { href: '/', icon: Home, label: 'Dashboard' },
      { href: '/analytics', icon: LineChart, label: 'Analytics' },
      { href: '/digital', icon: Gift, label: 'NoCry Offers' },
      { href: '/emprestimos', icon: Landmark, label: 'Empréstimos' },
      { href: '/carteira', icon: Wallet, label: 'Carteira' },
      { href: '/crypto', icon: Bitcoin, label: 'Crypto' },
    ],
  },
  {
    title: 'NOCRY OPTIONS',
    items: [
      { href: '/admin', icon: Shield, label: 'Admin' },
      { href: '/profile', icon: User, label: 'Profile' },
      { href: '/config', icon: Settings, label: 'Settings' },
    ],
  },
];

// ============================================================================
// Componente: NavItem (Item de Navegação)
// ============================================================================

function NavItem({ href, icon: Icon, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="group/item flex items-center gap-3 px-3 py-2 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nocry-gold focus-visible:ring-offset-2 focus-visible:ring-offset-nocry-black"
    >
      {/* ────────────────────────────────────────────────────────────────
          Quadradinho do Ícone (40x40px com fundo)
          ──────────────────────────────────────────────────────────────── */}
      <div
        className={`
          grid place-items-center h-10 w-10 rounded-lg transition-colors border border-white/10
          ${
            active
              ? 'bg-nocry-gold text-white'
              : 'bg-nocry-goldDark text-nocry-text hover:bg-[#4a3f22]'
          }
        `}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Label (aparece apenas quando sidebar expandida)
          ──────────────────────────────────────────────────────────────── */}
      <span
        className={`
          whitespace-nowrap text-sm transition-opacity duration-200
          opacity-0 group-hover/sidebar:opacity-100
          ${active ? 'text-white' : 'text-nocry-text'}
        `}
      >
        {label}
      </span>
    </Link>
  );
}

// ============================================================================
// Componente Principal: Sidebar
// ============================================================================

export default function Sidebar() {
  const pathname = usePathname();

  // ─────────────────────────────────────────────────────────────────────
  // Função para determinar se um item está ativo
  // ─────────────────────────────────────────────────────────────────────
  const isActive = (href: string): boolean => {
    // Rota exata
    if (pathname === href) return true;
    
    // Subrotas (ex: /digital/oferta/123 ativa o item /digital)
    if (href !== '/' && pathname.startsWith(href + '/')) return true;
    
    return false;
  };

  // ─────────────────────────────────────────────────────────────────────
  // Handlers para controlar largura da sidebar com hover
  // ─────────────────────────────────────────────────────────────────────
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.width = '264px';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.width = '72px';
  };

  return (
    <aside
      className="group/sidebar fixed left-0 top-0 h-screen glass-strong transition-[width] duration-300 overflow-hidden z-30"
      style={{ width: '72px' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ────────────────────────────────────────────────────────────────
          Logo / Brand
          ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center h-20 px-3 border-b border-white/10">
        {/* Logo Colapsada (quadradinho com "N") */}
        <div className="group-hover/sidebar:hidden w-10 h-10 rounded-lg bg-nocry-gold flex items-center justify-center flex-shrink-0">
          <span className="text-black font-bold text-xl">N</span>
        </div>
        
        {/* Logo Expandida (texto completo) */}
        <div className="hidden group-hover/sidebar:block text-nocry-gold font-bold text-xl whitespace-nowrap">
          NoCry Finance
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Navegação
          ──────────────────────────────────────────────────────────────── */}
      <nav className="flex flex-col gap-1 p-3 mt-4">
        {navigation.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {/* ──────────────────────────────────────────────────────────
                Separador com Título (NOCRY OPTIONS)
                ────────────────────────────────────────────────────────── */}
            {section.title && (
              <div className="px-3 mt-4 mb-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                <span className="text-[11px] tracking-wide text-nocry-muted uppercase">
                  {section.title}
                </span>
              </div>
            )}

            {/* ──────────────────────────────────────────────────────────
                Itens de Navegação
                ────────────────────────────────────────────────────────── */}
            {section.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={isActive(item.href)}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ────────────────────────────────────────────────────────────────
          Rodapé (Versão do App)
          ──────────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-0 right-0 px-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
        <div className="text-nocry-muted text-xs text-center">
          v1.0.0
        </div>
      </div>
    </aside>
  );
}
