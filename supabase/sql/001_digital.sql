-- /supabase/sql/001_digital.sql
-- Este script configura o schema inicial para o módulo "Digital",
-- focado em acompanhar o desempenho de ofertas e campanhas de marketing.

-- -----------------------------------------------------------------------------
-- Tabela: offers
-- Propósito: Armazena as ofertas ou produtos que estão sendo promovidos.
-- É a entidade central do módulo Digital.
-- -----------------------------------------------------------------------------
CREATE TABLE public.offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL, -- Ex: 'active', 'paused', 'archived'
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.offers IS 'Armazena as ofertas ou produtos que estão sendo promovidos.';
COMMENT ON COLUMN public.offers.user_id IS 'Link para o usuário proprietário da oferta.';
COMMENT ON COLUMN public.offers.name IS 'Nome descritivo da oferta para fácil identificação.';
COMMENT ON COLUMN public.offers.status IS 'Status atual da oferta (ex: active, paused).';


-- -----------------------------------------------------------------------------
-- Tabela: channels
-- Propósito: Armazena os canais de marketing (ex: Google Ads, Meta Ads, TikTok).
-- -----------------------------------------------------------------------------
CREATE TABLE public.channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL UNIQUE
);

COMMENT ON TABLE public.channels IS 'Canais de marketing onde as campanhas são executadas.';


-- -----------------------------------------------------------------------------
-- Tabela: campaigns
-- Propósito: Representa uma campanha de marketing específica para uma oferta
-- em um determinado canal.
-- -----------------------------------------------------------------------------
CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE NOT NULL,
    channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
    name text NOT NULL,
    external_id text -- ID da campanha na plataforma externa (ex: Google Ads Campaign ID)
);

COMMENT ON TABLE public.campaigns IS 'Campanhas de marketing específicas para uma oferta em um canal.';
COMMENT ON COLUMN public.campaigns.external_id IS 'ID da campanha na plataforma de anúncios original.';


-- -----------------------------------------------------------------------------
-- Tabela: spend_events
-- Propósito: Registra todos os gastos relacionados a uma campanha/oferta.
-- -----------------------------------------------------------------------------
CREATE TABLE public.spend_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE NOT NULL,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    date date DEFAULT now() NOT NULL,
    -- Por que bigint para dinheiro? Para evitar erros de arredondamento de ponto flutuante.
    -- Armazenamos sempre o menor valor unitário (centavos) como um inteiro.
    amount_cents bigint NOT NULL,
    note text,
    CONSTRAINT amount_must_be_positive CHECK ((amount_cents > 0))
);

COMMENT ON TABLE public.spend_events IS 'Registros de gastos em marketing para ofertas/campanhas.';
COMMENT ON COLUMN public.spend_events.amount_cents IS 'Valor do gasto em centavos para evitar erros de ponto flutuante.';


-- -----------------------------------------------------------------------------
-- Tabela: sales
-- Propósito: Registra as vendas (receitas) geradas por uma campanha/oferta.
-- -----------------------------------------------------------------------------
CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE NOT NULL,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    date date DEFAULT now() NOT NULL,
    amount_cents bigint NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL, -- Ex: 'completed', 'refunded', 'pending'
    order_id text, -- ID do pedido no sistema de pagamento (ex: Kiwify)
    CONSTRAINT amount_must_be_positive CHECK ((amount_cents > 0))
);

COMMENT ON TABLE public.sales IS 'Registros de vendas (receitas) para ofertas/campanhas.';
COMMENT ON COLUMN public.sales.status IS 'Status da venda (ex: completed, refunded).';
COMMENT ON COLUMN public.sales.order_id IS 'ID do pedido no gateway de pagamento.';


-- -----------------------------------------------------------------------------
-- Tabela: work_sessions
-- Propósito: Registra sessões de trabalho dedicadas a uma oferta/campanha,
-- permitindo o rastreamento do tempo investido.
-- -----------------------------------------------------------------------------
CREATE TABLE public.work_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE NOT NULL,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    duration_minutes integer, -- Calculado no final da sessão para performance
    note text
);

COMMENT ON TABLE public.work_sessions IS 'Sessões de trabalho para rastrear tempo investido.';
COMMENT ON COLUMN public.work_sessions.duration_minutes IS 'Duração da sessão em minutos, calculada no final.';

-- -----------------------------------------------------------------------------
-- VIEW: offer_summary
-- Propósito: Agrega dados diários de gastos, receitas e tempo por oferta,
-- simplificando a geração de relatórios de desempenho.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.offer_summary AS
WITH daily_spend AS (
    SELECT
        offer_id,
        date,
        sum(amount_cents) AS total_spend
    FROM public.spend_events
    GROUP BY offer_id, date
),
daily_sales AS (
    SELECT
        offer_id,
        date,
        sum(amount_cents) AS total_revenue
    FROM public.sales
    WHERE status = 'completed'
    GROUP BY offer_id, date
),
daily_work AS (
    SELECT
        offer_id,
        date(started_at) AS date,
        sum(duration_minutes) AS total_minutes
    FROM public.work_sessions
    WHERE duration_minutes IS NOT NULL
    GROUP BY offer_id, date(started_at)
)
SELECT
    COALESCE(ds.offer_id, dr.offer_id, dw.offer_id) AS offer_id,
    COALESCE(ds.date, dr.date, dw.date) AS day,
    COALESCE(dr.total_revenue, 0) AS revenue_cents,
    COALESCE(ds.total_spend, 0) AS spend_cents,
    (COALESCE(dr.total_revenue, 0) - COALESCE(ds.total_spend, 0)) AS profit_cents,
    COALESCE(dw.total_minutes, 0) as minutes
FROM daily_spend ds
FULL OUTER JOIN daily_sales dr ON ds.offer_id = dr.offer_id AND ds.date = dr.date
FULL OUTER JOIN daily_work dw ON COALESCE(ds.offer_id, dr.offer_id) = dw.offer_id AND COALESCE(ds.date, dr.date) = dw.date;

COMMENT ON VIEW public.offer_summary IS 'Visão agregada diária de desempenho por oferta.';


-- -----------------------------------------------------------------------------
-- ÍNDICES: Otimizam consultas comuns, especialmente filtragens por usuário e data.
-- -----------------------------------------------------------------------------
CREATE INDEX ON public.offers (user_id);
CREATE INDEX ON public.channels (user_id);
CREATE INDEX ON public.campaigns (user_id);
CREATE INDEX ON public.campaigns (offer_id);
CREATE INDEX ON public.spend_events (user_id);
CREATE INDEX ON public.spend_events (date);
CREATE INDEX ON public.sales (user_id);
CREATE INDEX ON public.sales (date);
CREATE INDEX ON public.sales (status);
CREATE INDEX ON public.work_sessions (user_id);
CREATE INDEX ON public.work_sessions (started_at);

-- -----------------------------------------------------------------------------
-- POLÍTICAS DE RLS (ROW LEVEL SECURITY):
-- Essencial para a segurança em um ambiente multi-tenant.
-- Garante que um usuário só possa ver e manipular seus próprios dados.
-- -----------------------------------------------------------------------------

-- RLS para a tabela 'offers'
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own offers" ON public.offers
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
COMMENT ON POLICY "Users can manage their own offers" ON public.offers IS 'Política RLS que permite acesso total (SELECT, INSERT, UPDATE, DELETE) aos próprios dados do usuário.';

-- RLS para a tabela 'channels'
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own channels" ON public.channels
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
COMMENT ON POLICY "Users can manage their own channels" ON public.channels IS 'Política RLS que permite acesso total aos próprios dados do usuário.';

-- RLS para a tabela 'campaigns'
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own campaigns" ON public.campaigns
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
COMMENT ON POLICY "Users can manage their own campaigns" ON public.campaigns IS 'Política RLS que permite acesso total aos próprios dados do usuário.';

-- RLS para a tabela 'spend_events'
ALTER TABLE public.spend_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own spend events" ON public.spend_events
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
COMMENT ON POLICY "Users can manage their own spend events" ON public.spend_events IS 'Política RLS que permite acesso total aos próprios dados do usuário.';

-- RLS para a tabela 'sales'
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sales" ON public.sales
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
COMMENT ON POLICY "Users can manage their own sales" ON public.sales IS 'Política RLS que permite acesso total aos próprios dados do usuário.';

-- RLS para a tabela 'work_sessions'
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own work sessions" ON public.work_sessions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
COMMENT ON POLICY "Users can manage their own work sessions" ON public.work_sessions IS 'Política RLS que permite acesso total aos próprios dados do usuário.';

