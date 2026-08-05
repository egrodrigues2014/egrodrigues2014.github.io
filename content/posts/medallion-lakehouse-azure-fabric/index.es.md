---
title: "Un lakehouse medallion en Azure y Microsoft Fabric"
date: 2026-08-05T03:00:00+02:00
description: "Por qué la separación bronce/plata/oro, los modelos dbt y las cargas incrementales parametrizadas sustituyeron a una recarga completa nocturna."
menu:
  sidebar:
    name: "Lakehouse medallion"
    identifier: medallion-lakehouse-azure-fabric-es
    weight: 10
tags: ["Azure", "Microsoft Fabric", "dbt", "Apache Airflow", "Data Modelling"]
categories: ["Data Engineering"]
---

En [MOD — Makers of Digital](https://mod.es), consultora digital en Barcelona,
diseño y opero las plataformas de datos que hay detrás de operaciones de
agroalimentación, retail y food service. Este resumen cuenta la forma a la que
esas plataformas convergieron.

No se nombra a ningún cliente y todas las cifras son relativas: la arquitectura
es mía y puedo describirla; sus datos, no.

El punto de partida era el habitual: un ERP como sistema de registro, un CRM,
varias APIs REST y hojas de cálculo por delegación mantenidas a mano. El
reporting era una recarga completa nocturna sobre una única base de datos. De
ahí salían tres síntomas, y solo el primero se reporta como problema: la ventana
de refresco se metía en horario laboral, así que la jornada empezaba con cifras
desactualizadas; cambiar un informe obligaba a editar SQL donde ingesta, reglas
de negocio y presentación vivían en la misma vista; y nadie podía decir de dónde
venía un número.

{{< mermaid >}}
flowchart LR
  ERP[ERP] --> ING
  CRM[CRM] --> ING
  API[APIs REST] --> ING
  OPS[(Bases de datos operacionales)] --> ING
  ING[Ingesta: Data Factory y Airflow] --> BRONZE
  BRONZE[Bronce: crudo, solo append, ADLS Gen2] --> SILVER
  SILVER[Plata: conformado y con tests, dbt] --> GOLD
  GOLD[Oro: esquemas en estrella, Fabric y Azure SQL] --> BI[Modelo semántico de Power BI]
{{< /mermaid >}}

Las tres capas son la separación medallion de siempre. Lo que la hace funcionar
no es la nomenclatura, sino el contrato entre capas: bronce es una zona de
aterrizaje deliberadamente tonta, porque es lo que permite corregir un modelo y
reprocesar en lugar de volver a pedir un extracto al sistema origen. La capa de
plata es donde dbt se gana su sitio, con tests sobre claves e integridad
referencial y un grafo de linaje generado en lugar de descrito. Y la capa de oro
se modela para la pregunta, no para el origen: se le permite duplicar datos,
porque eso es su función.

El resultado, en relativo: la ventana de refresco bajó en torno a tres cuartos
—de un lote nocturno que se desbordaba a la mañana a un ciclo horario—, el gasto
de cómputo cayó porque una carga incremental lee una fracción de las filas, y un
número de un informe resuelve ahora a un modelo con nombre y con tests. Eso
cambió las conversaciones más que la latencia.

Lo que haría distinto: contratos de datos en la frontera bronce/plata desde el
primer día. Los añadimos después de que un cambio silencioso de esquema del ERP
llegara hasta plata mientras el pipeline seguía en verde. Una ejecución verde y
equivocada es peor que una roja.

---

**La versión completa está en inglés**, con el detalle de cada decisión y sus
contrapartidas: [A medallion lakehouse on Azure and Microsoft Fabric](/posts/medallion-lakehouse-azure-fabric/).
