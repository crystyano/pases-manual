# 2. Arquitetura

Este capítulo apresenta o desenho geral da plataforma: as camadas, os papéis de cada componente de IA e os fluxos de trabalho padronizados.

!!! warning "Leia com o status em mente"
    A máquina está em montagem. Neste capítulo, a arquitetura descrita é o **alvo** — cada componente carrega seu badge de status. Conforme os componentes entrarem em operação, os badges mudam para <span class="badge badge-existe">Existe</span> e este aviso será removido.

## 2.1 Visão geral

```mermaid
flowchart TB
    VOCE(["👤 Engenheiro (você)"])
    SUP["AI Supervisor / Orquestrador"]
    CLAUDE["Claude<br/>(remoto)"]
    LOCAL["Modelos Locais<br/>(RTX 5060 Ti + RTX 4070)"]
    RAG["RAG / Banco de<br/>Conhecimento"]
    TOOLS["Ferramentas<br/>(Git, testes, build)"]
    GW["AI Gateway"]
    ERP["Moventus (ERP)"]
    MOD["Modulare"]
    CORTE["Otimizador de Corte"]

    VOCE --> SUP
    SUP --> CLAUDE
    SUP --> LOCAL
    SUP --> RAG
    SUP --> TOOLS
    CLAUDE --> GW
    LOCAL --> GW
    RAG --> GW
    GW --> ERP
    GW --> MOD
    GW --> CORTE
```

| Componente | Função | Status |
|---|---|---|
| Engenheiro | Decide, revisa, aprova. Único ponto com autoridade final. | <span class="badge badge-existe">Existe</span> |
| AI Supervisor | Orquestra quais IAs e ferramentas participam de cada tarefa | <span class="badge badge-proposto">Proposto</span> |
| Claude | Arquitetura, planejamento, revisão, decisões | <span class="badge badge-existe">Existe</span> |
| Modelos locais | Implementação, refatoração, testes, tarefas de volume | <span class="badge badge-existe">Existe</span> — Onda 1 no ar desde 21/07/2026 ([Cap. 8](08-inteligencia-artificial.md)) |
| RAG | Memória permanente: documentação, histórico, contexto | <span class="badge badge-proposto">Proposto</span> |
| AI Gateway | Interface única de IA para os projetos | <span class="badge badge-proposto">Proposto</span> |
| Projetos (Moventus, Modulare, Corte) | Os produtos que justificam a plataforma | <span class="badge badge-existe">Existe</span> |

!!! note "Sobre o nome 'Hermes'"
    Em conversas anteriores o orquestrador foi chamado de *Hermes*. O nome é <span class="badge badge-confirmar">A confirmar</span> — o componente em si está registrado aqui como **AI Supervisor**, e o batismo oficial acontecerá quando ele sair do papel. A arquitetura não depende do nome (Princípio P2 — Modularidade).

## 2.2 Arquitetura em camadas

A plataforma é organizada em camadas, cada uma documentada em seu próprio capítulo. Uma camada só depende da camada imediatamente abaixo — nunca o contrário.

```mermaid
flowchart TB
    subgraph FISICO ["Camada física"]
        HW["Hardware — Cap. 3"]
        BIOS["BIOS — Cap. 4"]
    end
    subgraph SISTEMA ["Camada de sistema"]
        OS["Ubuntu — Cap. 5"]
        INFRA["Infraestrutura — Cap. 6<br/>Docker · PostgreSQL · Redis · Qdrant · Rede"]
    end
    subgraph IA ["Camada de inteligência"]
        GW2["AI Gateway — Cap. 8"]
        MODELOS["Modelos — Cap. 8"]
        AGENTES["Agentes — Cap. 9"]
        KB["Banco de Conhecimento — Cap. 10"]
    end
    subgraph PRODUTO ["Camada de produto"]
        PROJ["Projetos — Cap. 7<br/>Moventus · Modulare · Otimizador"]
    end
    subgraph OPERACAO ["Camada de operação"]
        AUTO["Automações — Cap. 11"]
        MON["Monitoramento — Cap. 12"]
        SEC["Segurança — Cap. 13"]
        BKP["Backup — Cap. 14"]
    end

    FISICO --> SISTEMA --> IA --> PRODUTO
    OPERACAO -.->|observa e protege todas as camadas| FISICO
```

O sentido da dependência é a regra mais importante do desenho: **os projetos não sabem qual modelo de IA os atende** (falam com o gateway), **o gateway não sabe em qual GPU roda** (fala com o sistema), e assim por diante. Trocar uma peça de qualquer camada não deve exigir mudanças acima dela.

## 2.3 Papéis da IA

A divisão de trabalho entre as IAs segue uma lógica simples: **raciocínio caro e decisões vão para o melhor modelo disponível; volume e repetição vão para os modelos locais**, que custam apenas energia elétrica.

```mermaid
flowchart TB
    C["🧠 Claude — o Arquiteto"]
    E["⚙️ Executor Local — o Implementador"]
    R["📚 RAG — a Memória"]
    G["🔀 Gateway — o Roteador"]

    C -->|"planos e especificações"| E
    R -->|"contexto"| C
    R -->|"contexto"| E
    G -->|"decide quem responde"| C
    G -->|"decide quem responde"| E
```

### Claude — o Arquiteto <span class="badge badge-existe">Existe</span>

**Responsabilidades:** arquitetura, planejamento, design de soluções, revisão de código, decisões técnicas, escrita de ADRs.

**Por que o Claude é o arquiteto e não o executor?** Porque o valor de um modelo de ponta está no raciocínio, não na digitação. Usar o melhor modelo disponível para gerar milhares de linhas de código repetitivo é caro e desnecessário; usá-lo para decidir *o que* construir e revisar *o que foi* construído concentra o custo onde há mais retorno. Além disso, planos e revisões são artefatos pequenos e auditáveis — fáceis de validar antes de virarem código.

### Executor Local — o Implementador <span class="badge badge-planejado">Planejado</span>

**Responsabilidades:** implementação a partir de especificações, refatoração, geração de testes, tarefas de volume (boilerplate, migrações, conversões).

**Por que separar modelos locais e remotos?** Três motivos: **custo** (o local roda 24 h por dia pelo preço da energia), **privacidade** (código sensível dos produtos não precisa sair da máquina) e **disponibilidade** (a estação funciona mesmo sem internet ou com o fornecedor fora do ar — Princípio P3).

### RAG — a Memória <span class="badge badge-proposto">Proposto</span>

**Responsabilidades:** dar contexto permanente a todas as IAs — documentação dos projetos, histórico de decisões, este manual, esquemas de banco, código existente.

**Por que usamos RAG em vez de "colar tudo no prompt"?** Porque o conhecimento da Protustech cresce sem parar e nenhuma janela de contexto o comporta inteiro. O RAG busca apenas o relevante para cada tarefa, mantém uma única fonte de verdade (em vez de cópias desatualizadas em prompts) e funciona igual para qualquer modelo — remoto ou local.

### Gateway — o Roteador <span class="badge badge-proposto">Proposto</span>

**Responsabilidades:** expor uma interface única de IA para todos os projetos; decidir, por tarefa, se quem responde é o Claude, um modelo local ou uma combinação; aplicar cache, logging e limites de custo.

**Por que ter um AI Gateway?** Porque sem ele cada projeto integraria diretamente com um fornecedor específico — e trocar de modelo exigiria mexer em todos os projetos. Com o gateway, a troca acontece em um único lugar (Princípios P2 e P3). Ele também é o ponto natural para medir custo e desempenho de cada modelo.

## 2.4 Fluxos de trabalho padronizados

Os três fluxos abaixo são os "trilhos" sobre os quais todo o trabalho corre. Eles serão detalhados, com ferramentas e comandos, no [Capítulo 7](07-desenvolvimento.md).

### Fluxo de nova funcionalidade

```mermaid
flowchart LR
    A["Ideia"] --> B["Requisitos"] --> C["Arquitetura<br/>(Claude)"] --> D["Plano técnico"] --> E["Implementação<br/>(agentes/local)"] --> F["Testes"] --> G["Revisão<br/>(Claude + você)"] --> H["Documentação"] --> I["Build"] --> J["Deploy"]
```

### Fluxo de correção de bug

```mermaid
flowchart LR
    A["Bug"] --> B["Reprodução"] --> C["Diagnóstico<br/>assistido por IA"] --> D["Correção"] --> E["Teste<br/>automático"] --> F["Validação"] --> G["Commit"] --> H["Release"]
```

### Fluxo de novo produto

```mermaid
flowchart LR
    A["Ideia"] --> B["Pesquisa"] --> C["Viabilidade"] --> D["Arquitetura"] --> E["Protótipo"] --> F["Produto"] --> G["Manutenção"]
```

A regra comum aos três fluxos: **nenhuma etapa é pulada, mas toda etapa pode ser acelerada por IA.** A reprodução de um bug pode ser automatizada, o diagnóstico pode ser assistido, a correção pode ser gerada — mas o fluxo `Bug → Release` sempre passa por teste e validação.

## 2.5 Decisões de arquitetura deste capítulo

As decisões que sustentam este desenho estão registradas como ADRs no [Apêndice](16-apendices/adrs.md):

| ADR | Decisão | Status |
|---|---|---|
| [ADR-001](16-apendices/adrs.md#adr-001) | Ubuntu LTS como sistema operacional | <span class="badge badge-planejado">Aceito</span> |
| [ADR-002](16-apendices/adrs.md#adr-002) | MkDocs Material para o manual | <span class="badge badge-existe">Aceito</span> |
| [ADR-003](16-apendices/adrs.md#adr-003) | Claude como arquiteto, modelos locais como executores | <span class="badge badge-planejado">Aceito</span> |
| [ADR-004](16-apendices/adrs.md#adr-004) | AI Gateway como camada de desacoplamento | <span class="badge badge-proposto">Proposto</span> |
| [ADR-005](16-apendices/adrs.md#adr-005) | PostgreSQL como banco relacional padrão | <span class="badge badge-proposto">Proposto</span> |
