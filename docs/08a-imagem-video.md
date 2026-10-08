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

## 8A.6 Operação diária <span class="badge badge-existe">Existe</span>

### Regras de convivência com o Ollama

1. **Descarregar o LLM antes de gerar vídeo.** O Devstral ocupa ~11 GB da 5060 Ti; sem descarregá-lo, falta VRAM:

    ```bash
    ollama ps                          # ver o que está carregado
    ollama stop devstral-small-2:24b   # liberar a VRAM
    ```

2. **Uma geração por vez.** O nobreak tem 600 W e já apitou com cargas paralelas ([Cap. 8.6](08-inteligencia-artificial.md)).
3. **Não expor na rede.** O ComfyUI **não tem login**. O bind em `127.0.0.1` é uma decisão de segurança ([ADR-007](16-apendices/adrs.md#adr-007)); qualquer mudança para a rede local exige antes proxy com autenticação e revisão do [Cap. 13](13-seguranca.md).

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

### Subir no boot (pendente)

O serviço é de **usuário**: sem *linger* ativo, ele só inicia depois do login. Em 08/10/2026 o estado era `Linger=no` <span class="badge badge-confirmar">A confirmar</span> — não foi alterado por exigir `sudo`. Para subir no boot:

```bash
sudo loginctl enable-linger pases
loginctl show-user pases -p Linger   # esperado: Linger=yes
```

### Ferramentas de apoio <span class="badge badge-existe">Existe — 08/10/2026</span>

Instalados pelo apt em 08/10/2026: **VLC** 3.0.23 (reproduzir os MP4 no gerenciador de arquivos — sem ele o Ubuntu não tinha aplicativo para abrir vídeo) e **ffmpeg** 8.0.1 (extrair quadros, converter e cortar vídeos pela linha de comando). Exemplo, extraindo um quadro do vídeo de teste:

```bash
ffmpeg -i /scratch/comfyui/output/video/teste_wan_720p_00001_.mp4 -vf "select=eq(n\,60)" -frames:v 1 quadro60.png
```

O ComfyUI não depende de nenhum dos dois para gerar: ele salva o MP4 por conta própria.

## 8A.7 Versionamento e backup <span class="badge badge-confirmar">A confirmar</span>

!!! danger "Não versionar a pasta `comfyui/` inteira no `pases-infra`"
    Em 08/10/2026 a pasta `/srv/pases/comfyui/` aparece como **não rastreada** no repositório `pases-infra`. Ela contém o `.venv` (~5 GB) e um clone completo do ComfyUI. Um `git add .` descuidado enviaria tudo isso ao GitHub. A abordagem recomendada, ainda **não aplicada**:

    - adicionar `comfyui/` ao `.gitignore` do `pases-infra`;
    - versionar apenas a **definição**: `comfyui.service` e `extra_model_paths.yaml` (copiando-os para uma pasta rastreada, por exemplo `/srv/pases/comfyui-config/`);
    - o ComfyUI e o venv são **reconstruíveis** pelo procedimento da seção 8A.4.

**Backup (Cap. 14):** os modelos (34 GB) e os arquivos gerados são **reconstruíveis/descartáveis** — baixar de novo é possível e a saída em `/scratch` é temporária por definição. O que importa guardar são os **workflows** (grafos) que você criar e quiser preservar: exportá-los como JSON e salvá-los em um repositório. A inclusão de `/dados/modelos/comfyui` ou de workflows em alguma classe de dados do Cap. 14 ainda não foi decidida.

## 8A.8 Alternativas avaliadas e segunda rodada <span class="badge badge-planejado">Planejado</span>

Registro do que foi analisado em 07/10/2026 (fontes secundárias; os requisitos de VRAM divergem bastante entre elas — **confirmar nas páginas oficiais antes de baixar**):

| Opção | Situação para a estação |
|---|---|
| **LTX-2.3** (FP8) | Vídeo **com áudio** num único passe. Candidato à segunda rodada. Termos comerciais precisam de leitura antes de uso em produto (referenciados como atrelados à receita anual). |
| **LTX 2.5** | Caminho oficial pede **32 GB** de VRAM; em 16 GB só por quantizações GGUF da comunidade (Q3/Q4, 12,6–15,7 GB), com menor qualidade e velocidade. Não recomendado como primeira escolha. |
| **MiniMax H3** | Pesos abertos desde 03/08/2026 (33B parâmetros), com suporte nativo no ComfyUI. A versão aberta sai em **no máximo 768p**; o upscaler de 2K é só da API. Um site afirma restrição de licença para uso em EUA/UE/Reino Unido/Coreia — **não confirmado**; ler a licença no Hugging Face antes de qualquer investimento. |
| **Qwen-Image** (quantizado) | Melhor em texto legível dentro da imagem (útil para mockups). Candidato à segunda rodada. |
| **FLUX.2 klein 4B** | Bom para edição e multi-referência, Apache 2.0. Candidato. |
| **FLUX.2 [dev]** | Descartado: pede 24 GB ou mais e a licença é não comercial. |
| **Wan 2.2 A14B** (GGUF Q4) | Mais qualidade de movimento que o 5B, mas apertado em 16 GB e sem áudio. Candidato condicionado ao benchmark do 5B. |

**Gatilho para a segunda rodada:** quando houver uso real que o Z-Image/Wan 5B não atenda (texto em imagem, áudio no vídeo, movimento mais complexo) — não por curiosidade de catálogo. Antes de promover qualquer modelo, criar a suíte padronizada de imagem/vídeo citada na seção 8A.5.

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
| `comfyui/` não rastreada no `pases-infra` | Seção 8A.7 |
| Modelos de terceiros com licenças distintas | Conferir a licença de cada modelo antes de uso comercial; os instalados (Z-Image-Turbo e Wan 2.2) são Apache 2.0 conforme o Hugging Face em 07/10/2026 |

## Escopo restante do capítulo <span class="badge badge-stub">Stub</span>

- Suíte padronizada de benchmark para imagem e vídeo (equivalente ao PASES-Bench v1)
- Segunda rodada de modelos (LTX-2.3, Qwen-Image, FLUX.2 klein) após benchmark
- Workflows do ComfyUI versionados e backup deles ([Cap. 14](14-backup.md))
- Integração com o AI Gateway ([ADR-004](16-apendices/adrs.md#adr-004)) — hoje o ComfyUI é usado só pela interface web local
- Confirmar `Linger` e a política de versionamento (seção 8A.7)
