# PASES — Protustech AI Software Engineering Station

**Manual de Arquitetura, Implantação e Operação**

<div class="filosofia">
A inteligência artificial não é o produto principal da plataforma. Ela é uma aceleradora do desenvolvimento de software. O verdadeiro objetivo da estação é permitir que uma única pessoa desenvolva, evolua e mantenha sistemas de grande porte com qualidade, velocidade e consistência.
</div>

Este é o **manual vivo** da plataforma de engenharia de software assistida por IA da Protustech — a estação onde os produtos **Moventus (ERP)**, **Modulare** e **Otimizador de Corte** são desenvolvidos. Ele documenta o ecossistema completo — do hardware à operação diária — e registra não apenas *como* as coisas foram feitas, mas *por que* cada decisão foi tomada.

## Estado atual da estação

| Situação | Status |
|---|---|
| Hardware adquirido | <span class="badge badge-existe">Existe</span> |
| Montagem física | <span class="badge badge-existe">Existe</span> (pendente: gabinete final e 2 SATA) |
| Ubuntu instalado | <span class="badge badge-existe">Existe</span> — 26.04 LTS, kernel 7.0, driver NVIDIA OK |
| Infraestrutura (Docker · PostgreSQL 17 · Redis 7) | <span class="badge badge-existe">Existe</span> — stack core desde 21/07/2026 |
| Modelos locais (Ollama · Devstral Small 2 · Qwen3-VL) | <span class="badge badge-existe">Existe</span> — desde 21/07/2026 |
| Geração de imagem e vídeo (ComfyUI · Z-Image-Turbo · Wan 2.2 5B) | <span class="badge badge-existe">Existe</span> — desde 08/10/2026 |
| Camada de IA (Gateway, RAG, agentes) | <span class="badge badge-proposto">Proposto</span> |

!!! info "Convenção de status usada em todo o manual"
    - <span class="badge badge-existe">Existe</span> — implementado e em uso. Pode ser tratado como fato.
    - <span class="badge badge-planejado">Planejado</span> — decisão tomada, implementação pendente.
    - <span class="badge badge-proposto">Proposto</span> — hipótese de arquitetura, ainda sujeita a ADR.
    - <span class="badge badge-confirmar">A confirmar</span> — informação faltando; precisa ser levantada.
    - <span class="badge badge-stub">Stub</span> — capítulo ainda não escrito; apenas estrutura.

## Como este manual está organizado

O manual segue a arquitetura em camadas da própria plataforma: começa pela **filosofia** (por que a estação existe), passa pela **arquitetura** (o desenho geral), desce ao **físico** (hardware, BIOS), sobe pelo **sistema** (Ubuntu, infraestrutura), chega à **inteligência** (IA, agentes, conhecimento) e termina na **operação** (automações, monitoramento, segurança, backup).

| Capítulo | Conteúdo | Status |
|---|---|---|
| [1. Filosofia](01-filosofia.md) | Propósito, princípios e objetivos estratégicos | <span class="badge badge-existe">Completo</span> |
| [2. Arquitetura](02-arquitetura.md) | Visão geral, camadas, papéis da IA, fluxos | <span class="badge badge-existe">Completo</span> |
| [3. Hardware](03-hardware.md) | Inventário real da máquina e expansões | <span class="badge badge-planejado">Parcial</span> |
| [4. BIOS](04-bios.md) | Configuração da ASUS ROG STRIX X870E-H | <span class="badge badge-planejado">Parcial</span> |
| [5. Ubuntu](05-ubuntu.md) | Instalação, particionamento, drivers | <span class="badge badge-planejado">Parcial</span> |
| [6. Infraestrutura](06-infraestrutura.md) | Docker, PostgreSQL, Redis, rede | <span class="badge badge-existe">Núcleo no ar</span> |
| [7. Desenvolvimento](07-desenvolvimento.md) | Padrões, branches, commits, versionamento | <span class="badge badge-stub">Stub</span> |
| [8. Inteligência Artificial](08-inteligencia-artificial.md) | Claude, modelos locais, gateway | <span class="badge badge-planejado">Parcial</span> |
| [8A. Imagem e Vídeo](08a-imagem-video.md) | ComfyUI, Z-Image-Turbo, Wan 2.2, benchmarks | <span class="badge badge-existe">Núcleo no ar</span> |
| [9. Agentes](09-agentes.md) | Papéis, especialistas, orquestração | <span class="badge badge-stub">Stub</span> |
| [10. Banco de Conhecimento](10-banco-de-conhecimento.md) | RAG, embeddings, memória | <span class="badge badge-stub">Stub</span> |
| [11. Automações](11-automacoes.md) | Scripts, build, deploy, CI/CD | <span class="badge badge-stub">Stub</span> |
| [12. Monitoramento](12-monitoramento.md) | Grafana, Prometheus, alertas | <span class="badge badge-stub">Stub</span> |
| [13. Segurança](13-seguranca.md) | Acessos, SSH, Tailscale, segredos | <span class="badge badge-stub">Stub</span> |
| [14. Backup](14-backup.md) | Estratégia 3-2-1, recuperação de desastre, runbook | <span class="badge badge-planejado">Parcial</span> |
| [15. Roadmap](15-roadmap.md) | Fases de evolução da plataforma | <span class="badge badge-planejado">Parcial</span> |
| [16. Apêndices](16-apendices/index.md) | ADRs, glossário, histórico | <span class="badge badge-planejado">Parcial</span> |

!!! info "Padrão de escrita dos procedimentos deste manual"
    Todo procedimento é escrito para ser executável **sem conhecimento técnico prévio**: comandos completos para copiar e colar, o resultado esperado de cada passo, e o que fazer quando algo diferente aparecer. Se um procedimento do manual exigir interpretação ou conhecimento não explicado, isso é um defeito do manual — corrigir o texto, não culpar o leitor.

## Como manter este manual vivo

O manual só cumpre seu papel se acompanhar a realidade. A regra é uma só:

!!! warning "Regra de ouro"
    **Toda mudança de arquitetura, hardware ou ferramenta gera uma atualização no manual — no mesmo dia.** Comprou uma GPU? Atualize o Capítulo 3. Trocou o orquestrador? Atualize os Capítulos 8 e 9 e registre um ADR. Mudou uma decisão? O ADR antigo não é apagado — é marcado como *substituído* e o novo é registrado.

O manual é escrito em **Markdown** (pasta `docs/`) e gerado com **MkDocs Material**. Para editar:

```bash
# instalar (uma vez)
pip install mkdocs-material

# editar os arquivos .md na pasta docs/ e visualizar ao vivo
mkdocs serve

# gerar o site estático final (pasta site/)
mkdocs build
```

O motivo dessa escolha está registrado no [ADR-002](16-apendices/adrs.md#adr-002).
