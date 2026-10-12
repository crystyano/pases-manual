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

---

## ADR-007 — ComfyUI como plataforma de geração de imagem e vídeo, com Z-Image-Turbo e Wan 2.2 5B {#adr-007}

**Status:** Aceito <span class="badge badge-existe">Em uso</span> — **parcialmente substituído pelo [ADR-008](#adr-008)** quanto ao *modelo de vídeo principal* (o ComfyUI, o Z-Image-Turbo e o bind em `127.0.0.1` seguem valendo) · **Data:** 2026-10-08

### Objetivo
Dar à estação a capacidade de gerar imagens e vídeos localmente (material de produto, mockups, protótipos visuais), sem depender de serviços pagos por geração e sem enviar material dos produtos para fora da máquina — respeitando o teto de hardware (uma GPU de 16 GB) e o limite de energia do nobreak (600 W).

### Alternativas avaliadas
**Quanto à plataforma:** outras interfaces locais de geração **não foram avaliadas** — a decisão se apoiou no fato de o **ComfyUI** ter suporte nativo e templates oficiais para todos os modelos considerados (LTX, Wan, MiniMax H3, FLUX, Z-Image). Ele não é um modelo, e sim o motor que os executa. Se uma alternativa vier a ser cogitada, este ADR deve ser reaberto.

**Quanto aos modelos** (levantamento de 07/10/2026, a partir de fontes secundárias com requisitos de VRAM divergentes):

- **LTX 2.5** — caminho oficial pede 32 GB de VRAM; em 16 GB só por quantizações GGUF da comunidade, com perda de qualidade e velocidade. Descartado como primeira escolha.
- **MiniMax H3** (33B, pesos abertos desde 03/08/2026) — versão aberta limitada a 768p, upscaler de 2K só via API, e uma fonte relata restrição geográfica de licença (não confirmada). Descartado por ora; relida a licença, pode voltar.
- **FLUX.2 [dev]** — 24 GB ou mais e licença não comercial. Descartado.
- **Wan 2.2 A14B** — melhor movimento, mas apertado em 16 GB e sem áudio. Reservado para depois.
- **LTX-2.3 (FP8)** — vídeo com áudio e cabe em 16 GB, porém com termos comerciais a ler. Reservado para a segunda rodada.

### Decisão
Adotar o **ComfyUI** (instalação nativa em `/srv/pases/comfyui`, venv Python 3.12, PyTorch cu130), servido **somente em `127.0.0.1:8188`**, fixo na **RTX 5060 Ti**, como serviço systemd de usuário. Primeira rodada de modelos, ambos **Apache 2.0**:

- **Z-Image-Turbo** (imagem, bf16);
- **Wan 2.2 TI2V-5B** (vídeo, fp16), com codificador de texto em fp8.

Os modelos ficam em `/dados/modelos/comfyui/` e a saída em `/scratch/comfyui/output/`. Detalhes e benchmarks no [Capítulo 8A](../08a-imagem-video.md).

### Justificativa
- **Cabe no hardware:** os dois modelos rodaram na 5060 Ti sem falhar, inclusive o vídeo de 5 s em 720p (9 min 12 s), com pico de 75 °C e ~165 W somados das duas GPUs.
- **Licença limpa:** Apache 2.0 em ambos, sem aceite de termos nem restrição comercial identificada.
- **Instalação nativa, não em container**, pelo mesmo motivo do Ollama ([Cap. 6.1](../06-infraestrutura.md)): acesso direto às GPUs com o mínimo de camadas.
- **Sem login ⇒ sem exposição:** o ComfyUI não tem autenticação; por isso o bind em `127.0.0.1`.
- **Começar pequeno:** dois modelos validados antes de acumular um catálogo — o ecossistema muda em meses, e cada modelo extra custa dezenas de GB de disco.

### Consequências e riscos
- **Convivência com o Ollama:** o LLM carregado ocupa VRAM da mesma GPU (hoje o `qwen-cline`, 22 GB divididos entre as duas; na redação deste ADR era o Devstral, depois removido); é preciso descarregá-lo (`ollama stop`) antes de gerar vídeo. Isso é uma regra de operação, não automatizada.
- **VRAM no limite em 720p:** o teste de 1280×704 usou 15,8 GB dos 15,85 GB; funcionou por offload para RAM, mas é a fronteira do hardware.
- **Energia:** uma geração por vez; gerações paralelas foram a causa do alarme do nobreak em 22/07/2026.
- **Sem benchmark padronizado ainda:** a qualidade foi avaliada visualmente (1 imagem e 3 quadros de vídeo). Falta uma suíte fixa para imagem/vídeo, equivalente ao PASES-Bench.
- **Disco:** 34 GB de modelos já instalados; a segunda rodada pode somar mais dezenas de GB e reabre a discussão do NVMe dedicado a IA ([Cap. 3.4](../03-hardware.md)).
- **Versionamento:** `comfyui/` (clone + venv) é ignorada no `pases-infra`; só a definição (`comfyui.service`, `extra_model_paths.yaml`) é versionada em `comfyui-config/`, com links simbólicos nos locais de uso ([Cap. 8A.7](../08a-imagem-video.md)).
- **Serviço de usuário:** sem `enable-linger`, o serviço só sobe após o login.

### Quando revisar
- **Segunda rodada de modelos:** se houver caso de uso real que Z-Image/Wan 5B não atenda (texto em imagem, áudio no vídeo, movimento complexo) — reavaliar LTX-2.3, Qwen-Image, FLUX.2 klein ou Wan A14B, com a suíte de benchmark criada antes.
- **Upgrade de GPU** (seção 3.4 do [Cap. 3](../03-hardware.md)): o teto de 16 GB é o principal limitador; mais VRAM reabre LTX 2.5 completo e FLUX.2 [dev].
- **Necessidade de acesso por outras máquinas ou pelos produtos:** exige proxy com autenticação ou integração via AI Gateway ([ADR-004](#adr-004)), e reabre a decisão de bind em `127.0.0.1`.
- **Mudança de licença** de qualquer modelo instalado, ou aparecimento de um modelo aberto claramente superior no mesmo orçamento de VRAM.

---

## ADR-008 — LTX 2.5 como modelo de vídeo principal {#adr-008}

**Status:** Aceito <span class="badge badge-existe">Em uso</span> · **Data:** 2026-10-08 · **Substitui parcialmente:** [ADR-007](#adr-007) (apenas a escolha do Wan 2.2 5B como modelo de vídeo)

### Objetivo
Ter, na estação, um modelo de vídeo com qualidade e velocidade úteis para protótipos e material visual, depois de o primeiro modelo (Wan 2.2 5B) ter produzido resultados irregulares.

### Alternativas avaliadas
- **Wan 2.2 TI2V-5B** (decisão original do ADR-007): Apache 2.0, roda em 16 GB, mas com resultados irregulares — em 1 de 3 sementes o vídeo saía quase parado ou com elementos não pedidos, e o 720p levava ~9 min.
- **Wan 2.2 A14B:** mais qualidade, mas apertado em 16 GB e sem áudio. Não testado.
- **MiniMax H3:** versão aberta limitada a 768p e licença com dúvida não confirmada. Não testado.
- **WanGP / Pinokio:** interfaces alternativas, vistas em vídeo de terceiros. WanGP adiado; Pinokio descartado por segurança (executa scripts arbitrários).
- **LTX 2.5** (escolhido): testado nos mesmos itens do Wan, com a suíte padronizada ([Cap. 8A.5b](../08a-imagem-video.md)).

### Decisão
Adotar o **LTX 2.5 distilled em int8-convrot** (transformer oficial de 21,5 GB, text encoder Gemma 4 de 15,4 GB, VAEs e upscaler espacial ×2), rodando no **ComfyUI** existente, na RTX 5060 Ti, a partir do template oficial. O Wan 2.2 5B permanece instalado como alternativa de licença limpa.

### Justificativa
Resultados medidos em 08/10/2026, mesma suíte, mesmo hardware:

| Item | Wan 2.2 5B | LTX 2.5 |
|---|---|---|
| Vídeo curto (mediana) | 66 s | 19 s |
| Imagem para vídeo | 69 s | 34,5 s |
| 720p, 5 s | 554 s | 84 s |
| Falhas | 0 de 10 | 0 de 10 |
| Áudio | não | sim |

Leitura visual (do assistente, 3 quadros por vídeo; o áudio não foi avaliado): as 3 sementes do vídeo curto avançam a câmera como pedido; as 2 do 720p ficaram coerentes; o quadro inicial foi respeitado na imagem-para-vídeo. Pontos fracos: a ferramenta muda de forma e as mãos ficam borradas no teste de movimento complexo.

Também houve uma **correção de premissa**: as fontes secundárias de 07/10 diziam que em 16 GB o LTX 2.5 só rodaria por GGUF da comunidade; o transformer oficial rodou com offload dinâmico para a RAM.

### Consequências e riscos
- **Licença própria (LTX-2.x Community License):** gratuita só para entidades com receita anual abaixo de US$ 10 milhões (soma de afiliadas); acima disso, licença paga para uso comercial. O enquadramento foi declarado pelo responsável em 08/10/2026 e **não verificado**. Treinar/destilar modelos derivados para uso comercial exige licença paga.
- **RAM no limite:** pico de 50,7 GB de 59 GB; com o LTX carregado não rodar outras cargas pesadas. Se a RAM virar gargalo, reabrir a discussão (mais RAM, ou WanGP com sua gestão de memória).
- **Acesso restrito no Hugging Face:** exige conta, aceite de licença e token; o token fica em texto simples em `~/.cache/huggingface/token` e deve ser revogado após o uso.
- **Custo por prompt novo (~80 s):** o text encoder e o transformer não cabem juntos na GPU e se alternam a cada prompt; com o mesmo prompt a geração leva ~21 s. O fluxo ideal gera várias sementes por prompt.
- **Comparação com ressalvas:** dimensões ~15% maiores no LTX (múltiplos de 64), versão *distilled* (menos passos) e poucas sementes por item. A avaliação humana (fichas em `bench/results/`) ainda não foi feita.
- **Dependência de um único fornecedor/versão:** o ecossistema muda em meses; os arquivos baixados ficam fixados por SHA-256.

### Quando revisar
- **Receita do grupo se aproximando de US$ 10 milhões** (ou qualquer mudança nos termos da licença): contratar a licença paga ou migrar para o Wan (Apache 2.0).
- **A avaliação humana contrariar a leitura visual** do assistente, ou o áudio ser inadequado.
- **Surgir modelo aberto claramente superior** no mesmo orçamento de memória, ou upgrade de GPU/RAM (reabre Wan A14B, FLUX.2 [dev] e variantes sem offload).
- **Estouro de RAM** durante gerações reais.

### Atualização (2026-10-11) — defeito de configuração do VAE corrigido; decisão mantida
Os vídeos do LTX 2.5 usados nesta decisão tinham um defeito de configuração meu: o `VAEDecodeTiled` foi configurado com blocos temporais de 16 quadros e sobreposição 8 (o template usa 64 e 16), o que gerava uma **queda de nitidez a cada 8 quadros** ("piscar com borrão"). O benchmark não acusou o defeito. Corrigido, a suíte foi **repetida** (rodada `2026-10-11_0055_ltx`): a oscilação de nitidez caiu de 7–29% para **1,8–3,7%** nos itens de vídeo sem movimento intenso, e de 11–29% para 2,3% nas extensões; tempo e memória **não mudaram**. O efeito do defeito era **desfavorável ao LTX** na comparação com o Wan, portanto a **decisão se mantém e se fortalece**. Passou a existir uma métrica objetiva de piscar (`bench/qualidade.py`) em todo relatório. Detalhes e tabela no [Cap. 8A, seção LTX × Wan](../08a-imagem-video.md).

---

## ADR-009 — Qwen-Image 2.1 instalado só para avaliação (licença não comercial) {#adr-009}

**Status:** Aceito <span class="badge badge-existe">Em avaliação</span> — **decisão de uso comercial pendente** · **Data:** 2026-10-09

### Objetivo
Ter na estação um modelo de imagem mais confiável que o Z-Image-Turbo para **texto dentro de imagens** (etiquetas, documentos, mockups), sem comprometer a empresa com uma licença que ela ainda não avaliou.

### Alternativas avaliadas
- **Manter só o Z-Image-Turbo** (Apache 2.0): mais rápido, mas errou número e palavra em texto longo e em interface.
- **Qwen-Image 2.1** (escolhido para avaliar): leve (~7 B, 17,3 GB de arquivos), cabe folgado em 16 GB, mas sob a **Qwen Research License — somente pesquisa ou avaliação**.
- **Qwen-Image 2512** (Apache 2.0): licença limpa, porém ~30 GB e mais pesado em 16 GB. **Testado em 09/10/2026 e reprovado** (ver *Atualização* abaixo).
- **Licenciar o 2.1** para uso comercial (`model-business@notice.qwencloud.com`): condições e custo desconhecidos.

### Decisão
Instalar o **Qwen-Image 2.1** (int8-convrot) no ComfyUI **apenas para avaliação e pesquisa interna**. **Não usar as imagens geradas por ele em materiais comerciais da Protustech** até que uma destas ações seja tomada: (a) obter licença comercial da Qwen; ou (b) ficar só com o Z-Image-Turbo (Apache 2.0) — o Qwen-Image 2512, que seria a alternativa Apache, foi testado e reprovado. Enquanto isso, o **Z-Image-Turbo segue como modelo padrão** de imagem.

### Justificativa
Resultados de 09/10/2026, mesma suíte, mesmo hardware ([Cap. 8A.5](../08a-imagem-video.md)):

| | Z-Image-Turbo | Qwen-Image 2.1 |
|---|---|---|
| Bloco longo com acentos (I5) | 2 de 3 corretas | **3 de 3 corretas** |
| Etiqueta curta (I2) | 3 de 3 | 3 de 3 |
| Mockup de ERP (I3) | títulos errados ("Pedigos") | títulos certos, miúdo ilegível |
| Tempo por imagem | **12 s** | 18 s |

O ganho é real em texto com acentos e números, mas **não resolve interface densa**. Como o ganho é moderado e a licença é restritiva, a decisão correta é avaliar sem usar em produção.

### Consequências e riscos
- **Risco de uso indevido:** é fácil esquecer que o modelo é não comercial. Mitigação: o aviso está no Cap. 8A.3 e na tabela de riscos; nenhuma imagem do Qwen deve ir para material comercial sem decisão registrada aqui.
- **Termos:** lei da China, foro em Hangzhou; quebra de termos obriga a apagar o material. "Built with Qwen" é exigido se o modelo ou suas saídas forem usados para treinar/melhorar outro modelo de IA distribuído.
- **17,3 GB de disco** ocupados por um modelo que pode vir a ser apagado (modelos do ComfyUI: ~91 GB).
- **Avaliação limitada:** 3 sementes por item e leitura visual do assistente; a avaliação humana ainda não foi feita, e I1/I4 não foram avaliados com o Qwen.

### Quando revisar
- **Resposta da Qwen** sobre licença comercial (valor e condições): licenciar o 2.1 ou ficar com o Z-Image. (A alternativa 2512 já foi descartada.)
- **A avaliação humana mostrar que o ganho de texto não compensa** os 50% a mais de tempo → remover o Qwen-Image 2.1 e liberar os 17,3 GB.
- **Mudança dos termos da licença** ou lançamento de um modelo aberto (Apache) com texto igual ou melhor no mesmo orçamento de memória.

### Atualização (2026-10-09) — Qwen-Image 2512 testado e removido
O 2512 (Apache 2.0) foi baixado (30,07 GB, SHA-256 conferido) e testado no item de texto longo (I5), com os parâmetros do template oficial (50 passos, CFG 4): **0 de 3 imagens com texto correto a 1024²** e **0 de 2 à resolução nativa de 1328²**, a **218 s** e **370 s** por imagem (contra 12 s do Z-Image e 18 s do Qwen 2.1), com pico de 37,7 GB de RAM. Foi **descartado e apagado do disco**; o procedimento de reinstalação ficou no [Cap. 8A, passo 6D](../08a-imagem-video.md). Consequência para esta decisão: não existe alternativa Apache melhor que o **Z-Image-Turbo** para texto em imagem; a escolha real é entre **licenciar o Qwen-Image 2.1** (melhor texto) e **ficar com o Z-Image**. Limites: um item, poucas sementes, leitura visual do assistente; a LoRA de 4 passos do 2512 não foi testada.

---

## ADR-010 — FLUX.2 klein 4B para edição de imagens, com VAE do repositório Apache {#adr-010}

**Status:** Aceito <span class="badge badge-existe">Em uso</span> · **Data:** 2026-10-09

### Objetivo
Ter na estação um modelo de **edição de imagens** (mudar cor, material, remover objetos) rápido e de licença livre, para variações de acabamento e retoques de projetos de móveis.

### Alternativas avaliadas
- **FLUX.2 klein 4B** (escolhido): 4 B de parâmetros, **Apache 2.0**, edição com imagens de referência, versão distilled em fp8 de 4,07 GB.
- **FLUX.2 klein 9B:** licença **não comercial**. Não instalado.
- **FLUX.2 [dev]:** 24 GB ou mais e licença não comercial. Descartado.
- **Qwen-Image 2.1** (tem variantes de edição): licença não comercial ([ADR-009](#adr-009)); não testado para edição.
- **Edição "no Photoshop" manual:** fora do escopo da plataforma.

### Decisão
Adotar o **FLUX.2 klein 4B distilled fp8** no ComfyUI, com o encoder `qwen_3_4b_fp8_mixed` **reaproveitado do Z-Image** (sem novo download) e, para o **VAE**, o arquivo `vae/diffusion_pytorch_model.safetensors` do **repositório Apache** `black-forest-labs/FLUX.2-klein-4B`, **não** o `flux2-vae` do `Comfy-Org/flux2-dev`, que o template oficial cita mas cujo repositório está marcado com a licença **não comercial** do FLUX [dev]. Uso previsto: edições simples. **Não usar para compor objetos de duas imagens.**

### Justificativa
Resultados de 09/10/2026 (suíte PASES-Bench Visual, item `E*`; [Cap. 8A.5](../08a-imagem-video.md)):

| Edição | Resultado |
|---|---|
| Mudar a cor (E1) | Muito bom nas 3 sementes |
| Trocar o material (E2) | Muito bom, mas o piso também mudou |
| Remover um objeto (E3) | Excelente nas 3 |
| Compor 2 imagens (E4) | Fraco: o objeto de referência perde a identidade |

Tempo de **5 s** por edição (9 s com 2 referências), 12,6 GB de VRAM, 19,6 GB de RAM, 71 °C, sem falhas. O download novo foi de só ~4,24 GB, e o VAE Apache carregou normalmente no ComfyUI.

### Consequências e riscos
- **VAE não comparado:** não foi verificado se os pesos do VAE Apache (0,17 GB, formato diffusers) são idênticos aos do arquivo do Comfy-Org (0,34 GB). Os resultados foram bons, mas uma diferença sutil de qualidade não está descartada.
- **Encoder fp8:** o template usa o `qwen_3_4b` em bf16; aqui foi usado o fp8 já instalado. O **A/B foi feito em 09/10/2026** (ver *Atualização* abaixo): diferença desprezível; o fp8 fica.
- **Vazamento de edição:** no teste de material, o piso (concreto) também virou madeira. Prompts devem dizer o que **não** pode mudar.
- **Filtros de conteúdo:** a BFL recomenda implementar filtros nos modelos klein; a estação não os tem (uso interno, sem exposição na rede).
- **Avaliação limitada:** 3 sementes por item e leitura visual do assistente; avaliação humana pendente.

### Quando revisar
- **A avaliação humana contrariar** a leitura do assistente.
- **Surgir necessidade de composição de objetos** (E4): testar outras variantes ou modelos.
- **Mudança da licença do klein 4B** ou de qualquer repositório usado.

### Atualização (2026-10-09) — texto para imagem testado
O mesmo modelo foi testado em **texto→imagem** (itens I1–I5, 15 gerações, 0 falhas): **3 s por imagem** e 12,5 GB de VRAM, porém **texto dentro da imagem quebrado** (0 de 3 no bloco longo; título certo em 1 de 3 na etiqueta). Decisão complementar: o klein 4B **serve a rascunhos e conceitos visuais sem texto crítico e a edição**; para **texto na imagem** o modelo indicado continua sendo o Z-Image-Turbo (Apache 2.0) ou, havendo licença, o Qwen-Image 2.1 ([ADR-009](#adr-009)). Limite: versão fp8 com encoder fp8, sem A/B contra o bf16 do template (**A/B feito depois — ver a atualização seguinte**).

### Atualização (2026-10-09) — A/B do encoder fp8 × bf16
O encoder `qwen_3_4b` em **bf16** (o do template oficial, 8,04 GB) foi baixado e comparado ao fp8 em texto→imagem (15 gerações) e em edição (12), nas mesmas sementes: tempo **igual** (3 s / 6 s), VRAM **+2,3 GB** (14,8 contra 12,5 GB), diferença média por pixel de **0,5 a 1,8** nas edições (praticamente idênticas) e texto **igualmente quebrado** em texto→imagem. **Decisão: manter o fp8**; o bf16 foi apagado do disco. Reinstalação documentada no [Cap. 8A, seção 8A.5](../08a-imagem-video.md). Limite: 3 sementes; o modelo do klein em bf16 (7,2 GB) não foi testado.

---

## ADR-011 — Voz local em CPU: Kokoro (texto→fala) e faster-whisper (fala→texto) {#adr-011}

**Status:** Aceito <span class="badge badge-existe">Em uso</span> · **Data:** 2026-10-11

### Objetivo
Ter, na estação, (a) uma forma de **conferir o que os modelos de vídeo falam** — o LTX 2.5 gera voz junto com o vídeo e ninguém aqui consegue ouvir o áudio em automação — e (b) uma voz sintetizada de reserva, caso a voz gerada pelo vídeo não sirva, sem depender de serviços externos.

### Alternativas avaliadas
Levantamento por conhecimento prévio, **sem testar** as concorrentes:
- **Piper** (TTS leve, vozes pt-BR): menor, mas com voz mais robótica.
- **XTTS-v2** e **F5-TTS** (clonagem de voz): melhores em naturalidade e clonagem, mas com licença **não comercial**; descartados por isso.
- **Whisper maior (`medium`/`large`)**: mais preciso, bem mais pesado; o `small` bastou para a frase testada.
- **Inferência na GPU:** descartada para não disputar VRAM e RAM com o ComfyUI (o LTX já usa ~50 GB dos 59 GB de RAM).

### Decisão
Adotar **Kokoro-82M** (Apache 2.0, pt-BR, 327 MB) e **faster-whisper `small`** (MIT, 484 MB), ambos em **CPU**, num ambiente separado (`/srv/pases/tts`, 1,6 GB, não versionado), com os scripts `falar.py` e `transcrever.py` versionados em `/srv/pases/tts-config/`. Autorizado pelo responsável em 11/10/2026.

### Justificativa
- **Resolveu o problema real:** o Whisper conferiu que o LTX 2.5 falou exatamente "Lanchinho errado" em português (plano e vídeo final), e detectou os sons que o modelo gerou sozinho.
- O Kokoro gerou a mesma frase em duas vozes masculinas, conferidas pelo Whisper, e permitiu uma versão alternativa mais grave encaixada na janela da boca.
- Licenças livres e uso comercial permitido; CPU deixa a GPU livre; instalação sem `sudo`.

### Consequências e riscos
- **O Whisper alucina em silêncio/ruído**; o `transcrever.py` marca trechos suspeitos, mas a conferência não é infalível.
- **Qualidade da voz do Kokoro não avaliada por ouvido** (só pelo reconhecimento do Whisper e por medidas); depende da avaliação humana.
- **Dependências frágeis:** `faster-whisper` 1.2.1 é incompatível com o PyAV 19 na leitura de arquivo (contornado); versões fixadas em `tts-config/requirements.txt`.
- **Token revogado em cache** do Hugging Face pode quebrar downloads públicos (contornado por variável de ambiente nos scripts; falta apagar o token).
- Sem clonagem de voz nem sincronia labial automática com a voz sintetizada (só encaixe por tempo).

### Quando revisar
- A **avaliação humana reprovar** a voz do Kokoro ou a do LTX → reavaliar Piper, ou clonagem de voz sob licença comercial adequada.
- Surgir necessidade de **falas longas, dois personagens ou sincronia labial** → testar Whisper maior e modelos de vídeo/dublagem com sincronia.
- **Mudança de licença** de qualquer um dos dois modelos, ou a estação ganhar mais RAM/VRAM para rodar o Whisper maior na GPU.

---

## ADR-012 — Qwen3-Coder 30B-A3B como LLM local de código (o Devstral Small 2 foi removido) {#adr-012}

**Status:** Aceito <span class="badge badge-existe">Em uso</span> · **Registro:** 2026-10-11 (decisão tomada antes; a data exata da troca **não foi registrada** — o Ollama indica modelos instalados há cerca de 2 meses)

### Objetivo
Ter um LLM local de código e agentes (uso com o Cline) com qualidade aceitável para o responsável e velocidade interativa.

### Alternativas avaliadas
- **Devstral Small 2 24B** (a escolha original de julho, [Cap. 8.1](../08-inteligencia-artificial.md)): **removido por não apresentar resultados satisfatórios** (informado pelo responsável em 11/10/2026). Já no primeiro benchmark ele havia gerado uma função de CNPJ com erros reais (Cap. 8.3).
- **Qwen 3.6 27B** (generalista): **não instalado nem testado.**
- **Devstral 2 123B:** descartado em julho (não cabe nas GPUs).

### Decisão
Usar o **Qwen3-Coder 30B-A3B**, quantização Q4_K_M, via Ollama (`qwen3-coder:30b`), e um alias `qwen-cline` (mesmo arquivo; `num_ctx 32768`, `temperature 0.7`, `top_k 20`, `top_p 0.8`) para o **Cline** (extensão do VS Code 4.0.10 encontrada instalada).

### Justificativa
- **Avaliação do responsável:** o Devstral não atendeu; o Qwen3-Coder foi mantido.
- **Medição (11/10/2026, [Cap. 8.3](../08-inteligencia-artificial.md)):** 22 GB em memória, **100% em GPU**, dividido entre a 4070 (~9,6 GB) e a 5060 Ti (~12,3 GB); **91 tok/s** na 1ª chamada e **149,5 tok/s** a quente, bem acima da meta de 20 tok/s; carga fria de 74,5 s.
- Por ser um modelo MoE com ~3 B de parâmetros ativos, é muito mais rápido que o Devstral denso (27,6 tok/s).

### Consequências e riscos
- **Qualidade medida só em parte (ver a atualização abaixo):** o PASES-Bench v1 foi executado **só no Qwen3-Coder** e com fixtures sintéticas; **nunca no Devstral**. A decisão repousa na avaliação do responsável.
- **22 GB de VRAM** dos ~28,5 GB somados: **não convive com o ComfyUI gerando vídeo** na 5060 Ti; é preciso `ollama stop qwen-cline` antes (regra em [Cap. 8A.6](../08a-imagem-video.md)).
- O **Ollama escuta em todas as interfaces, sem autenticação** ([Cap. 13](../13-seguranca.md)).
- Uma única medição de velocidade (1 prompt, 400 tokens, 2 chamadas).

### Quando revisar
- Ao executar o **PASES-Bench v1 com as fixtures oficiais** (ou em outro modelo) e o resultado divergir da avaliação atual.
- Surgir candidato melhor (Qwen 3.6 27B ou outro) na mesma faixa de VRAM.
- Se a convivência com o ComfyUI virar um incômodo frequente (reabrir a discussão de mais VRAM).

### Atualização (2026-10-11) — PASES-Bench v1 executado no Qwen3-Coder
Executado com **fixtures sintéticas** (3 repetições; [Cap. 8.9](../08-inteligencia-artificial.md)). **Operacional: todas as metas cumpridas** (128–148 tok/s, 0,1 s até o 1º token, 100% GPU, RAM de pico 11,8 GB). **Precisão em código: 62,4%, abaixo da meta de 90%**: geração de código 89,9%, **refatoração 0%** (o código refatorado quebra sempre, `NameError: cupom`, nas 3 repetições) e tarefa de agente 97,2%. A decisão **se mantém** (é do responsável), mas deixa de se apoiar só em avaliação subjetiva: há agora um resultado que **reprova o modelo em refatoração**. Limites: uma fixture por item, 3 repetições, sem execução no Devstral e sem os itens de visão. Revisão a fazer: repetir a refatoração com outra fixture e, havendo candidato, rodar a mesma suíte nele.

### Atualização (2026-10-11) — refatoração repetida com outras fixtures
A refatoração foi repetida em **duas fixtures novas** (5 repetições cada; [Cap. 8.9](../08-inteligencia-artificial.md)). **Pedido:** 0% de novo, `NameError: cupom` em 8 de 8 tentativas. **Parcelas:** 93,1%, com erros de limite (`>=` trocado por `>`) em 4 de 5. **Produção:** 100%. Item 2 com as três fixtures: **64,4%**; precisão em código: **83,8%** (62,4% pela definição original), **ainda abaixo da meta de 90%**. A segunda definição foi adotada depois de ver os resultados; as duas estão registradas. A decisão **se mantém**. Uso recomendado: aceitar refatorações do modelo **só com testes rodando**, porque ele pode quebrar o código ou mudar limites sem avisar. Limites: três fixtures do assistente, do mesmo tema; Devstral nunca executado na suíte.

### Atualização (2026-10-11) — Qwen3.8-27B passa a ser o modelo principal
O PASES-Bench no Qwen3.8-27B ([Cap. 8.9](../08-inteligencia-artificial.md)) deu **92,5%** de precisão em código contra **83,8%** do Qwen3-Coder, com metade da velocidade. Por decisão do responsável, o **Qwen3.8 é o modelo principal** ([ADR-013](#adr-013)) e o **Qwen3-Coder permanece instalado** como modelo rápido. Este ADR continua aceito para esse papel; a configuração do Cline **não foi alterada** nesta sessão.

## ADR-013 — Qwen3.8-27B como LLM principal; Qwen3-Coder mantido como modelo rápido {#adr-013}

**Status:** Aceito <span class="badge badge-existe">Em uso</span> · **Data:** 2026-10-11 · **Decisão do responsável**, apoiada pelo PASES-Bench

### Objetivo
Ter um LLM local principal com a melhor qualidade que cabe nas duas GPUs (28 GB de VRAM), sem abrir mão de um modelo rápido para uso interativo.

### Alternativas avaliadas
- **Qwen3.8-27B** (denso, com visão, Apache 2.0, contexto de 256k, Q4_K_M de ~17 GB): **escolhido.** Os benchmarks que a própria Qwen publica o colocam à frente do Qwen3.6-27B (SWE-bench Pro 61,7 contra 53,5; LiveCodeBench v6 90,3 contra 83,9); são números do fornecedor e não foram reproduzidos.
- **Qwen3-Coder 30B-A3B:** **mantido** como modelo rápido (140 tok/s). Perdeu no PASES-Bench: 83,8% contra 92,5%.
- **Qwen3.8-Flash-Next** (MoE de 125B, licença própria) e **Qwen3.8-2.4T**: **não cabem** (centenas de GB de pesos).
- **Qwen3-Coder-Next** (MoE de 80B, 3B ativos): só com offload pesado para a RAM; **não testado.**
- **Devstral Small 2:** o responsável **não quer mais usá-lo**; não foi reinstalado.

### Decisão
Instalar `qwen3.8:27b` pelo Ollama e adotá-lo como **modelo principal**; manter `qwen3-coder:30b` e o alias `qwen-cline`. Os dois somam 40 GB em disco (`/dados/modelos/ollama`). O Ollama foi **atualizado de 0.32.1 para 0.40.3**, exigência do modelo novo.

### Justificativa (medido em 11/10/2026, Cap. 8.9)
- Precisão em código **92,5%** (meta 90%) contra 83,8%; geração de código 98,6% contra 89,9%; agente 100% em 5 a 6 passos contra 97,2% em 10.
- 100% em GPU, 18 GB divididos entre as duas placas, tempo até o 1º token de 0,12 s.

### Consequências e riscos
- **Metade da velocidade** (69 contra 140 tok/s) e mais RAM (18,9 contra 11,8 GB de pico).
- **A vantagem não é uniforme:** o Qwen3-Coder foi melhor na fixture de produção (100% contra 63,4%). Fixtures do assistente, uma amostra pequena.
- **Também quebra comportamento ao refatorar** (5 de 15 execuções): rodar os testes depois é obrigatório.
- **Medido com o raciocínio desligado**; ligado não foi testado. Sem uso real no Cline ainda; **a configuração do Cline não foi alterada**.
- O Ollama continua escutando em `0.0.0.0` sem autenticação ([Cap. 13](../13-seguranca.md)).
- 17 GB de VRAM: **não convive com o ComfyUI gerando vídeo**; `ollama stop` antes, como no ADR-012.

### Quando revisar
- Ao rodar o PASES-Bench com as **fixtures oficiais**, ou com o raciocínio ligado, e o resultado divergir.
- Se o uso real no Cline contrariar a medição.
- Surgir modelo melhor na mesma faixa de VRAM (por exemplo, um Qwen3.8 Coder).

