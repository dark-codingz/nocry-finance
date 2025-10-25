"use client";

// React 19 removeu ReactDOM.findDOMNode; máscaras antigas quebram.
// Substituímos por input controlado/CurrencyInput sem dependências externas.
//
// IMPORTANTE: Este componente trabalha com centavos (number) internamente.
// - value: número de centavos (ex: 15990 = R$ 159,90)
// - onChange: recebe número de centavos

import { useState, useEffect } from "react";
import { parseBRL, formatBRL } from "@/lib/money";

export interface CurrencyInputProps {
  id?: string;
  name?: string;
  value: number; // centavos
  onChange: (cents: number) => void; // centavos
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CurrencyInput({
  id, name, value, onChange, placeholder,
  className, disabled
}: CurrencyInputProps) {
  // Estado local para exibição formatada
  const [display, setDisplay] = useState<string>(() => formatBRL(value || 0));

  // Sincroniza display quando value externo muda
  useEffect(() => {
    setDisplay(formatBRL(value || 0));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const txt = e.target.value;
    setDisplay(txt);
    
    // Converte texto BRL → centavos
    const cents = parseBRL(txt);
    onChange(cents);
  };

  return (
    <input
      id={id}
      name={name}
      inputMode="decimal"
      autoComplete="off"
      className={className}
      placeholder={placeholder ?? "R$ 0,00"}
      value={display}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}
