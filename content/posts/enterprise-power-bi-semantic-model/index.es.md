---
title: "Un modelo semántico de Power BI corporativo que aguanta el contacto con los usuarios"
date: 2026-08-05T02:00:00+02:00
description: "Composite Import más DirectQuery, seguridad a nivel de fila, refresco incremental y gateways — y los patrones DAX que evitaron reescribir el modelo cada trimestre."
menu:
  sidebar:
    name: "Modelo semántico de Power BI"
    identifier: enterprise-power-bi-semantic-model-es
    weight: 20
tags: ["Power BI", "DAX", "Azure", "Data Modelling"]
categories: ["Business Intelligence"]
---

La capa de oro de un lakehouse no es lo que usa la gente. Lo que usa es un modelo
semántico, y la diferencia entre un modelo que dura y uno que se reescribe cada
trimestre está casi entera en decisiones tomadas antes de escribir la primera
medida.

Este es el modelo del que soy responsable en
[MOD — Makers of Digital](https://mod.es), para operaciones de agroalimentación,
retail y food service. No se nombra a ningún cliente; las cifras son relativas.

El problema del modelo que ya existía no era técnico. La capa de informes había
crecido como crecen las capas de informes: varios `.pbix`, cada uno con su propia
copia del calendario, su propia definición de «cliente activo» y su propio
horario de refresco. Dos discrepaban en el margen, y los dos tenían razón según
su propia lógica. El fallo real es que la definición de una métrica vivía en el
fichero que abriera quien la necesitaba.

{{< mermaid >}}
flowchart LR
  GOLD[(Esquemas en estrella de la capa oro)] --> IMP[Particiones Import: historico]
  GOLD --> DQ[DirectQuery: periodo abierto]
  IMP --> MODEL[Modelo semantico composite]
  DQ --> MODEL
  MODEL --> RLS[Seguridad a nivel de fila]
  RLS --> RPT[Informes y apps]
  GW[Gateway on-premises] --> DQ
  PIPE[Pipelines de despliegue: dev, test, prod] --> MODEL
{{< /mermaid >}}

Las decisiones que sostienen el modelo: **composite Import más DirectQuery**, con
el corte por tiempo —los periodos cerrados se importan, el periodo abierto va en
DirectQuery—, que es la que defendería con más fuerza y también la que más cuesta,
porque un modelo composite tiene dos perfiles de rendimiento en un mismo
artefacto. **Refresco incremental** particionado por mes, con la trampa del
folding de `RangeStart`/`RangeEnd`: si los parámetros no plegan hacia el origen,
Power BI se trae todo y filtra en memoria, el refresco se vuelve más lento en
lugar de más rápido y nada te avisa. **Seguridad a nivel de fila en el modelo**,
con el mapeo usuario-ámbito como tabla y no como filtro DAX fijo, de modo que
añadir una región es un cambio de datos. Y **patrones DAX elegidos por
legibilidad**: medidas base que hacen una sola cosa, variables sobre
subexpresiones repetidas, y las relaciones muchos-a-muchos con tabla puente
explícita en lugar de activar el filtrado bidireccional para que un visual
funcione.

El resultado: una única definición de cada métrica, así que dos informes que
discrepan pasaron a ser un bug con dueño en lugar de una diferencia de opinión;
la duración del refresco cayó de forma notable en cuanto el incremental plegó de
verdad; y los autores de informes dejaron de modelar y empezaron a componer
medidas que ya existen.

Lo que haría distinto: escribir las definiciones de las métricas en el lenguaje
del negocio **antes** de construir el modelo. Las derivamos de los informes
existentes, lo que significó heredar sus discrepancias y resolverlas después con
prisa. Y probar la seguridad a nivel de fila desde el primer rol, no desde el
quinto: es la única parte de un modelo de Power BI donde un error es una fuga de
datos y no un número mal.

---

**La versión completa está en inglés**, con el detalle de cada decisión y sus
contrapartidas: [An enterprise Power BI semantic model that survives contact with users](/posts/enterprise-power-bi-semantic-model/).
