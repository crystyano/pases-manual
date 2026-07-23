# 5. Ubuntu

Este capítulo registra o sistema operacional **como ele está instalado de fato**, e o checklist de pós-instalação que falta cumprir.

## 5.1 Registro da instalação <span class="badge badge-existe">Existe</span>

Instalação realizada em 20–21/07/2026, registrada a partir do sistema em execução:

| Item | Valor |
|---|---|
| Distribuição | **Ubuntu 26.04 LTS "Resolute Raccoon"** (Desktop) — conforme [ADR-001](16-apendices/adrs.md#adr-001) |
| Kernel | **7.0.0-28-generic** |
| Hostname / usuário | `pases` / `pases` |
| Modo de boot | UEFI (Secure Boot em Other OS — [Cap. 4](04-bios.md)) |
| Driver NVIDIA | **595.71.05** · CUDA **13.2** — as duas GPUs reconhecidas ✓ |
| Memória vista pelo SO | 59 Gi + swap de 8 Gi (arquivo `/swap.img`, padrão do instalador) |

## 5.2 Particionamento real

O instalador usou o **Kingston NV3 1 TB inteiro**, com o esquema padrão (ext4, sem LVM):

Estado atualizado em 21/07/2026 (segunda rodada — SATA instalados, Windows apagado):

| Dispositivo | Tamanho | FS / Rótulo | Papel definido | Montagem |
|---|---|---|---|---|
| NVMe Kingston NV3 | 1 GB + 930,5 GB | vfat `/boot/efi` + ext4 `/` | Sistema, projetos, Docker, bancos dev | ✓ |
| NVMe Micron 2210 512 GB | 476,9 GB | ext4 · rótulo `NVME512` | **Scratch** (temporários, caches de build, staging) — Windows antigo apagado ✓ | `/scratch` ✓ |
| SATA Samsung 860 QVO | 931,5 GB | ext4 · rótulo `SSD1TB` | **Biblioteca de modelos de IA** | `/dados/modelos` ✓ |
| SATA Kingston A400 | 894,3 GB | ext4 · rótulo `SSD960` | **Backup local** (perna 2 do 3-2-1 do [Cap. 14](14-backup.md)) | `/backup` ✓ |

Montagens permanentes ativas desde 21/07/2026, via fstab **por rótulo** com `noatime` (poupa escrita nos SSDs) e `nofail` (um disco secundário morto não trava o boot). `/backup` é propriedade de root de propósito: os scripts de backup escrevem lá com privilégio, e um `rm -rf` acidental do usuário comum não alcança o backup. Validado com `findmnt --verify` (0 erros).

Total utilizável: **~3,3 TB**. Pendente: registrar os pontos de montagem definitivos e o fstab (ver checklist 5.4).

!!! note "Decisão registrada: ext4 simples, partição única"
    O instalador criou uma única partição ext4 sem LVM/BTRFS. **Consequência:** snapshots de sistema serão feitos com **Timeshift em modo rsync** (cópias para outro disco), não snapshots instantâneos de filesystem. É uma troca aceitável — reinstalar para adotar BTRFS não compensa nesta altura — mas fica o registro: se um dia houver reinstalação, reavaliar BTRFS ([ADR](16-apendices/adrs.md) a criar nesse caso). O destino natural do Timeshift é o futuro disco SATA de backup ([Cap. 3, seção 3.4](03-hardware.md)).

## 5.3 GPUs no sistema <span class="badge badge-existe">Existe</span>

Driver **595.71.05 / CUDA 13.2** operacional, com a divisão de papéis já ideal de fábrica:

| GPU | Modelo | VRAM | Papel |
|---|---|---|---|
| GPU 0 (`01:00.0`) | RTX 4070 | 12 GB (488 MiB em uso pelo desktop) | **Vídeo/desktop** + cargas auxiliares de IA |
| GPU 1 (`09:00.0`) | RTX 5060 Ti | 16 GB (13 MiB em uso) | **Computação dedicada** — modelo principal de IA |

O monitor está conectado na 4070, deixando os 16 GB da 5060 Ti inteiramente livres para inferência — exatamente a configuração recomendada no [Capítulo 3](03-hardware.md).

## 5.4 Checklist de pós-instalação

- [x] **Atualizar tudo** — `full-upgrade` executado e reboot concluído em 21/07/2026 ✓ (3 pacotes em *phasing*, chegam sozinhos)
- [x] **Fstab validado em boot real** — após o reboot, os três discos montaram por rótulo mesmo com `nvme0`/`nvme1` trocando de nome de novo ✓
- [x] **Apagar o Windows antigo** do Micron 512 GB — formatado ext4 (`NVME512`) em 21/07/2026 ✓
- [x] **Instalar e formatar os SATA** — `SSD1TB` e `SSD960` formatados ext4 em 21/07/2026 ✓
- [x] **Montagens permanentes via fstab** (por rótulo): `NVME512` → `/scratch` · `SSD1TB` → `/dados/modelos` · `SSD960` → `/backup` — ativas e validadas em 21/07/2026 ✓
- [x] **Identificar os discos SATA** — Samsung 860 QVO 1 TB (`SSD1TB`) e Kingston A400 960 GB (`SSD960`), via `lsblk -o MODEL` em 21/07/2026 ✓
- [ ] **Timeshift** (modo rsync) instalado, com agenda e destino no disco de backup
- [ ] **SSH server** habilitado com autenticação por chave (senha desabilitada) — detalhes no [Cap. 13](13-seguranca.md)
- [ ] **smartmontools** instalado; monitoramento de desgaste dos SSDs integrado ao [Cap. 12](12-monitoramento.md)
- [ ] **`lm-sensors`** configurado (temperaturas de CPU/NVMe no sistema)
- [x] Estado final dos discos registrado (21/07/2026) ✓ :

```text
sda    Samsung SSD 860 QVO 1TB  931,5G  SSD1TB   /dados/modelos
sdb    KINGSTON SA400S37960G    894,3G  SSD960   /backup
nvme0  Micron MTFDHBA512QFD     476,9G  NVME512  /scratch
nvme1  KINGSTON SNV3S1000G      931,5G  (EFI + /)
```

## 5.5 Kernel e atualizações — política

- **Kernel**: manter o da série LTS (7.0.x via atualizações normais). Não instalar kernels de terceiros; se um hardware futuro exigir kernel mais novo, usar o caminho oficial (HWE) e registrar aqui.
- **Atualizações de segurança**: automáticas (`unattended-upgrades`, padrão do Ubuntu) — verificar ativação no checklist do [Cap. 13](13-seguranca.md).
- **Driver NVIDIA**: atualizar somente pelo repositório oficial do Ubuntu (`ubuntu-drivers`), nunca pelo instalador `.run` da NVIDIA — o `.run` quebra a cada atualização de kernel e foge do controle do apt.
- **Snaps/pacotes**: preferir apt > snap para infraestrutura; snap aceitável para apps de desktop (Firefox etc., como veio).
