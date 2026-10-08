# 6. Infraestrutura

Este capítulo documenta a camada de serviços da estação: containers, bancos, rede e as regras que mantêm tudo reconstruível (Princípio P6 — infraestrutura como código).

## 6.1 Princípios da camada

1. **Tudo que é serviço roda em container** (PostgreSQL, Redis, futuros Qdrant/Grafana/Gateway), com uma exceção deliberada: o **Ollama roda nativo**, porque precisa de acesso direto às GPUs com o mínimo de camadas — e já está instalado assim ([Cap. 8](08-inteligencia-artificial.md)).
2. **Um diretório, um repositório**: toda a definição da infraestrutura vive em `/srv/pases`, versionado em Git. Perder a máquina = clonar e subir ([Cap. 14](14-backup.md)).
3. **Nada exposto**: serviços escutam apenas em `127.0.0.1` (e, futuramente, na interface do Tailscale). Nenhuma porta aberta para a internet, nunca.
4. **Dados separados de definição**: os volumes de dados ficam em `/srv/pases/data/` (NVMe — latência para bancos); o que é definição (composes, configs) é versionado; o que é dado entra no backup diário.

## 6.2 Estrutura de diretórios <span class="badge badge-existe">Existe</span>

```text
/srv/pases/                  ← repositório Git "pases-infra"
├── core/                    ← stack base
│   ├── docker-compose.yml   ← PostgreSQL + Redis
│   └── .env                 ← senhas (NUNCA versionado — entra no backup criptografado)
├── comfyui/                 ← ComfyUI nativo (Cap. 8A) — clone + .venv; NÃO versionar inteiro
├── monitoring/              ← futura stack do Cap. 12 (Prometheus + Grafana)
├── gateway/                 ← futura stack do Cap. 8 (AI Gateway)
├── scripts/                 ← backup diário, manutenção (Cap. 11 e 14)
└── data/                    ← volumes de dados (fora do Git, dentro do backup)
    ├── postgres/
    └── redis/
```

## 6.3 Instalação do Docker <span class="badge badge-existe">Existe — instalado e validado em 21/07/2026</span>

Docker Engine pelo repositório oficial (nunca pelo snap, que traz limitações de caminho e rede):

```bash
# Repositório oficial do Docker
sudo apt update && sudo apt install -y ca-certificates gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Usar Docker sem sudo (exige logout/login para valer)
sudo usermod -aG docker $USER

# Limitar logs (evita containers enchendo o disco do sistema)
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "20m", "max-file": "3" } }
EOF
sudo systemctl restart docker

# Suporte a GPU dentro de containers (para o futuro gateway/monitoramento de GPU)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /etc/apt/keyrings/nvidia-container-toolkit.gpg
curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/etc/apt/keyrings/nvidia-container-toolkit.gpg] https://#' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list >/dev/null
sudo apt update && sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker
```

Validação: `docker run --rm hello-world` e `docker run --rm --gpus all ubuntu nvidia-smi`.

## 6.4 Stack core — PostgreSQL + Redis <span class="badge badge-existe">Existe — no ar desde 21/07/2026</span>

Criar `/srv/pases/core/docker-compose.yml`:

```yaml
name: pases-core

services:
  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_USER: pases
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - /srv/pases/data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pases"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - /srv/pases/data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

E o `.env` ao lado (senha forte, registrada no gerenciador — regra 14.4):

```bash
sudo mkdir -p /srv/pases/{core,scripts,data/postgres,data/redis}
sudo chown -R $USER:$USER /srv/pases
cd /srv/pases/core
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)" > .env && chmod 600 .env && cat .env
docker compose up -d && docker compose ps
```

**Por que PostgreSQL local se a produção está no Supabase?** Mesma engine, ambientes distintos ([ADR-005](16-apendices/adrs.md#adr-005)): o local é o ambiente de desenvolvimento e testes dos três produtos, e o banco dos serviços internos da plataforma. Migrações nascem aqui e só então vão ao Supabase.

**Por que Redis já na stack base?** Cache e filas aparecem cedo (o AI Gateway usará para cache de respostas), o custo é ~30 MB de RAM, e subir junto evita retrabalho.

## 6.5 Componentes com implantação adiada (de propósito)

| Componente | Quando entra | Gatilho |
|---|---|---|
| **Qdrant** | Fase 4 do [Roadmap](15-roadmap.md) | Implantação do RAG — antes disso, avaliar se `pgvector` no PostgreSQL já resolve (decisão vira ADR) |
| **Nginx** | Quando houver 2+ serviços web internos | Antes disso é camada sem função |
| **Grafana/Prometheus** | [Cap. 12](12-monitoramento.md) | Stack `monitoring/` própria |
| **Tailscale** | Junto com o [Cap. 13](13-seguranca.md) | Instalação nativa (não container); único acesso remoto da estação |
| **Git remoto** | Imediato — pré-requisito do [Cap. 14](14-backup.md) | Repositórios `pases-infra` e `pases-manual` privados |

## 6.6 Linguagens e ferramentas de desenvolvimento <span class="badge badge-proposto">Proposto</span>

Regra: **versões gerenciadas por ferramenta, não pelo apt** (o apt serve o sistema, não os projetos): `uv` para Python, `nvm` para Node, `rustup` para Rust. Detalhamento no [Capítulo 7](07-desenvolvimento.md), junto com a padronização dos projetos.

## 6.7 Checklist de implantação

- [x] Docker Engine + Compose instalados — `hello-world` OK em 21/07/2026 ✓
- [x] NVIDIA Container Toolkit — as **duas GPUs visíveis** dentro de container (`--gpus all nvidia-smi`) ✓
- [x] `/srv/pases` criado e versionado em Git ✓
- [x] Stack core no ar em 21/07/2026 ✓ — registro oficial:

```text
NAME                    IMAGE         SERVICE    STATUS                    PORTS
pases-core-postgres-1   postgres:17   postgres   Up 15 seconds (healthy)   127.0.0.1:5432->5432/tcp
pases-core-redis-1      redis:7       redis      Up 15 seconds (healthy)   127.0.0.1:6379->6379/tcp
```

- [x] Senha do PostgreSQL guardada fora da estação (regra 14.4) — confirmado em 21/07/2026 ✓
- [x] Repositório Git remoto privado `pases-infra` criado e com primeiro push em 22/07/2026 ✓ (SSH configurado, `.env` e `data/` protegidos por `.gitignore`)
