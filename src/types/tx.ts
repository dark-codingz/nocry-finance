// /src/types/tx.ts
// Tipos compartilhados para o módulo de transações

export type TxKind = 'expense' | 'income' | 'transfer';

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
}

export interface Account {
  id: string;
  name: string;
}

export interface Card {
  id: string;
  name: string;
}

// NOTE: O Supabase retorna joins como arrays, mesmo que seja foreign key única
// Por isso, accounts/cards/categories são arrays de objetos com apenas name
export interface Transaction {
  id: string;
  type: TxKind;
  amount_cents: number;
  occurred_at: string; // ISO date (YYYY-MM-DD)
  description?: string | null;
  account_id?: string | null;
  card_id?: string | null;
  category_id?: string | null;
  created_at?: string;
  user_id?: string; // Opcional pois nem sempre vem do backend

  // Joins do Supabase: retorna array de objetos parciais
  accounts?: { name: string }[] | null;
  cards?: { name: string }[] | null;
  categories?: { name: string; type?: string }[] | null;
}

export interface TxFilters {
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  q?: string; // searchTerm
}

