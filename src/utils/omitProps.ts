// ============================================================================
// Utility: omitProps
// ============================================================================
// PROPÓSITO:
// - Remover props específicas de um objeto antes de repassá-las ao DOM
// - Prevenir warnings do React sobre props não reconhecidas
// ============================================================================

/**
 * Remove propriedades específicas de um objeto.
 * Útil para remover props customizadas antes de repassar ao DOM.
 * 
 * @example
 * ```tsx
 * const domProps = omitProps(props, ['isNumericString', 'customProp']);
 * return <input {...domProps} />;
 * ```
 */
export function omitProps<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const clone = { ...obj };
  for (const k of keys) {
    delete (clone as any)[k];
  }
  return clone;
}

/**
 * Remove props conhecidas que não devem ser repassadas ao DOM.
 * Lista de props comuns de libs de UI que causam warnings.
 */
export const UNSAFE_DOM_PROPS = [
  'isNumericString',
  'thousandSeparator',
  'decimalSeparator',
  'allowNegative',
  'allowLeadingZeros',
  'allowedDecimalSeparators',
] as const;

/**
 * Remove props inseguras conhecidas de um objeto.
 * 
 * @example
 * ```tsx
 * const domProps = omitUnsafeDOMProps(props);
 * return <input {...domProps} />;
 * ```
 */
export function omitUnsafeDOMProps<T extends Record<string, any>>(
  obj: T
): Omit<T, typeof UNSAFE_DOM_PROPS[number]> {
  return omitProps(obj, [...UNSAFE_DOM_PROPS] as any);
}




