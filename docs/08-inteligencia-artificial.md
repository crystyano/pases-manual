# 8. Inteligência Artificial

Este capítulo documenta a camada de IA da estação: modelos locais, o papel do Claude e, futuramente, o AI Gateway. A geração de **imagem e vídeo** (ComfyUI) está no [Capítulo 8A](08a-imagem-video.md).

!!! warning "Estado atual dos LLMs (verificado em 11/10/2026)"
    Este capítulo foi escrito em julho com o **Devstral Small 2** como "cérebro local". **Ele foi removido** por não ter apresentado resultados satisfatórios (informado pelo responsável). O que está no Ollama hoje é o **Qwen3-Coder 30B-A3B** (Q4_K_M), em uso com o Cline, além do Qwen3-VL 8B — ver o **inventário verificado na seção 8.8** e o [ADR-012](16-apendices/adrs.md#adr-012). As tabelas e benchmarks do Devstral abaixo são **histórico**.

## 8.1 Seleção inicial de modelos locais <span class="badge badge-planejado">Planejado — definido em 21/07/2026</span>

A estratégia não é um modelo único, e sim um **time de modelos**, cada um dimensionado para a GPU e o papel certos (requisitos definidos: foco em programação, capacidade generalista e visão apurada). A implantação acontece em **duas ondas** — decisão consolidada em 21/07/2026 após análise cruzada de duas recomendações independentes:

### Onda 1 — fundação (instalar agora)

| Papel | Modelo | Tamanho (Q4) | GPU | Justificativa |
|---|---|---|---|---|
| **Executor agentic + generalista + visão de apoio** | **Devstral Small 2 (24B)** <span class="badge badge-confirmar">Removido</span> | ~14 GB | 5060 Ti (16 GB) dedicada | **68% SWE-bench Verified**, contexto de 256k, **multimodal** (visão nativa), Apache 2.0. O cérebro local da estação |
| **Especialista em visão / OCR** | **Qwen3-VL 8B** | ~6 GB | 4070 (12 GB) | Referência em OCR e multilíngue (PT-BR): telas do ERP, projetos Promob, PDFs escaneados, fotos de móveis; até 8 imagens por chamada |

Com esses dois, a estação cobre ~95% do uso: programação agentic, visão apurada, interpretação de documentos e questões gerais (com o Claude como teto para o que for difícil — [Cap. 2](02-arquitetura.md)).

### Onda 2 — após benchmark real da Onda 1

| Papel | Modelo | Tamanho (Q4) | GPU | Gatilho |
|---|---|---|---|---|
| Autocomplete / FIM | Qwen3-Coder 8B | ~5,6 GB | 4070 | Quando o editor for integrado (ghost text) |
| Generalista forte | Qwen 3.6 27B | ~18–22 GB | split nas duas GPUs | O Devstral Small 2 foi removido (seção 8.8); candidato **ainda não instalado** |
| Experimento MoE | Qwen3-Coder 80B-A3B | ~8 GB VRAM + RAM | 5060 Ti + 64 GB RAM | Curiosidade de engenharia: *expert offload* com os 64 GB de RAM |
| Embeddings (RAG — [Cap. 10](10-banco-de-conhecimento.md)) | a definir (bge-m3 / nomic-embed) | <2 GB | 4070 | Quando o RAG entrar (Fase 4 do Roadmap) |

Descartado conscientemente: **Devstral 2 (123B)** — ~75 GB de modelo não cabe em 28 GB de VRAM; mesmo com offload pesado para RAM a experiência seria lenta. Reavaliar apenas com upgrade de GPU (seção 3.4 do [Cap. 3](03-hardware.md)).

Notas de operação:

- O **Ollama carrega/descarrega modelos sob demanda** — os auxiliares da 4070 não precisam caber juntos na VRAM permanentemente.
- Questões acima da capacidade local **sobem para o Claude** (papéis do [Cap. 2](02-arquitetura.md)): o modelo local precisa ser bom no volume, não o melhor em tudo.
- Modelos somam dezenas de GB: a biblioteca vive em `/dados/modelos` (870 QVO — [Cap. 5](05-ubuntu.md)); revalidar espaço antes de cada download.
- Esta tabela é um **retrato de julho/2026**. O ecossistema muda em ciclos de poucos meses; reavaliar a cada mudança de fase do [Roadmap](15-roadmap.md) e registrar substituições aqui.

!!! note "Devstral Small 2 é a escolha inicial — não um casamento"
    Programação é o uso principal da estação, e o Devstral entra como cérebro por reunir agentic + generalista + visão + 256k num único modelo de 16 GB. Mas a escolha é **explicitamente provisória**: se a qualidade de código não atingir os critérios da seção 8.2, o primeiro teste comparativo é contra o **Qwen3-Coder** (ou o equivalente de código da época), rodando o PASES-Bench completo nos dois. Vence o que os números disserem.

    **Atualização (11/10/2026):** o Devstral foi removido por resultados insatisfatórios e o Qwen3-Coder entrou em uso. O PASES-Bench v1 foi executado **só no Qwen3-Coder**, com **fixtures sintéticas** (seção 8.9): ficou **abaixo da meta de precisão em código** (62,4% contra 90%), puxado pela refatoração. **Nunca foi executado no Devstral**, então não há comparação.

## 8.2 Critérios de permanência e PASES-Bench <span class="badge badge-planejado">Planejado</span>

A permanência de um modelo no time é decidida por **critérios objetivos**, não por impressão. Medições sempre nas mesmas condições: modelo já carregado ("quente"), prompt padronizado, `nvidia-smi` e `free -h` monitorados durante o teste.

| Critério | Meta | Como medir |
|---|---|---|
| Velocidade de geração | ≥ 20 tok/s | Resposta ≥ 300 tokens a partir de prompt padrão |
| Tempo até o 1º token (quente) | ≤ 3 s | Prompt curto padronizado, modelo já em VRAM |
| Pico de VRAM | Sem transbordo para RAM | `nvidia-smi` no pico; transbordou = reprovado no papel atual |
| Uso de RAM do runtime | ≤ 75% (~48 GB) | `free -h` durante o teste |
| Precisão em código | ≥ 90% da suíte interna | PASES-Bench itens 1, 2 e 6 |
| Precisão em visão | ≥ 90% dos casos de teste | PASES-Bench itens 3 e 4 |
| Qualidade em português | Sem erros graves | Avaliação manual do item 5 |

### PASES-Bench v1 — suíte padronizada de promoção

!!! note "Estado das fixtures (11/10/2026)"
    As **fixtures oficiais** descritas abaixo (módulo real do Moventus, imagem do Promob, PDF escaneado) **nunca existiram**. Em 11/10/2026 foi executada uma versão com **fixtures sintéticas** de marcenaria e testes automáticos para os itens 1, 2, 5 e 6, apenas no Qwen3-Coder — ver a seção 8.9. Os itens 3 e 4 (visão) não se aplicam a modelos só de texto e **seguem sem execução**.

Nenhum modelo entra em uso oficial (e nenhum é substituído) sem uma execução completa da suíte — **sempre a mesma**, para que gerações futuras de modelos sejam comparáveis em condições idênticas:

1. **Geração de código** — módulo Python/Django típico do Moventus, a partir de especificação fixa
2. **Refatoração** — um módulo real do Moventus (congelado como fixture)
3. **Visão técnica** — análise de uma imagem fixa de projeto Promob ("o que há de errado?")
4. **OCR de documento** — extração de dados de um PDF escaneado fixo (ex.: nota fiscal)
5. **Generalista em PT-BR** — pergunta de negócio fixa, avaliada por clareza e correção
6. **Tarefa agentic** — edição multi-arquivo com uso de ferramentas, ponta a ponta

Cada execução registra: data, modelo + quantização, tok/s, tempo até 1º token, pico de VRAM, RAM, aprovação por item. Os resultados entram em tabela permanente nesta página — o histórico de benchmarks é parte do manual.

## 8.3 Benchmarks registrados <span class="badge badge-existe">Existe</span>

Série histórica de medições reais na estação (condições: Ollama, resposta longa, `--verbose`):

| Data | Modelo | GPU | Carga (fria) | Prompt (tok/s) | **Geração (tok/s)** | Velocidade ≥20 | Observações de qualidade |
|---|---|---|---|---|---|---|---|
| 21/07/2026 | devstral-small-2:24b | **Split: 10,9 GB na 5060 Ti (99% util.) + 8,6 GB na 4070** — pesos + cache KV excedem os 16 GB de uma placa só | 28,0 s (15 GB do SATA) | 21,4 | **27,6** | ✅ | ⚠️ Primeira geração (função CNPJ) **continha erros reais**: dígito verificador calculado sobre 9 dígitos em vez de 12, posições 9/10 em vez de 12/13, e teste autocontraditório. Reforça a revisão obrigatória do fluxo ([Cap. 2](02-arquitetura.md)) — velocidade aprovada, precisão em código só será veredicto após o PASES-Bench completo. Térmica sob carga: 52–61 °C, ~220 W somados |

!!! note "Efeito colateral do split — e a alavanca de tuning registrada"
    Com o Devstral dividido, a 4070 fica com ~9,5 GB ocupados e **não comporta o Qwen3-VL simultaneamente**. O Ollama alterna os modelos sob demanda (troca de ~10–30 s), suficiente para uso alternado. Se o uso *simultâneo* virar necessidade (pipeline agente + visão), reduzir o `num_ctx` do Devstral até ele caber inteiro na 5060 Ti — trocando contexto máximo por residência fixa. Decidir apenas com necessidade real medida.

| 21/07/2026 | qwen3-vl:8b (imagem) | 4070 (troca de modelo em 3,5 s) | 3,5 s | 164,8 (inclui codificação da imagem) | **74,5** | ✅ | Descrição rica e precisa de foto urbana (objetos finos: loja de teclados, troncos pintados, vestuário de pedestre), resposta em PT-BR estruturado. ⚠️ Errou a localização (disse "Europa/Barcelona" para uma cena brasileira) — forte em *o que*, fraco em *onde*. Veredito de OCR/extração exata só com o PASES-Bench (fixture de PDF) |

### Medição do `qwen-cline` (Qwen3-Coder 30B-A3B) — 11/10/2026

`qwen-cline` é o mesmo modelo `qwen3-coder:30b` (30,5 B de parâmetros, MoE, Q4_K_M, 18 GB) com um *Modelfile* próprio: `num_ctx 32768`, `temperature 0.7`, `top_k 20`, `top_p 0.8`, `repeat_penalty 1.05`. É o que o Cline usa. Medição pela API do Ollama, com a VRAM livre antes (ComfyUI reiniciado), um prompt de código (validar CNPJ com testes) e 400 tokens gerados:

| Medida | Valor |
|---|---|
| Tamanho em memória (`ollama ps`) | **22 GB** (pesos de 18 GB + cache de contexto), **100% em GPU** |
| Divisão entre as GPUs | **~9,6 GB na RTX 4070** + **~12,3 GB na RTX 5060 Ti** |
| Carga fria (do SATA) | 74,5 s; a avaliação do prompt na 1ª chamada levou 32 s (inclui aquecimento) |
| Geração, 1ª chamada | **91 tok/s** |
| Geração, 2ª chamada (a quente) | **149,5 tok/s** |
| Temperatura / potência durante a geração | 52–57 °C / 66 e 95 W (GPU 0 e 1) |

Cumpre com folga a meta de velocidade (≥ 20 tok/s) da seção 8.2. **Limites:** um único prompt e duas chamadas; **não mede qualidade** (a qualidade foi medida depois, na seção 8.9), e a diferença entre a 1ª e a 2ª chamada mistura aquecimento com variação. Como ocupa 22 dos ~28,5 GB de VRAM somados, **não convive com o ComfyUI gerando vídeo** na 5060 Ti (descarregar com `ollama stop qwen-cline`).

Pendente: o PASES-Bench v1 com as fixtures **oficiais** (arquivos reais do Moventus, do Promob e uma nota fiscal escaneada). A versão com fixtures sintéticas foi executada em 11/10/2026 (seção 8.9).

## 8.4 Runtime <span class="badge badge-existe">Existe — Ollama</span>

**Ollama instalado e operacional desde 21/07/2026**, com a biblioteca de modelos em `/dados/modelos/ollama` (860 QVO), configurada via override do systemd (`OLLAMA_MODELS`). Onda 1 baixada em julho: `devstral-small-2:24b` (15 GB, **depois removido**) e `qwen3-vl:8b` (6,1 GB). Estado atual do Ollama: `qwen3-coder:30b`, `qwen-cline` e `qwen3-vl:8b` (seção 8.8). O serviço escuta em `0.0.0.0:11434` com `OLLAMA_ORIGINS=*` — ver o levantamento de exposição no [Cap. 13](13-seguranca.md). Quando o AI Gateway entrar ([ADR-004](16-apendices/adrs.md#adr-004)), avaliar llama.cpp/vLLM para cargas específicas — a troca fica invisível para os projetos, que falam com o gateway.

## 8.5 Interface gráfica — Open WebUI <span class="badge badge-existe">Existe — no ar desde 22/07/2026</span>

Interface web tipo ChatGPT para os modelos locais, rodando como stack Docker em `/srv/pases/webui` (`network_mode: host`, porta **3000**, dados em `/srv/pases/data/open-webui`). Acesso: **http://localhost:3000** (também acessível de outros aparelhos da rede local pelo IP da estação, protegido pelo login local — travamento por firewall no [Cap. 13](13-seguranca.md)). Volta sozinha após reboot (`restart: unless-stopped`).

Uso: seletor de modelo no topo do chat; imagens pelo botão de anexo; histórico salvo à esquerda. A primeira conta criada é o administrador.

!!! warning "Modelos não sabem quem são — não use 'quem é você?' como teste"
    Trocar de modelo **no meio de uma conversa** faz o novo modelo herdar o histórico e continuar a persona anterior (caso real registrado em 22/07/2026: Devstral se apresentou como "Qwen3" ao assumir uma conversa iniciada pelo Qwen3-VL). Além disso, a identidade autodeclarada de qualquer modelo local é não confiável por natureza (vem dos dados de treino, não do binário). **Teste válido de qual modelo está rodando: `ollama ps` no terminal.** Para conversas limpas, trocar de modelo sempre em conversa nova (botão +).

!!! tip "Duas configurações que evitam lentidão"
    1. **Modelo de Tarefa**: em *Painel de Administração → Configurações → Interface*, defina o Task Model local igual ao modelo do chat (ou desative geração automática de título/tags). Sem isso, cada mensagem pode disparar troca de modelo na VRAM (10–30 s).
    2. **Thinking × Instruct**: o `qwen3-vl:8b` padrão é a variante **pensante** — gasta centenas de tokens raciocinando antes de responder (medido: ~850 tokens/11 s para uma pergunta trivial, a 78 tok/s). Para o dia a dia, usar **`qwen3-vl:8b-instruct`** (resposta imediata, mesma visão e contexto); reservar a variante pensante para análises complexas que justifiquem o custo do raciocínio.

## 8.6 Proteção de energia — power limit das GPUs <span class="badge badge-existe">Existe — 22/07/2026</span>

**Problema resolvido:** o nobreak ATTIV (600 W) apitava em sobrecarga contínua durante inferência pelo Open WebUI — ver [Cap. 3, seção 3.5](03-hardware.md#35-consumo-e-energia). Causa: inferências paralelas do WebUI (resposta + título + tags + acompanhamento) pegando as duas GPUs ao mesmo tempo e passando dos 600 W.

**Solução em duas camadas:**

1. **Power limit por software** (rede de segurança — aplicada e permanente): serviço systemd `nvidia-powerlimit.service` que capa as GPUs a cada boot. Limites definidos a partir de `nvidia-smi -q -d POWER`:

    | GPU | Padrão | Limite aplicado | Mínimo permitido |
    |---|---|---|---|
    | RTX 4070 (índice 0) | 200 W | **140 W** | 100 W |
    | RTX 5060 Ti (índice 1) | 180 W | **150 W** | 150 W (não desce mais) |

    Pico combinado das GPUs: 380 W → **290 W** (−90 W), com perda de velocidade desprezível (geração de tokens é limitada por banda de memória, não por potência). Serviço em `/etc/systemd/system/nvidia-powerlimit.service`; conferir com `nvidia-smi --query-gpu=index,name,power.limit --format=csv`.

2. **Reduzir concorrência do WebUI** (causa raiz): desligar geração automática de título/tags/acompanhamento e unificar o Task Model (seção 8.5).

!!! note "Por que a inferência-base não é o problema"
    A mesma pergunta ao mesmo modelo **pelo terminal** nunca disparou o apito — prova de que uma inferência isolada cabe nos 600 W. O estouro vinha só da soma de tarefas paralelas do WebUI. O power limit garante o teto mesmo no pior caso simultâneo.

### Estado final aceito (decisão de 22/07/2026)

Após o power limit + desligar a concorrência do WebUI, o apito caiu de **contínuo** (sobrecarga sustentada, perigoso) para **3 bips de menos de 1 segundo no arranque** (transiente de corrente quando as GPUs saem do repouso), seguido de silêncio durante toda a resposta.

**Decisão: manter assim.** O consumo sustentado — o que de fato importa para o hardware — está dentro dos 600 W e protegido. O transiente de partida é inofensivo (nobreaks line-interactive bipam em degraus bruscos de carga por natureza). Ressalva registrada: no instante do arranque a folga é mínima, então uma queda de energia coincidente com esse meio-segundo poderia gerar transição imperfeita para bateria — janela pequena, risco aceitável para estação de desenvolvimento.

**Gatilho para revisão:** se o apito voltar a ser sustentado, ou se a estação passar a rodar cargas mais pesadas de forma rotineira, executar o upgrade para um nobreak senoidal maior (expansão já prevista na [seção 3.4](03-hardware.md)).

## 8.7 Guia de operação diária <span class="badge badge-existe">Existe</span>

### Após ligar ou reiniciar o PC — o que acontece sozinho

1. Os três discos montam automaticamente (fstab — [Cap. 5](05-ubuntu.md)).
2. O serviço do **Ollama inicia sozinho** (systemd).
3. O **PostgreSQL e o Redis voltam sozinhos** (`restart: unless-stopped` no compose — [Cap. 6](06-infraestrutura.md)).

Os **modelos não ficam residentes na VRAM**: são carregados na primeira chamada após o boot (a primeira resposta do `qwen-cline` leva ~75 s a mais — medido: 74,5 s de carga fria de 18 GB do SATA; as seguintes são rápidas). Após alguns minutos sem uso, o modelo descarrega sozinho da VRAM — comportamento normal, não é falha.

### Verificação de 30 segundos (após qualquer boot)

```bash
systemctl is-active ollama
docker compose -f /srv/pases/core/docker-compose.yml ps
ollama list
```

Resultado esperado: `active` · dois containers `(healthy)` · dois modelos listados. Se os três aparecerem, está tudo no ar.

### Uso dos modelos

```bash
# Chat interativo com o LLM de código (sair com /bye)
ollama run qwen-cline

# Pergunta única
ollama run qwen-cline "sua pergunta aqui"

# Visão — o caminho da imagem vai DENTRO da frase (evitar espaços no nome do arquivo)
ollama run qwen3-vl:8b "Descreva esta imagem: /tmp/tela.png"

# Ver o que está carregado na VRAM agora
ollama ps
```

### Recuperação (apenas se a verificação falhar)

```bash
sudo systemctl restart ollama                       # ressuscita o Ollama
cd /srv/pases/core && docker compose up -d          # ressuscita PostgreSQL e Redis
```

## 8.8 Inventário verificado da estação <span class="badge badge-existe">Existe — verificado em 11/10/2026</span>

Levantado na própria máquina (`ollama list`, arquivos do ComfyUI, `docker ps`, `ss`), não por memória. **Sempre que o inventário e outro texto do manual divergirem, vale este.**

### LLMs locais (Ollama, `/dados/modelos/ollama`, 24 GB)

| Modelo | Tamanho | Papel | Observação |
|---|---|---|---|
| `qwen3-coder:30b` | 18 GB | Código e agentes | Qwen3-Coder 30B-A3B, Q4_K_M, contexto de 256k, com ferramentas ([ADR-012](16-apendices/adrs.md#adr-012)) |
| `qwen-cline` | 18 GB (mesmo arquivo) | Código com o Cline | `num_ctx 32768`; velocidade na seção 8.3; precisão na seção 8.9 |
| `qwen3-vl:8b` | 6,1 GB | Visão e OCR | Benchmark de julho na seção 8.3 |
| *Devstral Small 2 24B* | — | — | **Removido** (resultados insatisfatórios, informado pelo responsável) |

### Imagem, vídeo e 3D (ComfyUI e Blender)

| Peça | Para quê | Licença | Detalhes |
|---|---|---|---|
| Z-Image-Turbo | Imagem (modelo padrão) | Apache 2.0 | [8A.3](08a-imagem-video.md) |
| FLUX.2 klein 4B (fp8) | Edição de imagem | Apache 2.0 | Bom em edição simples; **fraco em texto** |
| Qwen-Image 2.1 | Imagem com texto | **Só avaliação** (não comercial) | [ADR-009](16-apendices/adrs.md#adr-009) |
| LTX 2.5 22B distilled (int8-convrot) | Vídeo com áudio e fala | Licença própria (< US$ 10 mi) | [ADR-008](16-apendices/adrs.md#adr-008) |
| Wan 2.2 TI2V-5B (fp16) | Vídeo (alternativa) | Apache 2.0 | Superado pelo LTX |
| Kokoro + Whisper | Voz (texto→fala e fala→texto), CPU | Apache 2.0 / MIT | [8A.11](08a-imagem-video.md) |
| Blender 5.0.1 | 3D, rig e render (Cycles na 5060 Ti) | GPL | [8A.12](08a-imagem-video.md) |

Modelos do ComfyUI em disco: **91 GiB** (`/dados/modelos/comfyui`).

### Serviços no ar

Open WebUI (porta 3000), LobeChat com SearXNG, PostgreSQL e Redis (`pases-core`, só em `127.0.0.1`), ComfyUI (`127.0.0.1:8188`), Netdata (19999), Tailscale ativo. Exposição de portas: [Cap. 13](13-seguranca.md).

### O que **não** temos (plano do manual ainda não feito)

- **Qwen 3.6 27B** — candidato da Onda 2, não instalado.
- **FLUX.1 [dev] e FLUX.2 [dev]** — não instalados; o [dev] foi descartado por exigir ≥ 24 GB e ter licença não comercial.
- **Wan 2.1/2.2 de 14B** — nunca instalados.
- **AI Gateway, RAG (não há Qdrant) e Agentes** — [Cap. 9](09-agentes.md) e [10](10-banco-de-conhecimento.md) seguem esqueletos.

### Premissas comuns que as nossas medições **contradisseram**

1. **"O ComfyUI soma a VRAM das duas GPUs."** Não soma: ele roda **só na RTX 5060 Ti (16 GB)**, fixada por `CUDA_VISIBLE_DEVICES=1` ([8A.2](08a-imagem-video.md)). Quem se divide entre as duas é o **Ollama**.
2. **"O LTX 2.5 precisa de ~32 GB de VRAM."** É o requisito oficial; aqui roda em 16 GB com offload dinâmico para a RAM (~51 dos 59 GB).
3. **"O LTX 2.5 roda em FP8."** Aqui roda em **int8-convrot**.
4. **"Os modelos FLUX têm tipografia coerente."** No nosso teste o klein 4B errou texto em todas as imagens; o melhor foi o Qwen-Image 2.1.
5. **"4K nativo" e "duração automática" do LTX 2.5:** **não testados** (só 704×1280 e 1280×704; o arquivo de duração automática não foi baixado).

## 8.9 PASES-Bench v1 (LLM) com fixtures sintéticas — Qwen3-Coder <span class="badge badge-existe">Existe — 11/10/2026</span>

Primeira execução do PASES-Bench v1 em um LLM. Código, fixtures e resultados em `/srv/pases/llm-bench` (README próprio). **Modelo testado:** `qwen-cline` (= `qwen3-coder:30b`, Q4_K_M, com `num_ctx 32768`, `temperature 0.7`, `top_k 20`, `top_p 0.8`, `repeat_penalty 1.05`, os parâmetros que o Cline usa), `num_predict 4096`, sementes 1 a 3, **3 repetições por item**, ComfyUI parado e VRAM livre.

### Por que fixtures sintéticas
As fixtures oficiais (módulo real do Moventus, imagem do Promob, PDF escaneado) nunca existiram, e o código do Moventus **não está nesta máquina**. Foram criadas fixtures de marcenaria com **testes automáticos**, e cada uma foi **validada antes de testar o modelo**: os testes passam nas soluções de referência (23, 193 e 12 testes), falham no código inicial e **detectam erros plantados** (arredondamento errado, limite de desconto errado, desconto sobre o frete, regras especiais alteradas). O código gerado pelo modelo é **executado localmente** (pasta temporária, ambiente mínimo, timeout de 120 s); os testes ocultos nunca são mostrados ao modelo.

### Resultado contra as metas do Cap. 8.2

| Critério | Meta | Medido | |
|---|---|---|---|
| Velocidade de geração | ≥ 20 tok/s | **128–148 tok/s** (itens de texto 136–148; agente ~130) | ✅ |
| Tempo até o 1º token, a quente | ≤ 3 s | **0,1 s** (prompt curto, mediana de 5); 0,14–0,39 s nos itens | ✅ |
| Sem transbordo para a RAM | 100% GPU | **100% GPU**, 22 GB; pico de VRAM 10,5 GB (4070) e 12,5 GB (5060 Ti) | ✅ |
| RAM do sistema | ≤ 75% (~48 GB) | pico de **11,8 GB** | ✅ |
| **Precisão em código** (itens 1, 2 e 6) | **≥ 90%** | **62,4%** | ❌ |
| Português sem erros graves (item 5) | sem erros graves | verificação automática ok; **revisão humana pendente** | ⏳ |
| Precisão em visão (itens 3 e 4) | ≥ 90% | **não se aplica** (modelo só de texto) | — |

Temperatura máxima 64 °C e potência somada das GPUs de 202 W. **Carga a frio de 4,2 s:** não é comparável à de 74,5 s da seção 8.3, porque desta vez o arquivo do modelo já estava no cache do sistema operacional.

### Precisão por item

| Item | Rep. 1 | Rep. 2 | Rep. 3 | Média | O que aconteceu |
|---|---|---|---|---|---|
| **1. Gerar código** (módulo de orçamento) | 20/23 | 19/23 | 23/23 | **89,9%** | Falhas reais: `'int' object has no attribute 'quantize'` num orçamento vazio (soma de lista vazia dá `int`) nas repetições 1 e 2, e, na 2, não somou as quantidades dos itens agrupados |
| **2. Refatorar** (193 testes de comportamento) | 0 | 0 | 0 | **0%** | **O código refatorado quebra em toda chamada nas 3 repetições**: `NameError: name 'cupom' is not defined`, porque uma função auxiliar usa `cupom` sem recebê-lo. Confirmado rodando o código dele; **não é falha do teste**. A estrutura melhorou (5 a 6 funções, a maior com 22–30 linhas contra 58 do original), mas o comportamento não se preserva |
| **5. Pergunta de negócio** | ok | ok | ok | 3/3 | Lucro **R$ 1.116,50** e margem ~23%, em português e em 5 a 6 linhas (limite de 6) |
| **6. Tarefa de agente** (reserva de chapas, vários arquivos) | 11/12 | 12/12 | 12/12 | **97,2%** | 10 passos por repetição (1 `list_files`, 4 `read_file`, 3 `write_file`, 1 `run_tests`); rodou os testes antes de terminar; atualizou os testes visíveis (todos passam: 14, 13 e 12 testes). Na repetição 1, `reservar` não levantou o `ValueError` ao exceder o disponível |

**Precisão em código = média dos itens 1, 2 e 6 = (89,9 + 0 + 97,2) / 3 = 62,4%.** Sem o item 2 seria 93,5%, mas **isso não é a nota oficial**: retirar o pior item não é medir.

### O que isso significa
- Como **agente** (o uso com o Cline) o modelo foi muito bem; como **refatorador**, introduziu um erro que derruba tudo e **o repetiu nas três tentativas**. Uma falha repetível pesa mais que uma ocasional.
- A troca do Devstral pelo Qwen3-Coder ([ADR-012](16-apendices/adrs.md#adr-012)) **permanece** (decisão do responsável), mas agora com um dado: o modelo atual **reprova no critério de precisão em código** deste benchmark. **O Devstral nunca foi executado nesta suíte**; não dá para dizer qual é melhor.

### Limites
- **Uma fixture por item**, escrita pelo assistente, de tema único; uma refatoração diferente poderia se sair melhor ou pior.
- 3 repetições com temperatura 0,7: há variação, e a diferença entre 89,9% e a meta de 90% do item 1 **está dentro dessa variação**.
- A checagem do item 5 é automática (números, português por palavras frequentes e contagem de linhas); a **qualidade do português é avaliação humana** e não foi feita. Respostas em `results/<rodada>/i5_rep*.txt`.
- Os testes ocultos medem o que a especificação **disse**; um comportamento razoável que a especificação não cobre não é medido.
- A rodada fica em `results/2026-10-11_1733_qwen-cline/`. O campo `visiveis` do `resultado.json` dessa rodada mostra contagens enganosas (o modelo **acrescentou** testes); o executor já foi corrigido.

### Como repetir
```bash
cd /srv/pases/llm-bench && ./bench_llm.py --validar && ./bench_llm.py --modelo qwen-cline --reps 3
```
O ComfyUI precisa estar parado (VRAM livre) e `ollama ps` vazio.

## Escopo restante do capítulo <span class="badge badge-stub">Stub</span>

- Instalação do Ollama e benchmark real de cada modelo na estação (tok/s medidos)
- Repetir o item 2 (refatoração) com **outra fixture**, rodar o PASES-Bench com as **fixtures oficiais** (Moventus, Promob, nota fiscal) e os itens de **visão** no `qwen3-vl:8b`
- Papel do Claude no fluxo de trabalho ([ADR-003](16-apendices/adrs.md#adr-003))
- AI Gateway ([ADR-004](16-apendices/adrs.md#adr-004)) — ferramenta e configuração
- Cache de respostas e controle de custo
- Métricas de qualidade por tarefa (o que fica local, o que vai ao Claude)
