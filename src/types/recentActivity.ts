// src/types/recentActivity.ts

/**
 * Define a estrutura unificada para um item no feed de atividades recentes.
 * Agrega diferentes tipos de eventos (financeiros, digitais) em um formato comum.
 */
export interface RecentActivityItem {
  // ID único do registro original (ex: id da transação, id da venda)
  id: string;

  // Tipo de atividade para determinar o ícone e a lógica de exibição
  kind: 'expense' | 'income' | 'transfer' | 'sale' | 'spend' | 'work';
  
  // Título descritivo da atividade
  title: string;
  
  // Valor monetário em centavos (opcional para atividades sem valor, como 'work')
  amountCents?: number;
  
  // Data e hora em que a atividade ocorreu, no formato ISO string. Usado para ordenação.
  occurredAtISO: string;
  
  // Metadados adicionais específicos de cada tipo (ex: duração de uma sessão de trabalho)
  meta?: any;
}




