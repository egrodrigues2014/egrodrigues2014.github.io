---
title: "Previsão de demanda que termina em um pedido de compra"
date: 2026-08-05T00:00:00+02:00
description: "Prophet e scikit-learn em produção para planejamento de demanda por unidade — e por que o difícil nunca foi o modelo, mas a linha de base, o horizonte e fazer um comprador agir."
menu:
  sidebar:
    name: "Previsão de demanda"
    identifier: demand-forecasting-purchasing-pt-br
    weight: 40
tags: ["Python", "Prophet", "scikit-learn", "Power BI", "Forecasting"]
categories: ["Machine Learning"]
---

Uma previsão sobre a qual ninguém age é um gráfico. Esta termina em uma
recomendação de compra por unidade, que é bem mais difícil de construir do que o
modelo que fica no meio.

Construído na [MOD — Makers of Digital](https://mod.es) para operações de food
service e varejo. Nenhum cliente é nomeado; os números são relativos.

As compras eram feitas por unidade e por comprador, com base na experiência. Isso
funciona, e funciona de forma desigual: duas unidades com padrões de demanda
parecidos mantinham estoques muito diferentes conforme quem pedia. Os sintomas
estavam nos dois extremos — falta de estoque nos itens que importam e perda nos
perecíveis — e nenhum era visível como um número de que alguém respondesse.

{{< mermaid >}}
flowchart LR
  GOLD[(Ouro: fatos de venda por unidade e item)] --> FEAT[Construcao de features: calendario, promocoes, clima, prazos]
  FEAT --> BASE[Linha de base: naive sazonal]
  FEAT --> MODEL[Prophet e scikit-learn por serie]
  BASE --> EVAL[Backtest de origem movel]
  MODEL --> EVAL
  EVAL --> FC[(Tabela de previsao: item, unidade, horizonte)]
  FC --> REC[Recomendacao de compra: estoque, prazo, embalagem]
  REC --> BI[Power BI: visao do comprador]
  REC --> ALERT[Alertas para as excecoes]
{{< /mermaid >}}

As decisões: **a linha de base vem primeiro e tem permissão para ganhar** — antes
de qualquer modelo, um naive sazonal, e cada modelo é pontuado contra ele no mesmo
backtest; uma minoria ampla de séries é melhor atendida pela linha de base, e
saber quais significa não manter um modelo que não acrescenta nada. **Prophet onde
a sazonalidade manda e gradient boosting onde as features mandam**, com duas
famílias que falham de formas diferentes e visíveis: o Prophet se degrada de modo
previsível, modelos de árvore falham com confiança em regimes que nunca viram. **O
horizonte é o prazo de entrega, não um número redondo**: ninguém age sobre um
número que chega depois de o pedido ter de ser feito. **A recomendação não é a
previsão**: entre as duas estão o estoque atual, a embalagem, o pedido mínimo, a
validade e a assimetria entre uma falta e uma perda, que são regras de negócio e
moram onde um comprador pode vê-las. E **backtest de origem móvel com
retreinamento agendado e versionado**, para que uma semana ruim possa ser
explicada em vez de discutida.

O resultado: as compras saíram do critério de cada comprador para uma recomendação
da qual todos partem, o que sobretudo reduziu a variância entre unidades; a perda
em perecíveis e a falta em itens core melhoraram as duas, e pela primeira vez eram
mensuráveis; e a previsão tem uma precisão declarada contra uma linha de base
declarada.

O que eu faria diferente: levar a linha de base para produção **sozinha** e
primeiro — teria entregado a maior parte do valor numa fração do tempo — e
instrumentar a decisão, não apenas a predição. A taxa de override da recomendação
acabou sendo o sinal mais útil, porque aponta onde as regras de negócio estão
erradas, o que a métrica de erro não consegue ver.

---

**A versão completa está em inglês**, com o detalhe de cada decisão e suas
contrapartidas: [Demand forecasting that turns into a purchase order](/posts/demand-forecasting-purchasing/).
