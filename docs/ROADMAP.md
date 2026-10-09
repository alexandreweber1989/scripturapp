# Roadmap

## Fase 1: núcleo sólido ✅ (esta entrega)

- Leitor bíblico completo (destaques, favoritos, reflexões).
- Motor de progressão (XP, níveis, sequência com escudos, missões, conquistas) validado no servidor.
- Motor de quiz com 2 pacotes.
- Mentor de IA com personas e cota.
- Contas Supabase e modo visitante.
- Schema seguro com RLS e testes.

## Fase 2: conteúdo e jogos (em andamento)

Já entregue:
- Trilhas de Jornada (3 trilhas, 32 capítulos) com quiz pós-leitura e desafio final com relíquias.
- Palavra do Dia compartilhável.
- Memorização com repetição espaçada.
- Bloco "Hoje no Scriptura" na página inicial.

Próximos:

- **Novos motores de jogo**, cada um servindo vários jogos antigos:
  - Ligar pares: profecias, paralelos, conexões.
  - Ordenação / linha do tempo: inclui os dados que estavam sem uso.
  - Complete o versículo: flashcards, karaokê, duelo.
  - Pistas progressivas: detetive, desafio diário, "Na Testa".
  - Caça-palavras: dados prontos e sem uso no projeto antigo.
  - Narrativa ramificada: histórias interativas, dilemas.
- Planos de leitura com progresso real (migrar `reading-plans`).
- Estudos diários e temáticos.
- Páginas de personagens, dicionário de termos originais e mapas.
- Palavras de Jesus em vermelho, com dados confiáveis em vez de heurística.
- Comparar traduções, a partir da definição de licenças.

## Fase 3: assinatura e crescimento

- Planos gratuito e premium.
- Checkout no Mercado Pago com webhook idempotente e assinado.
- Landing page pública (SEO) e onboarding curto: escolher o companheiro e definir uma meta.
- PWA (instalar no celular) e lembretes da sequência.
- Painel administrativo enxuto (usuários, planos, conteúdo), sem ações destrutivas em massa.

## Fase 4: comunidade

- Ranking semanal (ligas) baseado no `xp_events`.
- Grupos de estudo e parceiros de oração, com moderação aplicada no banco (status controlado pelo servidor).
- Memória do mentor, opcional e transparente para o usuário.

## Decisões pendentes (do dono do produto)

1. **Tradução bíblica:** licenciar a NVI ou adotar uma tradução livre?
2. **Modelo do mentor:** Opus (máxima qualidade) ou Sonnet/Haiku (custo menor por conversa)?
3. **Preço e limites:** quantas conversas com o mentor no plano gratuito e no premium?
4. **Prioridade da Fase 2:** quais jogos antigos fazem mais falta aos usuários?
