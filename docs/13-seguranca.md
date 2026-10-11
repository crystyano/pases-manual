# 13. Segurança

!!! note "Capítulo parcialmente escrito"
    A maior parte é um **esqueleto** <span class="badge badge-stub">Stub</span> (escopo planejado ao final). Só a seção 13.1 — um **levantamento factual de exposição de portas** feito em 11/10/2026 — está escrita. Nada foi alterado no sistema.

## 13.1 Levantamento de exposição <span class="badge badge-existe">Existe — 11/10/2026</span>

Obtido com `ss -tln`, `docker ps` e testes `curl` **feitos pela própria máquina** (nenhum outro aparelho foi tocado).

| Serviço | Porta | Escuta em | Resposta pelo IP da rede local | Autenticação |
|---|---|---|---|---|
| **Ollama** | 11434 | **todas as interfaces** (`OLLAMA_HOST=0.0.0.0`, `OLLAMA_ORIGINS=*`) | HTTP 200 | **nenhuma** (o Ollama não tem) |
| Open WebUI | 3000 | `0.0.0.0` | HTTP 200 | login (cadastro desativado) |
| **Netdata** | 19999 | `0.0.0.0` e `[::]` | HTTP 200 | **não pediu credenciais** |
| ComfyUI | 8188 | `127.0.0.1` | sem resposta | nenhuma (por isso o bind local) |
| PostgreSQL / Redis (`pases-core`) | 5432 / 6379 | `127.0.0.1` | sem resposta | senha / — |
| LobeChat, RustFS | 3210 / 9000 | `127.0.0.1`, `127.0.1.1` e o IP do Tailscale | não pela rede local | LobeChat: não verificada |
| SSH | 22 | **nenhum servidor SSH ativo** (serviço `ssh` inativo) | — | — |

**Tailscale:** ativo, com 3 dispositivos na rede (esta estação, um Windows e um Android).

!!! warning "O que este levantamento NÃO prova"
    - **O firewall não foi verificado.** O serviço `ufw` está ativo, mas ler as regras exige superusuário. Um teste feito **pela própria máquina** contra o seu IP da rede local **não passa pelo filtro de entrada** da placa de rede, então "HTTP 200" mostra que o serviço escuta em todas as interfaces, **não** que outro aparelho consiga alcançá-lo. Para saber isso: `sudo ufw status verbose` ou testar de **outro aparelho na mesma rede** (um celular, por exemplo).
    - O Ollama, o Open WebUI e o Netdata estarem ligados a todas as interfaces **pode ser intencional** (por exemplo, usar o Cline a partir do notebook Windows pela rede). Isso é **decisão do responsável**.

### Pontos a decidir (nada foi alterado)

1. **Ollama sem autenticação ligado a todas as interfaces**, com `OLLAMA_ORIGINS=*`: qualquer aparelho que o alcance consegue usar os modelos e baixar ou apagar modelos. Alternativas: ligar só em `127.0.0.1` e no IP do Tailscale, restringir `OLLAMA_ORIGINS`, ou confirmar que o firewall bloqueia a porta fora do Tailscale.
2. **Netdata** em `0.0.0.0:19999` expõe métricas detalhadas da máquina sem login.
3. O manual diz "nada exposto" ([Cap. 6.1](06-infraestrutura.md)); isso **não vale** para estes três serviços.

## Escopo planejado

- Modelo de ameaças da estação
- SSH endurecido, chaves, sem senha
- Tailscale como única porta de entrada remota
- Gestão de segredos (tokens de API, senhas de banco)
- Atualizações de segurança automáticas
- Firewall e exposição zero de portas à internet
- Política de dados sensíveis vs IA remota
