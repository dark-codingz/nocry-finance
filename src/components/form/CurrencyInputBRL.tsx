"use client";
import * as React from "react";
import { NumericFormat, NumericFormatProps } from "react-number-format";

type Props = {
  value?: number | string;
  onValueChange?: (cents: number) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  interpretPlainDigitsAsCents?: boolean;
} & Omit<NumericFormatProps, "onValueChange" | "value" | "thousandSeparator" | "decimalSeparator" | "prefix" | "decimalScale" | "fixedDecimalScale" | "isNumericString">;

export default function CurrencyInputBRL({
  value,
  onValueChange,
  name,
  id,
  placeholder = "0,00",
  className,
  interpretPlainDigitsAsCents = false,
  ...rest
}: Props) {
  // ══════════════════════════════════════════════════════════════════════
  // SOLUÇÃO: COPIAR ABORDAGEM DO CurrencyInput.tsx (QUE FUNCIONA!)
  // Usar useState + useEffect para controlar o display
  // ══════════════════════════════════════════════════════════════════════
  
  // Estado local para exibição formatada (quebra o ciclo de re-renders)
  const [displayValue, setDisplayValue] = React.useState<string>(() => {
    if (typeof value === "number") {
      return (value / 100).toFixed(2);
    }
    return "";
  });

  // Sincroniza displayValue APENAS quando value externo muda
  React.useEffect(() => {
    if (typeof value === "number") {
      setDisplayValue((value / 100).toFixed(2));
    } else if (value === 0 || value === "" || value === null || value === undefined) {
      setDisplayValue("");
    }
  }, [value]);

  return (
    <NumericFormat
      {...rest}
      value={displayValue}
      name={name}
      id={id}
      placeholder={placeholder}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      prefix="R$ "
      inputMode="decimal"
      className={className}
      valueIsNumericString={false}
      onValueChange={(vals) => {
        const { floatValue, value: raw } = vals;
        let cents: number;

        if (interpretPlainDigitsAsCents) {
          const onlyDigits = raw.replace(/[^\d]/g, "");
          cents = onlyDigits.length ? parseInt(onlyDigits, 10) : 0;
          cents = Number.isFinite(cents) ? cents : 0;
        } else {
          cents = floatValue != null ? Math.round(floatValue * 100) : 0;
        }

        // Emitir para o pai (React Hook Form controla a sincronização)
        onValueChange?.(cents);
      }}
    />
  );
}

