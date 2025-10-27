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
  // ✅ Ref para rastrear último valor recebido (evita loops)
  const lastValueRef = React.useRef<number | null>(null);

  // ✅ Converter centavos para string formatada
  const getDisplayValue = React.useCallback((cents: number | string | null | undefined): string => {
    if (typeof cents === "number") {
      return (cents / 100).toFixed(2);
    }
    if (typeof cents === "string" && cents.trim() !== "") {
      return cents;
    }
    return "";
  }, []);

  // ✅ Valor controlado (sincronizado com prop)
  const displayValue = React.useMemo(() => {
    // ✅ Evitar loop: só atualizar se o valor REALMENTE mudou
    if (typeof value === "number" && value !== lastValueRef.current) {
      lastValueRef.current = value;
      return getDisplayValue(value);
    }
    if (value === 0 || value === "" || value === null || value === undefined) {
      lastValueRef.current = null;
      return "";
    }
    // ✅ Manter valor anterior se não mudou
    return getDisplayValue(lastValueRef.current);
  }, [value, getDisplayValue]);

  const handleValueChange = React.useCallback(
    (vals: any) => {
      const { floatValue, value: raw } = vals;
      let cents: number;

      if (interpretPlainDigitsAsCents) {
        const onlyDigits = raw.replace(/[^\d]/g, "");
        cents = onlyDigits.length ? parseInt(onlyDigits, 10) : 0;
        cents = Number.isFinite(cents) ? cents : 0;
      } else {
        cents = floatValue != null ? Math.round(floatValue * 100) : 0;
      }

      // ✅ SÓ emitir se mudou
      if (cents !== lastValueRef.current) {
        lastValueRef.current = cents;
        onValueChange?.(cents);
      }
    },
    [onValueChange, interpretPlainDigitsAsCents]
  );

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
      onValueChange={handleValueChange}
    />
  );
}

