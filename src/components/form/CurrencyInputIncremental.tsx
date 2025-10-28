"use client";

import { NumericFormat, NumericFormatProps } from 'react-number-format';

/**
 * CurrencyInputIncremental - Input de moeda estilo "caixa de supermercado"
 * 
 * COMPORTAMENTO:
 * - Formata conforme você digita (incremental)
 * - NÃO adiciona zeros automaticamente
 * - Só reorganiza os números digitados
 * 
 * EXEMPLO:
 * - Digite 2 → R$ 0,02
 * - Digite 3 → R$ 0,23
 * - Digite 5 → R$ 2,35
 * - Digite 0 → R$ 23,50
 * 
 * PROPS:
 * - value: Valor em CENTAVOS (number)
 * - onValueChange: Callback com novo valor em CENTAVOS (number)
 */

type Props = {
  value?: number;
  onValueChange?: (cents: number) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

export default function CurrencyInputIncremental({
  value = 0,
  onValueChange,
  name,
  id,
  placeholder = "R$ 0,00",
  className,
  autoFocus,
  disabled,
}: Props) {
  return (
    <NumericFormat
      id={id}
      name={name}
      autoFocus={autoFocus}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      
      // Formatação BRL
      thousandSeparator="."
      decimalSeparator=","
      prefix="R$ "
      decimalScale={2}
      fixedDecimalScale
      
      // Valor em reais (convertido de centavos)
      value={value / 100}
      
      // Quando muda, converte de volta para centavos
      onValueChange={(values) => {
        const cents = Math.round((values.floatValue || 0) * 100);
        onValueChange?.(cents);
      }}
      
      // Permite apenas números
      allowNegative={false}
      allowLeadingZeros={false}
      
      // Tipo de input
      type="text"
      inputMode="decimal"
      autoComplete="off"
    />
  );
}

