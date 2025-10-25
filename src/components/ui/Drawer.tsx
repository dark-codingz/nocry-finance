// ============================================================================
// Drawer - Painel lateral deslizante (side panel)
// ============================================================================
// PROPÓSITO:
// - Container para formulários e conteúdo auxiliar
// - Desliza da direita para esquerda
// - Overlay escuro com blur
// - Responsivo: full width mobile, 480px desktop
//
// USO:
// const [open, setOpen] = useState(false);
// <Drawer open={open} onClose={() => setOpen(false)} title="Criar Conta">
//   <form>...</form>
// </Drawer>
// ============================================================================

'use client';
import * as React from 'react';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export default function Drawer({ open, onClose, title, children }: DrawerProps) {
  // Bloqueia scroll do body quando drawer está aberto
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Overlay escuro com blur */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Painel deslizante */}
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[480px] bg-[#161616] border-l border-white/10 transition-transform duration-300 ease-in-out overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header do drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#161616] z-10">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#CACACA] hover:text-white transition-colors text-sm"
            aria-label="Fechar"
          >
            Fechar
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}



