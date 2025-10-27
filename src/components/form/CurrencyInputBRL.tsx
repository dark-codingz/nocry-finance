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
  // ✅ Estado interno para controlar o valor (evita loops de re-render)
  const [internalValue, setInternalValue] = React.useState<string>("");
  const isControlledRef = React.useRef(false);

  // ✅ Sincronizar com prop externa APENAS quando mudar externamente
  React.useEffect(() => {
    if (typeof value === "number") {
      const formatted = (value / 100).toFixed(2);
      setInternalValue(formatted);
      isControlledRef.current = false;
    } else if (typeof value === "string" && value.trim() !== "") {
      setInternalValue(value);
      isControlledRef.current = false;
    } else if (value === 0 || value === "" || value === null || value === undefined) {
      // ✅ Resetar apenas se for 0 ou vazio de fora
      if (!isControlledRef.current) {
        setInternalValue("");
      }
    }
  }, [value]);

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

      // ✅ Marcar como controlado internamente
      isControlledRef.current = true;

      // ✅ Emitir para o pai
      onValueChange?.(cents);
    },
    [onValueChange, interpretPlainDigitsAsCents]
  );

  return (
    <NumericFormat
      {...rest}
      value={internalValue}
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

