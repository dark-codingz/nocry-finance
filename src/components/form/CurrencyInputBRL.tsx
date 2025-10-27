"use client";
import * as React from "react";
import { formatBRL, parseBRL } from "@/lib/money";

type Props = {
  value?: number | string;
  onValueChange?: (cents: number) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

/**
 * CurrencyInputBRL - Input de moeda BRL (SEM NumericFormat para evitar loops)
 * 
 * ABORDAGEM MINIMALISTA:
 * - Input nativo controlado
 * - formatBRL/parseBRL do @/lib/money
 * - Sem NumericFormat (causava loops)
 * - Sem useEffect (causava loops)
 * - Funciona EXATAMENTE como CurrencyInput.tsx (provado funcionando)
 */
export default function CurrencyInputBRL({
  value,
  onValueChange,
  name,
  id,
  placeholder = "R$ 0,00",
  className,
  autoFocus,
  disabled,
}: Props) {
  // Estado local para exibição formatada
  const [display, setDisplay] = React.useState<string>(() => {
    const cents = typeof value === "number" ? value : 0;
    return formatBRL(cents);
  });

  // Sincronizar display quando value externo muda
  React.useEffect(() => {
    const cents = typeof value === "number" ? value : 0;
    setDisplay(formatBRL(cents));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const txt = e.target.value;
    setDisplay(txt);
    
    // Converte texto BRL → centavos
    const cents = parseBRL(txt);
    onValueChange?.(cents);
  };

  return (
    <input
      type="text"
      id={id}
      name={name}
      inputMode="decimal"
      autoComplete="off"
      autoFocus={autoFocus}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
    />
  );
}

