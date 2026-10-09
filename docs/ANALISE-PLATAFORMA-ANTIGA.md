# Análise da plataforma antiga (`scriptura-ai`)

Base analisada: commit `b22c77e` do repositório `alexandreweber1989/scriptura-ai`, em outubro de 2026.

## Visão geral

- **Stack:** React 18 + Vite + Tailwind + shadcn/ui, gerado no Lovable, com backend Supabase (Postgres, Auth e 17 Edge Functions).
- **IA:** Gemini 2.5 Flash via gateway do Lovable. Também usava Gemini direto e OpenAI `gpt-4o-mini` no gerador de roteiros de marketing.
- **Pagamentos:** Mercado Pago (mensal R$ 29,90; anual R$ 299,90) e trial de 24 h.
- **Tamanho:** cerca de 70 páginas, 76 rotas, cerca de 57 arquivos de dados e cerca de 52 mil linhas de TypeScript.

## O que havia de valor (e foi reaproveitado)

| Conteúdo | Situação na nova versão |
|---|---|
| 300 perguntas de quiz com explicação e referência | Migradas para `src/content/games/quiz-classico.json` |
| 110 afirmações de Verdadeiro ou Falso | Migradas para `verdadeiro-ou-falso.json` |
| Companheiros em pixel art (Timóteo, Ester, Davi, Moisés, Noé) e seus guias de voz | Migrados: sprites limpos (o fundo xadrez estava "desenhado" na imagem) e reduzidos de ~1 MB para ~100 KB cada |
| 50 títulos de nível bem-humorados | Migrados para `level-titles.json` |
| Catálogo dos 66 livros (autor, data, tema) | Migrado para `bible-books.json` |
| Texto bíblico NVI (4 MB, não era usado pelo app) | Dividido por livro em `src/content/bible/nvi/` |
| 31 versículos impactantes | Migrados para o versículo do dia |
| Princípios teológicos batistas do mentor | Mantidos no novo prompt do mentor |

Ainda há conteúdo a migrar nas próximas fases: planos de leitura, estudos temáticos e diários, personagens, dicionário (886 linhas), mapas, linha do tempo, genealogia e os dados dos demais minijogos. Também existiam cerca de 1.500 linhas de dados que nenhuma página usava ("Quem Disse?", linha do tempo, caça-palavras); elas também podem ser aproveitadas.

## Problemas encontrados

### Núcleo de gamificação quebrado ou falso

- O XP era somado **no navegador** (ler, somar, gravar) e o usuário podia editar o próprio XP, nível e sequência direto no banco.
- `complete_daily_study` aceitava qualquer ID: dava para ganhar +65 XP infinitamente.
- **As missões diárias nunca podiam ser concluídas:** o alvo era sempre `atual + 1`, e o XP nunca era pago.
- O mapa de atividade (heatmap) era gerado com `Math.random()`.
- Concluir a leitura de um capítulo não dava XP nem registrava progresso.
- As habilidades passivas ("+15% XP", "Escudo da Fé") eram só texto; nada estava implementado.
- A fórmula de nível estava copiada em 7 lugares diferentes.

### Segurança

- **Moderação contornável:** dava para inserir posts, comentários e grupos já com `status='approved'`.
- **Trial infinito:** o usuário podia editar `trial_duration_hours` e `first_login_at` no próprio perfil.
- **Parceiros de oração:** quem enviava o pedido podia ativar a parceria sem o aceite da outra pessoa e depois mandar mensagens diretas.
- **Restrição de plano só no front-end:** as funções de IA não verificavam plano nem trial e não tinham limite de uso. Qualquer conta cadastrada consumia créditos de IA.
- **Webhook do Mercado Pago frágil:** sem assinatura configurada ele aceitava tudo, gerava assinaturas duplicadas e, num pagamento recusado, marcava *todas* as assinaturas como recusadas.
- **Senhas temporárias em texto puro**, por e-mail e em respostas JSON.
- **Ação de admin destrutiva:** "apagar dados de todos os usuários" com um clique.
- A resposta da IA era renderizada com `dangerouslySetInnerHTML`.

### Manutenção

- As migrations divergiam do banco real: tabelas criadas duas vezes e uma tabela (`theme_progress`) que provavelmente nunca existiu em produção. Recriar o banco do zero falharia.
- **Duplicações:** duas listas de versões da Bíblia, sete cópias do parser de streaming e prompts de persona divididos entre cliente e servidor.
- **Arquivos gigantes:** `Admin.tsx` com 2.397 linhas, `Profile.tsx` com 1.108 e `MyRoom.tsx` com 994.
- A Bíblia era baixada em tempo de execução de URLs brutas do GitHub.
- 27 jogos como páginas separadas, muitos com menos de 160 linhas e conteúdo mínimo.
- Rotas novas fora das listas de plano, com mensagem de upgrade errada.

## Decisões para a nova versão

1. **Toda regra de gamificação fica num só lugar** (`src/domain/progression`): funções puras e testadas, executadas no servidor para contas.
2. **O banco não confia no cliente:** XP, nível, plano e papéis só são gravados pelo servidor. O cliente edita apenas o nome, o companheiro e as próprias anotações.
3. **Jogos viram motores alimentados por conteúdo:** um motor de quiz serve vários jogos, e a pontuação é recalculada no servidor a partir das respostas.
4. **O conteúdo fica em JSON versionado**, separado do código.
5. **Escopo primeiro no núcleo:** ler, jogar, perguntar e progredir precisam funcionar de verdade antes de ampliar (comunidade, pagamentos, sala de relíquias…).
6. **O mentor não engana o usuário:** ele interpreta um personagem, mas, se perguntado sinceramente, diz que é uma IA. Ele também traz orientação de cuidado pastoral, como o CVV 188, em situações de risco.
