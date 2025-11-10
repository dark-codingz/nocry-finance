-- ============================================================================
-- 045_invoice_payments.sql - Sistema de Pagamento de Faturas de Cartão
-- ============================================================================
-- PROPÓSITO:
-- - Criar tabela para registrar pagamentos de faturas de cartão
-- - Implementar RLS e índices para performance e segurança
-- - Separar "compras no cartão" (não são saídas) de "pagamentos de fatura" (SÃO saídas)
--
-- MODELO:
-- - invoice_payments: Registra cada pagamento de fatura
-- - Cada pagamento deduz do saldo aberto da fatura
-- - Permite pagamentos parciais (múltiplos registros para o mesmo ciclo)
--
-- REGIME DE CAIXA:
-- - Compra no cartão → NÃO é saída de caixa (fica na fatura aberta)
-- - Pagamento de fatura → SIM é saída de caixa (transaction + invoice_payment)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Criar tabela invoice_payments (idempotente)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  
  -- Valor pago (sempre > 0)
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  
  -- Data do pagamento (quando o dinheiro SAIU)
  paid_at date NOT NULL,
  
  -- Conta de origem (de onde saiu o dinheiro)
  source_account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  -- Observações (opcional)
  notes text NULL,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invoice_payments IS 
  'Registra pagamentos de faturas de cartão (saídas de caixa reais).';

COMMENT ON COLUMN public.invoice_payments.amount_cents IS 
  'Valor pago em centavos (sempre positivo).';

COMMENT ON COLUMN public.invoice_payments.paid_at IS 
  'Data em que o pagamento foi efetuado (quando o dinheiro saiu).';

COMMENT ON COLUMN public.invoice_payments.source_account_id IS 
  'Conta bancária de onde saiu o dinheiro para pagar a fatura.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2) RLS (Row Level Security)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Política: Usuário pode gerenciar apenas seus próprios pagamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' 
      AND tablename='invoice_payments' 
      AND policyname='invoice_payments_manage_own'
  ) THEN
    CREATE POLICY invoice_payments_manage_own
      ON public.invoice_payments
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Índices para performance
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoice_payments_user_id 
  ON public.invoice_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_card_id 
  ON public.invoice_payments(card_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_paid_at 
  ON public.invoice_payments(paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_user_card 
  ON public.invoice_payments(user_id, card_id, paid_at DESC);

-- Índice composto para queries frequentes (pagamentos de um cartão em um período)
CREATE INDEX IF NOT EXISTS idx_invoice_payments_card_period 
  ON public.invoice_payments(card_id, paid_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Validação adicional: card_id deve pertencer ao usuário
-- ────────────────────────────────────────────────────────────────────────────
-- Trigger para garantir que o card_id pertence ao user_id
CREATE OR REPLACE FUNCTION check_invoice_payment_card_ownership()
RETURNS TRIGGER AS $$
DECLARE
  card_owner_id uuid;
BEGIN
  -- Buscar owner do cartão
  SELECT user_id INTO card_owner_id
  FROM public.cards
  WHERE id = NEW.card_id;

  -- Verificar se o cartão pertence ao usuário
  IF card_owner_id IS NULL THEN
    RAISE EXCEPTION 'Cartão não encontrado';
  END IF;

  IF card_owner_id != NEW.user_id THEN
    RAISE EXCEPTION 'Cartão não pertence ao usuário';
  END IF;

  -- Verificar se a conta de origem pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = NEW.source_account_id
      AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Conta de origem não pertence ao usuário';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (idempotente)
DROP TRIGGER IF EXISTS trg_check_invoice_payment_ownership ON public.invoice_payments;
CREATE TRIGGER trg_check_invoice_payment_ownership
  BEFORE INSERT OR UPDATE ON public.invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_payment_card_ownership();

-- ============================================================================
-- FIM
-- ============================================================================

