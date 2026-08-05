---
title: "Medir la entrega sin medir a las personas"
date: 2026-08-04T23:00:00+02:00
description: "Un modelo de datos de esfuerzo, entrega, productividad y calidad para equipos de consultoría — y por qué el problema de modelado era definir métricas que aguanten la comparación entre equipos."
menu:
  sidebar:
    name: "Modelo de analítica de entrega"
    identifier: delivery-productivity-quality-model-es
    weight: 50
tags: ["Power BI", "SQL", "Data Modelling", "Analytics"]
categories: ["Business Intelligence"]
---

En [NTT DATA](https://es.nttdata.com) construí el modelo de datos para el análisis
de esfuerzo, entrega, productividad y calidad de los equipos de entrega. La parte
técnica era un esquema en estrella con dimensiones conformadas. La parte difícil es
que, en cuanto mides la entrega, la gente asume que la estás midiendo a ella — y si
el modelo lo pone fácil, tienen razón.

Cada equipo reportaba su progreso en sus propias unidades y con su propia cadencia.
Agregar eso daba un número aritméticamente válido y sin significado: puntos de
historia de equipos con escalas distintas, esfuerzo registrado contra
descomposiciones de trabajo distintas, y defectos contados con definiciones
distintas de lo que es un defecto. Lo que se pedía era una base compartida para
decidir. Lo que había que evitar era una tabla de clasificación.

{{< mermaid >}}
flowchart LR
  TIME[Registro de horas] --> STG[Staging: tipado y deduplicado]
  WORK[Items de trabajo e iteraciones] --> STG
  DEF[Defectos y resultados de test] --> STG
  REL[Releases y despliegues] --> STG
  STG --> DIM[Dimensiones conformadas: fecha, equipo, encargo, tipo de trabajo, severidad]
  STG --> FCT[Tablas de hechos: esfuerzo, entrega, defectos, releases]
  DIM --> MODEL[Modelo semantico]
  FCT --> MODEL
  MODEL --> RPT[Vista de equipo: tendencias en el tiempo]
  MODEL --> PORT[Vista de portfolio: agregados, sin ranking]
{{< /mermaid >}}

Las decisiones: **dimensiones conformadas antes que hechos**, porque sin un
calendario y una jerarquía de tipo de trabajo compartidos, cualquier pregunta que
cruce dos hechos es un join entre dos interpretaciones distintas de la misma
palabra; el coste es la parte lenta del proyecto, y es política más que técnica.
**Métricas definidas como ratios con denominador explícito** —no «velocidad» sino
unidades entregadas por unidad de esfuerzo, no «calidad» sino defectos por unidad
entregada y por severidad—, porque un numerador desnudo invita a la comparación
equivocada: un equipo con más defectos puede haber entregado cuatro veces más.
**Tendencias por equipo, agregados entre equipos, nunca un ranking**: es la
decisión que defendería con más fuerza, y es de modelado, no de informe — en cuanto
el modelo puede producir un ranking barato, alguien construye ese informe, y desde
ese momento cada dato de entrada se negocia. Y **el esfuerzo con la granularidad a
la que se registra, no más fina**: el registro de horas es honesto a nivel de
semana y tipo de trabajo, y ficción a nivel de hora y tarea.

El resultado: las conversaciones de entrega pasaron de cada equipo defendiendo sus
números a un conjunto compartido que todos reconocían, porque las definiciones eran
visibles; las preguntas entre encargos se volvieron respondibles sin reconciliación
manual; y la calidad dejó de ser un recuento de defectos y pasó a ser una tasa, lo
que cambió qué equipos parecían tener un problema — en los dos sentidos.

Lo que haría distinto: escribir **qué cosas no debe poner fáciles el modelo** al
mismo tiempo que los requisitos. La decisión de no rankear se sostuvo porque la
tomé pronto y podía señalarla; si hubiera salido seis meses después y con presión,
habría perdido.

---

**La versión completa está en inglés**, con el detalle de cada decisión y sus
contrapartidas: [Measuring delivery without measuring people](/posts/delivery-productivity-quality-model/).
