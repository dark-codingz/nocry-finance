// /src/lib/finance.ts

// Propósito: Centralizar as funções de cálculo e a lógica de negócios
// financeira. Funções puras que recebem dados e retornam cálculos.

// Tipos básicos para os cálculos. No futuro, podem ser importados de um
// arquivo de tipos gerado pelo Supabase.
type Account = {
    initial_balance_cents: number;
};

type FixedBill = {
    amount_cents: number;
};

interface SdmResult {
    totalBalanceCents: number;
    totalFixedBillsCents: number;
    sdmCents: number;
}

/**
 * Calcula o Saldo Disponível no Mês (SDM).
 * Fórmula: SDM = Saldo Total em Contas - Total de Contas Fixas do Mês
 *
 * @param accounts - Array de contas do usuário.
 * @param fixedBills - Array de contas fixas do usuário.
 * @returns Um objeto com os totais e o valor do SDM em centavos.
 */
export function calculateSDM(accounts: Account[], fixedBills: FixedBill[]): SdmResult {
    // 1. Soma o saldo inicial de todas as contas.
    // SUPOSIÇÃO: Por enquanto, usamos o saldo inicial. No futuro, será o saldo atualizado.
    const totalBalanceCents = accounts.reduce((sum, acc) => sum + acc.initial_balance_cents, 0);
    
    // 2. Soma o valor de todas as contas fixas.
    // SUPOSIÇÃO: Considera todas as contas fixas cadastradas para o mês.
    const totalFixedBillsCents = fixedBills.reduce((sum, bill) => sum + bill.amount_cents, 0);

    // 3. Calcula o saldo disponível.
    // TODO:
    // - Adicionar receitas confirmadas (+)
    // - Subtrair reservas/metas (-)
    // - Subtrair a fatura atual do cartão de crédito (-)
    const sdmCents = totalBalanceCents - totalFixedBillsCents;

    return { totalBalanceCents, totalFixedBillsCents, sdmCents };
}

/**
 * Calcula o valor disponível para gastar "Hoje".
 * Fórmula: Hoje = (SDM - Gastos já realizados no mês) / Dias restantes no mês
 *
 * @param sdmCents - O Saldo Disponível no Mês, em centavos.
 * @returns O valor disponível para hoje, em centavos.
 */
export function calculateToday(sdmCents: number): number {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const remainingDays = totalDaysInMonth - today.getDate() + 1;

    // SUPOSIÇÃO: Os gastos variáveis do mês ainda não estão sendo rastreados.
    const monthlySpendCents = 0;

    // TODO:
    // - Integrar os gastos variáveis já realizados no mês (compras no débito e crédito).
    // - Implementar uma estratégia de "carry-over": se não gastar o valor de hoje,
    //   ele deveria ser somado ao valor de amanhã? Ou ao SDM?

    if (remainingDays <= 0) {
        return 0;
    }

    const availableToday = (sdmCents - monthlySpendCents) / remainingDays;
    return Math.floor(availableToday);
}




