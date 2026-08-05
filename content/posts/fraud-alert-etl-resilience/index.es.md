---
title: "Un ETL que se reinicia solo: alertas de fraude en siniestros de auto"
date: 2026-08-04T22:00:00+02:00
description: "La generación de alertas de fraude de punta a punta, y el sistema de reinicio automático que convirtió una llamada a las 3 de la mañana en una línea de log."
menu:
  sidebar:
    name: "ETL de fraude auto-recuperable"
    identifier: fraud-alert-etl-resilience-es
    weight: 60
tags: ["SAS", "SQL", "Linux", "ETL", "Data Quality"]
categories: ["Data Engineering"]
---

En [PeRTICA Análisis Estadísticos](https://www.pertica.es), partner de SAS y
consultora analítica para seguros y banca, fui responsable de punta a punta del
proceso de generación de alertas de fraude para siniestros de auto: desde los datos
origen hasta la alerta sobre la que actúa un investigador.

Lo interesante no es el scoring. Es que el proceso tenía que terminar antes de que
empezara la jornada, todos los días, y durante mucho tiempo no lo hacía. Era una
cadena nocturna: extraer siniestros y pólizas, conformar, aplicar las reglas de
alerta y producir una cola priorizada para el equipo de investigación. Si fallaba a
las 3 de la mañana, alguien recibía una llamada, averiguaba dónde se había parado,
limpiaba el estado a medio escribir y lo reiniciaba. Si no había llamada, el equipo
llegaba a una cola vacía. Las dos cosas cuestan lo mismo: un día de capacidad de
investigación en un proceso cuyo valor depende del tiempo, porque un siniestro es
más fácil de investigar antes de pagarlo.

{{< mermaid >}}
flowchart LR
  CLM[(Siniestros)] --> EXT[Extraccion con marca de agua por origen]
  POL[(Polizas e intervinientes)] --> EXT
  HIST[(Historico de siniestros)] --> EXT
  EXT --> CONF[Conformado y validacion]
  CONF --> RULES[Reglas de alerta y scoring]
  RULES --> QUEUE[(Cola de alertas priorizada)]
  QUEUE --> INV[Investigadores]
  WD[Watchdog: checkpoints, reintentos, escalado] --> EXT
  WD --> CONF
  WD --> RULES
{{< /mermaid >}}

Las decisiones: **cada paso es idempotente o no es un paso** —se escribe en un
destino de staging y se intercambia, nunca se hace append en sitio, y toda salida
está claveada para que una reejecución sustituya en lugar de duplicar—; es más
código y más almacenamiento, y es lo único que hace seguro el reinicio automático,
porque reintentar un paso no idempotente es peor que fallar: produce alertas
duplicadas, y un investigador que deja de fiarse de la cola es peor resultado que
una cola vacía. **Checkpoints en las fronteras entre pasos, no dentro de un paso**:
la contabilidad de un checkpoint fino crece más rápido que el tiempo que ahorra, y
esa contabilidad es a su vez algo que puede estar mal. **Distinguir lo transitorio
de lo real y escalar la diferencia**: una tabla bloqueada o una conexión caída se
reintentan con backoff; un fallo de validación o un recuento de filas fuera de
banda paran y escalan. Equivocarse en esa clasificación en cualquiera de los dos
sentidos es el modo de fallo principal. **Monitorizar la plataforma, no solo el
job**: la mayoría de las llamadas de las 3 de la mañana tenían un aviso veinte
minutos antes que nadie estaba leyendo. Y **el tuning vino después de la
fiabilidad**, no antes: un proceso rápido que falla sigue siendo un proceso fallido.

El resultado: los fallos nocturnos dejaron de producir llamadas y empezaron a
producir líneas de log, y la recuperación que antes hacía una persona pasó a ser el
camino normal; la cola de alertas estaba lista antes de que llegara el equipo, de
forma consistente; y el tiempo de ejecución bajó de forma apreciable con reescritura
de consultas y planificación, lo que sobre todo compró margen para los reintentos.

Lo que haría distinto: construir el histórico de ejecuciones **antes** del watchdog,
porque la clasificación entre transitorio y real salió de la memoria en lugar de de
una tabla; y convertir en un paso de primera clase la comprobación de «¿ha producido
un número plausible de alertas?». La detección de anomalías de volumen sobre tu
propia salida caza la clase de bug en la que todo termina bien y el resultado está
mal, que es justo la que sobrevive a todos los demás controles.

---

**La versión completa está en inglés**, con el detalle de cada decisión y sus
contrapartidas: [An ETL that restarts itself: fraud alerts on motor insurance claims](/posts/fraud-alert-etl-resilience/).
