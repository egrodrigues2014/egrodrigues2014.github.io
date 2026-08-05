---
title: "Previsión de demanda que acaba en un pedido de compra"
date: 2026-08-05T00:00:00+02:00
description: "Prophet y scikit-learn en producción para planificación de demanda por delegación — y por qué lo difícil nunca fue el modelo, sino la línea base, el horizonte y que un comprador actúe."
menu:
  sidebar:
    name: "Previsión de demanda"
    identifier: demand-forecasting-purchasing-es
    weight: 40
tags: ["Python", "Prophet", "scikit-learn", "Power BI", "Forecasting"]
categories: ["Machine Learning"]
---

Una previsión sobre la que nadie actúa es un gráfico. Esta termina en una
recomendación de compra por delegación, que es mucho más difícil de construir que
el modelo que hay en el medio.

Construido en [MOD — Makers of Digital](https://mod.es) para operaciones de food
service y retail. No se nombra a ningún cliente; las cifras son relativas.

Las compras se hacían por delegación y por comprador, desde la experiencia. Eso
funciona, y funciona de forma desigual: dos delegaciones con patrones de demanda
parecidos mantenían stocks muy distintos según quién pidiera. Los síntomas estaban
en los dos extremos —roturas de stock en los artículos que importan y merma en los
perecederos— y ninguno era visible como un número del que alguien respondiera.

{{< mermaid >}}
flowchart LR
  GOLD[(Oro: hechos de venta por delegacion y articulo)] --> FEAT[Construccion de features: calendario, promociones, clima, plazos]
  FEAT --> BASE[Linea base: naive estacional]
  FEAT --> MODEL[Prophet y scikit-learn por serie]
  BASE --> EVAL[Backtest de origen movil]
  MODEL --> EVAL
  EVAL --> FC[(Tabla de prevision: articulo, delegacion, horizonte)]
  FC --> REC[Recomendacion de compra: stock, plazo, formato]
  REC --> BI[Power BI: vista del comprador]
  REC --> ALERT[Alertas para las excepciones]
{{< /mermaid >}}

Las decisiones: **la línea base va primero y tiene permiso para ganar** —antes de
cualquier modelo, un naive estacional, y cada modelo se puntúa contra él en el
mismo backtest; una minoría amplia de series se sirve mejor con la línea base, y
saber cuáles significa no mantener un modelo que no aporta nada. **Prophet donde
manda la estacionalidad y gradient boosting donde mandan las features**, con dos
familias que fallan de formas distintas y visibles: Prophet se degrada de manera
predecible, los modelos de árboles fallan con seguridad en regímenes que no han
visto. **El horizonte es el plazo de entrega, no un número redondo**: nadie puede
actuar sobre una cifra que llega después de que hubiera que hacer el pedido. **La
recomendación no es la previsión**: entre las dos están el stock actual, el formato
de pack, el mínimo de pedido, la vida útil y la asimetría entre una rotura y una
merma, que son reglas de negocio y viven donde un comprador puede verlas. Y
**backtest de origen móvil con reentrenamiento programado y versionado**, para que
una semana mala se pueda explicar en lugar de discutir.

El resultado: las compras pasaron del criterio de cada comprador a una
recomendación de la que todos parten, lo que sobre todo redujo la varianza entre
delegaciones; la merma en perecederos y las roturas en artículos core mejoraron
las dos, y por primera vez eran medibles; y la previsión tiene una precisión
declarada contra una línea base declarada.

Lo que haría distinto: llevar la línea base a producción **sola** y primero
—habría dado la mayor parte del valor en una fracción del tiempo—, e instrumentar
la decisión y no solo la predicción. La tasa de override de la recomendación
resultó ser la señal más útil, porque señala dónde están mal las reglas de negocio,
que es algo que la métrica de error no puede ver.

---

**La versión completa está en inglés**, con el detalle de cada decisión y sus
contrapartidas: [Demand forecasting that turns into a purchase order](/posts/demand-forecasting-purchasing/).
