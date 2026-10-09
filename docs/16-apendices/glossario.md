# Glossário

| Termo | Significado |
|---|---|
| **ADR** | *Architecture Decision Record* — registro formal de uma decisão de arquitetura, com contexto, alternativas e gatilho de revisão. |
| **AI Gateway** | Serviço interno que expõe uma interface única de IA aos projetos e roteia cada pedido para o modelo adequado. |
| **AI Supervisor** | Orquestrador que decide quais IAs e ferramentas participam de cada tarefa (nome definitivo a batizar). |
| **ComfyUI** | Interface e motor de execução, em grafo de nós, para modelos de imagem e vídeo. Não é um modelo — carrega os arquivos de modelo (Capítulo 8A). |
| **Embedding** | Representação numérica (vetor) de um texto, usada para busca por similaridade no RAG. |
| **EXPO** | Perfil de overclock de memória da AMD (equivalente ao XMP da Intel). |
| **HWE** | *Hardware Enablement* — kernels e drivers mais novos disponibilizados no Ubuntu LTS para suportar hardware recente. |
| **Inferência** | Execução de um modelo de IA já treinado (gerar texto, código etc.), em oposição a treinamento. |
| **LLM** | *Large Language Model* — modelo de linguagem de grande porte (Claude, Llama, Qwen etc.). |
| **LTX 2.5** | Modelo de vídeo aberto da Lightricks (22 bilhões de parâmetros) que gera vídeo e áudio juntos. Licença própria: gratuito abaixo de US$ 10 milhões de receita anual (Capítulo 8A, ADR-008). |
| **Modulare** | Produto da Protustech (sistema em desenvolvimento). |
| **Moventus** | Produto da Protustech: sistema ERP. Banco de dados de produção hospedado no Supabase. |
| **Otimizador de Corte** | Produto da Protustech (sistema em desenvolvimento). |
| **PASES** | Protustech AI Software Engineering Station — o nome desta plataforma. |
| **Protustech** | A empresa (em formação) dona da plataforma e dos produtos Moventus, Modulare e Otimizador de Corte. |
| **PITR** | *Point-In-Time Recovery* — restauração de um banco a um instante específico, via base + logs de transação. |
| **QLC** | Memória flash com 4 bits por célula: barata e boa em leitura, lenta em escrita sustentada (caso do SSD 870 QVO). |
| **Quantização** | Compressão de um modelo (ex.: 16 → 4 bits por parâmetro) para caber em menos VRAM, com perda controlada de qualidade. |
| **RAG** | *Retrieval-Augmented Generation* — técnica em que a IA consulta uma base de conhecimento antes de responder. |
| **Stub** | Capítulo com estrutura e escopo definidos, mas conteúdo ainda não escrito. |
| **Supabase** | Serviço de PostgreSQL gerenciado na nuvem. Hospeda o banco de produção do Moventus (organização Protustech). |
| **VRAM** | Memória da GPU — o recurso que determina quais modelos locais a estação consegue rodar. |
| **Wan 2.2 TI2V-5B** | Modelo de vídeo aberto (Apache 2.0) de 5 bilhões de parâmetros, texto e imagem para vídeo. Instalado na estação (Capítulo 8A). |
| **Z-Image-Turbo** | Modelo de imagem aberto (Apache 2.0) de 6 bilhões de parâmetros, destilado para 8 passos. Instalado na estação (Capítulo 8A). |
