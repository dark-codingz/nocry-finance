-- /supabase/sql/004_kiwify_integration.sql
-- Este script adiciona as colunas necessárias para a integração com webhooks
-- e garante a idempotência dos registros de vendas.

-- -----------------------------------------------------------------------------
-- Tabela: sales
-- -----------------------------------------------------------------------------

-- Adiciona a coluna `source` para identificar a origem da venda (manual, kiwify, etc.)
ALTER TABLE public.sales
ADD COLUMN source text DEFAULT 'manual' NOT NULL;

-- Adiciona colunas para armazenar informações do cliente e método de pagamento vindas do webhook.
ALTER TABLE public.sales
ADD COLUMN customer_email text,
ADD COLUMN payment_method text;

-- Cria um índice único para garantir a idempotência.
-- Não será possível inserir duas vendas com o mesmo `order_id` da mesma `source` para o mesmo `user_id`.
CREATE UNIQUE INDEX sales_user_id_source_order_id_key
ON public.sales (user_id, source, order_id);

COMMENT ON COLUMN public.sales.source IS 'Origem da venda (ex: manual, kiwify, hotmart).';
COMMENT ON INDEX public.sales_user_id_source_order_id_key IS 'Garante a idempotência das vendas por plataforma.';

-- -----------------------------------------------------------------------------
-- Tabela: offers
-- -----------------------------------------------------------------------------

-- Adiciona a coluna `external_id` para mapear a oferta com o ID de produtos em plataformas externas.
ALTER TABLE public.offers
ADD COLUMN external_id text;

-- Cria um índice único para otimizar a busca e garantir que não haja mapeamentos duplicados.
CREATE UNIQUE INDEX offers_user_id_external_id_key
ON public.offers (user_id, external_id);

COMMENT ON COLUMN public.offers.external_id IS 'ID do produto na plataforma externa (ex: Kiwify, Hotmart).';



