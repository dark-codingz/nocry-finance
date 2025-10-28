// src/components/digital/DigitalKpi.tsx
// ============================================================================
// Card KPI para Desempenho Digital
// ============================================================================
//
// DESIGN:
// - Estilo "glass" com borda sutil
// - Título pequeno e discreto (nocry-muted)
// - Valor grande e destacado com cor baseada no state
// - Texto sutil opcional (ex.: "vs. período anterior")
//
// ESTADOS DE COR:
// - default: branco (text-white)
// - ok / success: verde (text-green-400)
// - danger / warning: vermelho (text-red-400)
// - warning: amarelo (text-yellow-300)
//
// USO:
// <DigitalKpi
//   title="ROI"
//   valueText="2.5x"
//   state="ok"
//   subtleText="vs. mês anterior"
// />
// ============================================================================

interface DigitalKpiProps {
  title: string;
  valueText: string;
  subtleText?: string;
  state?: 'default' | 'ok' | 'danger' | 'warning';
}

export default function DigitalKpi({
  title,
  valueText,
  subtleText,
  state = 'default',
}: DigitalKpiProps) {
  // Mapa de cores por estado
  const colorMap = {
    default: 'text-white',
    ok: 'text-green-400',
    danger: 'text-red-400',
    warning: 'text-yellow-300',
  };

  const valueColor = colorMap[state];

  return (
    <div className="glass rounded-xl px-5 py-4 border border-white/10">
      {/* Título */}
      <p className="text-nocry-muted text-sm font-medium mb-1">{title}</p>

      {/* Valor Principal */}
      <p className={`${valueColor} text-xl md:text-2xl font-semibold`}>
        {valueText}
      </p>

      {/* Texto Sutil (opcional) */}
      {subtleText && (
        <p className="text-nocry-muted text-xs mt-1">{subtleText}</p>
      )}
    </div>
  );
}




