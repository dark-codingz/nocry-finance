-- /supabase/sql/002_fix_offer_summary_view.sql
-- Este script substitui a view 'offer_summary' por uma versão mais robusta.

-- MOTIVO DA MUDANÇA:
-- A versão anterior usava `FULL OUTER JOIN` diretamente nas datas, o que podia
-- falhar em agregar corretamente dias que tinham apenas gastos, apenas vendas
-- ou apenas sessões de trabalho. A nova abordagem primeiro coleta todos os dias
-- e ofertas com qualquer atividade e depois faz a agregação, garantindo que
-- nenhum dado seja perdido.

-- 1. Remove a view antiga para que possa ser recriada.
DROP VIEW IF EXISTS public.offer_summary;

-- 2. Recria a view com a lógica aprimorada.
CREATE OR REPLACE VIEW public.offer_summary AS
WITH all_activity_days AS (
    -- Coleta todos os pares únicos de (offer_id, day) onde houve qualquer atividade.
    -- O RLS é aplicado implicitamente em cada `SELECT`.
    SELECT offer_id, date AS day FROM public.spend_events
    UNION
    SELECT offer_id, date AS day FROM public.sales
    UNION
    SELECT offer_id, date(started_at) AS day FROM public.work_sessions
),
aggregated_spend AS (
    -- Agrega os gastos por oferta e dia.
    SELECT offer_id, date, sum(amount_cents) AS total_spend
    FROM public.spend_events
    GROUP BY offer_id, date
),
aggregated_sales AS (
    -- Agrega as receitas ('approved') por oferta e dia.
    SELECT offer_id, date, sum(amount_cents) AS total_revenue
    FROM public.sales
    WHERE status = 'approved'
    GROUP BY offer_id, date
),
aggregated_work AS (
    -- Agrega os minutos trabalhados por oferta e dia.
    SELECT offer_id, date(started_at) AS date, sum(duration_minutes) AS total_minutes
    FROM public.work_sessions
    WHERE duration_minutes IS NOT NULL
    GROUP BY offer_id, date(started_at)
)
SELECT
    days.offer_id,
    days.day,
    COALESCE(sales.total_revenue, 0) AS revenue_cents,
    COALESCE(spend.total_spend, 0) AS spend_cents,
    (COALESCE(sales.total_revenue, 0) - COALESCE(spend.total_spend, 0)) AS profit_cents,
    COALESCE(work.total_minutes, 0) AS minutes
FROM all_activity_days days
LEFT JOIN aggregated_spend spend ON days.offer_id = spend.offer_id AND days.day = spend.date
LEFT JOIN aggregated_sales sales ON days.offer_id = sales.offer_id AND days.day = sales.date
LEFT JOIN aggregated_work work ON days.offer_id = work.offer_id AND days.day = work.date;

COMMENT ON VIEW public.offer_summary IS 'Visão agregada diária de desempenho por oferta, otimizada para capturar todas as atividades.';

