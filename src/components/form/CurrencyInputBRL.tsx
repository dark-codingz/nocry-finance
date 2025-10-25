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
  // valor de exibição: se receber centavos (number), converte para reais
  const displayValue =
    typeof value === "number" ? (value / 100).toFixed(2) : value;

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
      isNumericString={false}
      onValueChange={(vals) => {
        const { floatValue, value: raw } = vals;
        if (interpretPlainDigitsAsCents) {
          // Remove tudo que não é dígito e trata como centavos
          const onlyDigits = raw.replace(/[^\d]/g, "");
          const cents = onlyDigits.length ? parseInt(onlyDigits, 10) : 0;
          onValueChange?.(Number.isFinite(cents) ? cents : 0);
        } else {
          const cents = floatValue != null ? Math.round(floatValue * 100) : 0;
          onValueChange?.(cents);
        }
      }}
    />
  );
}

