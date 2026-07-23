# 1. Filosofia

Este capítulo responde à pergunta que guia todas as outras: **o que estamos construindo, e por quê?**

## 1.1 O propósito da estação

A PASES não é "um computador potente com IA instalada". Ela é uma **plataforma de engenharia de software** cujo objetivo é multiplicar a capacidade de uma única pessoa.

A Protustech desenvolve e mantém sistemas de porte considerável — **Moventus (ERP)**, **Modulare** e **Otimizador de Corte** — com uma equipe de engenharia de uma pessoa. Sem alavancagem, isso impõe um teto: cada hora gasta em tarefa repetitiva (build, deploy, teste manual, documentação, backup) é uma hora retirada de arquitetura e produto. A estação existe para remover esse teto.

<div class="filosofia">
A inteligência artificial não é o produto principal da plataforma. Ela é uma aceleradora do desenvolvimento de software. O verdadeiro objetivo da estação é permitir que uma única pessoa desenvolva, evolua e mantenha sistemas de grande porte com qualidade, velocidade e consistência.
</div>

Na prática, isso significa três metas permanentes:

1. **Qualidade** — todo código que entra em produção passou por revisão (humana ou assistida), testes e documentação. O tamanho da equipe não é desculpa para abrir mão de disciplina de engenharia.
2. **Velocidade** — o ciclo entre "ideia" e "funcionalidade em produção" deve encurtar continuamente, através de automação e assistência de IA.
3. **Consistência** — os projetos seguem os mesmos padrões de estrutura, versionamento e deploy. Quem conhece um projeto da Protustech conhece todos.

## 1.2 Princípios da plataforma

Estes princípios são os critérios de desempate para qualquer decisão futura. Quando duas alternativas parecem equivalentes, vence a que respeita mais princípios.

### P1 — IA como aceleradora, não como protagonista

A IA propõe, o engenheiro decide. Nenhum sistema em produção depende de uma IA "acertar" para funcionar; a IA acelera a construção e a manutenção, mas o produto final é software convencional, testado e determinístico.

### P2 — Modularidade

Cada componente da plataforma (banco, gateway, modelo, agente, projeto) deve poder ser trocado sem reescrever o restante. É por isso que existe um AI Gateway ([Capítulo 2](02-arquitetura.md)): os projetos falam com "a IA", não com um fornecedor específico.

### P3 — Independência de fornecedores

Nenhum fornecedor — nem mesmo a Anthropic — deve ser insubstituível. Modelos remotos e locais são intercambiáveis pela camada de gateway. Dados ficam em bancos abertos (PostgreSQL, Qdrant). Formatos proprietários são evitados.

### P4 — Automação primeiro

Se uma tarefa foi feita manualmente duas vezes, a terceira vez deve ser um script. A lista de tarefas que **nunca mais** devem ser manuais está na seção [1.5](#15-filosofia-de-automacao).

### P5 — Documentação contínua

Documentação não é uma fase; é um subproduto obrigatório de cada mudança. Este manual é a materialização do princípio: ele é atualizado **no mesmo dia** em que a realidade muda.

### P6 — Infraestrutura como código

Tudo que configura a estação — containers, serviços, agendamentos, dashboards — vive em arquivos versionados. Se a máquina for perdida, a plataforma é reconstruível a partir do repositório e dos backups.

### P7 — Versionamento de tudo

Código, configuração, documentação, esquemas de banco, prompts de agentes: tudo em Git. O que não está versionado não existe oficialmente.

### P8 — Decisões registradas (ADRs)

Toda decisão de arquitetura relevante gera um [ADR](16-apendices/adrs.md) com objetivo, alternativas, justificativa e gatilho de revisão. O manual não diz apenas *o que* fazer — diz *por quê*, e quando reavaliar.

## 1.3 O que a plataforma NÃO é

Definir limites evita desperdício de energia:

- **Não é um laboratório de pesquisa em IA.** Não treinamos modelos do zero; usamos modelos prontos como ferramentas.
- **Não é um datacenter.** É uma estação de trabalho ambiciosa. Cargas que exigirem escala real (clientes externos, alta disponibilidade) vão para servidores dedicados ou nuvem — a estação é o ambiente de *engenharia*.
- **Não é um fim em si.** Cada investimento na plataforma se justifica pelo impacto nos produtos: Moventus, Modulare, Otimizador de Corte e os que vierem.

## 1.4 Objetivos estratégicos

Os prazos abaixo contam a partir da conclusão da montagem física da máquina.

### Horizonte de 6 meses <span class="badge badge-planejado">Planejado</span>

- Estação montada, Ubuntu instalado e estável, dual boot ou máquina dedicada definidos.
- Infraestrutura base operacional: Docker, PostgreSQL, Redis, Git remoto, backups automáticos.
- Primeiro modelo local rodando nas GPUs, com casos de uso reais (autocomplete, refatoração, geração de testes).
- Este manual com os Capítulos 1–6 completos e fiéis à realidade.

### Horizonte de 1 ano <span class="badge badge-proposto">Proposto</span>

- AI Gateway operacional: projetos consomem IA por uma interface única, com roteamento entre Claude e modelos locais.
- RAG inicial indexando a documentação e o histórico dos projetos da Protustech.
- Pipeline de CI local: build, testes e deploy dos projetos principais sem intervenção manual.
- Monitoramento básico (temperaturas, GPU, containers, bancos) com alertas.

### Horizonte de 3 anos <span class="badge badge-proposto">Proposto</span>

- Agentes especializados cobrindo o ciclo completo: arquitetura, implementação, testes, documentação, release.
- Banco de conhecimento como memória permanente da empresa: decisões, código, manuais, atendimentos.
- Plataforma tratada como produto interno: com versões, changelog e roadmap próprios.

!!! note "Por que os horizontes longos são 'propostos' e não 'planejados'?"
    Porque o ecossistema de IA muda rápido demais para planos rígidos de 3 anos. Os horizontes longos indicam **direção**, não compromisso. Eles serão revisados a cada 6 meses, junto com os ADRs.

## 1.5 Filosofia de automação

Tarefas que, uma vez automatizadas, **nunca mais** serão feitas manualmente:

- [ ] Backup (dados, código, configuração, este manual)
- [ ] Build e empacotamento dos projetos
- [ ] Execução de testes
- [ ] Deploy
- [ ] Geração de changelog e documentação de release
- [ ] Atualização de dependências (com testes de regressão)
- [ ] Snapshots do sistema antes de mudanças de risco
- [ ] Monitoramento de temperatura, disco, GPU e serviços

Esta lista é um contrato. Cada item vira um checklist de implementação no [Capítulo 11 — Automações](11-automacoes.md), e o status de cada um é acompanhado lá.

## 1.6 O manual como parte da plataforma

Este documento não é um anexo — é um componente da arquitetura, com o mesmo peso do banco de dados ou do gateway. Ele cumpre três funções:

1. **Memória** — em uma equipe de uma pessoa, o manual é o "segundo engenheiro" que lembra por que as coisas são como são.
2. **Disciplina** — escrever a decisão força a pensá-la; o formato ADR expõe alternativas não consideradas.
3. **Continuidade** — se amanhã outra pessoa precisar operar a estação, o caminho está escrito.

A decisão sobre a tecnologia do próprio manual está registrada no [ADR-002](16-apendices/adrs.md#adr-002).
