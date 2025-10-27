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
  // SOLUÇÃO MINIMALISTA - SEM useMemo, SEM useCallback desnecessário
  // ══════════════════════════════════════════════════════════════════════
  
  const lastEmittedRef = React.useRef<number>(-1);

  // Converter value (centavos) para displayValue (string formatada)
  let displayValue = "";
  if (typeof value === "number") {
    displayValue = (value / 100).toFixed(2);
  } else if (typeof value === "string" && value.trim() !== "") {
    displayValue = value;
  }

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

        // SÓ emitir se mudou
        if (cents !== lastEmittedRef.current) {
          lastEmittedRef.current = cents;
          onValueChange?.(cents);
        }
      }}
    />
  );
}

