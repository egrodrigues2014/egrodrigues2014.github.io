---
title: "Um ETL que se reinicia sozinho: alertas de fraude em sinistros de automóvel"
date: 2026-08-04T22:00:00+02:00
description: "A geração de alertas de fraude de ponta a ponta, e o sistema de reinício automático que transformou uma ligação às 3 da manhã em uma linha de log."
menu:
  sidebar:
    name: "ETL de fraude auto-recuperável"
    identifier: fraud-alert-etl-resilience-pt-br
    weight: 60
tags: ["SAS", "SQL", "Linux", "ETL", "Data Quality"]
categories: ["Data Engineering"]
---

Na [PeRTICA Análisis Estadísticos](https://www.pertica.es), parceira SAS e
consultoria analítica para seguros e bancos, fui responsável de ponta a ponta pelo
processo de geração de alertas de fraude para sinistros de automóvel: dos dados de
origem até o alerta sobre o qual um investigador age.

O que vale escrever não é o scoring. É que o processo tinha de terminar antes do
início da jornada, todos os dias, e por muito tempo não terminava. Era uma cadeia
noturna: extrair sinistros e apólices, conformar, aplicar as regras de alerta e
produzir uma fila priorizada para o time de investigação. Se falhasse às 3 da manhã,
alguém recebia uma ligação, descobria onde havia parado, limpava o estado escrito
pela metade e reiniciava. Se não houvesse ligação, o time chegava a uma fila vazia.
As duas coisas custam o mesmo: um dia de capacidade de investigação num processo
cujo valor depende do tempo, porque um sinistro é mais fácil de investigar antes de
ser pago.

{{< mermaid >}}
flowchart LR
  CLM[(Sinistros)] --> EXT[Extracao com marca de agua por origem]
  POL[(Apolices e envolvidos)] --> EXT
  HIST[(Historico de sinistros)] --> EXT
  EXT --> CONF[Conformacao e validacao]
  CONF --> RULES[Regras de alerta e scoring]
  RULES --> QUEUE[(Fila de alertas priorizada)]
  QUEUE --> INV[Investigadores]
  WD[Watchdog: checkpoints, retentativas, escalonamento] --> EXT
  WD --> CONF
  WD --> RULES
{{< /mermaid >}}

As decisões: **cada passo é idempotente ou não é um passo** — escreve-se em um
destino de staging e faz-se a troca, nunca append no lugar, e toda saída tem chave
para que uma reexecução substitua em vez de duplicar —; é mais código e mais
armazenamento, e é a única coisa que torna seguro o reinício automático, porque
repetir um passo não idempotente é pior do que falhar: produz alertas duplicados, e
um investigador que deixa de confiar na fila é um resultado pior do que uma fila
vazia. **Checkpoints nas fronteiras entre passos, não dentro de um passo**: a
contabilidade de um checkpoint fino cresce mais rápido do que o tempo que ele
economiza, e essa contabilidade é, por si, algo que pode estar errado. **Distinguir
o transitório do real e escalonar a diferença**: uma tabela bloqueada ou uma conexão
caída são retentadas com backoff; uma falha de validação ou uma contagem de linhas
fora da faixa param e escalam. Errar essa classificação em qualquer das duas
direções é o principal modo de falha. **Monitorar a plataforma, não só o job**: a
maioria das ligações das 3 da manhã tinha um aviso vinte minutos antes que ninguém
estava lendo. E **o tuning veio depois da confiabilidade**, não antes: um processo
rápido que falha continua sendo um processo que falhou.

O resultado: as falhas noturnas deixaram de gerar ligações e passaram a gerar linhas
de log, e a recuperação que antes uma pessoa fazia passou a ser o caminho normal; a
fila de alertas ficava pronta antes de o time chegar, de forma consistente; e o
tempo de execução caiu de modo apreciável com reescrita de consultas e agendamento,
o que sobretudo comprou margem para as retentativas.

O que eu faria diferente: construir o histórico de execuções **antes** do watchdog,
porque a classificação entre transitório e real veio da memória em vez de uma
tabela; e tornar um passo de primeira classe a verificação de "produziu um número
plausível de alertas?". A detecção de anomalia de volume sobre a própria saída pega
a classe de bug em que tudo termina bem e o resultado está errado, que é justamente
a que sobrevive a todos os outros controles.

---

**A versão completa está em inglês**, com o detalhe de cada decisão e suas
contrapartidas: [An ETL that restarts itself: fraud alerts on motor insurance claims](/posts/fraud-alert-etl-resilience/).
