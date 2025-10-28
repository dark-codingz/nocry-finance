// ============================================================================
// lib/dates.ts - Helpers de Data Padronizados
// ============================================================================
// PROPÓSITO:
// - Centralizar formatação de datas usadas em queries
// - Garantir consistência de monthKey em todo o sistema
// - Evitar duplicação de dayjs().format('YYYY-MM')
// ============================================================================

import dayjs from 'dayjs';

/**
 * Retorna o mês atual no formato YYYY-MM (usado como key no DB e queries).
 * 
 * @returns String no formato 'YYYY-MM' (ex: '2025-10')
 * 
 * @example
 * ```ts
 * const key = currentMonthKey(); // '2025-10'
 * await saveBudget({ amountCents: 300000, monthKey: key });
 * ```
 */
export function currentMonthKey(): string {
  return dayjs().format('YYYY-MM');
}

/**
 * Formata uma data para o formato de mês YYYY-MM.
 * 
 * @param date - Data a ser formatada (Date, string ou dayjs)
 * @returns String no formato 'YYYY-MM'
 * 
 * @example
 * ```ts
 * toMonthKey(new Date()); // '2025-10'
 * toMonthKey('2025-10-15'); // '2025-10'
 * ```
 */
export function toMonthKey(date: Date | string | dayjs.Dayjs): string {
  return dayjs(date).format('YYYY-MM');
}

/**
 * Retorna o nome do mês por extenso (pt-BR).
 * 
 * @param monthKey - Mês no formato YYYY-MM
 * @returns Nome do mês (ex: 'outubro de 2025')
 * 
 * @example
 * ```ts
 * monthKeyToName('2025-10'); // 'outubro de 2025'
 * ```
 */
export function monthKeyToName(monthKey: string): string {
  return dayjs(monthKey + '-01').format('MMMM [de] YYYY');
}




