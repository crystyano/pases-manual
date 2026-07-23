# 4. BIOS

Este capítulo documenta a configuração real da UEFI BIOS da ASUS ROG STRIX X870E-H GAMING WIFI7. Cada alteração segue o padrão do manual: **caminho, valor, motivo, impacto e risco**.

## 4.1 Registro oficial da BIOS <span class="badge badge-existe">Existe</span>

Registrado a partir das telas reais em 18/07/2026 (primeira inicialização):

| Item | Valor |
|---|---|
| BIOS Version | **2402** (build 15/07/2026) — flash executado em **21/07/2026** via EZ Flash 3 ✓ |
| AGESA Version | ComboAM5 PI 1.3.0.1b Patch A |
| Versão de fábrica (histórico) | 1804 (build 11/12/2025, AGESA 1.2.7.0) — registrada na primeira inicialização em 18/07/2026 |
| EC Version | MBEC-X870-0149 *(da 1804; reconfirmar na 2402)* |
| Interface | AMI, Advanced Mode |

Leituras da primeira inicialização (referência de sanidade):

| Leitura | Valor | Avaliação |
|---|---|---|
| Temperatura CPU (ociosa, em setup) | 45–48 °C | Saudável |
| Frequência CPU | 4400 MHz (44×100) | Base correta do 9900X |
| DRAM Frequency | 6000 MHz | EXPO aplicado ✓ |
| Capacidade reconhecida | 65536 MB | 64 GB completos ✓ |
| Core Voltage | ~1,32–1,36 V | Normal em setup |
| SP (qualidade do silício) | 108 | Acima da média |
| Cooler score | 156 pts | Refrigeração bem avaliada pela placa |

## 4.2 O que já está correto ✓

- **EXPO I ativo** — Ai Overclock Tuner = `EXPO I`, perfil `DDR5-6000 36-38-38-80`, Memory Frequency `DDR5-6000MHz`. É exatamente o alvo definido no [Capítulo 3](03-hardware.md) (sweet spot do Zen 5). <span class="badge badge-planejado">Pendente: validar com memtest</span>
- **FCLK em Auto** — correto; em 6000 MT/s o Auto resolve para a razão ideal. Não mexer.
- **BCLK 100 MHz, Core Ratio Auto, Core Performance Boost Auto** — padrão correto para a fase atual (estabilidade primeiro).

## 4.3 Checklist de alterações pendentes

Ordem recomendada de execução. Marque conforme concluir:

- [x] 1. Atualizar BIOS para a versão 2402 — **concluído em 21/07/2026** ✓
- [ ] 2. Habilitar SVM (virtualização)
- [ ] 3. Habilitar IOMMU
- [ ] 4. Habilitar Above 4G Decoding + Resizable BAR
- [ ] 5. Restore AC Power Loss → Power On
- [ ] 6. Secure Boot → modo Other OS
- [ ] 7. Fast Boot → Disabled (durante a fase de instalação)
- [x] 8. Reaplicar EXPO I e validar com memtest — **aprovado em 21/07/2026**: Memtest86+ v8.00, DDR5-6000 CAS 36-38-38-80, 1ª passada completa, **0 erros** ✓
- [ ] 9. Calibrar Q-Fan (após gabinete fechado)
- [ ] 10. Salvar perfil em ASUS User Profile + pendrive

---

### 1 — Atualizar a BIOS: 1804 → 2402 (estável)

| | |
|---|---|
| **Caminho** | `Tool → ASUS EZ Flash 3 Utility` (arquivo baixado da página oficial de suporte da placa, extraído em pendrive FAT32) |
| **Valor** | Versão **2402** de 15/07/2026 (AGESA ComboAM5 PI 1.3.0.1b Patch A) · SHA-256 `A5A26376B52D9102C7535E56E06E80E115BF4BDE89398748C39E685F70C1E4AF` · a **2401** listada abaixo dela é beta — ignorar |
| **Motivo** | Changelog oficial: melhoria de desempenho e estabilidade de memória (relevante para o EXPO 6000) e suporte a TSME. Atualizar **antes** de configurar o resto, porque o update reseta todas as configurações |
| **Impacto** | Configurações voltam ao padrão (por isso este é o item nº 1) |
| **Risco** | Interrupção de energia durante o flash pode inutilizar a placa — **fazer com o PC no nobreak**. Rollback para versões antigas pode ser bloqueado (prevenção de rollback do AGESA). Observação: o aviso da ASUS sobre renomear o arquivo (`A5704.CAP`, via BIOSRenamer) vale **apenas** para o USB BIOS Flashback; pelo EZ Flash 3 não é necessário |

### 2 — SVM Mode (virtualização AMD-V)

| | |
|---|---|
| **Caminho** | `Advanced → CPU Configuration → SVM Mode` |
| **Valor** | **Enabled** |
| **Motivo** | Pré-requisito para Docker com KVM, máquinas virtuais e sandboxes — o coração do [Capítulo 6](06-infraestrutura.md). Costuma vir desabilitado de fábrica |
| **Impacto** | Nenhum perceptível no uso normal |
| **Risco** | Nenhum |

### 3 — IOMMU

| | |
|---|---|
| **Caminho** | `Advanced → AMD CBS → NBIO Common Options → IOMMU` (ou via `PCI Subsystem Settings`, conforme a versão) |
| **Valor** | **Enabled** |
| **Motivo** | Isolamento de dispositivos PCIe e base para passthrough de GPU no futuro (VFIO). Com duas GPUs, mantém a porta aberta para dedicar uma delas a uma VM |
| **Impacto** | Nenhum no uso normal com kernel Linux moderno |
| **Risco** | Baixíssimo; em caso de problema de boot, reverter para Auto |

### 4 — Above 4G Decoding + Resizable BAR

| | |
|---|---|
| **Caminho** | Atalho **ReSize BAR** na barra superior da BIOS, ou `Advanced → PCI Subsystem Settings` |
| **Valor** | Above 4G Decoding **Enabled** · Re-Size BAR Support **Enabled** |
| **Motivo** | Permite à CPU mapear toda a VRAM das GPUs de uma vez — relevante para carregar modelos de IA grandes nas duas placas (28 GB no total) |
| **Impacto** | Carregamento de modelos e transferências CPU→GPU mais eficientes |
| **Risco** | Nenhum com sistema UEFI moderno (exige boot UEFI, que será o caso do Ubuntu) |

### 5 — Comportamento após queda de energia

| | |
|---|---|
| **Caminho** | `Advanced → APM Configuration → Restore AC Power Loss` |
| **Valor** | **Power On** |
| **Motivo** | Comportamento de servidor: quando a energia voltar após um apagão (nobreak esgotado e desligamento seguro executado — [Cap. 3, seção 3.5](03-hardware.md#35-consumo-e-energia)), a estação religa sozinha, sem intervenção |
| **Impacto** | A máquina liga automaticamente sempre que a alimentação AC retornar |
| **Risco** | Nenhum; apenas lembrar que o comportamento é intencional |

### 6 — Secure Boot

| | |
|---|---|
| **Caminho** | `Boot → Secure Boot → OS Type` |
| **Valor** | **Other OS** (equivale a desabilitar a exigência de assinatura) |
| **Motivo** | O driver NVIDIA proprietário no Ubuntu exige assinatura de módulos (MOK) quando o Secure Boot está ativo — uma fricção recorrente a cada atualização de kernel/driver, sem ganho de segurança relevante para uma estação física de uma pessoa |
| **Impacto** | Instalação e atualização dos drivers NVIDIA sem etapas extras |
| **Risco** | Perde-se a verificação de assinatura no boot. Alternativa documentada: manter Secure Boot e registrar MOK na instalação — decisão final no [Capítulo 5](05-ubuntu.md) |

### 7 — Fast Boot

| | |
|---|---|
| **Caminho** | `Boot → Fast Boot` |
| **Valor** | **Disabled** durante a fase de instalação |
| **Motivo** | Garante inicialização completa de USB (pendrive de instalação, teclado) e acesso fácil ao menu de boot |
| **Impacto** | Boot alguns segundos mais lento |
| **Risco** | Nenhum; pode ser reativado quando a estação estiver estável |

### 8 — Revalidar EXPO após o update

| | |
|---|---|
| **Caminho** | `Ai Tweaker → Ai Overclock Tuner → EXPO I` (o update da BIOS reseta para Auto) |
| **Valor** | EXPO I · DDR5-6000 36-38-38-80 |
| **Motivo** | Retornar ao perfil validado do kit |
| **Impacto** | RAM de volta a 6000 MT/s (sem EXPO ela roda a 4800) |
| **Risco** | Instabilidade de memória é silenciosa e corrompe dados. **Validação obrigatória:** rodar MemTest86 (pendrive) ou `memtester` por pelo menos 1 passada completa antes de instalar o sistema |

### 9 — Q-Fan (curvas de ventoinha)

| | |
|---|---|
| **Caminho** | `Qfan (F6)` ou `Monitor → Q-Fan Configuration` |
| **Valor** | Calibrar todas as ventoinhas (Q-Fan Tuning) e definir curvas; perfil *Standard* já serve como base |
| **Motivo** | Equilíbrio ruído × temperatura para uma máquina que trabalha longas horas |
| **Impacto** | Operação mais silenciosa em cargas leves |
| **Risco** | Nenhum; fazer **depois** que o gabinete estiver na configuração final de ventoinhas <span class="badge badge-confirmar">gabinete a confirmar</span> |

### 10 — Salvar o perfil

| | |
|---|---|
| **Caminho** | `Tool → ASUS User Profile` |
| **Valor** | Salvar como `PASES-base` no slot 1 **e** exportar para pendrive |
| **Motivo** | Recuperação em um passo após Clear CMOS ou troca de bateria |
| **Impacto** | Reconfiguração instantânea |
| **Risco** | Perfis podem não sobreviver a updates de BIOS — re-salvar após cada update |

## 4.4 O que deixar como está (por enquanto)

- **Precision Boost Overdrive: Auto** — estabilidade primeiro. Tuning de PBO (limites térmicos, Curve Optimizer) ganhará uma seção própria após o período de burn-in com monitoramento ([Cap. 12](12-monitoramento.md)). Com SP 108 e cooler bem avaliado, há margem para otimizar depois.
- **fTPM: habilitado** (padrão) — inofensivo no Linux e necessário se um dia houver dual boot com Windows 11.
- **Global C-States: Auto** — economia de energia em ocioso, sem custo prático.
- **Memory Context Restore: Auto** — se os boots ficarem demorados (re-treino de memória com 64 GB), avaliar `Enabled` — somente após o memtest passar.
- **Chassis Intrusion, Setup Animator, Full HD Setup: Disabled** — como estão.

## 4.5 Pendências deste capítulo

- [ ] Executar o checklist 4.3 e marcar os itens (item 1 concluído)
- [x] Registrar a versão final instalada — 2402, flash em 21/07/2026 ✓
- [x] Resultado do memtest — Memtest86+ v8.00 (boot UEFI): 1 passada completa, 0 erros, IMC DDR5-6000 / CAS 36-38-38-80, 61,6 GB testados. CPU a 73–78 °C durante o teste (gabinete ainda em configuração provisória) ✓
- [ ] Fotografar `Advanced → NVMe Configuration` — de quebra, fecha a pendência do **modelo do NVMe** no [Capítulo 3](03-hardware.md)
- [ ] Curvas de Q-Fan definidas (após gabinete final)
