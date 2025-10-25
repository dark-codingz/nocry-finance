// ============================================================================
// TabsPills - Sistema de abas estilo pílula
// ============================================================================
// PROPÓSITO:
// - Navegação por abas com estilo moderno (pills/rounded)
// - Aba ativa: fundo dourado (#D4AF37), texto preto
// - Aba inativa: fundo translúcido, texto cinza claro
//
// USO:
// const [tab, setTab] = useState('geral');
// <TabsPills
//   items={[
//     { key: 'geral', label: 'Geral' },
//     { key: 'settings', label: 'Configurações' }
//   ]}
//   value={tab}
//   onChange={setTab}
// />
// ============================================================================

'use client';
import clsx from 'clsx';

export type TabItem = {
  key: string;
  label: string;
};

type TabsPillsProps = {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
};

export function TabsPills({ items, value, onChange, className }: TabsPillsProps) {
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={clsx(
            // Base
            'px-4 py-2 rounded-full text-sm transition-all duration-200 border',
            // Estado ativo (dourado)
            value === item.key
              ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-medium'
              : // Estado inativo (translúcido)
                'bg-white/5 text-[#CACACA] border-white/10 hover:bg-white/10 hover:border-white/20'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}



