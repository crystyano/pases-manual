# 8A. Imagem e Vídeo

Este capítulo documenta a camada de **geração de imagem e vídeo** da estação: o ComfyUI, os modelos instalados, os benchmarks medidos e a operação diária. Ele complementa o [Capítulo 8](08-inteligencia-artificial.md) (LLMs) — os dois compartilham as mesmas GPUs e o mesmo nobreak, e por isso as regras de convivência estão na seção 8A.6.

!!! info "Por que '8A' e não um número novo"
    O capítulo foi incluído entre o 8 e o 9 sem renumerar os demais, para não quebrar os links internos do manual. Se o manual for reorganizado no futuro, ele pode virar o Capítulo 9.

## 8A.1 Visão geral <span class="badge badge-existe">Existe — no ar desde 08/10/2026</span>

| Item | Valor |
|---|---|
| Interface / motor | **ComfyUI 0.39.0** — editor de grafos de nós; roda os modelos |
| Endereço | `http://127.0.0.1:8188` — **somente esta máquina** |
| GPU usada | **RTX 5060 Ti 16 GB** (fixada por `CUDA_VISIBLE_DEVICES=1`); a RTX 4070 fica livre para o desktop e o Qwen3-VL |
| Ambiente | Python 3.12 em venv (`uv`), PyTorch `2.14.1+cu130` — o Python 3.14 do sistema **não é usado** |
| Instalação | `/srv/pases/comfyui` |
| Modelos | `/dados/modelos/comfyui/` (SSD SATA `SSD1TB`) |
| Saída (imagens/vídeos) | `/scratch/comfyui/output/` (NVMe `NVME512`) |
| Serviço | `comfyui.service` (systemd **de usuário**) |

!!! note "ComfyUI não é um modelo"
    O ComfyUI é a *interface e o motor* de execução. Os modelos (Z-Image, Wan etc.) são arquivos separados que ele carrega. Trocar ou adicionar um modelo não exige reinstalar nada — basta colocar o arquivo na pasta certa.

A decisão de usar essa pilha, e as alternativas descartadas, estão no [ADR-007](16-apendices/adrs.md#adr-007).

## 8A.2 Por que o teto é 16 GB <span class="badge badge-existe">Existe</span>

Diferente dos LLMs no Ollama, os modelos de imagem e vídeo **não se dividem entre duas GPUs** no ComfyUI. O teto real é, portanto, a **VRAM de uma placa — 16 GB (5060 Ti)** — e não os 28 GB somados citados no [Capítulo 3](03-hardware.md). Os 64 GB de RAM entram como apoio: o ComfyUI descarrega partes do modelo para a RAM quando a VRAM não basta (observado nos testes da seção 8A.5).

Consequência prática: ao escolher um modelo, vale o tamanho dos **pesos + codificador de texto + VAE + ativações**, não só o arquivo principal. Modelos que oficialmente pedem 32 GB (caso do LTX 2.5 completo) só rodam aqui por quantizações da comunidade, com perda de qualidade e velocidade.

## 8A.3 Modelos instalados <span class="badge badge-existe">Existe</span>

Todos vêm dos repositórios **Comfy-Org** no Hugging Face (versões já reempacotadas para o ComfyUI), públicos, sem aceite de licença, **Apache 2.0**. Total: **~34 GB**. O SHA-256 dos 6 arquivos foi conferido contra o publicado pelo Hugging Face em 08/10/2026.

### Z-Image-Turbo — imagem

Repositório: `Comfy-Org/z_image_turbo`.

| Arquivo | Tamanho | Pasta (em `/dados/modelos/comfyui/`) |
|---|---|---|
| `z_image_turbo_bf16.safetensors` | 12,31 GB | `diffusion_models/` |
| `qwen_3_4b_fp8_mixed.safetensors` | 5,63 GB | `text_encoders/` |
| `ae.safetensors` | 0,34 GB | `vae/` |

### Wan 2.2 TI2V-5B — vídeo (texto e imagem para vídeo)

Repositório: `Comfy-Org/Wan_2.2_ComfyUI_Repackaged`.

| Arquivo | Tamanho | Pasta |
|---|---|---|
| `wan2.2_ti2v_5B_fp16.safetensors` | 10,00 GB | `diffusion_models/` |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | 6,74 GB | `text_encoders/` |
| `wan2.2_vae.safetensors` | 1,41 GB | `vae/` |

**Variantes escolhidas e por quê:** pesos em bf16/fp16 para a qualidade máxima que cabe na 5060 Ti; o codificador de texto do Wan em **fp8** (6,7 GB em vez dos 11,4 GB do fp16) para poupar VRAM e RAM com perda mínima. Existem versões menores do Z-Image (`int8_convrot` 6,2 GB, `nvfp4` 4,5 GB) — úteis se um dia for preciso rodar junto com outro modelo grande.

### LTX 2.5 — vídeo com áudio <span class="badge badge-existe">Existe — 08/10/2026</span>

Repositório oficial: `Lightricks/LTX-2.5` (Hugging Face). **Não é Apache 2.0** e o acesso é restrito: exige conta, aceite da licença e token de leitura (procedimento na seção 8A.4, passo 6B).

| Arquivo | Tamanho | Pasta (em `/dados/modelos/comfyui/`) |
|---|---|---|
| `ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors` | 21,50 GB | `diffusion_models/` |
| `gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors` | 15,37 GB | `text_encoders/` |
| `ltx-2.5-video-vae-bf16.safetensors` | 1,47 GB | `vae/` |
| `ltx-2.5-audio-vae-bf16.safetensors` | 0,36 GB | `vae/` |
| `ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors` | 1,00 GB | `latent_upscale_models/` |

**Total: ~39,7 GB** (acumulado dos modelos instalados: ~74 GB). SHA-256 dos 5 arquivos conferido contra o publicado pelo Hugging Face em 08/10/2026. Variante escolhida: a **distilled** (8 passos no estágio 1 + 3 de refino), em **int8-convrot**, que é exatamente a que o template oficial `video_ltx2_5_t2v` do ComfyUI referencia.

!!! warning "Licença — LTX-2.x Community License (11/08/2026)"
    - **Receita anual abaixo de US$ 10 milhões:** uso gratuito, inclusive comercial. A receita considera **empresas afiliadas e do mesmo grupo**, somadas.
    - **US$ 10 milhões ou mais:** exige licença paga (`ltxv-licensing@lightricks.com`) para uso comercial. Mesmo assim, teste e avaliação em ambiente de desenvolvimento, sem produção e sem gerar receita, são permitidos.
    - **Treinar ou destilar** outro modelo para uso comercial exige licença paga.
    - O enquadramento abaixo do limite foi **declarado pelo responsável da Protustech** em 08/10/2026; não foi verificado de forma independente. Reavaliar se a receita do grupo se aproximar de US$ 10 milhões.

## 8A.4 Instalação — procedimento reproduzível <span class="badge badge-existe">Existe</span>

Registro do que foi feito em 07–08/10/2026. Cada passo pode ser repetido em uma máquina nova.

**1. Instalar o `uv`** (gerenciador de Python — evita depender do Python 3.14 do sistema):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
uv --version
```

Resultado esperado: `uv 0.12.x`.

**2. Clonar o ComfyUI e criar o ambiente:**

```bash
cd /srv/pases
git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git comfyui
cd comfyui
uv venv --python 3.12 .venv
```

**3. Instalar o PyTorch com CUDA 13.0 e os requisitos** (o README do ComfyUI exige `cu130` ou superior para GPUs NVIDIA recentes; o driver da estação é CUDA 13.2):

```bash
export UV_HTTP_TIMEOUT=300
uv pip install --python .venv/bin/python torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cu130
uv pip install --python .venv/bin/python -r requirements.txt
```

São ~6 GB de download. Resultado esperado — o PyTorch enxerga as duas GPUs:

```bash
CUDA_DEVICE_ORDER=PCI_BUS_ID .venv/bin/python -c "import torch; print(torch.__version__, torch.cuda.is_available(), [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())])"
```

Esperado: `2.14.1+cu130 True [... 'NVIDIA GeForce RTX 4070', ... 'NVIDIA GeForce RTX 5060 Ti']`.

!!! warning "Lição aprendida: timeout de rede e `&&` com `| tail`"
    Na primeira tentativa, um pacote de ~400 MB estourou o timeout padrão de 30 s do `uv`. Duas lições: (1) usar `UV_HTTP_TIMEOUT=300` em downloads grandes; (2) **não** encadear `comando | tail && próximo` — o `tail` devolve sucesso mesmo quando o comando anterior falhou, e o passo seguinte roda sobre uma instalação quebrada. Aqui isso gerou dois instaladores concorrentes no mesmo venv, que foi preciso encerrar manualmente.

**4. Apontar os modelos e a saída para os discos certos:**

```bash
mkdir -p /dados/modelos/comfyui/{checkpoints,diffusion_models,text_encoders,vae,loras,unet,clip,upscale_models}
mkdir -p /scratch/comfyui/{output,temp}
```

Arquivo `/srv/pases/comfyui/extra_model_paths.yaml`:

```yaml
pases:
    base_path: /dados/modelos/comfyui/
    checkpoints: checkpoints/
    diffusion_models: |
        diffusion_models/
        unet/
    text_encoders: |
        text_encoders/
        clip/
    vae: vae/
    loras: loras/
    upscale_models: upscale_models/
```

**5. Serviço systemd de usuário** — `~/.config/systemd/user/comfyui.service`:

```ini
[Unit]
Description=ComfyUI (PASES) - geracao de imagem/video local
After=network.target

[Service]
WorkingDirectory=/srv/pases/comfyui
# GPU 1 = RTX 5060 Ti (ordem PCI, igual ao nvidia-smi)
Environment=CUDA_DEVICE_ORDER=PCI_BUS_ID
Environment=CUDA_VISIBLE_DEVICES=1
ExecStart=/srv/pases/comfyui/.venv/bin/python main.py --listen 127.0.0.1 --port 8188 --output-directory /scratch/comfyui/output --temp-directory /scratch/comfyui/temp
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now comfyui.service
```

!!! danger "`CUDA_DEVICE_ORDER=PCI_BUS_ID` é obrigatório"
    Sem ele, o PyTorch pode numerar as GPUs em ordem diferente do `nvidia-smi` e o serviço acabaria na RTX 4070 (12 GB) em vez da 5060 Ti. Foi verificado que, com as duas variáveis, `CUDA_VISIBLE_DEVICES=1` seleciona a **RTX 5060 Ti**.

**6. Baixar os modelos** — com `curl -C -` (retoma de onde parou se a conexão cair):

```bash
B=/dados/modelos/comfyui
Z=https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files
W=https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files

curl -L -C - --fail -o $B/vae/ae.safetensors                                        $Z/vae/ae.safetensors
curl -L -C - --fail -o $B/text_encoders/qwen_3_4b_fp8_mixed.safetensors             $Z/text_encoders/qwen_3_4b_fp8_mixed.safetensors
curl -L -C - --fail -o $B/diffusion_models/z_image_turbo_bf16.safetensors           $Z/diffusion_models/z_image_turbo_bf16.safetensors
curl -L -C - --fail -o $B/vae/wan2.2_vae.safetensors                                $W/vae/wan2.2_vae.safetensors
curl -L -C - --fail -o $B/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors      $W/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors
curl -L -C - --fail -o $B/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors          $W/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors
```

O download completo levou cerca de 3 horas nesta rede. Se um `curl` terminar com erro (`HTTP/2 stream ... CANCEL` já ocorreu uma vez), basta repetir o mesmo comando: ele continua do ponto em que parou. Ao final, confira o tamanho de cada arquivo contra a tabela da seção 8A.3.

**6B. Baixar o LTX 2.5** (acesso restrito — três ações **suas**, que o assistente não faz por você: criar conta, aceitar a licença e criar o token):

1. Criar conta em `https://huggingface.co/join` e **confirmar o e-mail** (sem isso o acesso aos modelos restritos não funciona).
2. Em `https://huggingface.co/Lightricks/LTX-2.5`, ler e aceitar a licença (a página passa a mostrar *"You have been granted access to this model"*).
3. Em `https://huggingface.co/settings/tokens`, criar um token **somente de leitura** (ex.: `pases-ltx`) e **copiar na hora** — ele só aparece uma vez.
4. Fazer o login no terminal, **você mesmo**, escolhendo a opção **token** no menu e colando o token (ele não aparece na tela):

    ```bash
    /srv/pases/comfyui/.venv/bin/hf auth login
    /srv/pases/comfyui/.venv/bin/hf auth whoami      # deve mostrar o seu usuário
    ```

5. Acrescentar ao `extra_model_paths.yaml` a linha `latent_upscale_models: latent_upscale_models/` e baixar (os arquivos do repositório já usam as mesmas subpastas do ComfyUI, então `--local-dir` direto na pasta de modelos funciona):

    ```bash
    mkdir -p /dados/modelos/comfyui/latent_upscale_models
    /srv/pases/comfyui/.venv/bin/hf download Lightricks/LTX-2.5 \
      diffusion_models/ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors \
      text_encoders/gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors \
      vae/ltx-2.5-video-vae-bf16.safetensors \
      vae/ltx-2.5-audio-vae-bf16.safetensors \
      latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors \
      --local-dir /dados/modelos/comfyui
    ```

6. Ao terminar o teste, **revogar o token** em `huggingface.co/settings/tokens`: o `hf auth login` o grava em `~/.cache/huggingface/token`, em texto simples.

!!! warning "Lições aprendidas no download do LTX 2.5"
    - **Não use o login "pelo navegador"** (`Log in with your browser`): a tela de autorização pedia permissões amplas — gerenciar e **apagar** repositórios, abrir PRs, jobs pagos, webhooks. Para baixar basta leitura; use o **token de leitura**.
    - **`hf auth login --token` exige o valor do token como argumento** — digitá-lo deixaria o segredo no histórico do terminal. Use o menu interativo (ou `read -s`).
    - **O download pode parecer parado e não estar.** O `hf_xet` acumula blocos em memória e grava em rajadas; o tamanho do arquivo `.incomplete` pode ficar parado por minutos. Para saber se há progresso, meça o tráfego do **próprio processo** (`ss -tinp`, bytes recebidos), não só o disco. Reiniciar é seguro (retoma), mas deixa `.incomplete` órfãos em `<pasta>/.cache/huggingface/download/` que podem ser apagados depois de validar os SHA-256.
    - **Cuidado com `pkill -f`:** o padrão casa com a linha de comando do próprio `pkill` e mata a shell. Encerre pelo PID.

**7. Reiniciar o serviço** para o ComfyUI indexar os modelos novos:

```bash
systemctl --user restart comfyui
```

## 8A.5 Benchmarks <span class="badge badge-existe">Existe — 08/10/2026</span>

Medições reais na estação, sempre com **uma geração por vez**, GPUs com o power limit permanente do [Cap. 8.6](08-inteligencia-artificial.md) aplicado (4070 → 140 W, 5060 Ti → 150 W), Devstral **descarregado**. Parâmetros dos templates oficiais do ComfyUI. Temperatura e VRAM referem-se à 5060 Ti; a potência é a **soma das duas GPUs**.

| Data | Modelo | Resolução / duração | Passos | Tempo | Pico VRAM | Pico temp. | Pico potência | RAM do sistema (pico) |
|---|---|---|---|---|---|---|---|---|
| 08/10/2026 | Z-Image-Turbo (bf16) | 1024×1024 | 8 | **11,5 s** (16,5 s na 1ª, com carga a frio) | 15,5 GB | 72 °C | 167 W | — |
| 08/10/2026 | Wan 2.2 TI2V-5B (fp16) | 832×480 · 49 quadros (~2 s a 24 fps) | 20 | **70 s** | 15,5 GB | 73 °C | 166 W | ~26 GB |
| 08/10/2026 | Wan 2.2 TI2V-5B (fp16) | 1280×704 · 121 quadros (5 s a 24 fps) | 20 | **9 min 12 s** | 15,8 GB | 75 °C | 162 W | ~26 GB |

**Qualidade observada (avaliação visual, não é o PASES-Bench):**

- **Z-Image-Turbo:** marcenaria moderna com bancada de madeira clara, luz natural, texturas e perspectiva coerentes, sem artefatos evidentes.
- **Wan 2.2 (720p, 5 s):** cena coerente nos três quadros inspecionados (início, meio, fim) — oficina com luz do sol, ferramentas nítidas e movimento de câmera avançando em direção à bancada, como pedido no prompt. Avaliados apenas 3 quadros de 121; movimento fino entre quadros não foi inspecionado.

**Leitura dos números:**

- **Folga de energia ampla:** ~165 W somados contra o limite de 600 W do nobreak. Nenhum alarme durante os testes. A restrição do nobreak, nesta carga, não é o gargalo — mas continua valendo a regra de **uma geração por vez**.
- **Térmica saudável:** pico de 75 °C na carga mais longa (9 min). O vigia dos testes interromperia a geração em 82 °C; não foi acionado.
- **Em 720p a VRAM encosta no teto** (15,8 GB de 15,85 GB). O ComfyUI compensou descarregando partes para a RAM, sem falhar. Funciona, mas é o limite: resoluções maiores ou vídeos mais longos podem ficar bem mais lentos ou falhar.
- Os números do Z-Image são de **2 gerações** e os de vídeo de **1 geração cada**; servem como referência de ordem de grandeza, não como média estatística.

!!! warning "Pendente"
    Esses testes **não** são o PASES-Bench ([Cap. 8.2](08-inteligencia-artificial.md)), que cobre LLMs e visão. Uma suíte padronizada para imagem/vídeo (prompts e sementes fixos, critérios de aprovação) ainda não existe — é pré-requisito para promover ou substituir modelos desta camada com critério objetivo.

### LTX 2.5 × Wan 2.2 5B — mesma suíte de vídeo <span class="badge badge-existe">Existe — 08/10/2026</span>

Rodada `2026-10-08_2320_ltx` do **PASES-Bench Visual v1** (seção 8A.5b), com os mesmos prompts, sementes e durações do Wan (rodada `2026-10-08_1800`). Mesmas condições: uma geração por vez, Devstral descarregado, power limit permanente das GPUs. **10 gerações, 0 falhas, todas com áudio e na resolução pedida.**

| Item | Wan 2.2 5B — mediana (s) | **LTX 2.5 — mediana (s)** | LTX 1ª geração, a frio (s) |
|---|---|---|---|
| V1 — vídeo curto (2 s) | 66,1 | **19,0** | 106,4 |
| V3 — imagem para vídeo | 68,7 | **34,5** | 49,0 |
| V4 — movimento complexo | 66,2 | **19,0** | 49,0 |
| V2 — 720p, 5 s | 554,2 | **83,6** | 98,7 |

| Recurso | Wan 2.2 5B | LTX 2.5 |
|---|---|---|
| Pico de VRAM (5060 Ti) | 15,8 GB | 15,8 GB (com offload dinâmico) |
| Pico de temperatura | 78 °C | 76 °C |
| Pico de potência (2 GPUs) | 167 W | 165 W |
| **Pico de RAM do sistema** | ~28–29 GB | **~50,7 GB de 59 GB** |
| Áudio | não | sim (gerado junto) |

Teste de carga prévio (768×448, 2 s, a frio): 77 s, 70 °C, 162 W, RAM 51,4 GB.

**Qualidade — leitura do assistente, a partir de folhas de contato (início, meio e fim de cada vídeo). O áudio não foi avaliado. A ficha de avaliação humana (0 a 2) é a que vale e ainda precisa ser preenchida.**

- **V1:** nas 3 sementes a câmera avança como o prompt pedia. No Wan, a semente 101 saiu praticamente parada e com uma pessoa não pedida.
- **V2 (720p):** as 2 sementes coerentes, sem o "pulo" de câmera visto no Wan (semente 101).
- **V3:** quadro inicial respeitado nas 2 sementes, câmera avançando suave; no Wan uma das sementes quase não se movia.
- **V4:** movimento plausível nas 3 sementes (serragem, desfoque de movimento). Defeitos: a ferramenta muda de forma entre as sementes (às vezes lembra uma plaina, não uma lixadeira) e as mãos ficam borradas no movimento.

!!! warning "Limites desta comparação"
    - **Dimensões diferentes:** o LTX exige largura e altura finais **múltiplas de 64** e frames no formato **8n+1**; rodou em 896×512 (V1/V3/V4) contra 832×480 do Wan, ~15% mais pixels. O V2 foi 1280×704 nos dois.
    - **O LTX usado é o *distilled*** (8 + 3 passos), contra 20 passos do Wan — isso explica boa parte da diferença de velocidade, não só a arquitetura.
    - **2 a 3 sementes por item:** sinal forte, não estatística.
    - **RAM no limite:** 50,7 de 59 GB. Com o LTX carregado, não rodar outras cargas pesadas.

### LTX 2.5 — primeiro e último quadro (flf2v) <span class="badge badge-existe">Existe — 08/10/2026</span>

Template oficial `video_ltx2_5_flf2v`, reproduzido em `bench/ltx.py` (`wf_ltx_flf`). Ao contrário do texto/imagem-para-vídeo, é **um único estágio**, sem upscale latente: o vídeo nasce direto na resolução final (largura e altura **múltiplas de 32**). O primeiro quadro entra por `LTXVAddGuide` com índice 0 e o último com índice -1, ambos com força 0,7; ao fim os guias são removidos (`LTXVCropGuides`). Rodada `2026-10-08_2337_ltx`, 896×512, 49 quadros (2 s), 2 sementes por item. **4 gerações, 0 falhas**, pico de 73 °C e 166 W; **~21 s** por geração com o prompt já em cache (~100 s na 1ª semente de cada prompt, ver seção 8A.6).

| Item | Extremos | Resultado (leitura do assistente, 3 quadros por vídeo) |
|---|---|---|
| **F1** — reconstrução | Primeiro = imagem I1_101; último = fim de um vídeo LTX que parte dessa imagem | **Bom nas 2 sementes.** Começa e termina fiel aos extremos, com câmera avançando suave pelo caminho esperado; praticamente reproduz o vídeo de origem |
| **F2** — transição entre cenas | Primeiro = I1_101; último = I1_102 (outra bancada) | **Chega fiel nos dois extremos, mas o meio é ruim.** Semente 101: *cross-dissolve* (as duas cenas sobrepostas, com transparência), não um movimento de câmera. Semente 102: o quadro do meio é um borrão de movimento irreconhecível, e depois "pousa" exato no último quadro |

**Leitura:** o flf2v funciona bem quando os dois quadros são **da mesma cena** (a câmera ou a luz mudando) — é o uso para o qual serve. Quando os extremos são cenas **diferentes**, o modelo respeita as duas pontas mas não inventa um caminho plausível: recorre a dissolver ou a borrar. Para transições entre cenas, a técnica adequada é outra (cortes, ou gerar trechos separados).

!!! warning "Limites"
    2 sementes por item e 3 quadros por vídeo avaliados; o áudio não foi avaliado. O prompt negativo usado é o curto dos demais testes do LTX, não o do template (que tem termos de uma cena específica de pessoa falando).

### 8A.5b PASES-Bench Visual v1 <span class="badge badge-existe">Existe — 08/10/2026</span>

Suíte padronizada de imagem e vídeo, no mesmo espírito do PASES-Bench dos LLMs ([Cap. 8.2](08-inteligencia-artificial.md)). Fica em `/srv/pases/comfyui-config/bench/` (versionada):

| Arquivo | Função |
|---|---|
| `items.json` | 8 itens (I1–I4 imagem, V1–V4 vídeo) com prompts, sementes, parâmetros e metas provisórias. **Não alterar sem criar a versão v2** — senão os resultados deixam de ser comparáveis |
| `bench.py` | Runner: uma geração por vez, recusa rodar com modelo no Ollama, reinicia o serviço (1ª geração = medida a frio), mede VRAM/RAM/temperatura/potência, aborta acima de 82 °C, gera relatório e folhas de contato |
| `ltx.py` | Workflow do LTX 2.5 em formato de API (espelha o template oficial: dois estágios, upscale latente ×2, áudio e vídeo juntos; versão imagem-para-vídeo) |
| `results/` | JSON e relatório de cada rodada, com versões do ambiente e SHA-256 dos modelos |

```bash
cd /srv/pases/comfyui-config/bench
/srv/pases/comfyui/.venv/bin/python -I bench.py --dry-run          # valida, não gera
/srv/pases/comfyui/.venv/bin/python -I bench.py                    # suíte completa (Z-Image + Wan), ~40 min
/srv/pases/comfyui/.venv/bin/python -I bench.py --modelo ltx       # só vídeo + F1/F2, com o LTX 2.5, ~12 min
```

Itens: **I1** ambiente de marcenaria · **I2** texto em português na imagem · **I3** mockup de tela de ERP · **I4** composição precisa · **V1** vídeo curto · **V3** imagem para vídeo · **V4** movimento complexo (mãos lixando madeira) · **V2** 720p de 5 s · **F1** primeiro e último quadro (reconstrução) · **F2** primeiro e último quadro (transição entre cenas) — os itens `F*` só rodam com `--modelo ltx`, e seus extremos ficam em `bench/fixtures/` (896×512). A qualidade é avaliada por humano (0 a 2 por critério, ficha no relatório); as metas operacionais continuam **provisórias** até a primeira revisão humana. O modelo de visão local (Qwen3-VL) pode servir de triagem, nunca de juiz.

**Linha de base das imagens** (Z-Image-Turbo, 12 gerações, 0 falhas): mediana de **12 s** por imagem 1024², pico de 76 °C e 169 W. A 1ª geração a frio levou 50 s.

## 8A.6 Operação diária <span class="badge badge-existe">Existe</span>

### Regras de convivência com o Ollama

1. **Descarregar o LLM antes de gerar vídeo.** O Devstral ocupa ~11 GB da 5060 Ti; sem descarregá-lo, falta VRAM:

    ```bash
    ollama ps                          # ver o que está carregado
    ollama stop devstral-small-2:24b   # liberar a VRAM
    ```

2. **Uma geração por vez.** O nobreak tem 600 W e já apitou com cargas paralelas ([Cap. 8.6](08-inteligencia-artificial.md)).
3. **Não expor na rede.** O ComfyUI **não tem login**. O bind em `127.0.0.1` é uma decisão de segurança ([ADR-007](16-apendices/adrs.md#adr-007)); qualquer mudança para a rede local exige antes proxy com autenticação e revisão do [Cap. 13](13-seguranca.md).

### Regras de uso do LTX 2.5

- **RAM é o limite, não a VRAM:** pico de ~50,7 GB de 59 GB. Antes de gerar, fechar cargas pesadas; o Devstral deve estar descarregado (`ollama ps` vazio).
- **Dimensões:** largura e altura finais **múltiplas de 64** (o estágio 1 roda na metade e precisa de múltiplos de 32). **Frames = segundos × fps + 1 e precisa ser 8n+1** (2 s a 24 fps = 49; 5 s = 121).
- **Cada prompt novo custa ~80 s a mais.** O text encoder (14,6 GB) e o transformer (20,5 GB) não cabem juntos na GPU: a cada prompt novo o ComfyUI carrega o encoder, descarrega e recarrega o transformer (visto nos logs). Com o **mesmo prompt e outra semente** o encoder é reaproveitado e a geração leva só ~19 a 21 s (vídeo curto). Na prática: **gere várias sementes por prompt** (ex.: 3 variações seguidas) em vez de trocar de prompt a cada geração. Os ~100 s da 1ª semente de cada item nas tabelas vêm daí, não de uma carga única dos modelos.
- Templates prontos na interface: `video_ltx2_5_t2v` (texto), `video_ltx2_5_i2v` (imagem) e `video_ltx2_5_flf2v` (primeiro e último quadro — testado, ver seção 8A.5).

### Comandos do serviço

```bash
systemctl --user status comfyui          # estado do serviço
systemctl --user restart comfyui         # reiniciar (necessário ao adicionar modelos)
journalctl --user -u comfyui -n 50       # últimos logs
```

Para usar, abrir **http://127.0.0.1:8188** no navegador desta máquina. Os templates prontos estão em *Templates* (menu do ComfyUI): `image_z_image_turbo` e `video_wan2_2_5B_ti2v`.

!!! tip "Ao usar o template do Z-Image"
    O template oficial referencia `qwen_3_4b.safetensors` (versão bf16, 8 GB). A estação tem a versão **fp8** (`qwen_3_4b_fp8_mixed.safetensors`, 5,6 GB). Ao abrir o template, trocar o arquivo no nó *Load CLIP* — os testes da seção 8A.5 foram feitos com a versão fp8.

### Verificação de 30 segundos

```bash
systemctl --user is-active comfyui
ss -tlnp | grep 8188
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8188/
```

Resultado esperado: `active` · `127.0.0.1:8188` (**nunca** `0.0.0.0`) · `HTTP 200`.

### Subir no boot <span class="badge badge-existe">Existe — 08/10/2026</span>

O serviço é de **usuário**: sem *linger* ativo, ele só inicia depois do login. O *linger* foi ativado pelo responsável em 08/10/2026 (`sudo loginctl enable-linger pases`) e verificado: `loginctl show-user pases -p Linger` retorna `Linger=yes`, então o ComfyUI sobe no boot, antes de qualquer login. Para conferir após um reinício real: `systemctl --user is-active comfyui` → `active`. <span class="badge badge-confirmar">Falta validar em um reboot de fato</span>

### Ferramentas de apoio <span class="badge badge-existe">Existe — 08/10/2026</span>

Instalados pelo apt em 08/10/2026: **VLC** 3.0.23 (reproduzir os MP4 no gerenciador de arquivos — sem ele o Ubuntu não tinha aplicativo para abrir vídeo) e **ffmpeg** 8.0.1 (extrair quadros, converter e cortar vídeos pela linha de comando). Exemplo, extraindo um quadro do vídeo de teste:

```bash
ffmpeg -i /scratch/comfyui/output/video/teste_wan_720p_00001_.mp4 -vf "select=eq(n\,60)" -frames:v 1 quadro60.png
```

O ComfyUI não depende de nenhum dos dois para gerar: ele salva o MP4 por conta própria.

## 8A.7 Versionamento e backup <span class="badge badge-existe">Existe — 08/10/2026</span>

A pasta `/srv/pases/comfyui/` (clone do ComfyUI + `.venv` de ~5 GB) está no `.gitignore` do `pases-infra`: é **reconstruível** pelo procedimento da seção 8A.4 e não deve ir ao GitHub. O que é **definição** vive em uma pasta rastreada:

| Arquivo versionado (`/srv/pases/comfyui-config/`) | Usado em (link simbólico apontando para a pasta rastreada) |
|---|---|
| `comfyui.service` | `~/.config/systemd/user/comfyui.service` |
| `extra_model_paths.yaml` | `/srv/pases/comfyui/extra_model_paths.yaml` |
| `README.md` | Como reinstalar em máquina nova |

Como os originais são **links simbólicos**, editar qualquer um deles altera o arquivo versionado — não há cópia que possa divergir. Depois de mudar o `.service`, rodar `systemctl --user daemon-reload` e reiniciar o serviço. Validado em 08/10/2026: após a troca por links, o serviço reiniciou e o ComfyUI continuou encontrando os dois modelos.

**Backup (Cap. 14):** os modelos (34 GB) e os arquivos gerados são **reconstruíveis/descartáveis** — baixar de novo é possível e a saída em `/scratch` é temporária por definição. Os **resultados dos benchmarks** (`bench/results/*.json` e `*.md`) são versionados junto com a suíte; as mídias geradas, não. O que importa guardar são os **workflows** (grafos) que você criar e quiser preservar: exportá-los como JSON e salvá-los em um repositório. A inclusão de `/dados/modelos/comfyui` ou de workflows em alguma classe de dados do Cap. 14 ainda não foi decidida <span class="badge badge-confirmar">A confirmar</span>.

## 8A.8 Alternativas avaliadas e segunda rodada <span class="badge badge-existe">Atualizado em 08/10/2026</span>

Registro do que foi analisado em 07/10/2026 (fontes secundárias; os requisitos de VRAM divergem bastante entre elas — **confirmar nas páginas oficiais antes de baixar**):

| Opção | Situação para a estação |
|---|---|
| **LTX-2.3** (FP8) | Mesma família do 2.5, que o superou. Não é necessário instalar. |
| **LTX 2.5** | **Adotado como modelo de vídeo principal** ([ADR-008](16-apendices/adrs.md#adr-008)). **Correção:** a avaliação de 07/10 dizia que em 16 GB só rodaria por quantizações GGUF da comunidade; na prática, o transformer **oficial** `int8-convrot` (21,5 GB) rodou com offload dinâmico, sem GGUF, a 19 s por vídeo curto. As fontes secundárias estavam desatualizadas. |
| **MiniMax H3** | Pesos abertos desde 03/08/2026 (33B parâmetros), com suporte nativo no ComfyUI. A versão aberta sai em **no máximo 768p**; o upscaler de 2K é só da API. Um site afirma restrição de licença para uso em EUA/UE/Reino Unido/Coreia — **não confirmado**; ler a licença no Hugging Face antes de qualquer investimento. |
| **Qwen-Image** (quantizado) | Melhor em texto legível dentro da imagem (útil para mockups). Candidato à segunda rodada. |
| **FLUX.2 klein 4B** | Bom para edição e multi-referência, Apache 2.0. Candidato. |
| **FLUX.2 [dev]** | Descartado: pede 24 GB ou mais e a licença é não comercial. |
| **Wan 2.2 A14B** (GGUF Q4) | Mais qualidade de movimento que o 5B, mas apertado em 16 GB e sem áudio. Perdeu urgência diante do LTX 2.5; reavaliar só se surgir uma limitação do LTX. |
| **Wan 2.2 5B** | **Mantido** como alternativa de licença limpa (Apache 2.0), mas deixou de ser o modelo principal de vídeo. |
| **WanGP** (`deepbeepmeep/Wan2GP`) | Interface alternativa com gestão agressiva de memória (afirma H3 de 15 s em 1080p com ~11 GB de VRAM — alegação do projeto, não verificada). Visto em vídeo de terceiros em 08/10/2026. **Adiado:** o LTX 2.5 já roda bem no ComfyUI; reconsiderar se a RAM apertada ou vídeos de 720p mais longos virarem problema. Se for testado: `git clone` + `uv` em `/srv/pases/wan2gp`, fora do Git, só em `127.0.0.1`. |
| **Pinokio** | **Descartado:** instala apps rodando scripts que executam qualquer comando na máquina (revisão humana só dos apps em destaque, isolamento por pasta, não sandbox) e foge do princípio de infraestrutura reconstruível (P6). |

**Gatilho para a próxima rodada:** uso real que o Z-Image/LTX 2.5 não atenda (texto em imagem → Qwen-Image; movimento mais complexo; vídeo mais longo) — não por curiosidade de catálogo. A suíte padronizada já existe (seção 8A.5b): todo candidato roda a suíte completa antes de ser promovido.

!!! note "Retrato de outubro/2026"
    Esta camada muda em ciclos de poucos meses (como a de LLMs). Os modelos desta página são um retrato de 08/10/2026; revisar a cada mudança de fase do [Roadmap](15-roadmap.md) e registrar substituições aqui.

## 8A.9 Riscos e lições registradas <span class="badge badge-existe">Existe</span>

| Risco | Mitigação |
|---|---|
| VRAM no limite em 720p / vídeos longos | Offload automático para RAM (funcionou); reduzir resolução ou duração se falhar; avaliar variantes quantizadas |
| Conflito de VRAM com o Ollama | Regra 1 da seção 8A.6 (`ollama stop` antes de gerar vídeo) |
| Sobrecarga do nobreak por gerações paralelas | Uma geração por vez; power limit permanente das GPUs ([Cap. 8.6](08-inteligencia-artificial.md)) |
| ComfyUI sem autenticação | Bind em `127.0.0.1` apenas ([ADR-007](16-apendices/adrs.md#adr-007)) |
| Instalação sobre `&&` mascarando falha | Lição da seção 8A.4: não usar `comando \| tail && próximo` |
| Versionar a pasta `comfyui/` inteira por engano | Ignorada no `.gitignore`; só `comfyui-config/` é versionada (seção 8A.7) |
| RAM no limite com o LTX 2.5 (pico 50,7 de 59 GB) | Não rodar outras cargas pesadas durante a geração; vigiar a RAM; se estourar, reduzir resolução/duração |
| Licença do LTX 2.5 (gratuita só abaixo de US$ 10 mi de receita anual do grupo) | Enquadramento declarado em 08/10/2026; reavaliar com o crescimento da empresa; ver aviso na seção 8A.3 |
| Token do Hugging Face em texto simples em `~/.cache/huggingface/token` | Token só de leitura, **revogado no site em 08/10/2026** (informado pelo responsável; o `hf auth whoami` falha, o que confirma). O arquivo local fica inútil e pode ser apagado com `hf auth logout` |
| Modelos de terceiros com licenças distintas | Conferir a licença de cada modelo antes de uso comercial; Z-Image-Turbo e Wan 2.2 são Apache 2.0 (Hugging Face, 07/10/2026); o **LTX 2.5 tem licença própria** (seção 8A.3) |

## Escopo restante do capítulo <span class="badge badge-stub">Stub</span>

- **Avaliação humana** das rodadas `2026-10-08_1800` e `2026-10-08_2320_ltx` (fichas em `bench/results/`)
- **Avaliar o áudio** gerado pelo LTX 2.5 (não foi avaliado)
- Testar a **extensão de vídeos** (vídeos mais longos que 5 s)
- Próxima rodada de modelos (Qwen-Image para texto em imagem; FLUX.2 klein) após benchmark
- Validar o `Linger` em um reboot real e apagar o token local (`hf auth logout`)
- Workflows do ComfyUI versionados e backup deles ([Cap. 14](14-backup.md))
- Integração com o AI Gateway ([ADR-004](16-apendices/adrs.md#adr-004)) — hoje o ComfyUI é usado só pela interface web local
- Confirmar `Linger` (seção 8A.6) e a política de backup dos workflows (seção 8A.7)
