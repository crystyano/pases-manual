# 15. Roadmap

A evolução da plataforma acontece em fases. Cada fase só começa quando a anterior está **operacional e documentada** — a tentação de pular etapas é o maior risco do projeto.

```mermaid
flowchart TB
    F0["Fase 0 — Montagem física + BIOS<br/>⬅ estamos aqui"]
    F1["Fase 1 — Estação Local<br/>Ubuntu · Docker · bancos · backup"]
    F2["Fase 2 — Modelos Locais<br/>runtime · primeiros casos de uso"]
    F3["Fase 3 — AI Gateway"]
    F4["Fase 4 — RAG / Banco de Conhecimento"]
    F5["Fase 5 — Agentes Especializados"]
    F6["Fase 6 — CI/CD Inteligente + Testes Automáticos"]
    F7["Fase 7 — Documentação Automática"]
    F8["Fase 8 — ERP Autoevolutivo"]

    F0 --> F1 --> F2 --> F3 --> F4 --> F5 --> F6 --> F7 --> F8
```

| Fase | Entregável que a encerra | Status |
|---|---|---|
| 0 — Montagem + BIOS | Máquina estável, Capítulos 3 e 4 completos | <span class="badge badge-existe">Concluída ✓ 21/07/2026</span> |
| 1 — Estação Local | Infra base ✓ + **backup testado** (pendente), Capítulos 5, 6 e 14 | <span class="badge badge-planejado">Em andamento — falta só o backup</span> |
| 2 — Modelos Locais | Modelo local em uso diário real, Capítulo 8 (parcial) | <span class="badge badge-planejado">Em andamento — Onda 1 no ar e aprovada em velocidade</span> |
| 3 — AI Gateway | Projetos consumindo IA só via gateway | <span class="badge badge-proposto">Proposto</span> |
| 4 — RAG | Conhecimento da Protustech indexado e consultável | <span class="badge badge-proposto">Proposto</span> |
| 5 — Agentes | Fluxo de funcionalidade executado por agentes ponta a ponta | <span class="badge badge-proposto">Proposto</span> |
| 6 — CI/CD Inteligente | Build/teste/deploy sem intervenção manual | <span class="badge badge-proposto">Proposto</span> |
| 7 — Doc. Automática | Documentação gerada e atualizada por pipeline | <span class="badge badge-proposto">Proposto</span> |
| 8 — ERP Autoevolutivo | A definir quando a Fase 5 amadurecer | <span class="badge badge-proposto">Proposto</span> |

!!! tip "Regra de sequenciamento"
    Backup (Fase 1) vem antes de qualquer IA. Uma estação que perde dados não é acelerada por nada.
