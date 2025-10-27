"use client";
import * as React from "react";
import { NumericFormat, NumericFormatProps } from "react-number-format";

type Props = {
  value?: number | string;              // pode vir centavos (number) ou string
  onValueChange?: (cents: number) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  /**
   * Se true, interpreta dígitos como centavos (ex.: digitar 2000 -> R$ 20,00).
   * Default false (2000 -> R$ 2.000,00).
   */
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
  // ✅ Ref para rastrear o último valor emitido (evita loops)
  const lastEmittedRef = React.useRef<number | null>(null);

  // ✅ valor de exibição: garantir que seja sempre válido
  const displayValue = React.useMemo(() => {
    if (typeof value === "number") {
      return (value / 100).toFixed(2);
    }
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
    return ""; // ✅ Retornar string vazia para campo limpo
  }, [value]);

  return (
    <NumericFormat
      {...rest}
      value={displayValue as any}
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
      // Modo: nunca interpretar como string numérica pura (sempre formatar)
      valueIsNumericString={false}
      onValueChange={(vals) => {
        const { floatValue, value: raw } = vals;
        let cents: number;

        if (interpretPlainDigitsAsCents) {
          // Remove tudo que não é dígito e trata como centavos
          const onlyDigits = raw.replace(/[^\d]/g, "");
          cents = onlyDigits.length ? parseInt(onlyDigits, 10) : 0;
          cents = Number.isFinite(cents) ? cents : 0;
        } else {
          cents = floatValue != null ? Math.round(floatValue * 100) : 0;
        }

        // ✅ SÓ EMITIR SE O VALOR MUDOU (evita loop infinito)
        if (cents !== lastEmittedRef.current) {
          lastEmittedRef.current = cents;
          onValueChange?.(cents);
        }
      }}
    />
  );
}

