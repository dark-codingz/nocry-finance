# NoCry Finance

Projeto Next.js para gestão financeira pessoal com foco em clareza e controle de gastos diários.

## Começando

### 1. Instalação

Clone o repositório e instale as dependências:
```bash
git clone <URL_DO_REPOSITORIO>
cd nocry-finance
npm install
```

### 2. Configuração do Ambiente

O projeto utiliza variáveis de ambiente para se conectar ao Supabase e para habilitar ferramentas de desenvolvimento.

1.  **Crie o arquivo de ambiente local:**
    Copie o arquivo `.env.example` para um novo arquivo chamado `.env.local`.
    ```bash
    cp .env.example .env.local
    ```
    *Nota: O arquivo `.env.local` é ignorado pelo Git por segurança.*

2.  **Preencha as variáveis:**
    Abra o `.env.local` e substitua os placeholders pelas suas credenciais do Supabase:
    - `NEXT_PUBLIC_SUPABASE_URL`: Encontrado em *Project Settings -> API -> Project URL*.
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Encontrado em *Project Settings -> API -> Project API Keys -> anon public*.

3.  **Ferramentas de Desenvolvimento (Opcional):**
    Para habilitar páginas de auxílio ao desenvolvimento (como `/dev/seed`), mantenha a variável `NEXT_PUBLIC_DEV_TOOLS` como `"true"`. Em produção, remova esta variável ou defina-a como `"false"`.

### 3. Configuração do Supabase

Para que a autenticação funcione corretamente:

1.  **Habilite o Provedor de E-mail:**
    - No seu Supabase Dashboard, vá para **Authentication -> Providers**.
    - Encontre **Email** e habilite-o.

2.  **Configure a URL do Site:**
    - Vá para **Authentication -> URL Configuration**.
    - Defina o **Site URL** como `http://localhost:3000` para o ambiente de desenvolvimento. Isso é crucial para que os links de autenticação (Magic Link) redirecionem corretamente.
    - *Dica: Ao testar o login, clique no link recebido por e-mail no mesmo navegador onde a aplicação está rodando.*

### 4. Rode o Projeto

Com tudo configurado, inicie o servidor de desenvolvimento:
```bash
npm run dev
```
A aplicação estará disponível em [http://localhost:3000](http://localhost:3000).

---

## Rotas Principais

- `/`: Dashboard principal com os indicadores financeiros (SDM e Disponível Hoje).
- `/login`: Página de autenticação por e-mail (Magic Link).
- `/onboarding`: Fluxo inicial para configuração da conta, cartões e contas fixas.
- `/digital`: Dashboard de desempenho para produtos/serviços digitais.
- `/digital/registrar`: Página para registro manual de gastos e vendas do módulo digital.
- `/config`: Página de diagnóstico para verificar a conexão com o Supabase.
- `/dev/seed`: (Apenas em desenvolvimento) Ferramenta para popular o banco de dados com dados de teste.
