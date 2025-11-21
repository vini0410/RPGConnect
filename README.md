# RPGConnect

O RPGConnect é uma aplicação web projetada para facilitar e aprimorar a experiência de sessões de RPG de mesa. A plataforma permite que mestres de jogo criem e gerenciem mesas de RPG, enquanto os jogadores podem se juntar a essas mesas, criar personagens e interagir em tempo real.

## 1. Stack Tecnológica

- **Frontend:**
  - **Framework:** React com Vite
  - **Linguagem:** TypeScript
  - **Roteamento:** Wouter
  - **Gerenciamento de Estado do Servidor:** TanStack Query (React Query)
  - **Estilização:** Tailwind CSS
  - **Componentes:** shadcn/ui
  - **Formulários:** React Hook Form com Zod para validação
- **Backend:**
  - **Framework:** Express.js
  - **Linguagem:** TypeScript
  - **Banco de Dados:** PostgreSQL
  - **ORM:** Drizzle ORM
  - **Autenticação:** Passport.js com sessões
  - **Comunicação em Tempo Real:** WebSockets (ws)
- **Validação de Schema:** Zod (compartilhado entre front e back)

## 2. Como Iniciar o Projeto

### Pré-requisitos

- Node.js (v18 ou superior)
- npm

### Passos para Instalação

1.  **Clonar o repositório:**
    ```bash
    git clone <url-do-repositorio>
    cd RPGConnect
    ```

2.  **Instalar as dependências:**
    ```bash
    npm install
    ```

3.  **Configurar as variáveis de ambiente:**
    - Crie um arquivo `.env` na raiz do projeto.
    - Adicione as variáveis listadas na seção "Variáveis de Ambiente".

4.  **Iniciar a aplicação em modo de desenvolvimento:**
    ```bash
    npm run dev
    ```

A aplicação estará disponível localmente. O servidor backend rodará em um processo e o frontend será servido pelo Vite, geralmente em uma porta como `5173`.

### Outros Scripts

- **`npm run build`**: Compila o frontend e o backend para produção.
- **`npm run start`**: Inicia a aplicação em modo de produção (após o build).
- **`npm run check`**: Executa a verificação de tipos do TypeScript.
- **`npm run db:push`**: Aplica as mudanças do schema do Drizzle ao banco de dados.

## 3. Variáveis de Ambiente

Para rodar o projeto, crie um arquivo `.env` na raiz do diretório com as seguintes variáveis:

| Variável         | Descrição                                                                  | Exemplo                                                 |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`   | A URL de conexão completa para o banco de dados PostgreSQL.                | `postgresql://user:password@localhost:5432/rpgconnect`  |
| `SESSION_SECRET` | Uma string secreta usada para assinar o cookie de ID da sessão.            | `um-segredo-muito-forte-e-longo`                        |
| `PORT`           | A porta em que o servidor Express será executado. O padrão é `5000`.       | `5000`                                                  |

## 4. Endpoints da API

A seguir está uma lista completa dos endpoints da API disponíveis no backend.

| Método | Rota                               | Descrição                                              |
| ------ | ---------------------------------- | ------------------------------------------------------ |
| **POST**   | `/api/register`                    | Registra um novo usuário.                              |
| **POST**   | `/api/login`                       | Autentica um usuário e inicia uma sessão.              |
| **POST**   | `/api/logout`                      | Encerra a sessão do usuário.                           |
| **GET**    | `/api/user`                        | Retorna os dados do usuário autenticado.               |
| **PUT**    | `/api/users/:id`                   | Atualiza as informações de um usuário.                 |
| **GET**    | `/api/tables/owned`                | Retorna as mesas que o usuário autenticado mestra.     |
| **GET**    | `/api/tables/joined`               | Retorna as mesas em que o usuário autenticado joga.    |
| **POST**   | `/api/tables`                      | Cria uma nova mesa de RPG.                             |
| **GET**    | `/api/tables/:id`                  | Retorna os detalhes de uma mesa específica.            |
| **POST**   | `/api/tables/join`                 | Permite que um usuário entre em uma mesa com um código. |
| **GET**    | `/api/tables/:tableId/characters`  | Retorna todos os personagens de uma mesa.              |
| **POST**   | `/api/tables/:tableId/characters`  | Cria um novo personagem em uma mesa.                   |
| **PUT**    | `/api/characters/:id`              | Atualiza as informações de um personagem específico.   |

## 5. Deployment

Para fazer o deploy da aplicação em um ambiente de produção, siga estes passos:

1.  **Build da Aplicação:**
    Execute o comando a seguir para compilar o código do frontend e do backend. O Vite irá gerar os arquivos estáticos do cliente, e o `esbuild` irá transpilar o servidor para a pasta `dist`.
    ```bash
    npm run build
    ```

2.  **Executar em Produção:**
    Após o build ser concluído, inicie o servidor em modo de produção com o seguinte comando. Ele usará o código transpilado na pasta `dist`.
    ```bash
    npm run start
    ```
    Certifique-se de que as variáveis de ambiente (`DATABASE_URL`, `SESSION_SECRET`, `PORT`) estão configuradas no ambiente de produção.

## 6. Fluxos da Aplicação e Rotas

A aplicação é dividida em várias páginas e fluxos principais, cada um interagindo com rotas específicas da API.

### 6.1. Fluxo de Autenticação

- **Página Frontend:** `/auth` (`auth-page.tsx`)

```mermaid
graph TD
    subgraph "Página: /auth"
        A[Usuário acessa a página de autenticação] --> B{Escolhe entre Login e Cadastro};
        B -- Cadastro --> C[Preenche formulário de cadastro];
        C -- Enviar --> D[POST /api/register];
        D -- Sucesso --> E[Redireciona para a Home];
        D -- Erro --> F[Exibe mensagem de erro no formulário];

        B -- Login --> G[Preenche formulário de login];
        G -- Enviar --> H[POST /api/login];
        H -- Sucesso --> E;
        H -- Erro --> I[Exibe mensagem de erro no formulário];
    end
```

### 6.2. Fluxo da Home (Dashboard de Mesas)

- **Página Frontend:** `/` (`home-page.tsx`)

```mermaid
graph TD
    subgraph "Página: / (Home)"
        A[Usuário acessa a Home] --> B[Carregamento de dados];
        B --> C[GET /api/tables/owned];
        B --> D[GET /api/tables/joined];
        C --> E[Exibe lista de Mesas que eu Mestro];
        D --> F[Exibe lista de Mesas que eu Jogo];

        G[Usuário clica em Criar Mesa] --> H[Abre modal de criação];
        H -- Preenche e envia --> I[POST /api/tables];
        I -- Sucesso --> J[Atualiza a lista de mesas e fecha o modal];

        K[Usuário clica em Entrar em uma Mesa] --> L[Abre modal para inserir código];
        L -- Insere código e envia --> M[POST /api/tables/join];
        M -- Sucesso (retorna dados da mesa) --> N[Redireciona para /session/:tableId];
        M -- Erro --> O[Exibe mensagem de erro no modal];
    end
```

### 6.3. Fluxo da Sessão de Jogo

- **Página Frontend:** `/session/:tableId` (`session-page.tsx`)

```mermaid
graph TD
    subgraph "Página: /session/:tableId"
        A[Usuário acessa a página da sessão] --> B[Carregamento de dados iniciais];
        B --> C[GET /api/tables/:id];
        B --> D[GET /api/tables/:tableId/characters];
        B --> E[Conecta ao WebSocket e envia join_table];

        C --> F[Exibe informações da mesa];
        D --> G[Exibe painel de personagens];

        subgraph "Interação em Tempo Real"
            H[Usuário envia mensagem no chat] --> I[Envia chat_message via WebSocket];
            I --> J[Servidor distribui a mensagem para todos na mesa];
            J --> K[Outros clientes recebem a mensagem e atualizam a UI];

            L[Usuário desenha no quadro] --> M[Envia whiteboard_draw via WebSocket];
            M --> N[Servidor distribui o desenho];
            N --> O[Outros clientes atualizam o quadro];
        end
    end
```

### 6.4. Fluxo de Gerenciamento de Conta

- **Página Frontend:** `/account` (`account-page.tsx`)

```mermaid
graph TD
    subgraph "Página: /account"
        A[Usuário acessa a página da conta] --> B[GET /api/user];
        B --> C[Exibe informações do usuário em um formulário];
        C --> D{Usuário clica em Editar};
        D -- Sim --> E[Habilita os campos do formulário];
        E --> F{Usuário altera os dados e clica em Salvar};
        F -- Sim --> G[PUT /api/users/:id];
        G -- Sucesso --> H[Atualiza os dados na UI e desabilita o formulário];
        G -- Erro --> I[Exibe mensagem de erro];
    end
```

## 7. Estrutura do Projeto

```
/
├── client/         # Código do frontend (React/Vite)
│   ├── src/
│   │   ├── components/ # Componentes React reutilizáveis (shadcn/ui)
│   │   ├── hooks/      # Hooks customizados (ex: use-auth)
│   │   ├── lib/        # Funções utilitárias e configurações
│   │   ├── pages/      # Componentes de página (um por rota)
│   │   └── App.tsx     # Definição das rotas com Wouter
├── server/         # Código do backend (Node.js/Express)
│   ├── auth.ts       # Lógica de autenticação com Passport.js
│   ├── db.ts         # Configuração do banco de dados com Drizzle
│   ├── index.ts      # Ponto de entrada do servidor Express
│   ├── routes.ts     # Definição das rotas da API e WebSocket
│   └── storage.ts    # Funções de acesso ao banco de dados (repositório)
├── prisma/         # Contém o schema.prisma para referência e migrações antigas
├── shared/         # Código compartilhado entre frontend e backend
│   └── schema.ts     # Schemas do Drizzle e Zod para validação
└── README.md       # Esta documentação
```