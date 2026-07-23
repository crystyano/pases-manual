# 8. Inteligência Artificial

Este capítulo documenta a camada de IA da estação: modelos locais, o papel do Claude e, futuramente, o AI Gateway.

## 8.1 Seleção inicial de modelos locais <span class="badge badge-planejado">Planejado — definido em 21/07/2026</span>

A estratégia não é um modelo único, e sim um **time de modelos**, cada um dimensionado para a GPU e o papel certos (requisitos definidos: foco em programação, capacidade generalista e visão apurada). A implantação acontece em **duas ondas** — decisão consolidada em 21/07/2026 após análise cruzada de duas recomendações independentes:

### Onda 1 — fundação (instalar agora)

| Papel | Modelo | Tamanho (Q4) | GPU | Justificativa |
|---|---|---|---|---|
| **Executor agentic + generalista + visão de apoio** | **Devstral Small 2 (24B)** | ~14 GB | 5060 Ti (16 GB) dedicada | **68% SWE-bench Verified**, contexto de 256k, **multimodal** (visão nativa), Apache 2.0. O cérebro local da estação |
| **Especialista em visão / OCR** | **Qwen3-VL 8B** | ~6 GB | 4070 (12 GB) | Referência em OCR e multilíngue (PT-BR): telas do ERP, projetos Promob, PDFs escaneados, fotos de móveis; até 8 imagens por chamada |

Com esses dois, a estação cobre ~95% do uso: programação agentic, visão apurada, interpretação de documentos e questões gerais (com o Claude como teto para o que for difícil — [Cap. 2](02-arquitetura.md)).

### Onda 2 — após benchmark real da Onda 1

| Papel | Modelo | Tamanho (Q4) | GPU | Gatilho |
|---|---|---|---|---|
| Autocomplete / FIM | Qwen3-Coder 8B | ~5,6 GB | 4070 | Quando o editor for integrado (ghost text) |
| Generalista forte | Qwen 3.6 27B | ~18–22 GB | split nas duas GPUs | Se o Devstral Small 2 deixar a desejar em tarefas generalistas |
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

Pendente: execução completa do PASES-Bench v1 com as fixtures oficiais.

## 8.4 Runtime <span class="badge badge-existe">Existe — Ollama</span>

**Ollama instalado e operacional desde 21/07/2026**, com a biblioteca de modelos em `/dados/modelos/ollama` (860 QVO), configurada via override do systemd (`OLLAMA_MODELS`). Onda 1 baixada: `devstral-small-2:24b` (15 GB) e `qwen3-vl:8b` (6,1 GB). Quando o AI Gateway entrar ([ADR-004](16-apendices/adrs.md#adr-004)), avaliar llama.cpp/vLLM para cargas específicas — a troca fica invisível para os projetos, que falam com o gateway.

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

Os **modelos não ficam residentes na VRAM**: são carregados na primeira chamada após o boot (a primeira resposta do Devstral leva ~30 s a mais — é o carregamento de 15 GB do disco; as seguintes são rápidas). Após alguns minutos sem uso, o modelo descarrega sozinho da VRAM — comportamento normal, não é falha.

### Verificação de 30 segundos (após qualquer boot)

```bash
systemctl is-active ollama
docker compose -f /srv/pases/core/docker-compose.yml ps
ollama list
```

Resultado esperado: `active` · dois containers `(healthy)` · dois modelos listados. Se os três aparecerem, está tudo no ar.

### Uso dos modelos

```bash
# Chat interativo com o Devstral (sair com /bye)
ollama run devstral-small-2:24b

# Pergunta única
ollama run devstral-small-2:24b "sua pergunta aqui"

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

## Escopo restante do capítulo <span class="badge badge-stub">Stub</span>

- Instalação do Ollama e benchmark real de cada modelo na estação (tok/s medidos)
- Papel do Claude no fluxo de trabalho ([ADR-003](16-apendices/adrs.md#adr-003))
- AI Gateway ([ADR-004](16-apendices/adrs.md#adr-004)) — ferramenta e configuração
- Cache de respostas e controle de custo
- Métricas de qualidade por tarefa (o que fica local, o que vai ao Claude)
