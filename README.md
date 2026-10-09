# Scriptura

Plataforma gamificada de estudo bíblico: leia a Bíblia, cumpra missões diárias, jogue, mantenha sua sequência ("Fogo Santo") e converse com um mentor de IA que fala no estilo de um personagem bíblico.

Esta é a **nova versão**, reconstruída do zero a partir da análise do projeto anterior (`scriptura-ai`). Veja:

- [`docs/ANALISE-PLATAFORMA-ANTIGA.md`](docs/ANALISE-PLATAFORMA-ANTIGA.md): o que a versão antiga tinha, o que funcionava e o que estava quebrado ou inseguro.
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md): como a nova versão funciona (regras de XP, segurança, motores de jogo).
- [`docs/ROADMAP.md`](docs/ROADMAP.md): as próximas fases.

## O que já funciona (Fase 1)

| Área | O que tem |
|---|---|
| **Bíblia** | Os 66 livros e 1.189 capítulos (NVI), pré-gerados como páginas estáticas. Destaque em 5 cores, favoritos, reflexões por versículo, copiar, "perguntar ao mentor", tamanho de fonte e "continuar lendo". |
| **Gamificação** | XP com curva de níveis, 50 títulos bem-humorados, 9 patentes (Peregrino → Patriarca) e sequência diária com **Escudos da Fé**, que perdoam um dia perdido. Também há 3 missões diárias (iguais para todos no dia), 19 conquistas e limites diários anti-farm. |
| **Jogos** | Motor de quiz reutilizável, com dois pacotes: Quiz Bíblico (300 perguntas, 3 dificuldades) e Verdadeiro ou Falso (110 afirmações), ambos com cronômetro. A pontuação é **recalculada no servidor**. |
| **Mentor (IA)** | Chat em streaming com Claude, persona do companheiro escolhido e perspectiva teológica batista. As referências bíblicas da resposta viram links. Há cota diária por plano. |
| **Contas** | Supabase Auth com e-mail e senha. Sem Supabase configurado, o app funciona em **modo visitante**, salvando o progresso no navegador. |
| **Visual** | Identidade "manuscrito iluminado moderno", com modo escuro automático, responsivo e navegação inferior no celular. |

## Rodando localmente

Pré-requisito: Node.js 20.9+.

```bash
npm install
cp .env.example .env.local   # pode deixar tudo vazio para usar o modo visitante
npm run dev                  # http://localhost:3000
```

Verificações:

```bash
npm run check   # lint + typecheck + testes
npm run build   # build de produção (gera as 1.338 páginas estáticas)
```

## Configurando o Supabase (contas e progresso na nuvem)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Aplique a migration `supabase/migrations/20261009000000_initial_schema.sql`. Use o SQL Editor ou `supabase db push` com a CLI.
3. Em **Authentication → URL Configuration**, adicione `https://SEU-DOMINIO/auth/callback` às Redirect URLs.
4. Preencha no `.env.local` (e na Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`: só no servidor, nunca com o prefixo `NEXT_PUBLIC_`.

## Configurando o mentor (IA)

Defina `ANTHROPIC_API_KEY`. O modelo padrão é `claude-opus-5-5`. Para reduzir o custo por conversa, troque `MENTOR_MODEL` por `claude-sonnet-5-5` ou `claude-haiku-5-5`. A cota diária por plano é configurada em `MENTOR_DAILY_LIMIT_FREE` e `MENTOR_DAILY_LIMIT_PREMIUM`.

## Deploy

O projeto é Next.js 16 puro e funciona direto na Vercel: importe o repositório e configure as variáveis acima.

## Estrutura

```
src/
  app/                 rotas (App Router) e route handlers (/api/progress, /api/mentor)
  components/          UI (leitor, quiz, painel, mentor, perfil…)
  content/             conteúdo em JSON: Bíblia por livro, pacotes de jogos, companheiros, versículos
  domain/              regras puras e testadas: bíblia, referências, XP, níveis, sequência, missões, conquistas, quiz
  lib/                 store do cliente, clientes Supabase, camada de servidor
supabase/migrations/   schema do banco com RLS
docs/                  análise, arquitetura e roadmap
```
