-- /supabase/sql/003_personal_finance.sql
-- Este script configura o schema inicial para o módulo de "Finanças Pessoais".

-- -----------------------------------------------------------------------------
-- Tabela: accounts
-- Propósito: Armazena as contas financeiras do usuário (corrente, poupança, carteira).
-- -----------------------------------------------------------------------------
CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    initial_balance_cents bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.accounts IS 'Contas financeiras do usuário (ex: conta corrente, carteira).';

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own accounts" ON public.accounts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX ON public.accounts (user_id);

-- -----------------------------------------------------------------------------
-- Tabela: cards
-- Propósito: Armazena os cartões de crédito do usuário.
-- -----------------------------------------------------------------------------
CREATE TABLE public.cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    limit_cents bigint NOT NULL,
    closing_day smallint NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
    due_day smallint NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.cards IS 'Cartões de crédito do usuário.';
COMMENT ON COLUMN public.cards.closing_day IS 'Dia do fechamento da fatura (1-31).';
COMMENT ON COLUMN public.cards.due_day IS 'Dia do vencimento da fatura (1-31).';

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own cards" ON public.cards
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX ON public.cards (user_id);

-- -----------------------------------------------------------------------------
-- Tabela: fixed_bills
-- Propósito: Armazena contas a pagar recorrentes com valor e data fixos.
-- A constraint `single_destination` garante que a conta seja paga a partir de
-- uma conta (débito) ou de um cartão (fatura), mas não ambos.
-- -----------------------------------------------------------------------------
CREATE TABLE public.fixed_bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),
    day_of_month smallint NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
    -- `account_id` e `card_id` são mutuamente exclusivos.
    account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
    card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT single_destination CHECK (
        (account_id IS NOT NULL AND card_id IS NULL) OR
        (account_id IS NULL AND card_id IS NOT NULL)
    )
);
COMMENT ON TABLE public.fixed_bills IS 'Contas a pagar recorrentes com data e valor fixos.';
COMMENT ON COLUMN public.fixed_bills.day_of_month IS 'Dia do vencimento da conta (1-31).';


ALTER TABLE public.fixed_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own fixed bills" ON public.fixed_bills
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX ON public.fixed_bills (user_id);
