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
| 3D (Blender 5.0.1) | `/srv/pases/blender`; scripts em `/srv/pases/blender-config` (seção 8A.12) |
| Voz (CPU, separada do ComfyUI) | `/srv/pases/tts` — Kokoro (texto→fala) e Whisper (fala→texto); ferramentas em `/srv/pases/tts-config` (seção 8A.11) |

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

### Qwen-Image 2.1 — imagem com texto <span class="badge badge-existe">Existe — 09/10/2026</span> <span class="badge badge-confirmar">Somente avaliação</span>

Repositório: `Comfy-Org/Qwen-Image-2.1` (Hugging Face), público e **sem login**. A licença, porém, **não é Apache**: é a *Qwen Research License* (20/09/2026).

| Arquivo | Tamanho | Pasta (em `/dados/modelos/comfyui/`) |
|---|---|---|
| `qwen_image_2.1_int8_convrot.safetensors` | 7,26 GB | `diffusion_models/` |
| `qwen3vl_8b_int8_convrot.safetensors` | 9,35 GB | `text_encoders/` |
| `qwen_image_2.1_vae_bf16.safetensors` | 0,68 GB | `vae/` |

**Total: ~17,3 GB** (modelos do ComfyUI somam agora ~98 GB). SHA-256 dos 3 arquivos conferido contra o Hugging Face em 09/10/2026. Não foi baixado o *prompt enhancer* opcional (9,47 GB), que o template oficial deixa desligado.

!!! danger "Licença Qwen Research — uso não comercial"
    - O uso é permitido **somente para pesquisa ou avaliação** ("Non-Commercial"). **Qualquer uso comercial exige licença separada** da Qwen (`model-business@notice.qwencloud.com`). Usar as imagens geradas em materiais da empresa pode ser considerado uso comercial — em caso de dúvida, perguntar a eles antes.
    - Se o modelo ou suas saídas forem usados para criar, treinar ou melhorar **outro modelo de IA** distribuído, é preciso exibir "Built with Qwen" / "Improved using Qwen".
    - A lei aplicável é a da China, com foro em Hangzhou; quebra dos termos obriga a apagar o material.
    - **Hoje o Qwen-Image 2.1 está instalado apenas para avaliação.** Alternativa **Apache 2.0** (não instalada): Qwen-Image 2512, ~30 GB, mais pesado em 16 GB — ver [ADR-009](16-apendices/adrs.md#adr-009).

### FLUX.2 klein 4B — edição de imagens <span class="badge badge-existe">Existe — 09/10/2026</span>

Modelo de 4 bilhões de parâmetros da Black Forest Labs, **Apache 2.0** e sem restrição de acesso. Versão **distilled em fp8** (4 passos), a do template oficial `image_flux2_klein_image_edit_4b_distilled`.

| Peça | Origem | Tamanho | Pasta (em `/dados/modelos/comfyui/`) |
|---|---|---|---|
| `flux-2-klein-4b-fp8.safetensors` | `black-forest-labs/FLUX.2-klein-4b-fp8` | 4,07 GB | `diffusion_models/` |
| `flux2-klein-vae-apache.safetensors` | `black-forest-labs/FLUX.2-klein-4B`, arquivo `vae/diffusion_pytorch_model.safetensors` | 0,17 GB | `vae/` |
| Text encoder | **reaproveitado:** `qwen_3_4b_fp8_mixed.safetensors` (o mesmo Qwen3-4B do Z-Image) | 0 GB novos | `text_encoders/` |

**Download novo: ~4,24 GB.** SHA-256 dos 2 arquivos conferido em 09/10/2026. Armazenamento total dos modelos do ComfyUI: **98 GB** (91 GiB pelo `du`).

!!! info "Decisão sobre o VAE (licença)"
    O template do ComfyUI aponta para `Comfy-Org/flux2-dev/.../flux2-vae.safetensors` (0,34 GB), mas esse repositório está marcado com a licença **não comercial do FLUX [dev]**. **Não foi usado.** Em seu lugar foi usado o VAE que o **próprio repositório Apache do klein** distribui, em formato diffusers, e que o ComfyUI carregou normalmente no `VAELoader`. Não foi verificado se os pesos são idênticos aos do arquivo do Comfy-Org (podem diferir em precisão: 0,17 GB contra 0,34 GB).

**Ressalvas do modelo:** o template usa o encoder `qwen_3_4b` em bf16 (8,04 GB); aqui foi usado o **fp8_mixed** já instalado; o **A/B contra o bf16 foi feito em 09/10/2026** e mostrou que o fp8 é adequado (seção 8A.5). A BFL recomenda implementar filtros de conteúdo ao usar o klein. A versão **9B** do klein tem licença **não comercial** e não foi instalada.

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

**6C. Baixar o Qwen-Image 2.1** (público, sem token). Usar `curl` retomável, **não** o `hf`: depois do LTX o arquivo `~/.cache/huggingface/token` (já revogado) ainda existe, e o `hf` o enviaria — um token inválido pode fazer o Hugging Face recusar até repositórios públicos.

```bash
B=/dados/modelos/comfyui
R=https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main
curl -L -C - --fail -o $B/vae/qwen_image_2.1_vae_bf16.safetensors                        $R/vae/qwen_image_2.1_vae_bf16.safetensors
curl -L -C - --fail -o $B/text_encoders/qwen3vl_8b_int8_convrot.safetensors              $R/text_encoders/qwen3vl_8b_int8_convrot.safetensors
curl -L -C - --fail -o $B/diffusion_models/qwen_image_2.1_int8_convrot.safetensors       $R/diffusion_models/qwen_image_2.1_int8_convrot.safetensors
```

O download levou cerca de 40 min nesta rede. Conferir os SHA-256 contra o publicado no Hugging Face (campo `lfs.oid` da API de árvore do repositório) e reiniciar o ComfyUI.

**6D. Qwen-Image 2512 (Apache 2.0) — baixado, testado e removido em 09/10/2026.** Mantido aqui só para poder reinstalar. Origem `Comfy-Org/Qwen-Image_ComfyUI` (público, sem login), mesmo método do passo 6C com `curl` retomável:

| Arquivo | Tamanho | Pasta |
|---|---|---|
| `qwen_image_2512_fp8_e4m3fn.safetensors` | 20,43 GB | `diffusion_models/` |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | 9,38 GB | `text_encoders/` |
| `qwen_image_vae.safetensors` | 0,25 GB | `vae/` |

URL base: `https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/<pasta>/<arquivo>`. Depois: conferir SHA-256 e reiniciar o ComfyUI. O workflow está em `bench/qwen.py` (`wf_qwen2512`) e roda com `bench.py --imagem qwen2512`, **que só funciona com os arquivos reinstalados**. A LoRA opcional de 4 passos (`Qwen-Image-2512-Lightning-4steps-V1.0`, 1,58 GB, repositório `lightx2v/Qwen-Image-2512-Lightning`) **não foi testada**.

**6E. Baixar o FLUX.2 klein 4B** (público, sem token; `curl` retomável como nos passos 6C e 6D):

```bash
B=/dados/modelos/comfyui
curl -L -C - --fail -o $B/diffusion_models/flux-2-klein-4b-fp8.safetensors \
  https://huggingface.co/black-forest-labs/FLUX.2-klein-4b-fp8/resolve/main/flux-2-klein-4b-fp8.safetensors
curl -L -C - --fail -o $B/vae/flux2-klein-vae-apache.safetensors \
  https://huggingface.co/black-forest-labs/FLUX.2-klein-4B/resolve/main/vae/diffusion_pytorch_model.safetensors
```

Conferir os SHA-256 (campo `lfs.oid` da API de árvore de cada repositório) e reiniciar o ComfyUI. O encoder **não** precisa ser baixado: usa-se o `qwen_3_4b_fp8_mixed.safetensors` do Z-Image. O download levou poucos minutos.

**6F. Ambiente de voz (CPU)** — texto→fala (Kokoro) e fala→texto (Whisper), num venv **separado** do ComfyUI. Detalhes, scripts e cuidados na seção 8A.11 e em `/srv/pases/tts-config/README.md`:

```bash
export PATH="$HOME/.local/bin:$PATH" UV_HTTP_TIMEOUT=300
mkdir -p /srv/pases/tts && cd /srv/pases/tts && uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python torch --index-url https://download.pytorch.org/whl/cpu
uv pip install --python .venv/bin/python "kokoro==0.9.4" soundfile faster-whisper
```

Não exige `sudo` nem `espeak-ng` (o pacote `misaki` traz a biblioteca). Os modelos são baixados na primeira execução.

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

!!! danger "Correção (11/10/2026) — os vídeos do LTX desta rodada tinham um defeito de configuração meu"
    Todos os vídeos do LTX gerados até 10/10/2026 saíram com uma **queda de nitidez a cada 8 quadros** (o "piscar com borrão"). A causa foi um erro meu ao copiar o template: o nó `VAEDecodeTiled` foi configurado com `temporal_size 16` e `temporal_overlap 8`, quando o template oficial usa **64 e 16**; blocos de 16 quadros com sobreposição de 8 criam uma emenda a cada 8 quadros. O benchmark **não acusou** o defeito e as conclusões abaixo foram tiradas sem ele. Corrigido em `bench/ltx.py` e `bench/extend.py`, a suíte do LTX foi **repetida** (rodada `2026-10-11_0055_ltx`) e uma **métrica objetiva de piscar** (`bench/qualidade.py`) passou a fazer parte de todo relatório.

    **Efeito, medido** (oscilação de nitidez em relação à média móvel de 9 quadros; mediana e, entre parênteses, o pior caso; quedas = quadros com nitidez >15% abaixo da média):

    | Item | Wan 2.2 5B | LTX **antes** da correção | LTX **corrigido** |
    |---|---|---|---|
    | V1 — vídeo curto | 5,0% (13,0%) · 4 quedas | 22,7% (25,7%) · 8 quedas | **2,3% (3,0%)** · 0 quedas |
    | V3 — imagem para vídeo | 3,6% (4,8%) · 0 | 7,1% (10,4%) · 3 | **1,8% (1,8%)** · 0 |
    | V4 — movimento complexo | 5,6% (9,2%) · 3 | 9,0% (13,0%) · 5 | 6,8% (12,4%) · 6 |
    | V2 — 720p, 5 s | 1,1% (1,3%) · 0 | 23,4% (26,0%) · 27 | **3,5% (3,7%)** · 0 |

    No **V4** (mãos lixando) a oscilação segue alta nos dois modelos porque ali a nitidez varia por causa do **movimento real** (desfoque de movimento), não de um defeito: a métrica não separa defeito de conteúdo em cenas de muito movimento. **Tempos e memória não mudaram** (V1 19,0 s · V3 34,5 s · V4 19,0 s · V2 83,8 s; RAM ~51 GB), e a leitura visual por quadros abaixo continua valendo. Com a correção o LTX fica na faixa do Wan em nitidez e mantém a vantagem de velocidade, de movimento e de áudio.


Rodada `2026-10-08_2320_ltx` (**afetada pelo defeito acima**; repetida em `2026-10-11_0055_ltx`) do **PASES-Bench Visual v1** (seção 8A.5b), com os mesmos prompts, sementes e durações do Wan (rodada `2026-10-08_1800`). Mesmas condições: uma geração por vez, Devstral descarregado, power limit permanente das GPUs. **10 gerações, 0 falhas, todas com áudio e na resolução pedida.**

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

!!! warning "Correção (11/10/2026)"
    A rodada original (`2026-10-08_2337_ltx`) foi afetada pelo defeito do VAE temporal descrito na seção anterior. Repetida em `2026-10-11_0055_ltx`: a oscilação de nitidez do **F1** caiu de **11,4% para 1,8%** (3 quedas → 0); no **F2** de 18,6% para 11,4%, que **continua alta por causa do conteúdo** (o meio do vídeo é um *dissolve*/borrão de transição, não um defeito de decodificação). As conclusões abaixo sobre o flf2v **se mantêm**.


Template oficial `video_ltx2_5_flf2v`, reproduzido em `bench/ltx.py` (`wf_ltx_flf`). Ao contrário do texto/imagem-para-vídeo, é **um único estágio**, sem upscale latente: o vídeo nasce direto na resolução final (largura e altura **múltiplas de 32**). O primeiro quadro entra por `LTXVAddGuide` com índice 0 e o último com índice -1, ambos com força 0,7; ao fim os guias são removidos (`LTXVCropGuides`). Rodada `2026-10-08_2337_ltx`, 896×512, 49 quadros (2 s), 2 sementes por item. **4 gerações, 0 falhas**, pico de 73 °C e 166 W; **~21 s** por geração com o prompt já em cache (~100 s na 1ª semente de cada prompt, ver seção 8A.6).

| Item | Extremos | Resultado (leitura do assistente, 3 quadros por vídeo) |
|---|---|---|
| **F1** — reconstrução | Primeiro = imagem I1_101; último = fim de um vídeo LTX que parte dessa imagem | **Bom nas 2 sementes.** Começa e termina fiel aos extremos, com câmera avançando suave pelo caminho esperado; praticamente reproduz o vídeo de origem |
| **F2** — transição entre cenas | Primeiro = I1_101; último = I1_102 (outra bancada) | **Chega fiel nos dois extremos, mas o meio é ruim.** Semente 101: *cross-dissolve* (as duas cenas sobrepostas, com transparência), não um movimento de câmera. Semente 102: o quadro do meio é um borrão de movimento irreconhecível, e depois "pousa" exato no último quadro |

**Leitura:** o flf2v funciona bem quando os dois quadros são **da mesma cena** (a câmera ou a luz mudando) — é o uso para o qual serve. Quando os extremos são cenas **diferentes**, o modelo respeita as duas pontas mas não inventa um caminho plausível: recorre a dissolver ou a borrar. Para transições entre cenas, a técnica adequada é outra (cortes, ou gerar trechos separados).

!!! warning "Limites"
    2 sementes por item e 3 quadros por vídeo avaliados; o áudio não foi avaliado. O prompt negativo usado é o curto dos demais testes do LTX, não o do template (que tem termos de uma cena específica de pessoa falando).

### Qwen-Image 2.1 × Z-Image-Turbo — texto em imagens <span class="badge badge-existe">Existe — 09/10/2026</span>

Rodada `2026-10-09_0043_qwen` (Qwen, itens I1–I5, 3 sementes: 15 gerações, **0 falhas**) e `2026-10-09_0048` (I5 com Z-Image, que ainda não tinha esse item), contra a linha de base do Z-Image de 08/10. 1024×1024, uma geração por vez. O Qwen roda com os parâmetros do template oficial: **25 passos**, CFG 1, `euler`, prompt enhancer desligado (o pipeline oficial usa ~40–50 passos; 25 é o padrão do template).

| | Z-Image-Turbo | Qwen-Image 2.1 |
|---|---|---|
| Tempo por imagem (mediana) | **12 s** | 18 s |
| 1ª geração, a frio | 50 s | **22 s** |
| Pico de VRAM | 15,7 GB | 15,7 GB |
| Pico de RAM | ~27 GB | ~28,7 GB |
| Pico de temperatura / potência (2 GPUs) | 76 °C / 169 W | 77 °C / 168 W |

**Texto — leitura do assistente nas folhas de contato (3 sementes por item). A ficha de avaliação humana é a que vale e ainda não foi preenchida.**

| Item | Qwen-Image 2.1 | Z-Image-Turbo |
|---|---|---|
| **I2** — etiqueta "PEDIDO 1024 - MOVENTUS" | 3 de 3 corretas | 3 de 3 corretas |
| **I5** — bloco longo com acentos e símbolos ("ORÇAMENTO Nº 0412", "Armário", "R$ 4.850,00", "úteis") | **3 de 3 com todas as linhas e acentos corretos.** Na semente 101 o "º" parece um símbolo de grau | 2 de 3 corretas. Na semente 101 saiu **"04112"** (dígito a mais) e a folha ganhou formato de folha de árvore |
| **I3** — mockup de tela de ERP | Títulos e botão certos nas 3 sementes ("Pedidos", "Novo Pedido"), mas **tabelas e menus viram ruído ilegível** | Foto de monitor; **"Pedigos"** errado nas 3 sementes e palavras como "Botor" |

**Conclusão:** para **texto curto a médio e documentos**, o Qwen é mais confiável (especialmente com acentos e números), ao custo de ~50% mais tempo por imagem. Para **interface com texto denso e pequeno** (tabelas de ERP) nenhum dos dois produz uma imagem final aproveitável: o Qwen acerta os títulos e perde o miúdo; o Z-Image erra até os títulos. O Z-Image continua sendo o modelo padrão para imagens sem texto crítico (mais rápido, Apache 2.0). I1 e I4 (composição e fotorrealismo) **não foram avaliados** nesta comparação.

!!! warning "Limites"
    3 sementes por item e avaliação visual do assistente. O Qwen está sob licença **só para avaliação** (seção 8A.3): estes resultados orientam a decisão de licenciar ou de usar o Qwen-Image 2512 (Apache 2.0), não autorizam uso em produção.

### Qwen-Image 2512 (Apache 2.0) — reprovado e removido <span class="badge badge-existe">Existe — 09/10/2026</span>

O Qwen-Image 2.1 só pode ser usado para avaliação ([ADR-009](16-apendices/adrs.md#adr-009)); o **2512** é Apache 2.0 e era a alternativa livre de licença. Foi baixado (30,07 GB, SHA-256 conferido), testado no item **I5** (texto longo com acentos) e **removido do disco**. Parâmetros do template oficial `image_qwen_Image_2512`: **50 passos, CFG 4**, `euler`, shift 3,1, sem a LoRA de aceleração, com o prompt negativo do template. Rodadas `2026-10-09_2021_qwen2512` (1024², 3 sementes) e um teste avulso à **resolução nativa de 1328×1328** (2 sementes).

| | Z-Image-Turbo | Qwen-Image 2.1 | Qwen-Image 2512 |
|---|---|---|---|
| Licença | Apache 2.0 | não comercial | Apache 2.0 |
| I5 — texto totalmente correto | 2 de 3 | **3 de 3** | **0 de 3** (1024²) e **0 de 2** (1328²) |
| Tempo por imagem | **12 s** | 18 s | **218 s** (1024²) / **370 s** (1328²) |
| Pico de RAM | ~27 GB | ~28,7 GB | 37,7 GB |
| Pico de VRAM | 15,7 GB | 15,7 GB | 15,5 GB (1024²) / 15,8 GB (1328²) |

**O texto saiu com erros em todas as imagens do 2512.** A 1024²: "Cliete", "Clente", "Valoo", "Marceneria", "Armáro", "cozinho", "ORÇIAMENTO". À resolução nativa de 1328² melhorou — "Marcenaria Silva", "R$ 4.850,00", "15 dias úteis" e "Nº 0412" saíram certos —, mas ainda restaram erros por imagem ("Clente", "Valo"/"Valoo", "cozinho", "ORÇÍAMENTO"). Ou seja, **a resolução ajudou, mas não explica o resultado**.

**Conclusão:** o 2512 perde para o Z-Image em tudo neste item — texto pior, **18 a 30 vezes mais lento**, mais RAM — e o Z-Image já é Apache 2.0. Portanto **não é uma alternativa viável** ao Qwen-Image 2.1 para texto; os 30 GB foram apagados. Se a precisão de texto for importante, o caminho é licenciar o 2.1 (ADR-009); se não for, o Z-Image basta.

!!! warning "Limites"
    Um único item (I5), 3 sementes a 1024² e 2 a 1328², leitura visual do assistente. I2 e I3 não foram rodados com o 2512, e a LoRA de 4 passos não foi testada — a qualidade de texto com ela é desconhecida.

### FLUX.2 klein 4B — edição de imagens <span class="badge badge-existe">Existe — 09/10/2026</span>

Rodada `2026-10-09_2147_flux2edit` do PASES-Bench Visual: **4 edições × 3 sementes = 12 gerações, 0 falhas**. As imagens-base (`bench/fixtures/E_*.jpg`) vêm do Z-Image (rodada de 08/10). Parâmetros do template: **4 passos, CFG 1**, `euler`, referência reduzida a ~1 megapixel (o tamanho da saída segue a primeira imagem); em edições, a(s) imagem(ns) entram como `ReferenceLatent` no condicionamento positivo e no negativo (zerado).

| Medida | Valor |
|---|---|
| Tempo por edição, 1 imagem (mediana) | **5 s** (a 1ª, a frio: 27 s) |
| Edição com 2 referências (E4) | **9 s** |
| Pico de VRAM | **12,6 GB** |
| Pico de RAM do sistema | 19,6 GB |
| Pico de temperatura / potência (2 GPUs) | 71 °C / 156 W |

**Qualidade — leitura do assistente nas folhas de contato (3 sementes por item). A ficha de avaliação humana é a que vale e ainda não foi preenchida.**

| Item | Edição pedida | Resultado |
|---|---|---|
| **E1** — cor | Armário branco → verde-escuro, mantendo puxadores, forma e fundo | **Muito bom nas 3.** Cor trocada; formato, puxadores, prateleira e gavetas preservados. Mudança indevida pequena: o fundo ficou um pouco mais frio |
| **E2** — material | Madeira clara → nogueira escura, mantendo o resto | **Troca muito boa e consistente nas 3**, preservando janela, objetos e luz. **Mudança indevida:** o piso de concreto virou piso de madeira escura, embora o prompt falasse só de superfícies de madeira |
| **E3** — remoção | Remover a panela preta da bancada | **Excelente nas 3.** A panela sumiu, a bancada foi reconstruída, e a panela decorativa da parede foi corretamente mantida |
| **E4** — 2 referências | Colocar o armário da imagem 2 na sala da imagem 1 | **Fraco.** A sala foi preservada, mas o armário **não manteve a identidade**: em duas sementes virou um trecho branco do balcão e na terceira surgiu um armário alto diferente do da referência |

**Conclusão:** para **edições simples** (cor, material, remoção de objeto) o klein 4B é rápido e confiável, o que o torna útil para variações de acabamento e retoques de projeto. Para **compor objetos de duas imagens** ele ainda reinterpreta a referência e não serve.

!!! warning "Limites"
    3 sementes por item, leitura visual do assistente. Uma variante só (4B distilled fp8) com o encoder fp8 reaproveitado (o A/B contra o bf16 mostrou diferença desprezível nas edições). O E2 mostra que prompts de material podem **vazar para o piso**: convém dizer explicitamente o que **não** deve mudar.

### LTX 2.5 — extensão de vídeo (continuação) <span class="badge badge-existe">Existe — 09/10/2026</span>

!!! warning "Correção (11/10/2026)"
    A rodada original (`2026-10-09_2208_ltx`) usou o decodificador com o defeito do VAE temporal (veja a seção LTX × Wan). Repetida em `2026-10-11_0055_ltx`: a oscilação de nitidez dos vídeos de extensão caiu de **23,3% para 2,3%** (11 quedas → 0). Tempo (~21 s por extensão) e memória não mudaram. Os saltos nas emendas abaixo foram atualizados; **a conclusão "M1 é melhor que M2" foi enfraquecida** (agora está dentro do ruído).


**Não existe template oficial de extensão para o LTX 2.5** (só texto, imagem e primeiro/último quadro). O método aqui é montado com nós do ComfyUI e está em `bench/extend.py`: os **últimos K quadros** do trecho anterior (`LoadVideo` → `GetVideoComponents` → `ImageFromBatch`) viram guia do início do próximo trecho (`LTXVAddGuide`, `frame_idx` 0, força 1,0), num único estágio, como no flf2v. O trecho novo repete esses K quadros; ao **costurar com `ffmpeg`** descartam-se os K primeiros do trecho novo (vídeo e áudio). O **áudio de cada trecho é gerado do zero**, sem condicionamento do anterior.

Rodada `2026-10-09_2208_ltx`, item **X1**: parte do V1 do LTX (2 s) e encadeia **2 extensões de 2 s** (~5,4 a 6 s no total), 896×512, 2 sementes e 2 métodos — **M1** guiado pelo **último quadro** (K = 1) e **M2** pelos **últimos 9 quadros** (K = 9). **8 gerações, 0 falhas.**

| Medida | Valor |
|---|---|
| Tempo por extensão de 2 s | **20 a 22 s** (a 1ª, a frio: 97 s) |
| Pico de VRAM | 15,8 GB |
| Pico de RAM do sistema | **49,8 GB de 59 GB** |
| Pico de temperatura / potência (2 GPUs) | 73 °C / 166 W |

**Emendas.** "Salto" = diferença visual entre o último quadro antigo e o primeiro novo, dividida pela mediana da diferença entre quadros consecutivos fora das emendas (**~1 = emenda invisível**):

| Método | Vídeo final | Saltos medidos (2 emendas × 2 sementes) |
|---|---|---|
| **M1** (1 quadro) | 145 quadros (6,0 s) | 0,99 · 0,64 · 1,43 · 1,41 *(antes da correção: 0,91–1,29)* |
| **M2** (9 quadros) | 129 quadros (5,4 s) | 1,37 · 1,01 · 1,58 · 1,30 *(antes: 1,20–1,69)* |

**Leitura visual do assistente** (6 quadros ao redor das emendas de cada vídeo; a avaliação humana é a que vale e não foi feita): nos 4 vídeos, os quadros de cada lado da emenda são praticamente iguais; a câmera segue avançando e a sala e os objetos principais permanecem. A diferença entre M1 e M2 é pequena e **está dentro do ruído** (saltos de 0,64 a 1,58); o **M2, que deveria carregar melhor a inércia do movimento, não mostrou vantagem** (e a semente 102 terminou com muito clarão de luz). Em 6 s os detalhes pequenos mudam (a bancada ganha outros objetos conforme a câmera se aproxima), sem a cena "derreter".

**Recomendação provisória:** estender com **M1** (último quadro) — mais simples, rende mais vídeo útil (145 contra 129 quadros) e sem desvantagem nas emendas — e trechos de 2 s; cada extensão custa ~20 s com o prompt de continuação em cache.

!!! warning "Limites"
    - **Áudio não avaliado** (cada trecho gera o próprio áudio, então pode haver quebra na emenda) e **continuidade da velocidade do movimento não medida** (só a aparência na emenda).
    - 2 sementes, uma cena de base e só 2 extensões; não se sabe como se comporta em vídeos mais longos.
    - O M2 foi uma única configuração (força 1,0, 9 quadros); outras escolhas podem render diferente.
    - O prompt de continuação foi escrito em inglês e é o mesmo nas duas etapas; trocar de prompt a cada trecho custa ~80 s extra por causa do encoder (8A.6).

### FLUX.2 klein 4B — texto para imagem <span class="badge badge-existe">Existe — 09/10/2026</span>

Rodada `2026-10-09_2226_flux2`: os **5 itens de imagem (I1–I5), 3 sementes, 15 gerações, 0 falhas**, a 1024×1024, com o **mesmo modelo** já instalado para edição (4B distilled fp8, VAE Apache, encoder fp8 reaproveitado) — **nenhum download novo**. Parâmetros do template oficial `image_flux2_klein_text_to_image` (subgrafo *Distilled*): **4 passos, CFG 1**, `euler`, prompt negativo zerado. O template usa `flux-2-klein-4b` em **bf16** (7,2 GB); aqui roda a versão **fp8** do mesmo modelo.

| Medida | FLUX.2 klein 4B | Z-Image-Turbo | Qwen-Image 2.1 |
|---|---|---|---|
| Tempo por imagem (mediana) | **3 s** | 12 s | 18 s |
| 1ª geração, a frio | 24 s | 50 s | 22 s |
| Pico de VRAM | **12,5 GB** | 15,7 GB | 15,7 GB |
| Pico de RAM | **19,4 GB** | ~27 GB | ~28,7 GB |
| Pico de temperatura / potência (2 GPUs) | 71 °C / 162 W | 76 °C / 169 W | 77 °C / 168 W |
| Licença | Apache 2.0 | Apache 2.0 | não comercial |

**Texto — leitura do assistente nas folhas de contato (3 sementes por item). A ficha de avaliação humana é a que vale e ainda não foi preenchida.**

| Item | Resultado do klein |
|---|---|
| **I5** — bloco longo com acentos | **Quebrado nas 3.** "Cliebte", "Volal: R $ $ 4.850,0", "Armarô", "cozinha" deformado e "Prazo úteis" sem "15 dias" |
| **I2** — etiqueta curta | **1 de 3 com o título certo** ("PEEDIDO", "PEDITO" nas outras); a 2ª linha deformada nas 3 ("cozihna", "Armarzinha") |
| **I3** — mockup de ERP | Layout bonito de monitor, mas o título saiu "Pedicos" e "Pedicoos" nas 3 |

**Texto longo correto (I5), todos os modelos testados:** Qwen-Image 2.1 **3 de 3** · Z-Image **2 de 3** · FLUX.2 klein **0 de 3** · Qwen-Image 2512 **0 de 3**.

**Fora do texto (I1 e I4):** I1 (oficina) saiu com fotos nítidas e realistas — bancada de madeira clara, janela e painel de ferramentas —, mas **sem o "projeto de móveis sobre a mesa"** pedido no prompt. I4 (composição precisa) foi **mista**: 2 das 3 sementes têm exatamente 3 gavetas, uma tem só 2, e porta e prateleiras variam.

**Conclusão:** o klein é o modelo **mais rápido** (4× o Z-Image) e **mais leve** (3 GB a menos de VRAM), bom para **rascunhos e conceitos visuais sem texto** e, já testado, para **edição**. **Não usar para texto dentro da imagem**: Z-Image e, sobretudo, o Qwen 2.1 são bem melhores.

!!! warning "Limites"
    3 sementes por item e leitura visual do assistente. Foi testada a versão **fp8** do modelo com o encoder **fp8**; a comparação posterior com o encoder **bf16** do template (seção 8A.5) mostrou que o encoder **não é a causa** do texto ruim. A variante *base* (não distilled, 50 passos) não foi testada.

### FLUX.2 klein — encoder fp8 × bf16 (A/B) <span class="badge badge-existe">Existe — 09/10/2026</span>

O template oficial do klein usa o text encoder `qwen_3_4b` em **bf16** (8,04 GB); a estação usa o **fp8_mixed** do Z-Image (5,63 GB). Para saber se a quantização do encoder explicava o texto ruim, o `qwen_3_4b.safetensors` (bf16, `Comfy-Org/z_image_turbo`, Apache 2.0, SHA-256 conferido) foi baixado e rodado em **texto→imagem (I1–I5, 15 gerações)** e **edição (E1–E4, 12 gerações)**, nas mesmas sementes. Rodadas `2026-10-09_2304_flux2_encbf16` e `2026-10-09_2305_flux2edit_encbf16`, contra as rodadas fp8 de `2226_flux2` e `2147_flux2edit`. Opção do runner: `--encoder bf16`. **27 gerações, 0 falhas.**

| Recurso | Encoder fp8 | Encoder bf16 |
|---|---|---|
| Tempo por imagem / edição (mediana) | 3 s / 6 s | 3 s / 6 s (igual) |
| Pico de VRAM | 12,5 GB | **14,8 GB** (+2,3 GB) |
| Pico de RAM do sistema | 19,4 GB (edição: 19,6) | 23,1 GB (edição: 21,9) |
| Disco do encoder | 5,6 GB | 8,0 GB |

**Diferença objetiva entre as imagens** (diferença média absoluta por pixel, escala 0–255, mesma semente, fp8 contra bf16):

| Conjunto | Diferença |
|---|---|
| **Edições** (E1–E4) | **0,5 a 1,8** — praticamente idênticas |
| Texto→imagem (I2–I5) | 3 a 13 |
| Texto→imagem (I1, oficina) | 16 a 30 |
| *Referência:* duas sementes diferentes do mesmo item, mesmo encoder | ~54 |

**Texto (leitura do assistente, 3 sementes):** etiqueta I2 com o título correto em **2 de 3** com o bf16 (era 1 de 3), mas a 2ª linha continua deformada; no bloco longo I5 uma imagem acertou a linha "Prazo: 15 dias úteis", mas o texto segue quebrado ("Cielote", "Vorula", "Armande", "R$ 4,855,00"); no mockup I3 o título continua errado ("Pedicos", "Pedioos"). Nas edições, o piso do E2 mudou do mesmo jeito e o E4 falhou do mesmo jeito.

**Conclusão:** a quantização fp8 do encoder **não é a causa** do texto ruim do klein. O fp8 é adequado e economiza 2,3 GB de VRAM e ~2,4 GB de disco; o bf16 foi **apagado**. Para reinstalar: `curl -L -C - --fail -o /dados/modelos/comfyui/text_encoders/qwen_3_4b.safetensors https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors` (8,04 GB), conferir o SHA-256 e reiniciar o ComfyUI.

!!! warning "Limites"
    3 sementes; a melhora do título da etiqueta (1 → 2 de 3) está dentro do ruído. O **modelo** do klein continua em fp8 (o bf16 do modelo, 7,2 GB, não foi testado).

### Wan-Animate-2 destilado — o Texugo no lugar de uma bailarina <span class="badge badge-existe">Existe — 12/10/2026</span>

Primeiro teste do **Wan-Animate-2** (conjunto destilado, `int8_convrot`; seção 8A.8): **imagem de referência + vídeo de movimento → o personagem executando o movimento**, sem extração de pose. Executor versionado: `/srv/pases/comfyui-config/bench/animate2.py` (fluxo em formato de API equivalente ao do template `video_wan_animate2_distilled`).

| Item | Valor |
|---|---|
| Referência | `frente.jpg` do Texugo (corpo inteiro, fundo liso, 548×812) |
| Movimento | `street_dance_drive.mp4`, o vídeo de exemplo do ComfyUI (8.229.122 bytes, 720×1280, 121 quadros a 24,1 fps), baixado do repositório oficial de modelos de fluxo |
| Prompt de personagem e fundo | texugo gordinho de pelagem preta com crina creme, cicatriz e sorriso de dentes, em uma rua de cidade chuvosa com neon à noite |
| Parâmetros | 81 quadros, 482×854 pedidos (saiu em **480×848**), 10 passos, amostrador `lcm`, `cfg 1`, semente 1, `WanAnimate2Cache` em GPU (`int8`) |
| Resultado | **sucesso em 420 s**, **pico de 14,7 GiB de VRAM** na 5060 Ti, vídeo de 3,36 s (81 quadros) |

**Avaliação do responsável (12/10/2026), após assistir ao vídeo lado a lado: "o vídeo ficou bom".** É um parecer geral, sem detalhe por critério (identidade, movimento, fundo); a leitura do assistente abaixo, de miniaturas, continua válida só como descrição.

**Leitura do assistente** (miniaturas de 8 quadros contra os da origem; os testes anteriores já mostraram que o assistente lê miniaturas de forma otimista):
- **Identidade:** crina creme, cicatriz e sorriso de dentes aparecem iguais nos 8 quadros, que era o ponto fraco do LTX 2.5.
- **Movimento:** a pose acompanha a bailarina (passos largos, giro, braços abertos), inclusive o plano fechado do início.
- **Defeitos vistos:** o fundo muda (neon roxo no lugar do cenário original) e nos primeiros quadros ainda aparece o fundo cinza da referência; o texugo anda ereto, com proporção de brinquedo, não de animal.
- **Limites do teste:** um clipe, uma semente, uma referência e um movimento; o parecer do responsável cobre o vídeo como um todo.

**Observações técnicas:**
- Só **81 quadros** por execução; vídeos mais longos exigem encadear execuções (o template usa um subgrafo repetido).
- O `ffprobe` do vídeo de entrada acusa 60 fps (`r_frame_rate`), mas a taxa média real é 24,1 fps; vale conferir `avg_frame_rate`.
- O ComfyUI precisou ser reiniciado para enxergar a nova pasta `clip_vision/` (agora mapeada no `extra_model_paths.yaml`).

**Decisão sobre o vídeo de movimento:** o responsável pediu para colocar o Texugo em um personagem de um **Short do YouTube** (trecho de *O Exterminador do Futuro 2*, repostado por um canal de terceiros). **Não foi baixado:** os termos do YouTube proíbem baixar vídeos e o trecho é material de um estúdio; o resultado seria uma obra derivada, problema para uso na marca. Alternativas: vídeo próprio ou licenciado como movimento.

Arquivos: `/scratch/comfyui/output/video/animate2_teste1_00001_.mp4`, `animate2_teste1_origem_x_resultado.mp4` e `animate2_teste1_comparacao.png`.

#### Segundo teste: a leoa como referência

Mesmo vídeo de movimento, mesmo executor e mesmos parâmetros, trocando só a referência e o prompt.

| Item | Valor |
|---|---|
| Referência | `texugo3_leoa_base.png`, a leoa **sozinha**, de pé sobre as quatro patas (768×1360). A `leoa_ref_quadro01.png` foi descartada por mostrar o Texugo e a leoa juntos |
| Prompt | leoa realista de pelo dourado, peito creme e olhos âmbar, "em pé e dançando", numa savana dourada com céu azul (o fundo da referência, diferente do teste do Texugo, que pedia neon) |
| Resultado | **sucesso em 411 s**, **pico de 15,4 GiB de VRAM**, 81 quadros em 480×848 |

**Avaliação do responsável (12/10/2026), após assistir ao vídeo: "o vídeo da leoa ficou ok".** Um parecer geral e **mais morno** que o do Texugo ("bom"), sem detalhe por critério; não diz se a anatomia humanoide incomodou. A leitura do assistente abaixo, de miniaturas, continua válida só como descrição.

**Leitura do assistente** (miniaturas):
- **Identidade e cenário:** pelagem dourada, peito creme, rosto e savana se mantêm nos 8 quadros.
- **Movimento:** a leoa acompanha passos, giro e braços da bailarina, inclusive o plano fechado inicial.
- **Anatomia, o ponto fraco:** o corpo vira o de uma **pessoa com cabeça de leoa**: ereta, pernas finas e longas, tronco musculoso, **punhos fechados no lugar de patas**, cabeça pequena para o corpo; a cauda aparece.
- **Consequência:** serve para uma **leoa antropomórfica dançando**, não para uma leoa que se move como leoa. O movimento de origem é humano e é transferido como tal.

**Para o episódio "Lanchinho errado":** a leoa ficaria consistente no visual, mas moveria o corpo como gente. Uma mordida no Texugo exigiria um **vídeo de movimento de quadrúpede**; **não testado**, e não se sabe se o Animate-2 transfere o movimento dos quatro membros.

Arquivos: `/scratch/comfyui/output/video/animate2_teste2_leoa_00001_.mp4`, `animate2_teste2_leoa_origem_x_resultado.mp4` e `animate2_teste2_leoa_comparacao.png`.

#### Terceiro e quarto testes: movimento de quadrúpede

Mesma referência da leoa (`texugo3_leoa_base.png`, de frente, sobre as quatro patas), mesmo executor e parâmetros, trocando o **vídeo de movimento** por dois clipes de **quadrúpede gerados por nós** com o LTX 2.5 na produção do episódio da leoa (73 quadros a 24 fps; sem material de terceiros). Com 73 quadros em vez de 81, porque os clipes têm só 73.

| Teste | Movimento de origem | Tempo | Pico de VRAM |
|---|---|---|---|
| 3 | leoa andando **de frente** para a câmera (`clip_n2_101`) | 375 s | 15,2 GiB |
| 4 | leoa correndo **de costas**, levantando poeira (`clip_n5_101`) | 350 s | 15,5 GiB |

**Leitura do assistente** (miniaturas de 8 quadros; **avaliação do responsável pendente**):
- **Teste 3 (andando):** funciona. A leoa **continua quadrúpede**, sem virar bípede como no teste com a dança; pelagem consistente, savana preservada, passo e aproximação até o close acompanhados.
- **Teste 4 (correndo de costas):** **o sentido não foi transferido.** A origem corre de costas, afastando-se; o resultado mostra a leoa **de frente, vindo para a câmera**, sem a poeira e com passada de caminhada. A orientação parece vir da **imagem de referência**, não do vídeo de movimento.

**Limites:**
- As origens **já mostram essa leoa**; o teste 3 prova que movimento de quadrúpede é transferido, mas **não é um teste forte de trocar de personagem**.
- Uma semente por teste, só miniaturas; suavidade e patas em vídeo não foram avaliadas.
- Para o "Lanchinho errado": andar e se aproximar funciona; **uma mordida entre duas criaturas continua sem solução**, porque o modelo anima **um personagem por vez**.
- **Não testado:** o Texugo como referência com movimento de quadrúpede (andar de quatro).

Arquivos em `/scratch/comfyui/output/video/` (fora do Git): `animate2_teste3_quad_andando_*` e `animate2_teste4_quad_correndo_*` (o vídeo, o lado a lado `_origem_x_resultado.mp4` e a folha `_comparacao.png`).

#### Quinto teste: o Texugo andando de quatro

Referência `texugo3_n1.png` (o Texugo **de quatro**, vindo de frente numa trilha de terra da savana, 768×1360) com o **movimento do teste 3** (a leoa andando de frente, `quad_n2_andando.mp4`, 73 quadros). Mesmo executor e parâmetros. Prompt: texugo gordinho de quatro patas, pelo preto e crina creme, em uma savana com trilha de terra, andando em direção à câmera.

| Item | Valor |
|---|---|
| Resultado | **sucesso em 350 s**, **pico de 15,5 GiB de VRAM**, 73 quadros em 480×848 |

**Avaliação do responsável (12/10/2026), após assistir ao vídeo: "o vídeo do Texugo ficou bom".** Parecer geral, sem detalhe por critério; igual ao do teste 1 (dança), mais favorável que o da leoa ("ok").

**Leitura do assistente** (miniaturas de 8 quadros):
- **Identidade:** crina creme, pelo preto, orelhas, olhos desconfiados e cicatriz se mantêm nos 8 quadros; trilha, céu e árvores da referência também.
- **Movimento:** acompanha o passo da leoa, com as patas alternando e as garras visíveis; aproxima-se da câmera e termina agachado, em close.
- **Expressão:** nos últimos quadros ele **sorri de lado**; **não vem do movimento de origem**, o modelo a inventou.
- **Anatomia:** continua **quadrúpede**, sem virar bípede como no teste da dança.
- **Limites:** uma semente, miniaturas, 3 s de vídeo; suavidade e patas de perto não foram avaliadas.

**Leitura de conjunto dos testes 1 a 5:** o Animate-2 transfere o **movimento**, mas a **forma do corpo** segue a referência e a **orientação** também (teste 4). Com origem e referência **compatíveis** (humano com humanoide; quadrúpede com quadrúpede), o resultado foi o melhor de personagem do projeto. Com origem humana e referência quadrúpede (teste 2), o corpo virou humanoide. **Uma mordida entre dois personagens segue sem solução**, porque o modelo anima **um personagem por vez**.

Arquivos em `/scratch/comfyui/output/video/` (fora do Git): `animate2_teste5_texugo_quad_*` (o vídeo, o lado a lado `_origem_x_resultado.mp4` e a folha `_comparacao.png`).

#### Sexto teste: uma cena com dois personagens

Referência `texugo3_n6.png` (o Texugo de pé em 3/4, 768×1360) com um **movimento de origem de dois personagens**: um trecho de 3 s (73 quadros, a partir de 1,5 s) do episódio v5 (`Texugo_Bolado_Leoa_v5_15s_vertical.mp4`, geração nossa), em que o Texugo se ergue ao lado da leoa até ficarem cara a cara. Mesmo executor e parâmetros; prompt de um texugo se erguendo nas patas de trás ao lado de uma leoa, na savana.

| Item | Valor |
|---|---|
| Resultado | **sucesso em 350 s**, **pico de 15,5 GiB de VRAM**, 73 quadros em 480×848 |

**Avaliação do responsável (12/10/2026), após abrir a pasta e assistir: "o resultado ficou bom".** Parecer geral, sem detalhe por critério; não diz se considerou bom o fato de a leoa ter sumido.

**Leitura do assistente** (miniaturas de 8 quadros):
- **O Texugo segue o movimento do texugo de origem** (agacha, se ergue nas patas de trás, pula, abre a boca); crina, pelo preto e sorriso se mantêm.
- **A leoa desaparece em todos os quadros.** O vídeo de origem tinha a leoa ao lado e cara a cara; no resultado resta só o Texugo, olhando para cima de boca aberta, **sem destinatário**. A mordida e o contato se perderam.
- **O cenário foi reinventado** (savana com árvores e trilha), pela descrição do prompt.

**Conclusão:** o Animate-2 **anima um personagem por execução**; uma cena de contato entre dois **não sai de uma execução só**. Caminhos possíveis, **não testados**: gerar os dois em execuções separadas, com o mesmo movimento e câmera, e **compor**; usar uma **referência com os dois juntos** (`leoa_ref_quadro01.png`); ou manter o **LTX 2.5** nas cenas de contato e o Animate-2 nos planos de um personagem.

Arquivos em `/scratch/comfyui/output/video/` (fora do Git): `animate2_teste6_dois_*` (o vídeo, o lado a lado `_origem_x_resultado.mp4` e a folha `_comparacao.png`).

### 8A.5b PASES-Bench Visual v1 <span class="badge badge-existe">Existe — 08/10/2026</span>

Suíte padronizada de imagem e vídeo, no mesmo espírito do PASES-Bench dos LLMs ([Cap. 8.2](08-inteligencia-artificial.md)). Fica em `/srv/pases/comfyui-config/bench/` (versionada):

| Arquivo | Função |
|---|---|
| `items.json` | 8 itens (I1–I4 imagem, V1–V4 vídeo) com prompts, sementes, parâmetros e metas provisórias. **Não alterar sem criar a versão v2** — senão os resultados deixam de ser comparáveis |
| `bench.py` | Runner: uma geração por vez, recusa rodar com modelo no Ollama, reinicia o serviço (1ª geração = medida a frio), mede VRAM/RAM/temperatura/potência, aborta acima de 82 °C, gera relatório e folhas de contato |
| `ltx.py` | Workflow do LTX 2.5 em formato de API (espelha o template oficial: dois estágios, upscale latente ×2, áudio e vídeo juntos; versão imagem-para-vídeo) |
| `extend.py` | Extensão de vídeo com o LTX 2.5 (item X1): continuação por quadros-guia, costura com `ffmpeg` e métrica do salto nas emendas |
| `qualidade.py` | **Métrica objetiva de piscar/borrão periódico** (criada em 11/10/2026): oscilação de nitidez em %, autocorrelação em 8 quadros e quadros borrados; vira 3 colunas em todo relatório de vídeo. Vale para **um plano** (cortes e fades geram quedas legítimas). Vídeo limpo: ~1–6%; com o defeito do VAE: 10–28% |
| `results/` | JSON e relatório de cada rodada, com versões do ambiente e SHA-256 dos modelos |

```bash
cd /srv/pases/comfyui-config/bench
/srv/pases/comfyui/.venv/bin/python -I bench.py --dry-run          # valida, não gera
/srv/pases/comfyui/.venv/bin/python -I bench.py                    # suíte completa (Z-Image + Wan), ~40 min
/srv/pases/comfyui/.venv/bin/python -I bench.py --modelo ltx       # só vídeo + F1/F2, com o LTX 2.5, ~12 min
/srv/pases/comfyui/.venv/bin/python -I bench.py --imagem qwen      # só imagens (I1–I5), com o Qwen-Image 2.1, ~5 min
/srv/pases/comfyui/.venv/bin/python -I bench.py --imagem qwen2512  # Qwen-Image 2512 (~55 min; exige reinstalar os arquivos, ver passo 6D)
/srv/pases/comfyui/.venv/bin/python -I bench.py --imagem flux2     # só imagens (I1–I5), com o FLUX.2 klein 4B (texto→imagem), ~2 min
/srv/pases/comfyui/.venv/bin/python -I bench.py --imagem flux2 --encoder bf16   # idem com o encoder bf16 (exige baixar qwen_3_4b.safetensors; foi removido)
/srv/pases/comfyui/.venv/bin/python -I bench.py --edicao          # só edição de imagens (E1–E4), com o FLUX.2 klein 4B, ~3 min
/srv/pases/comfyui/.venv/bin/python -I bench.py --modelo ltx --only X1   # extensão de vídeo (exige um V1 do LTX de rodada anterior), ~6 min
```

Itens: **I1** ambiente de marcenaria · **I2** texto em português na imagem · **I3** mockup de tela de ERP · **I4** composição precisa · **I5** bloco de texto longo em português com acentos (adicionado em 09/10/2026) · **V1** vídeo curto · **V3** imagem para vídeo · **V4** movimento complexo (mãos lixando madeira) · **V2** 720p de 5 s · **F1** primeiro e último quadro (reconstrução) · **F2** primeiro e último quadro (transição entre cenas) — **E1** edição: mudar a cor · **E2** edição: trocar o material · **E3** edição: remover um objeto · **E4** edição com duas imagens de referência — **X1** extensão de vídeo (continuação do V1) — o item `X1` só roda com `--modelo ltx` e depende de uma rodada LTX anterior com V1; os itens `E*` só rodam com `--edicao`; os itens `F*` só rodam com `--modelo ltx`, e seus extremos ficam em `bench/fixtures/` (896×512). A qualidade é avaliada por humano (0 a 2 por critério, ficha no relatório); as metas operacionais continuam **provisórias** até a primeira revisão humana. O modelo de visão local (Qwen3-VL) pode servir de triagem, nunca de juiz.

**Linha de base das imagens** (Z-Image-Turbo, 12 gerações, 0 falhas): mediana de **12 s** por imagem 1024², pico de 76 °C e 169 W. A 1ª geração a frio levou 50 s.

## 8A.6 Operação diária <span class="badge badge-existe">Existe</span>

### Regras de convivência com o Ollama

1. **Descarregar o LLM antes de gerar vídeo.** O `qwen-cline` ocupa **22 GB** (divididos entre as duas GPUs; ~12 GB na 5060 Ti); sem descarregá-lo, falta VRAM:

    ```bash
    ollama ps                          # ver o que está carregado
    ollama stop qwen-cline             # liberar a VRAM
    ```

2. **Uma geração por vez.** O nobreak tem 600 W e já apitou com cargas paralelas ([Cap. 8.6](08-inteligencia-artificial.md)).
3. **Não expor na rede.** O ComfyUI **não tem login**. O bind em `127.0.0.1` é uma decisão de segurança ([ADR-007](16-apendices/adrs.md#adr-007)); qualquer mudança para a rede local exige antes proxy com autenticação e revisão do [Cap. 13](13-seguranca.md).

### Regras de uso do LTX 2.5

- **RAM é o limite, não a VRAM:** pico de ~50,7 GB de 59 GB. Antes de gerar, fechar cargas pesadas; nenhum LLM pode estar carregado (`ollama ps` vazio).
- **Dimensões:** largura e altura finais **múltiplas de 64** (o estágio 1 roda na metade e precisa de múltiplos de 32). **Frames = segundos × fps + 1 e precisa ser 8n+1** (2 s a 24 fps = 49; 5 s = 121).
- **Cada prompt novo custa ~80 s a mais.** O text encoder (14,6 GB) e o transformer (20,5 GB) não cabem juntos na GPU: a cada prompt novo o ComfyUI carrega o encoder, descarrega e recarrega o transformer (visto nos logs). Com o **mesmo prompt e outra semente** o encoder é reaproveitado e a geração leva só ~19 a 21 s (vídeo curto). Na prática: **gere várias sementes por prompt** (ex.: 3 variações seguidas) em vez de trocar de prompt a cada geração. Os ~100 s da 1ª semente de cada item nas tabelas vêm daí, não de uma carga única dos modelos.
- Templates prontos na interface: `video_ltx2_5_t2v` (texto), `video_ltx2_5_i2v` (imagem) e `video_ltx2_5_flf2v` (primeiro e último quadro — testado, ver seção 8A.5).
- **Para estender um vídeo** não há template: usar o método do `bench/extend.py` (seção 8A.5). Guarde o vídeo anterior na pasta `input/` do ComfyUI (o `LoadVideo` só lê dali) e use o **mesmo prompt** nas continuações; cada trecho de 2 s custa ~20 s.
- **`VAEDecodeTiled`: use `temporal_size 64` e `temporal_overlap 16`** (os valores do template). Com 16 e 8 aparece uma queda de nitidez a cada 8 quadros (o "piscar com borrão"); isso aconteceu aqui até 10/10/2026. Confira com `bench/qualidade.py` (`piscar(video)`): oscilação alta (≳10%) **e** autocorrelação em 8 quadros ≳0,6 indicam o defeito.

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
| **MiniMax H3** | **Instalado e testado em 14–15/10/2026** ([8A.14](#8a14-minimax-h3-licenca-instalacao-e-testes-existe-15102026)): 33B densos, vídeo com **áudio estéreo**, 4 a 15 s, 768p de base (o 2K é um módulo hospedado, não aberto). Roda no ComfyUI instalado com a versão `pruned_int8_convrot` (19,53 GiB): **115–186 s** por clipe de 3 a 10 s, **15,2 GiB de VRAM** e **50–52 GiB de RAM**. **Fala em português funciona** (conferida pelo Whisper). **Licença com restrição de território: exclui UE, Reino Unido, Coreia do Sul e EUA, e proíbe exibir os resultados fora do território**; o responsável aceitou os termos para testar; **publicar no Instagram é arriscado** (ver 8A.14). |
| **Qwen-Image 2.1** | **Instalado para avaliação** (seção 8A.3): melhor que o Z-Image em texto com acentos, mas licença **só não comercial** — decisão em [ADR-009](16-apendices/adrs.md#adr-009). |
| **Qwen-Image 2512** (fp8, Apache 2.0) | **Testado e removido (09/10/2026):** texto com erros em todas as imagens, 218–370 s por imagem. Não é alternativa ao 2.1 nem ao Z-Image ([8A.5](#qwen-image-2512-apache-20-reprovado-e-removido-existe-09102026)). |
| **FLUX.2 klein 4B** | **Instalado e aprovado para edições simples** (cor, material, remoção) a 5 s; fraco em compor objetos de duas imagens ([8A.5](#flux2-klein-4b-edicao-de-imagens-existe-09102026)). Em **texto→imagem** é o mais rápido (3 s) mas **fraco em texto** ([8A.5](#flux2-klein-4b-texto-para-imagem-existe-09102026)). Apache 2.0; decisão em [ADR-010](16-apendices/adrs.md#adr-010). |
| **FLUX.2 [dev]** | Descartado: pede 24 GB ou mais e a licença é não comercial. O repositório `Comfy-Org/flux2-dev` também foi evitado por esse motivo (ver o VAE em 8A.3). |
| **FLUX.2 klein 9B** | Licença **não comercial**; não instalado. |
| **Wan 2.2 A14B** (GGUF Q4) | Mais qualidade de movimento que o 5B, mas apertado em 16 GB e sem áudio. Perdeu urgência diante do LTX 2.5; reavaliar só se surgir uma limitação do LTX. |
| **Wan 2.2 5B** | **Mantido** como alternativa de licença limpa (Apache 2.0), mas deixou de ser o modelo principal de vídeo. |
| **Wan 3.0** | **Não é candidato (avaliado em 12/10/2026): sem pesos abertos.** Beta fechado desde 06/08/2026, só por API (Alibaba Cloud Model Studio e Qwen Cloud). Conferido nas fontes primárias: o Hugging Face `Wan-AI` não tem repositório Wan 3.0 (o mais novo é o `Wan2.2-Animate-2-14B`, de 08–13/08/2026) e o GitHub `Wan-Video` também não (o mais recente é o Wan2.2, Apache 2.0). Dois sites afirmam pesos sob Apache 2.0 sem citar repositório; **contradizem os repositórios e não foram considerados**. Especificações (30 s com áudio) vêm de material da Alibaba, **não verificadas**. Rodaria só como serviço de nuvem, o que foge da regra de rodar tudo local. **Reavaliar se aparecer um repositório oficial com pesos.** |
| **Wan2.2-Animate-2-14B** | **Candidato; conjunto destilado baixado, verificado (SHA-256) e testado em 12/10/2026: o Texugo dançou no lugar de uma bailarina, 420 s para 81 quadros, pico de 14,7 GiB de VRAM ([8A.5](#wan-animate-2-destilado-o-texugo-no-lugar-de-uma-bailarina-existe-12102026)); identidade consistente na leitura do assistente; o responsável avaliou o vídeo como bom.** *Correção:* a versão anterior desta linha dizia "inviável, sem suporte no ComfyUI", baseada no **cartão do modelo, que está desatualizado**; o ComfyUI instalado (`comfyui_workflow_templates` 0.11.78) já tem os nós nativos `WanAnimate2ToVideo` e `WanAnimate2Cache` e os fluxos `video_wan_animate2` e `video_wan_animate2_distilled`. Anima um personagem a partir de uma **imagem de referência** e de um **vídeo de movimento**, **sem extração de pose**; fundo e câmera pelo texto (Apache 2.0, sem acesso restrito). O repositório do ComfyUI, `Comfy-Org/Wan-Animate-2`, tem **111,06 GiB**; o transformer `int8_convrot` (**15,51 GiB**, o mesmo formato do LTX 2.5) deve caber na 5060 Ti de 16 GB com descarga para a RAM. Conjunto destilado (10 passos): transformer `wan_animate_2_distill_int8_convrot` **16.653.175.528 bytes**, T5 fp8 (6.735.906.897 bytes, **já existia** para o Wan 2.2 5B, SHA-256 conferido), `clip_vision_h` 1.264.219.396 bytes e VAE `Wan2_1_VAE_bf16` 253.806.278 bytes: **cerca de 23,2 GiB** ao todo. O cartão oficial do modelo prevê 8 GPUs A800 para 720p, sem VRAM mínima. **Velocidade e qualidade nesta estação: desconhecidas.** Alternativa: Animate-14B v1 (`wan2.2_animate_14B_int8_convrot`, 17,15 GiB), que exige extração de pose. |
| **Wan-Dancer-14B** | Pesos abertos (Apache 2.0) de 17/07/2026, para dança. **Não avaliado** (tamanho em disco, VRAM e suporte no ComfyUI por conferir). |
| **WanGP** (`deepbeepmeep/Wan2GP`) | Interface alternativa com gestão agressiva de memória (afirma H3 de 15 s em 1080p com ~11 GB de VRAM — alegação do projeto, não verificada). Visto em vídeo de terceiros em 08/10/2026. **Adiado:** o LTX 2.5 já roda bem no ComfyUI; reconsiderar se a RAM apertada ou vídeos de 720p mais longos virarem problema. Se for testado: `git clone` + `uv` em `/srv/pases/wan2gp`, fora do Git, só em `127.0.0.1`. |
| **Pinokio** | **Descartado:** instala apps rodando scripts que executam qualquer comando na máquina (revisão humana só dos apps em destaque, isolamento por pasta, não sandbox) e foge do princípio de infraestrutura reconstruível (P6). |

**Gatilho para a próxima rodada:** uso real que o Z-Image/LTX 2.5 não atenda (texto denso em imagem; movimento mais complexo; vídeo mais longo) — não por curiosidade de catálogo. A suíte padronizada já existe (seção 8A.5b): todo candidato roda a suíte completa antes de ser promovido.

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
| **Qwen-Image 2.1 sob licença não comercial** | Usar só para avaliação; não incluir em materiais da empresa sem licença comercial da Qwen — a alternativa Apache (2512) foi testada e reprovada; sem licença, usar o Z-Image; ver [ADR-009](16-apendices/adrs.md#adr-009) |
| **VAE do FLUX.2 com licença ambígua** (repositório `Comfy-Org/flux2-dev` marcado como não comercial) | Usado o VAE do repositório Apache do klein; pesos **não comparados** com o do Comfy-Org (8A.3) |
| **Parâmetros do VAE tiled copiados com a ordem trocada** (blocos temporais de 16 quadros e sobreposição 8, em vez de 64 e 16) | Erro meu: queda de nitidez a cada 8 quadros em todos os vídeos do LTX até 10/10/2026, sem o benchmark acusar. Corrigido em 11/10/2026; o `bench/qualidade.py` agora mede o defeito em todo relatório. **Lição:** ao reproduzir um template, conferir os valores pelo **nome do campo** (`object_info`), não pela posição em `widgets_values` |
| **Whisper alucinando texto em silêncio/ruído** | `transcrever.py` marca trechos suspeitos (`sem_fala`/`logprob`); conferir só o trecho com fala real, e repetir se algo parecer estranho |
| **Token revogado em cache quebrando downloads públicos** | `HF_HUB_DISABLE_IMPLICIT_TOKEN=1` nos scripts; apagar o token (`hf auth logout`) |
| **Sufixo de consistência citando personagem ausente** | Um sufixo por plano, só com os personagens presentes (8A.10, item 8) |
| Modelos de terceiros com licenças distintas | Conferir a licença de cada modelo antes de uso comercial; Z-Image-Turbo e Wan 2.2 são Apache 2.0 (Hugging Face, 07/10/2026); o **LTX 2.5** e o **Qwen-Image 2.1** têm licenças próprias (seção 8A.3) |

## 8A.10 Receita: vídeos curtos de um personagem 3D <span class="badge badge-existe">Existe — 11/10/2026</span>

!!! danger "Avaliação do responsável (11/10/2026): resultados MUITO RUINS — leia a receita abaixo com isso em mente"
    Depois de **assistir** ao episódio "Lanchinho errado", o responsável avaliou: **"personagem inconsistente, física ruim"**. Os dois primeiros vídeos tinham sido avaliados como "interessantes, mas ainda não satisfatórios". As observações de "bom" e "funcionou" desta seção vêm da **leitura de miniaturas pelo assistente** e **estavam otimistas demais**: miniaturas não mostram escala, anatomia nem física. Nas capturas do vídeo final: (a) no plano de captura o personagem aparece **fundido ao corpo da leoa**; (b) pendurado na boca dela, o personagem fica **minúsculo e com uma barriga rosada segmentada que não existe no desenho**; (c) no plano da mordida o **rosto muda** (a faixa vira uma crina) e a **pata** entra na boca da leoa em vez de a boca dele morder o focinho; (d) caminhando, o corpo vira o de um urso e a faixa e a cicatriz mudam de lugar. **Conclusão provisória:** com os modelos locais atuais, **ações com contato físico entre dois personagens** (carregar pela nuca, morder, torcer o corpo) **não são confiáveis**; o que funciona razoavelmente são **planos de um personagem só, com movimento simples**. A conferência da **fala** (8A.11) segue válida, mas **fala correta não significa vídeo bom**.


Caso real (com resultado **insatisfatório**, ver o aviso acima) em que o pipeline desta estação foi usado para produzir dois vídeos verticais (9:16, ~14–16 s, 3 a 4 planos cada) de um mascote 3D, a partir de **uma única imagem de referência** do personagem. O que funcionou e o que não funcionou:

1. **Quadros iniciais com o FLUX.2 klein (edição):** colocar o personagem em cada cenário preservando a identidade (pelagem, cicatriz, olhos, estilo) funciona bem. Gerar **4 variações por plano** (~6 s cada) e escolher.
2. **Personagem secundário consistente: criar uma referência e usar as duas imagens juntas.** Sem isso, o secundário mudou de desenho entre planos e um quadro saiu com **duas** cobras. Gerou-se uma referência por texto→imagem e os quadros foram editados com **duas referências** (principal + secundário), pedindo "exatamente UM" de cada. Resultado: o mesmo desenho nos três planos. (O mesmo recurso falhou ao compor um *objeto* de outra foto — ver E4 —, mas funciona com personagens do mesmo estilo.)
3. **Animação:** LTX 2.5 imagem→vídeo, 704×1280, 3 a 5 s por plano, ~100 s por plano (≈80 s a mais a cada prompt novo, por causa do encoder). Descrever no prompt que os personagens **mantêm exatamente o mesmo desenho** ajudou.
4. **Âncora do último quadro (flf2v) segura o personagem principal mas pode deformar o secundário em movimento** (a cobra virou uma "lagartixa" comprida ao fugir). Melhor: **cortar o plano quando o desvio começa** e fechar com **um plano curto gerado a partir de um quadro final** pronto.
5. **Montagem com `ffmpeg`:** cortes secos, volume normalizado (`loudnorm`, -16 LUFS; os planos saíram de -22 a -38 dB), fade curto no início e no fim, H.264 + AAC.
6. **Medir o piscar de cada plano com `qualidade.py` antes de montar.** Foi o que localizou o defeito do VAE: os 6 planos passaram de 10–28% de oscilação para 1,6–6,4% depois da correção.

7. **Reaproveitar quadros de um episódio anterior como referência** manteve cenário e estilo (a identidade do personagem **não** se manteve nos vídeos, ver o aviso): bastou passar um quadro do episódio anterior ao FLUX.2 klein e pedir "mantenha ambos os personagens exatamente como na imagem" para ter 4–6 candidatos por plano na mesma savana.
8. **O texto de consistência que você cola em todo prompt NÃO pode citar um personagem que não está no plano.** O sufixo "a leoa mantém o pelo castanho sem juba" fez a leoa **reaparecer** num plano em que ela já tinha ido embora. Cada plano precisa do seu próprio sufixo, só com os personagens presentes.
9. **Postura de quatro patas:** pedir "anda em quatro patas" a partir de um quadro em pé não bastou (o modelo manteve o personagem em duas patas). Funcionou descrever como **animal quadrúpede de verdade** ("todas as patas no chão, tronco horizontal e baixo, cabeça baixa") com 6 variações, e animar a partir de um quadro **já em quatro patas**.
10. **Ação difícil (ser carregado pela nuca e se virar para morder): ancorar primeiro e último quadro (flf2v)** — primeiro = carregado, visão lateral; último = close da mordida — produziu uma transição com a câmera se aproximando, que o imagem→vídeo simples não produziu, **mas o resultado visto em tela cheia tem escala e anatomia erradas (item avaliado como ruim pelo responsável)**. O último quadro do plano ancorado é o primeiro do plano seguinte, o que dá um corte contínuo.
11. **Fala no vídeo:** o LTX 2.5 gera a voz junto; funciona escrevendo a frase **entre aspas, com o idioma e o tipo de voz no prompt** (seção 8A.11). Se a voz não agradar, dá para trocá-la por uma voz sintetizada encaixada na janela da boca.

**Limites:** a fala depende do prompt e deve ser conferida com o Whisper (seção 8A.11); o rosto do personagem principal varia um pouco entre planos e perde detalhe em planos longos de muito movimento; o personagem secundário se afina quando se estica; geração única por plano, sem refinamento.

## 8A.11 Voz e fala <span class="badge badge-existe">Existe — 11/10/2026</span>

### Ferramentas instaladas (CPU, ambiente separado)

| Peça | Para quê | Licença | Tamanho |
|---|---|---|---|
| **Kokoro-82M** (`hexgrad/Kokoro-82M`, pacote `kokoro` 0.9.4) | texto→fala em português do Brasil; vozes `pm_santa`, `pm_alex` (masculinas), `pf_dora` (feminina) | Apache 2.0 | modelo 327 MB |
| **faster-whisper `small`** (`Systran/faster-whisper-small`, pacote 1.2.1) | fala→texto: **conferir o que um modelo de vídeo falou** | MIT | modelo 484 MB |

Ambiente `/srv/pases/tts/.venv` (1,6 GB, **não versionado**; PyTorch **CPU**, para não disputar a GPU com o ComfyUI), modelos em `~/.cache/huggingface/hub` (777 MB, disco do sistema). Scripts versionados em `/srv/pases/tts-config/`: **`falar.py`** (`falar.py "texto" saida.wav [--voz pm_santa] [--grave 0.85]`) e **`transcrever.py`** (`transcrever.py arquivo.mp4`). Decisão: [ADR-011](16-apendices/adrs.md#adr-011).

### O LTX 2.5 fala português quando a frase vai no prompt
Num plano de 5 s de um personagem de desenho animado, o prompt trouxe a frase entre aspas, com o idioma e a voz: *"...says in a deep sarcastic raspy voice, in Brazilian Portuguese, with his lips moving clearly: "Lanchinho errado.""*. Resultado conferido com o Whisper no **plano isolado** e no **vídeo final de 21 s**: transcrito exatamente "Lanchinho errado", idioma português detectado com 99–100% de confiança, falado em ~1,3 s (de 0,34 s a 1,68 s do plano). O modelo também gerou **sozinho** dois sons coerentes com a cena (um grito de susto e um grito da leoa mordida); nos outros planos não houve fala inventada. **Nenhuma dublagem externa foi necessária.**

**Tom da voz (medida grosseira):** F0 mediano de ~157 Hz (o rastreador é simples e erra oitavas), isto é, **média, não grave**, apesar de o prompt pedir "deep" e "raspy". Quem julga o timbre é quem ouve; nenhuma avaliação humana do áudio foi feita ainda.

### Trocar a voz por uma sintetizada (opcional)
1. Gerar a frase: `falar.py "Lanchinho errado." voz.wav --voz pm_santa --grave 0.85` (a voz do Kokoro tem F0 de ~150 Hz; `--grave 0.85` a aprofunda ~15% sem mudar a duração além de ~1,4 s).
2. Medir onde a fala do modelo ocorre no plano (envelope de volume) e **silenciar essa janela, incluindo a cauda da última palavra** (a sílaba final "-do" se estendia ~0,4 s além do que o volume sugeria e deixou um "do" residual na primeira tentativa).
3. Mixar a nova voz começando no início da fala original (`adelay`) e normalizar (`loudnorm`).
4. Conferir com `transcrever.py` que só a nova voz aparece.

### Cuidados
- **O Whisper alucina texto em silêncio ou ruído.** Numa execução ele "inventou" frases depois do fim de uma fala real ("O que você tem...") que não se repetiram na execução seguinte. O `transcrever.py` imprime `sem_fala` e `logprob` por trecho e marca os suspeitos (`sem_fala` > 0,5 ou `logprob` < -1,0); a transcrição do trecho real saiu estável (`sem_fala` 0,09) nas duas execuções.
- **Token do Hugging Face revogado, ainda em `~/.cache/huggingface/token`:** faz o Hub recusar até repositórios públicos. Os scripts definem `HF_HUB_DISABLE_IMPLICIT_TOKEN=1`; o certo é apagar o token (`hf auth logout`) <span class="badge badge-confirmar">A confirmar</span>.
- **`faster-whisper` 1.2.1 × PyAV 19:** a leitura direta de arquivo falha (`open() got an unexpected keyword argument 'metadata_errors'`). O `transcrever.py` contorna extraindo o áudio com `ffmpeg` e passando um **vetor** ao Whisper.
- Planos de vídeo com ambiente quase mudo (volume ~-46 dBFS) existem (planos de caminhada); a normalização de volume do vídeo final não os corrige — ver 8A.10.

## 8A.12 3D com o Blender <span class="badge badge-existe">Existe — 11/10/2026</span>

Motivo: os vídeos de IA com **dois personagens em contato** (carregar, torcer, morder) perderam escala, anatomia e identidade ([8A.10](#8a10-receita-videos-curtos-de-um-personagem-3d-existe-11102026)). O Blender permite animar um modelo 3D com identidade idêntica em todos os planos.

### Instalação
**Blender 5.0.1** (a mesma versão em que o projeto original foi feito, no Windows), baixado do site oficial: **374.154.072 bytes, SHA-256 conferido** contra o publicado (`8019580e…e60b09`). Extraído em `/srv/pases/blender/` (1,6 GB, **não versionado**, sem `sudo`). Procedimento e scripts em `/srv/pases/blender-config/` (README). Roda **sem interface** (`blender -b --factory-startup --python script.py`), com Python 3.11.13, e o **Cycles renderiza na RTX 5060 Ti** via OptiX.

### O que o modelo 3D do texugo tem (inspecionado em 11/10/2026)
Exportação do Tripo (`modelo3d/Tripo-export/Bolado.zip`, um FBX com texturas):

| Item | Valor |
|---|---|
| Malha | 1 objeto, 9.146 vértices, 18.289 faces; ~0,56 × 0,57 × 0,78 m |
| Material | 1, com 4 texturas PBR (cor, normal, rugosidade, metálico) |
| Esqueleto | **65 ossos, padrão Mixamo (`mixamorig:`)**, **rig humanoide** (corpo e dedos; **sem ossos de rosto ou mandíbula**), 52 grupos de vértices (pesos de pele) |
| Animações prontas (12) | `angry_01`, `angry_03`, `box_01`, `dance_02`, `fall`, `flee_02`, `fold_arms`, `frightened`, `idle`, `play_mobile_game`, `run`, `sit` |

### Velocidade de render
Cycles, 720×1280, denoise ligado: **~1,3 s por quadro** a 48 amostras; o clipe `angry_01` inteiro (85 quadros, 32 amostras) levou **1 min 45 s**. Quadros renderizados mostram a **identidade exata** do personagem (faixa, cicatriz, olhos, dentes, pelo texturizado).

### Limites (o que o 3D **não** resolve sozinho)
- **O rig é humanoide:** o texugo anda em **duas patas**; não há caminhada de quatro patas pronta.
- **Não há ossos de rosto:** a boca não fala nem a fala sincroniza; falas exigiriam trabalho extra (ou outro modelo).
- **Não existe modelo 3D da leoa**, então o episódio da leoa não cabe em 3D sem criá-la.
- A **licença** da exportação do Tripo **não foi verificada**.
- O clipe de teste (`video/local-pc/teste-3d/Texugo_3D_teste_angry_01.mp4`) **ainda não foi avaliado pelo responsável**; a qualidade do **movimento** das animações prontas é desconhecida.

### Usos possíveis
Clipes só com o texugo usando as animações existentes (bravo, correndo, assustado, dançando, jogando no celular); usar renders do 3D como **âncora de identidade** (quadro inicial) dos planos de IA; criar a leoa em 3D (custo e qualidade **não avaliados**).

## 8A.13 Cena "O Troco do Texugo": plano, produção e resultado <span class="badge badge-existe">Existe — 12/10/2026</span>

**Pedido:** uma cena de **pelo menos 15 s** em que a leoa morde o Texugo e ele se livra mordendo o focinho dela, com as melhores técnicas e ferramentas disponíveis. Arquivos em `/home/pases/Texugo Bolado/video/local-pc/troco-do-texugo/` (**fora do Git**; LEIA-ME próprio): `final/Texugo_Bolado_O_Troco_do_Texugo_local_v1.mp4` (22 s, 704×1280, 24 fps, com áudio).

### O que se sabia (testes do Cap. 8A.5)
- O LTX 2.5 faz cenas com os dois personagens, mas a **física de contato e a identidade** são fracas; o episódio v1 foi avaliado como "muito ruim".
- O Wan-Animate-2 anima **um personagem por execução** (a leoa some numa cena de dois); serve para planos de um personagem.
- Faltava uma ferramenta de composição por máscara (só ffmpeg); o FLUX.2 klein compõe duas imagens de forma limitada.

### O plano (aprovado) e o que mudou na execução
Roteiro de 7 planos (16,5 s), com a regra de **esconder o contato** por corte e reação, e uma imagem-chave do "troco" escolhida entre dezenas de candidatas. **Na execução:**
- Em vez de gerar tudo de novo, **5 dos planos foram reaproveitados do episódio v3** (Texugo andando, leoa espreitando, bote, captura pela nuca, leoa fugindo, "Lanchinho errado."), que já tinham sido aprovados em consistência; o episódio ficou com **22 s**, não 16,5.
- Foram feitos **dois planos novos**, com a técnica de **primeiro e último quadro** do LTX 2.5: **a mordida do Texugo** (do quadro 46 do plano da captura até um quadro-chave) e **o recuo da leoa**. O plano da captura foi **cortado exatamente no quadro onde começa a mordida**, sem salto.
- O contato **foi tentado de forma explícita** (quadros-chave com o Texugo agarrado ao focinho), e não apenas implícito; o plano de reserva por corte não foi necessário.
- A fala final ficou "Lanchinho errado." (o responsável não escolheu outra).

### Quadros-chave e planos novos
| Etapa | Candidatas | Escolhida |
|---|---|---|
| Quadro-chave da mordida (FLUX.2 klein, 2 referências) | 8 (~9 s cada) | **2007**: o Texugo pequeno agarrado ao queixo e ao focinho, a leoa de olhos arregalados |
| Quadro-chave do recuo (FLUX.2 klein) | 6 | **3004**: a leoa de patas no focinho, chorando; o Texugo em primeiro plano com tufos de pelo dela nos dentes (a cara do mascote, com crina e cicatriz) |
| Plano da mordida (LTX 2.5 primeiro/último quadro, 3 s, 704×1280) | sementes 101 e 102 | **101** (0 quedas de nitidez; 155 s e 67 s) |
| Plano do recuo (idem) | sementes 101 e 102 | **101** (3 quedas, no movimento brusco; 143 s e 67 s) |

### Resultado (avaliação do assistente; **a do responsável está pendente**)
- **A história se lê de ponta a ponta:** o Texugo anda, a leoa espreita, o bote, a captura pela nuca, o troco, o recuo da leoa e o Texugo de pé com a fala final.
- **A mordida não é clara:** o Texugo aparece **agarrado ao queixo e ao focinho**, de boca aberta; os dentes **cravados** no focinho não são nítidos. Lê-se como "ele se agarra ao focinho dela".
- **No recuo** a leoa fica **de pé como uma pessoa** (patas no rosto), diferente do resto; e há um instante em que o Texugo, rolando na poeira, **perde a forma**.
- **Áudio:** o Whisper leu a fala final como "Lançinho Errado" (variação do reconhecedor); **ninguém ouviu o áudio**.
- O medidor de nitidez acusa 24 quedas no vídeo inteiro, mas **confunde cortes de plano com quedas**.
- Um vídeo, uma montagem; 5 de 8 planos já tinham os defeitos registrados no v3.

### Versão 2: refeita com o MiniMax H3 e a voz aprovada <span class="badge badge-existe">Existe — 17/10/2026</span>

**Pedido:** refazer a cena com o H3 e a voz aprovada (seção 8A.14). Arquivos em `/home/pases/Texugo Bolado/video/local-pc/troco-do-texugo-h3/` (fora do Git; LEIA-ME próprio): `final/Texugo_Bolado_O_Troco_do_Texugo_H3_v1.mp4` (**15 s, 736×1312, 24 fps, áudio estéreo**).

**Técnica:** em vez de montar planos, a cena inteira saiu de **uma única geração** do `ref2va`, com **6 cortes descritos no prompt** (como o modelo de fluxo oficial faz) e três referências: o Texugo (`<Picture 1>`), a leoa (`<Picture 2>`) e a voz aprovada (`<Audio 1>`). A fala final: "Ih, rapaz... escolheu o lanchinho errado, hein? Fica pra próxima!"

| Tomada | Tempo | Resultado (leitura do assistente) |
|---|---|---|
| 480×832, sementes 7 e 21 | 370 s e 356 s | seguem os 6 cortes; fala limpa a partir de ~10 s |
| 736×1312, semente 21 | **1655 s** | **descartada**: duas cabeças de leoa no close; o Whisper ouviu possível fala inventada no início |
| **736×1312, semente 7** | **1640 s** | **escolhida**: 6 cortes, uma leoa só, mordida clara (a boca do Texugo no focinho, os olhos dela arregalados), fala só a partir de 9,8 s |

**Comparado com a versão 1 (LTX, 22 s, 8 planos montados):** a mordida aparece de forma mais clara, a voz é a aprovada e a cena não tem emendas; em troca, a 736×1312 custa **~27 min por tomada** e **~52 GiB de RAM**, e o vídeo fica sob a **licença restrita do H3**.

**Limites:** na captura o Texugo fica pequeno e com o peito mais branco por instantes; há um quadro de transição em que ele vira um borrão; o Whisper ouviu "E rapaz" no lugar de "Ih, rapaz".

**Avaliação do responsável (17/10/2026):** "gostei muito da qualidade do vídeo e da voz do Texugo; somente o **enredo não tem muito sentido**, mas a qualidade gráfica está muito boa". Primeiro episódio com **qualidade visual e voz aprovadas**; o ponto a melhorar passa a ser o **roteiro**, não a técnica.

**Lições:** uma geração de 15 s com cortes no prompt resolve continuidade de personagens, som e voz melhor que montar planos; **a resolução maior não garante resultado melhor** (a semente 21 piorou a 736×1312), então vale escolher a semente a 480×832 (~6 min) e só então renderizar na resolução final, aceitando que o resultado muda.

### Versão 3: novo enredo, "cada um com seu lanchinho" <span class="badge badge-existe">Existe — 17/10/2026</span>

**Motivo:** a versão 2 teve qualidade e voz aprovadas, mas "o enredo não tem muito sentido". **Enredo novo** (mesma técnica: uma geração de 15 s do `ref2va` com 6 cortes e as mesmas três referências): o Texugo come um favo de mel tranquilo; a leoa ataca e ele **nem se abala** (boceja); ela o carrega pela nuca e ele segue lambendo o mel; ele dá um "troco" no nariz dela sem nem olhar; ela foge envergonhada; ele cai sentado com o favo intacto e diz "Ih, rapaz... cada um com seu lanchinho, hein? Fica pra próxima!". O humor vem da **calma do malandro** e o mel liga a fala ao começo. Arquivo: `troco-do-texugo-h3/final/Texugo_Bolado_O_Troco_do_Texugo_H3_v3.mp4` (15 s, 736×1312).

| Tomada | Tempo | Resultado (leitura do assistente) |
|---|---|---|
| 480×832, sementes 7 e 21 | ~6 min cada | seguem o enredo; fala limpa só no fim |
| 480×832, semente 3 | ~6 min | descartada: brilho verde-amarelado no Texugo |
| 736×1312, semente 21 | 27,6 min | **descartada**: duas cabeças de leoa no close (o **mesmo defeito** da versão 2) e uma fala solta no início |
| **736×1312, semente 7** | **27,3 min** | **escolhida**: uma leoa só, enredo inteiro, fala só no fim |

**Limites:** o "troco" saiu como **um tapa com a pata no nariz**, não uma mordida; um quadro de transição com fantasma no início da captura.

**Avaliação do responsável (17/10/2026):** concorda com os dois limites e conclui: **"sempre que precisa ter uma interação entre personagens, não fica satisfatório"**.

!!! warning "Lição consolidada: contato entre personagens"
    Em todas as tentativas (LTX montado, LTX primeiro/último quadro, Animate-2 e H3 em geração única), **o contato físico entre dois personagens** (morder, agarrar, carregar) saiu insatisfatório: vira tapa, agarrão, fantasma ou cabeça duplicada. Planos de **um personagem** e de **dois personagens sem contato** funcionam. Até haver uma técnica que controle o contato, os roteiros devem **contar a interação por reação, corte e som**, não por contato em tela.

**Padrão observado:** nas duas versões, a **semente 21 a 736×1312 duplicou a cabeça da leoa** no close e a **semente 7** ficou limpa. Com 2 casos não dá para generalizar; por ora, renderizar a final com mais de uma semente candidata e conferir o close antes de entregar.

### Versão 4: a mordida contada sem contato em tela <span class="badge badge-existe">Existe — 17/10/2026</span>

Aplicação direta da lição acima: **os dois nunca se tocam em tela**; a mordida é contada por **reação, corte e som**. Mesma técnica (geração única de 15 s, 6 cortes, referências de personagens e voz). Roteiro: o Texugo come mel tranquilo e a leoa espreita ao fundo · a leoa, **sozinha no quadro**, salta rugindo · **close só no Texugo**: ele vira a cabeça para fora do quadro, ouve-se um "nhac" e um ganido, ele volta mastigando · a leoa, **sozinha**, foge com o nariz vermelho · ele tira um tufo de pelo dos dentes · "Ih, rapaz... cada um com seu lanchinho, hein? Fica pra próxima!". Arquivos: `troco-do-texugo-h3/final/Texugo_Bolado_O_Troco_do_Texugo_H3_v4.mp4` (principal) e `..._v4_alternativa.mp4`.

| Tomada | Tempo | Resultado (leitura do assistente) |
|---|---|---|
| 480×832, sementes 7 e 21 | ~6 min cada | sem contato em tela; fala limpa só no fim |
| 480×832, semente 3 | ~6 min | descartada: a leoa salta em pé como gente; som solto antes da fala |
| **736×1312, semente 7** | 27,3 min | **principal**: no close, o "nhac" com um tufo bege entrando no quadro; duas transições em fusão entre cortes |
| 736×1312, semente 21 | 27,6 min | alternativa: **sem cabeça duplicada desta vez** (sem contato, o defeito não apareceu); mordida menos clara |

**Avaliação do responsável (17/10/2026):** **nenhuma das duas tomadas ficou boa**: "visualmente está muito bonito, mas a mordida está estranha; não atingiu o objetivo". Contar a mordida por reação e som **também não resolveu**: o gesto de morder em close, mesmo sem contato, sai estranho. Conclusão do conjunto (versões 1 a 4): com as ferramentas locais atuais, **a mordida em si não sai convincente**, com ou sem contato; a qualidade visual e a voz, sim.

## 8A.14 MiniMax H3: licença, instalação e testes <span class="badge badge-existe">Existe — 15/10/2026</span>

### O modelo (fontes oficiais: blog, GitHub e Hugging Face da MiniMax)
Modelo omni-modal de **33B parâmetros densos** (codificador de texto baseado no Qwen3-VL-32B) que gera **vídeo com áudio estéreo** (voz, efeitos e música juntos), de **4 a 15 s a 24 fps**, em vários formatos (inclui 9:16), com **768p de base**. O 2K depende do módulo **H3-Regenerate-2K**, hospedado e **não aberto**; o pré-processador H3-Context-IR também não. Duas versões: **fl2va** (texto, primeiro e último quadro) e **ref2va** (até 9 imagens, 3 vídeos e 3 áudios de referência). Falas estáveis em **11 idiomas** (a lista não foi conferida, mas o português funcionou nos testes).

### A licença (MiniMax H3 Community License, 02/08/2026), lida por inteiro
- **Território:** o mundo, **exceto a União Europeia, o Reino Unido, a Coreia do Sul e os Estados Unidos**. O Brasil está dentro.
- **Resultados também são restritos:** proíbe "usar, reproduzir, distribuir ou **exibir** o modelo ou os seus resultados **fora do território**". Pela **leitura literal**, publicar um vídeo gerado numa rede aberta ao mundo, como o Instagram, contraria a licença. **Não é aconselhamento jurídico**; a licença convida a pedir autorização à MiniMax (`api@minimax.io`).
- **Faturamento:** acima de **US$ 20 milhões por ano** em produtos e serviços comerciais, exige autorização por escrito.
- **Marca:** produtos ou serviços comerciais que usam o H3 devem exibir "MiniMax H3" na interface.
- **Treino:** não se pode usar o modelo nem seus resultados para melhorar outro modelo de IA.
- **Aceite:** o responsável **aceitou os termos em 14/10/2026** para baixar e testar. Uso permitido hoje: **teste, comparação e uso interno**; **publicação de vídeos de venda fica pendente de confirmação com a MiniMax ou um advogado**.

### Instalação (somente a versão fl2va; 39,14 GiB, tamanho e SHA-256 conferidos contra o repositório)
Origem: `Comfy-Org/MiniMax-H3` no Hugging Face (Apache não: licença própria, acima). O ComfyUI instalado (0.39.0) já tem os nós `MiniMaxH3*` e os fluxos de imagem→vídeo, referência→vídeo, texto→vídeo, continuação, multiquadros e ControlNet; **não foi preciso atualizar nem reiniciar**.

| Arquivo | Pasta | Tamanho |
|---|---|---|
| `minimax_h3_fl2va_pruned_int8_convrot` | `diffusion_models/` | 20.970.379.616 bytes (19,53 GiB) |
| `qwen3vl_32b_minimax_h3_nvfp4_awq` (não exige Blackwell) | `text_encoders/` | 15.687.142.551 bytes (14,61 GiB) |
| `minimax_h3_video_vae_int8_convrot` | `vae/` | 2.811.065.184 bytes |
| `minimax_h3_audio_vae_fp32` | `vae/` | 605.254.808 bytes |
| `minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16` (LoRA turbo, 4 passos) | `loras/` | 1.956.192.992 bytes |

**Não instalados:** a versão `ref2va` (+19,53 GiB), a `w6a8` (14,89 GiB, sem descrição) e os ControlNets. "Pruned" não é explicado pelo repositório; o efeito na qualidade é **desconhecido**. O download em partes paralelas não acelerou (a rede da estação dá 3 a 5 MB/s, ~2,5 h para tudo); o baixador ficou versionado (`baixar_paralelo.py`). Executor: `/srv/pases/comfyui-config/bench/h3.py`.

### Testes (primeiro e último quadro; 4 passos com o LoRA turbo; `res_multistep`)
| Teste | Tamanho e duração | Tempo | VRAM / RAM de pico |
|---|---|---|---|
| 1. Mordida (mesmos quadros do plano do LTX do 8A.13) | 480×832, 3 s | 115 s (com a carga dos modelos) | 15,2 GiB / 50,3 GiB |
| 2. O mesmo, resolução oficial | 736×1312, 3 s | 150 s | 15,4 GiB / 51,5 GiB |
| 3. Fala em português (Texugo de pé) | 480×832, 4 s | 60 s | 15,2 GiB / 51,5 GiB |
| 4. Clipe longo (Texugo anda, para, se ergue e fala) | 480×832, **10 s** | **186 s** | 15,2 GiB / 51,6 GiB |

**Leitura do assistente** (miniaturas e Whisper; **avaliação do responsável pendente**; o áudio não foi ouvido por ninguém):
- **Contra o LTX 2.5 (mesmos quadros):** os dois chegam ao quadro-chave; o H3 aproxima o Texugo do focinho mais cedo e a leoa abre bem a boca, mais expressiva. A 736×1312 a mordida aparece em dois tempos (ele agarra o focinho com a leoa de olhos fechados, depois ela arregala os olhos). Custo parecido com o do LTX (67–155 s por 3 s a 704×1280), mas o H3 usa **quase toda a RAM**.
- **Fala em português:** o Whisper transcreveu "Hahaha, lanchinho errado." (teste 3) e "Hmm, lanchinho errado." (teste 4); a **pronúncia** só quem ouve julga.
- **Clipe de 10 s:** coerente do início ao fim, com a crina e a cicatriz estáveis; um detalhe laranja estranho na barriga do Texugo nos últimos quadros. O LTX não faz mais de ~4 s por clipe sem emendas.

### Voz do Texugo com áudio de referência (ref2va) <span class="badge badge-existe">Existe — 16/10/2026</span>

**Pedido do responsável:** a dicção do H3 em português agradou, mas a voz não combinava com o personagem — "cara de mau, mas malandro gente boa", sotaque malandro, voz não muito aguda.

**Só com descrição no prompt não deu certo.** Oito variações (A–H), mudando só a direção de voz, foram **todas reprovadas**: as "roucas e graves" (A–C, ~132–139 Hz de mediana) ficaram graves demais; as "leves e claras" (E, F, H, ~250–258 Hz) também não agradaram. O responsável mandou como referência o **episódio 1** (gerado na nuvem pelo Seedance 2.0 em 28/09/2026), cuja fala mede **258 Hz** — o mesmo tom da H, reprovada. Conclusão: o que diferencia a voz certa é **timbre e jeito**, que texto não descreve.

**Solução: o modo `ref2va` com um áudio de referência.** Instalados (mesma licença, SHA-256 conferido): `minimax_h3_ref2va_pruned_int8_convrot` (20.970.379.616 bytes) e o LoRA `minimax_h3_ref2v_turbo_4step_v0.1` (1.956.193.000 bytes), **21,35 GiB**. Executor: `/srv/pases/comfyui-config/bench/h3_ref.py` (imagens e áudios por etiqueta, `<Picture 1>`, `<Audio 1>`). Referência: a fala do episódio 1 recortada (2,1 s, 32 kHz).

| Rodada | Direção | Resultado |
|---|---|---|
| R1–R2 | copiar a voz de `<Audio 1>`, dicção clara | timbre próximo (269–286 Hz), mas **fala inventada** depois da frase |
| **R3** | copiar timbre e atitude, **falar devagar e articulado** | **timbre preferido pelo responsável**; ainda com fala inventada |
| R4–R6 | frase curta + "depois fica em silêncio"; R6 com a referência cortada | fala inventada continua; com a referência cortada ele **repete o áudio de referência** |
| R7–R8 | direção do R3 + **frase que ocupa os 5 s** | fala só o texto pedido: "Ih, rapaz... escolheu o lanchinho errado, hein? Fica pra próxima!" |

**Aprovado pelo responsável: R8 ("muito bom")** — 5 s, 480×832, 70 s para gerar, 276 Hz de mediana, Texugo de corpo inteiro com as mãos na cintura. O Whisper ouviu "E rapaz" no lugar de "Ih, rapaz".

**Regras aprendidas:**
- Para voz de personagem, usar **áudio de referência**, não descrição.
- O `ref2va` exige **no mínimo 5 s** (124 quadros); a **fala precisa ocupar o clipe inteiro**, senão o modelo inventa palavras ou copia o texto da referência.
- Pedir "copie o timbre, mas fale devagar e articulando" separou o timbre da dicção ruim da referência.

Receita e arquivos aprovados (fora do Git): `/home/pases/Texugo Bolado/voz-texugo/` (referência, prompt, vídeo aprovado e LEIA-ME).

### Limites e cuidados
- **RAM:** 50–52 GiB de 59; o ComfyUI com o H3 **não convive com o Ollama nem com outros serviços pesados**.
- Uma semente por teste, miniaturas, 480×832 na maioria; a 768p só um teste.
- Não testados: `ref2va` com **vídeo** de referência, ControlNet, clipes de 15 s, resolução oficial em clipes longos, o 2K.
- Os arquivos dos testes ficam em `/scratch/comfyui/output/video/` (`h3_teste*`), fora do Git.

## Escopo restante do capítulo <span class="badge badge-stub">Stub</span>

- **Avaliação humana** das rodadas `2026-10-08_1800` e `2026-10-08_2320_ltx` (fichas em `bench/results/`)
- **Avaliar o áudio** gerado pelo LTX 2.5 (não foi avaliado)
- **Avaliar o áudio** das extensões e a continuidade do movimento; testar extensões mais longas (mais de 2 etapas) e outros valores de força/quadros-guia
- **Avaliar o clipe 3D** (`teste-3d/`) e decidir entre clipes só do texugo em 3D, 3D como âncora de identidade ou criar a leoa (8A.12)
- **Avaliação humana da voz** do LTX (e da alternativa do Kokoro) e do áudio dos vídeos
- Testar outras falas e idiomas no LTX, falas mais longas e **dois personagens falando**; medir a sincronia labial
- Reavaliar as emendas M1 × M2 da extensão com **mais sementes** (a diferença está no ruído)
- Medir a extensão com condicionamento de **áudio** do trecho anterior (nós `LTXVAudioVAEEncode` / `LTXVReferenceAudio` existem no ComfyUI e não foram usados)
- **Decidir a licença do Qwen-Image 2.1** (licenciar, ou ficar só com o Z-Image) — [ADR-009](16-apendices/adrs.md#adr-009)
- Avaliação humana dos resultados do Qwen-Image 2.1 e dos itens I1/I4 com ele
- (Opcional) testar a LoRA Lightning de 4 passos do 2512, se um dia o 2512 voltar a ser considerado
- Avaliação humana das edições do FLUX.2 klein
- Testar prompts de edição que digam o que **não** deve mudar (caso do piso no E2) e a variante **base** (não distilled) do klein
- (Opcional) testar o **modelo** do klein em bf16 (7,2 GB) contra o fp8 — o A/B do **encoder** já foi feito e não mostrou ganho
- Próxima rodada de modelos (Wan A14B) após benchmark
- Validar o `Linger` em um reboot real e apagar o token local (`hf auth logout`)
- Workflows do ComfyUI versionados e backup deles ([Cap. 14](14-backup.md))
- Integração com o AI Gateway ([ADR-004](16-apendices/adrs.md#adr-004)) — hoje o ComfyUI é usado só pela interface web local
- Confirmar `Linger` (seção 8A.6) e a política de backup dos workflows (seção 8A.7)
