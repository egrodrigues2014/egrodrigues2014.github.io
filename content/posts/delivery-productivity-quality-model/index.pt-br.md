---
title: "Medir a entrega sem medir as pessoas"
date: 2026-08-04T23:00:00+02:00
description: "Um modelo de dados de esforço, entrega, produtividade e qualidade para times de consultoria — e por que o problema de modelagem era definir métricas que aguentem a comparação entre times."
menu:
  sidebar:
    name: "Modelo de analítica de entrega"
    identifier: delivery-productivity-quality-model-pt-br
    weight: 50
tags: ["Power BI", "SQL", "Data Modelling", "Analytics"]
categories: ["Business Intelligence"]
---

Na [NTT DATA](https://es.nttdata.com) construí o modelo de dados para a análise de
esforço, entrega, produtividade e qualidade dos times de entrega. A parte técnica
era um esquema estrela com dimensões conformadas. A parte difícil é que, no momento
em que você mede a entrega, as pessoas presumem que você está medindo elas — e se o
modelo facilita isso, elas estão certas.

Cada time reportava seu progresso nas próprias unidades e na própria cadência.
Agregar isso dava um número aritmeticamente válido e sem significado: story points
de times com escalas diferentes, esforço registrado contra decomposições de
trabalho diferentes, e defeitos contados com definições diferentes do que é um
defeito. O que se pedia era uma base compartilhada para decidir. O que era preciso
evitar era uma tabela de classificação.

{{< mermaid >}}
flowchart LR
  TIME[Registro de horas] --> STG[Staging: tipado e deduplicado]
  WORK[Itens de trabalho e iteracoes] --> STG
  DEF[Defeitos e resultados de teste] --> STG
  REL[Releases e implantacoes] --> STG
  STG --> DIM[Dimensoes conformadas: data, time, contrato, tipo de trabalho, severidade]
  STG --> FCT[Tabelas fato: esforco, entrega, defeitos, releases]
  DIM --> MODEL[Modelo semantico]
  FCT --> MODEL
  MODEL --> RPT[Visao do time: tendencias no tempo]
  MODEL --> PORT[Visao de portfolio: agregados, sem ranking]
{{< /mermaid >}}

As decisões: **dimensões conformadas antes dos fatos**, porque sem um calendário e
uma hierarquia de tipo de trabalho compartilhados, qualquer pergunta que cruze dois
fatos é um join entre duas interpretações diferentes da mesma palavra; o custo é a
parte lenta do projeto, e é política mais do que técnica. **Métricas definidas como
razões com denominador explícito** — não "velocidade", mas unidades entregues por
unidade de esforço; não "qualidade", mas defeitos por unidade entregue e por
severidade —, porque um numerador nu convida à comparação errada: um time com mais
defeitos pode ter entregue quatro vezes mais. **Tendências por time, agregados
entre times, nunca um ranking**: é a decisão que eu defenderia com mais força, e é
de modelagem, não de relatório — quando o modelo consegue produzir um ranking
barato, alguém constrói esse relatório, e a partir daí cada dado de entrada passa a
ser negociado. E **o esforço na granularidade em que é registrado, não mais fina**:
o registro de horas é honesto no nível de semana e tipo de trabalho, e ficção no
nível de hora e tarefa.

O resultado: as conversas de entrega saíram de cada time defendendo seus números
para um conjunto compartilhado que todos reconheciam, porque as definições eram
visíveis; perguntas entre contratos passaram a ser respondíveis sem reconciliação
manual; e a qualidade deixou de ser uma contagem de defeitos e passou a ser uma
taxa, o que mudou quais times pareciam ter um problema — nos dois sentidos.

O que eu faria diferente: escrever **o que o modelo não deve facilitar** ao mesmo
tempo que os requisitos. A decisão de não ranquear se sustentou porque eu a tomei
cedo e podia apontá-la; se tivesse surgido seis meses depois, sob pressão, teria
perdido.

---

**A versão completa está em inglês**, com o detalhe de cada decisão e suas
contrapartidas: [Measuring delivery without measuring people](/posts/delivery-productivity-quality-model/).
