# Changelog - NoCry Finance

<!--
NOTA DE USO:
Este arquivo deve ser atualizado ao final de cada tarefa ou Pull Request significativo.
O objetivo é manter um registro claro das mudanças, facilitando o rastreamento do
histórico do projeto e a compreensão do contexto por trás de cada alteração.
-->

---

## Sprint 2 - Integração de Vendas (23/10/2025)

Esta sprint focou na automação do registro de vendas através da integração com a plataforma Kiwify via webhooks.

### Novas Funcionalidades e Arquivos

- **Endpoint de Webhook (`/api/webhooks/kiwify/route.ts`):**
  - Rota de API criada para receber, validar e processar webhooks da Kiwify.
  - Inclui validação de assinatura HMAC-SHA256 para segurança.
  - Implementa lógica de idempotência usando `upsert` para evitar vendas duplicadas.
  - Mapeia status de eventos da Kiwify (aprovado, reembolso, chargeback) para o status interno.
  - Contém uma lógica de fallback para encontrar ou criar ofertas automaticamente com base nos dados do produto.

- **Cliente de Admin do Supabase (`/lib/supabaseAdmin.ts`):**
  - Criado um cliente Supabase server-side que utiliza a `service_role_key`.
  - Permite que a rota de API realize operações no banco de dados bypassando as políticas de RLS, com a segurança garantida pela validação do webhook.

- **Atualizações no Banco de Dados (`/supabase/sql/004_kiwify_integration.sql`):**
  - **Tabela `sales`:** Adicionada a coluna `source` e um índice único em `(user_id, source, order_id)` para garantir a idempotência. Adicionadas colunas `customer_email` e `payment_method`.
  - **Tabela `offers`:** Adicionada a coluna `external_id` para mapear ofertas a produtos de plataformas externas.

- **Documentação:**
  - `docs/documentacao.md`: Adicionada seção detalhada sobre como configurar o webhook da Kiwify.
  - `.env.example`: Incluídas novas variáveis de ambiente (`SUPABASE_SERVICE_ROLE`, `WEBHOOK_DEFAULT_USER_ID`, `KIWIFY_WEBHOOK_SECRET`).

### Decisões Técnicas

1.  **Segurança Server-to-Server:** A autenticação do webhook é feita estritamente via assinatura criptográfica, que é o padrão da indústria. O uso do cliente de serviço do Supabase foi a escolha correta para um processo de backend que não tem um contexto de usuário autenticado, delegando a responsabilidade de segurança para a validação da assinatura.
2.  **Idempotência no Banco de Dados:** Em vez de verificar a existência de uma venda antes de inserir (o que poderia levar a race conditions), a abordagem de usar `upsert` com um índice único no banco de dados é mais robusta e garante a integridade dos dados de forma atômica.
3.  **MVP Mono-usuário:** A decisão de usar uma variável de ambiente `WEBHOOK_DEFAULT_USER_ID` é uma simplificação pragmática para a fase atual do projeto (mono-usuário). Isso permite que a funcionalidade principal seja entregue rapidamente, com comentários claros no código sobre como a arquitetura precisará evoluir para um sistema multi-tenant.

---

## Sprint Inicial (23/10/2025)

Esta sprint inicial focou na estruturação do projeto, configuração do backend com Supabase e implementação das funcionalidades essenciais para a primeira experiência do usuário.

### Arquivos Criados/Modificados

- **Setup do Projeto:**
  - `package.json`: Configuração inicial com Next.js, TypeScript, Tailwind.
  - `tailwind.config.ts`, `postcss.config.js`, `src/app/globals.css`: Configuração base do Tailwind.
- **Supabase & Auth:**
  - `/supabase/sql/`: Scripts de migração para os schemas `digital` e `personal_finance`.
  - `src/lib/supabaseBrowserClient.ts`: Cliente Supabase para o browser.
  - `src/components/SupabaseProvider.tsx`: Provedor de sessão global.
  - `src/app/layout.tsx`: Integração do `SupabaseProvider`.
  - `.env.example`: Documentação das variáveis de ambiente.
- **Serviços:**
  - `src/services/digital.ts`: Lógica de negócios para o módulo digital (ofertas, vendas).
  - `src/services/finance.ts`: Lógica de negócios para finanças pessoais (contas, cartões, contas fixas).
- **Funcionalidades:**
  - `src/app/login/page.tsx`: Autenticação via Magic Link.
  - `src/app/onboarding/`: Fluxo de onboarding em 3 passos com persistência de dados.
  - `src/app/page.tsx`: Dashboard inicial com "SDM" e "Disponível Hoje".
  - `src/app/digital/`: Dashboard e registro de dados para o módulo digital.
  - `src/app/config/page.tsx`: Healthcheck de conexão com o Supabase.
  - `src/app/dev/seed/page.tsx`: Ferramenta para popular dados de desenvolvimento.
- **Libs e Componentes:**
  - `src/lib/money.ts`: Utilitários para formatação de moeda.
  - `src/lib/finance.ts`: Funções de cálculo para os indicadores financeiros.
  - `src/components/MoneyCard.tsx`: Card reutilizável para exibir valores.

### Decisões Técnicas

1.  **Backend com Supabase:** Escolhido pela facilidade de uso, Postgres integrado e autenticação com Row Level Security (RLS), garantindo a segurança e isolamento dos dados de cada usuário desde o início.
2.  **`@supabase/auth-helpers`:** Utilizado para gerenciar a sessão de forma integrada com o Next.js App Router, simplificando o acesso aos dados do usuário em Componentes de Cliente.
3.  **Valores Monetários em `bigint` (centavos):** Adotado como padrão em todo o banco de dados e serviços para evitar problemas de precisão com ponto flutuante, uma prática robusta para aplicações financeiras.
4.  **Serviços Agnósticos de UI:** A lógica de interação com o banco de dados foi centralizada em `src/services/`, tornando o código mais organizado, reutilizável e fácil de testar, separando as responsabilidades da camada de visualização.
5.  **Cálculos em Funções Puras:** A lógica de cálculo dos indicadores financeiros foi isolada em `src/lib/finance.ts` para facilitar testes e manutenção, sem acoplamento com a UI ou com a busca de dados.
