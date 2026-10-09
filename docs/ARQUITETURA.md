# Arquitetura

## Stack

- **Next.js 16** (App Router, Cache Components, Turbopack) + React 19 + TypeScript estrito.
- **Tailwind CSS 4**, com design tokens em `src/app/globals.css`.
- **Supabase:** Postgres, Auth e RLS.
- **Claude** (`@anthropic-ai/sdk`) para o mentor.
- **Vitest** para as regras de domínio.

## Camadas

```
content/   dados (JSON): Bíblia, pacotes de jogos, companheiros…
domain/    regras puras, sem React e sem banco, 100% testáveis
lib/       store do cliente, clientes Supabase, serviços de servidor
app/       páginas e route handlers
components/ UI
```

## O motor de progressão

`applyActivity(estado, atividade, { day, alreadyClaimed })` em `src/domain/progression/engine.ts` é a **única** implementação das regras. Ele:

1. Valida a atividade e calcula a **chave de idempotência**. Por exemplo: `chapter:jo.3:2026-10-09`, `quiz:<sessão>` ou `fav:jo.3.16`.
2. Aplica o XP base, respeitando o **limite diário** de cada tipo. Acima do limite a atividade conta para missões e estatísticas, mas não paga XP.
3. Atualiza a **sequência** (com Escudos da Fé), as **missões do dia** e o **bônus de dia completo**.
4. Desbloqueia **conquistas** em laço até estabilizar.
5. Devolve o novo estado e uma "recompensa" detalhada, que a interface exibe.

Modos de execução:

- **Visitante:** o motor roda no navegador e o estado fica no `localStorage`.
- **Conta:** o cliente envia a atividade bruta para `POST /api/progress`. O servidor valida com zod, recalcula a pontuação de quizzes a partir das respostas, roda o motor e grava tudo **atomicamente** com `commit_progress`. Essa função insere o evento no livro-razão (`xp_events`, chave única) e atualiza o estado com controle de versão otimista; em conflito, recarrega e tenta de novo.

### Valores atuais

| Atividade | XP | Limite diário | Repetição |
|---|---|---|---|
| Capítulo lido | 10 (+5 na primeira vez) | 30 | 1× por capítulo por dia |
| Quiz | 2/3/5 por acerto (fácil/médio/difícil) + 10 se gabaritar | 6 | por sessão |
| Versículo favoritado | 2 | 10 | 1× por versículo |
| Versículo destacado | 1 | 15 | 1× por versículo |
| Reflexão escrita | 5 | 5 | 1× por versículo por dia |
| Versículo do dia | 3 | 1 | 1× por dia |
| Pergunta ao mentor | 3 | 5 | registrada pelo servidor |

- **Níveis:** XP total para alcançar o nível *n* = `50 × (n−1)^1.5`. São 50 títulos e 9 patentes.
- **Sequência:** um dia sem atividade zera a sequência, a menos que haja Escudos da Fé. Ganha-se 1 escudo a cada 7 dias seguidos, com máximo de 2.
- **Missões:** 3 por dia (sempre uma de leitura), sorteadas de forma determinística pela data. Concluir as três dá +25 XP.
- **Dia:** é calculado no fuso `America/Sao_Paulo`, igual no cliente e no servidor.

## Segurança (resumo)

- RLS em todas as tabelas. Políticas só do dono.
- Privilégios por coluna em `profiles`: o cliente só altera `display_name`, `companion_id` e `avatar_url`. `plan` e `is_admin` são intocáveis pelo cliente.
- `user_progress`, `xp_events`, `ai_usage` e `mentor_messages` não têm escrita pelo cliente. `commit_progress` e `consume_ai_quota` só podem ser executadas pelo `service_role`, e a chave de serviço existe apenas no servidor.
- O mentor verifica sessão e cota **no servidor** antes de chamar a IA.
- A resposta da IA é renderizada como elementos React; não se usa `innerHTML`.
- Esses ataques foram testados contra um Postgres real com a migration aplicada: autopromoção para premium ou admin, escrita direta de XP, chamada das funções internas e escrita nos dados de outro usuário. Todos foram bloqueados.

## O mentor

- `src/lib/server/mentor-prompt.ts` define o prompt-base (estável e cacheado) e a persona do companheiro.
- `POST /api/mentor` faz o streaming em texto puro. O fluxo é:
  1. Verifica sessão e cota.
  2. Chama o Claude com `effort: "low"` (chat), cache do prompt e fallback automático do servidor em caso de recusa indevida.
  3. Grava a conversa e registra a atividade `mentor_question`.

## Como adicionar um jogo de quiz

1. Crie `src/content/games/<id>.json` no formato `QuizQuestion[]`.
2. Registre o pacote em `src/content/games/index.ts`.
3. Pronto: a página `/jogos/<id>`, a pontuação no servidor e o XP já funcionam.

Motores novos (ligar pares, linha do tempo etc.) seguem o mesmo padrão: um componente de motor, um tipo de pacote e uma função de pontuação em `domain/games`, que o servidor usa para validar.

## Tradução bíblica

O texto usado é a **NVI**, a mesma que o projeto anterior já tinha. A NVI é protegida por direitos autorais (Biblica). Para uso comercial, é preciso licenciá-la ou trocar por uma tradução de domínio público ou com licença livre. O código é independente da tradução: basta colocar outros arquivos em `src/content/bible/<id>/` e ajustar `src/lib/server/bible.ts`.
