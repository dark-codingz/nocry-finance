// ============================================================================
// Money Utilities - NoCry Finance
// ============================================================================
// Propósito: Centralizar as funções de manipulação e formatação de valores
// monetários. Manter essa lógica isolada garante consistência e facilita a
// manutenção.
//
// CONVENÇÕES:
// - Valores monetários são sempre armazenados em CENTAVOS (bigint no DB)
// - Inputs de usuário podem vir como string ("435,00", "1.200,50") ou number
// - Outputs para o usuário são sempre formatados em BRL (R$ 1.234,56)
//
// FUNÇÕES:
// - toCents: Converte string/number → centavos (number)
// - parseBRL: Converte string BRL → centavos (number) [legacy, use toCents]
// - formatBRL: Converte centavos → string formatada (R$ 1.234,56)
// ============================================================================

/**
 * Converte valores de entrada (string ou number) para centavos (number).
 * 
 * ACEITA:
 * - Strings: "1.234,56", "1234,56", "435,00", "1234", "R$ 1.234,56"
 * - Numbers: 1234.56, 435, 1234
 * 
 * RETORNA:
 * - number (centavos): 123456, 43500, 123400
 * - NaN se não conseguir converter
 * 
 * EXEMPLOS:
 * - toCents("1.234,56") → 123456
 * - toCents("435,00") → 43500
 * - toCents(1234.56) → 123456
 * - toCents("R$ 1.200,50") → 120050
 * - toCents("abc") → NaN
 * 
 * @param input - Valor a ser convertido (string ou number)
 * @returns Valor em centavos (number) ou NaN se inválido
 */
export function toCents(input: string | number): number {
  // Caso 1: Já é um número válido → converter para centavos
  if (typeof input === 'number' && !Number.isNaN(input)) {
    return Math.round(input * 100);
  }

  // Caso 2: Não é string → retornar NaN
  if (typeof input !== 'string') {
    return NaN;
  }

  // Caso 3: String → normalizar e converter
  const normalized = input
    .trim()
    .replace(/\s/g, '')                    // Remove espaços
    .replace('R$', '')                     // Remove símbolo de moeda
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')  // Remove separador de milhar (pontos antes de 3 dígitos)
    .replace(',', '.');                    // Troca vírgula decimal por ponto

  const value = Number(normalized);
  
  if (Number.isNaN(value)) {
    return NaN;
  }

  return Math.round(value * 100);
}

/**
 * Converte uma string de moeda BRL para centavos.
 * 
 * NOTA: Esta função é mantida por compatibilidade com código existente.
 * Para novos desenvolvimentos, prefira usar `toCents()` que é mais robusta.
 * 
 * @deprecated Use toCents() para maior flexibilidade
 * @param input - String de valor a ser convertida (ex: "R$ 1.234,56" ou "1234,56")
 * @returns Valor em centavos (ex: 123456) ou 0 se inválido
 */
export function parseBRL(input: string): number {
  const cents = toCents(input);
  return Number.isNaN(cents) ? 0 : cents;
}

/**
 * Formata centavos para string no formato de moeda brasileira (BRL).
 * 
 * EXEMPLOS:
 * - formatBRL(123456) → "R$ 1.234,56"
 * - formatBRL(43500) → "R$ 435,00"
 * - formatBRL(0) → "R$ 0,00"
 * - formatBRL(-5000) → "-R$ 50,00"
 * - formatBRL(null) → "R$ 0,00"
 * - formatBRL(undefined) → "R$ 0,00"
 * 
 * @param cents - Valor em centavos (ex: 15990 para R$ 159,90), aceita null/undefined
 * @returns String formatada como 'R$ 159,90'
 */
export function formatBRL(cents: number | null | undefined): string {
  // Garantir que temos um número válido, senão usar 0
  const safeCents = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;
  
  const value = safeCents / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
