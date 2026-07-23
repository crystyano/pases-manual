# ADRs — Registros de Decisão de Arquitetura

Um **ADR** (Architecture Decision Record) registra uma decisão relevante com seu contexto, alternativas e — tão importante quanto — o **gatilho de revisão**: a condição que deve nos fazer reavaliá-la. ADRs nunca são apagados; quando uma decisão muda, o ADR antigo é marcado como *substituído* e aponta para o novo.

**Modelo para novos ADRs:**

```markdown
## ADR-0XX — Título {#adr-0xx}
**Status:** Proposto | Aceito | Substituído por ADR-0YY · **Data:** AAAA-MM-DD
### Objetivo
### Alternativas avaliadas
### Decisão
### Justificativa
### Consequências e riscos
### Quando revisar
```

---

## ADR-001 — Ubuntu LTS como sistema operacional {#adr-001}

**Status:** Aceito <span class="badge badge-planejado">Planejado</span> · **Data:** 2026-07-18

### Objetivo
Padronizar a plataforma sobre um sistema estável, amplamente suportado e compatível com o ecossistema de IA.

### Alternativas avaliadas
Windows 11 (familiaridade, mas ecossistema de IA/containers inferior e camadas extras como WSL2), Fedora (moderno, mas ciclo de vida curto — ~13 meses por versão), Arch Linux (controle total, mas custo de manutenção incompatível com uma equipe de uma pessoa), Debian Stable (estável, porém pacotes e kernels mais antigos para hardware recém-lançado).

### Decisão
Ubuntu LTS. Versão definida em 21/07/2026: **26.04 LTS "Resolute Raccoon"** (kernel 7.0, suporte até 2031) — preferida à 24.04 pelo suporte nativo ao hardware recém-lançado da estação (Zen 5, X870E, RTX Blackwell). Registro da instalação no [Capítulo 5](../05-ubuntu.md).

### Justificativa
Melhor interseção entre estabilidade (5 anos de suporte), compatibilidade com CUDA/drivers NVIDIA, Docker, PostgreSQL e ferramentas de IA — a maioria dos projetos de IA documenta e testa primeiro em Ubuntu. Hardware Zen 5 + RTX série 50 exige kernel e drivers recentes, que as versões LTS atuais já fornecem via HWE.

### Consequências e riscos
Pacotes do repositório padrão podem ser conservadores; quando necessário, versões novas virão via repositórios oficiais dos projetos (Docker, PostgreSQL, NVIDIA) e não de PPAs de terceiros.

### Quando revisar
Se o suporte da NVIDIA/CUDA ao Ubuntu se degradar, ou se uma mudança significativa no ecossistema (ex.: imutáveis como NixOS/Fedora Silverblue amadurecerem para este uso) justificar nova análise.

---

## ADR-002 — MkDocs Material como tecnologia do manual {#adr-002}

**Status:** Aceito <span class="badge badge-existe">Existe</span> · **Data:** 2026-07-18

### Objetivo
Escolher a tecnologia do manual vivo da plataforma, priorizando o custo de manutenção ao longo de anos.

### Alternativas avaliadas
**HTML artesanal modular** (proposta original: páginas HTML com CSS/JS compartilhados — controle visual total, mas cada atualização exige editar HTML manualmente e busca/menu/índice precisam ser mantidos à mão), **HTML único gigante** (portátil, mas inviável acima de algumas centenas de páginas), **Docusaurus** (excelente, porém traz o ecossistema Node/React para um documento que não precisa disso), **Wiki (ex.: Wiki.js)** (bom para colaboração, mas exige servidor rodando e afasta o conteúdo do Git).

### Decisão
MkDocs com tema Material, conteúdo em Markdown, versionado em Git junto aos projetos.

### Justificativa
O custo de manter o manual vivo é o critério dominante (Princípio P5). Com MkDocs, uma atualização é editar um arquivo Markdown; menu, busca, dark mode, diagramas Mermaid e responsividade vêm do tema. O site gerado é estático, funciona offline e pode ser servido pelo Nginx da própria estação. É o mesmo modelo usado por documentações profissionais de referência.

### Consequências e riscos
Exige Python instalado para *gerar* o site (não para lê-lo). O visual é o do tema, personalizado por CSS — menos liberdade que HTML artesanal, o que é aceitável.

### Quando revisar
Se o manual precisar de funcionalidades dinâmicas reais (comentários, edição via web, controle de acesso por seção).

---

## ADR-003 — Claude como arquiteto, modelos locais como executores {#adr-003}

**Status:** Aceito <span class="badge badge-planejado">Planejado</span> · **Data:** 2026-07-18

### Objetivo
Definir a divisão de trabalho entre modelos remotos de ponta e modelos locais.

### Alternativas avaliadas
**Tudo remoto** (máxima qualidade em tudo, mas custo por token em tarefas de volume, dependência total de internet/fornecedor e envio de todo o código para fora), **tudo local** (custo zero por token e privacidade total, mas modelos locais ainda ficam atrás em raciocínio arquitetural complexo), **divisão por papel** (raciocínio e revisão no melhor modelo; volume e repetição no local).

### Decisão
Divisão por papel: Claude atua como arquiteto/revisor; modelos locais atuam como executores/implementadores.

### Justificativa
Concentra o custo do modelo de ponta onde há mais retorno (decisões e revisões — artefatos pequenos e auditáveis) e move o volume para onde o custo marginal é energia elétrica. Reduz exposição de código sensível e mantém a estação funcional sem internet (Princípios P1 e P3).

### Consequências e riscos
Exige especificações bem escritas na fronteira arquiteto→executor; a qualidade do executor local limita o que pode ser delegado. A fronteira deve ser reavaliada a cada geração de modelos locais.

### Quando revisar
A cada troca significativa de geração dos modelos locais, ou se o custo/qualidade dos modelos remotos mudar a ponto de inverter a equação.

---

## ADR-004 — AI Gateway como camada de desacoplamento {#adr-004}

**Status:** Proposto <span class="badge badge-proposto">Proposto</span> · **Data:** 2026-07-18

### Objetivo
Evitar que os projetos da Protustech dependam diretamente de um fornecedor ou modelo de IA específico.

### Alternativas avaliadas
**Integração direta em cada projeto** (mais simples no início, mas cada troca de modelo exige alterar todos os projetos), **biblioteca compartilhada** (centraliza o código, mas cada projeto ainda embute credenciais e a troca exige redeploy de tudo), **gateway como serviço** (um único serviço HTTP interno que roteia, cacheia e loga).

### Decisão (proposta)
Gateway como serviço interno na estação. A ferramenta concreta (LiteLLM, OpenRouter self-hosted, ou implementação própria) será decidida em ADR complementar quando a infraestrutura estiver de pé.

### Justificativa
Um ponto único de troca de fornecedor (P2, P3), de medição de custo e de aplicação de cache. Os projetos falam um protocolo estável; o mundo da IA muda atrás do gateway.

### Consequências e riscos
Um serviço a mais para operar e monitorar; ponto único de falha interno — mitigável por ser stateless e fácil de reiniciar.

### Quando revisar
Na implantação (escolha da ferramenta) e sempre que o padrão de consumo de IA dos projetos mudar significativamente.

---

## ADR-005 — PostgreSQL como banco relacional padrão {#adr-005}

**Status:** Aceito <span class="badge badge-existe">Em uso (Moventus/Supabase)</span> · **Data:** 2026-07-18 · **Atualizado:** 2026-07-21

### Objetivo
Padronizar o banco relacional de todos os projetos e serviços da plataforma.

### Alternativas avaliadas
**MySQL/MariaDB** (popular, mas historicamente mais permissivo com integridade de dados e menos rico em tipos e extensões), **SQLite** (perfeito para aplicações embarcadas e protótipos — continuará sendo usado nesses nichos — mas não para serviços concorrentes), **SQL Server Express** (limites de licença e pior integração com o ecossistema Linux/Docker).

### Decisão
PostgreSQL para tudo que for serviço; SQLite permitido em aplicações desktop embarcadas.

**Fato já em produção (2026-07-21):** o banco do **Moventus** roda em **Supabase** (PostgreSQL gerenciado, organização Protustech, plano Pro). Isso valida a padronização na prática e define a fronteira a documentar no [Capítulo 6](../06-infraestrutura.md): **Supabase para produção** dos produtos; **PostgreSQL local da estação para desenvolvimento, testes e serviços internos da plataforma** — mesmo motor, ambientes distintos.

### Justificativa
**Por que PostgreSQL e não MySQL?** Integridade estrita por padrão, tipos ricos (JSONB, arrays, ranges), extensões que a plataforma provavelmente usará (`pgvector` para embeddings — possivelmente simplificando a pilha de RAG), ferramentas de réplica e backup maduras, e licença verdadeiramente livre. É também o padrão de fato do ecossistema de IA e ORMs modernos.

### Consequências e riscos
Um único SGBD para operar, monitorar e fazer backup — simplifica os Capítulos 12 e 14. Migração de dados legados (se houver bancos em outros formatos) precisará de plano próprio.

### Quando revisar
Quando o RAG for implementado (avaliar `pgvector` vs. Qdrant dedicado — pode gerar novo ADR), e se algum produto exigir características que o PostgreSQL não atenda.

---

## ADR-006 — restic + Google Drive como backup externo {#adr-006}

**Status:** Aceito <span class="badge badge-planejado">Planejado</span> · **Data:** 2026-07-21

### Objetivo
Garantir que, na perda total do equipamento, todos os dados insubstituíveis existam fora do prédio, criptografados, com RPO de 1 dia.

### Alternativas avaliadas
**Backblaze B2** (serviço dedicado a backup, ~US$ 6/TB/mês, desempenho previsível — seria a escolha puramente técnica), **Cloudflare R2 / AWS S3** (robustos, custo e complexidade um pouco maiores), **Google Drive** (conta já existente, custo zero adicional, API com *throttling*), **HD externo rotacionado manualmente** (barato, mas depende de disciplina humana e o "fora do prédio" raramente acontece na prática).

### Decisão
**restic** (criptografia do lado da estação + deduplicação + verificação) com backend **rclone → Google Drive**, aproveitando a conta existente. Backup diário automatizado (madrugada), RPO 1 dia.

### Justificativa
O volume crítico é pequeno (~100–200 GB; modelos de IA e SO ficam fora por serem reconstruíveis), o custo é zero sobre a conta existente, e a criptografia do restic elimina a preocupação de privacidade no Drive. A ferramenta é agnóstica ao destino: trocar de nuvem é uma linha de configuração.

### Consequências e riscos
*Throttling* da API do Drive pode alongar a janela noturna. A senha do restic vira ponto crítico: precisa existir fora da estação (regra 14.4).

### Quando revisar
**Gatilho objetivo:** se a janela de backup noturna estourar ou falhar com frequência (alerta do Cap. 12), migrar o destino para Backblaze B2 — plano B já nomeado no Capítulo 14.
