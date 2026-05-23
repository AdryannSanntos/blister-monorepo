# workflow de agentes

## Contextos

- **Contexto da empresa**: é a base compartilhada por todos os agentes da empresa, com tom de voz, regras gerais, objetivos, processos, referências, permissões e demais informações centrais do workspace.
- **Contexto próprio do agente**: cada agente tem uma camada própria, separada do contexto geral da empresa, com instruções específicas, memória própria, comportamento próprio e arquivos próprios.
- **Herdar sem misturar**: o agente lê o contexto da empresa e o próprio contexto ao mesmo tempo, mas em camadas separadas, para não misturar regras globais com regras específicas daquele agente.
- **Arquivos da empresa e do agente**: o contexto geral pode usar arquivos da empresa, enquanto o agente também pode usar seus próprios arquivos, inclusive arquivos enviados pelo usuário ou criados por ele.
- **Seleção de contexto**: na criação ou execução, o usuário pode escolher quais arquivos entram no contexto daquele agente, além do que já vem como base da empresa.

## Estrutura do agente

- **Agente como unidade principal**: cada agente representa uma função operacional do sistema, como briefing, copy, post, imagem, organização, follow-up, resumo ou análise.
- **Um agente pode ter vários workflows**: o mesmo agente pode ser executado por diferentes fluxos, dependendo do caso de uso, da intenção ou do tipo de saída esperada.
- **Workflow declarativo**: o workflow é um fluxo definido por blocos, não por lógica escondida em código solto, e cada step é rastreável.
- **Criação do workflow**: o workflow deve ser criado como uma configuração estruturada, com blocos, conexões, tipos de entrada e tipos de saída.
- **Execução do workflow**: quando o workflow roda, ele percorre os blocos na ordem definida, respeitando o tipo de dado gerado em cada etapa.

## Blocos principais

- **Bloco de entrada**: recebe o input do usuário e os parâmetros iniciais da execução.
- **Bloco de contexto**: injeta o contexto da empresa, o contexto próprio do agente e os arquivos selecionados.
- **Bloco de leitura de arquivos**: permite carregar arquivos de contexto da empresa ou do agente para dentro da execução.
- **Bloco de decisão**: avalia o que fazer com a entrada atual, podendo seguir, ramificar, chamar outro agente ou interromper.
- **Bloco booleano**: é um bloco que usa IA para responder true/false, útil para decidir se algo deve ou não continuar.
- **Bloco de if/else**: é um bloco condicional explícito para separar caminhos do workflow com base em uma condição, podendo seguir para o caminho `if` ou para o caminho `else`.
- **Bloco de chamada de agente**: é o ponto explícito onde o workflow pode spawnar ou chamar outro agente quando necessário.
- **Bloco de clarificação**: quando faltam dados, esse bloco gera perguntas para o usuário e pode repetir essa etapa em várias rodadas.
- **Bloco de validação**: verifica se a resposta ou a saída intermediária está coerente, completa e pronta para avançar.
- **Bloco de transformação**: converte a saída de um formato para outro, por exemplo de texto para JSON, ou de JSON para lista.
- **Bloco de múltiplas entradas e saídas**: alguns blocos podem receber mais de uma entrada e produzir mais de uma saída, dependendo do workflow.
- **Bloco de formatação de output**: prepara a resposta final do agente para exibição no frontend, organizando estrutura, rótulos e formato visual.
- **Bloco finalizador**: encerra a execução, consolida o resultado e registra o término do AgentRun.

## Tipos de saída

- **Saída tipada por bloco**: cada bloco pode produzir um tipo de saída específico, como texto, boolean, lista, objeto JSON ou outro formato estruturado.
- **Leitura tipada no próximo bloco**: o próximo bloco entende o tipo da saída anterior, então texto é lido como texto, boolean como boolean e assim por diante.
- **Saída final estruturada**: o frontend não deve depender de texto solto; a saída precisa chegar organizada para renderização de cards, blocos, listas, imagens ou componentes.

## Chamada de agentes

- **Spawn explícito**: um agente pode spawnar outro agente, mas isso precisa acontecer dentro de um bloco claro do workflow, não de forma implícita.
- **Agente pai controla a execução**: mesmo quando chama outro agente, a execução principal continua sendo dona do fluxo.
- **Retorno do subagente**: o subagente pode devolver uma resposta final ou um pedido de clarificação para o agente pai.
- **Mais de uma rodada de perguntas**: se o subagente ainda não tiver contexto suficiente, ele pode entrar novamente no bloco de clarificação e fazer novas perguntas.
- **Perguntas voltam para a execução principal**: toda dúvida precisa ser repassada para o fluxo principal, que mantém o estado e continua quando receber as respostas.

## Execução e estado

- **Execução rastreável**: cada chamada, step, pergunta, resposta e decisão precisa ficar registrada no AgentRun.
- **Estado de pausa e retomada**: se o workflow parar para pedir informação, ele precisa guardar exatamente onde interrompeu para retomar depois.
- **Histórico da execução**: a execução deve permitir ver os steps já rodados, os blocos acionados e o que foi consumido.
- **Consumo de créditos**: cada execução ou subexecução precisa estar ligada ao CreditLedger para debitar corretamente o uso de IA.
- **Reservas e liberação**: quando necessário, o sistema pode reservar custo estimado antes do step e confirmar ou liberar no fim.

## Interface e animação

- **Execução visualizada**: quando o workflow estiver rodando, o frontend deve mostrar o estado da execução e a progressão dos blocos.
- **Animação por bloco**: cada bloco pode ter um estado visual próprio enquanto está em execução, concluído ou aguardando resposta.
- **Feedback de progresso**: o usuário precisa entender claramente o que o agente está fazendo, onde parou e o que falta para continuar.

## Evolução futura

- **Agendamento de execução**: futuramente, um agente pode ser agendado para executar em outro momento, como uma tarefa programada.
- **Flexibilidade para crescer**: o MVP deve começar com blocos básicos, mas já preparado para suportar novos tipos de bloco, novos formatos de saída e novas formas de execução.

## Resumo da lógica

- **Fluxo geral**: o usuário dispara um agente, o workflow carrega o contexto da empresa e do agente, seleciona arquivos, executa os blocos, pode chamar outro agente, pode pedir clarificação em várias rodadas, valida a resposta e entrega um output estruturado.
- **Separação importante**: todos os agentes compartilham o contexto da empresa, mas cada um mantém seu próprio contexto isolado para não misturar comportamento, memória e instruções.

## Exemplos

- **Briefing com triagem**: o agente de briefing detecta falta de dados e chama o agente de triagem, que faz perguntas e pode repetir clarificação até completar o contexto.
- **Post com copy e imagem**: o agente de post chama copy e imagem em sequência, valida os outputs e compõe um resultado final estruturado.
- **Copy com boolean**: o agente gera a copy e usa um bloco booleano para decidir se o texto está aderente antes de finalizar.
- **Resumo com análise**: o agente de resumo chama análise para extrair pontos importantes e depois monta a versão condensada.
- **Adaptação de conteúdo**: o agente adapta um conteúdo para outra plataforma, chamando subagente quando precisar extrair ou validar partes antes.
- **Fallback por contexto insuficiente**: o workflow usa if/else ou boolean para decidir se continua ou se entra em clarificação.
