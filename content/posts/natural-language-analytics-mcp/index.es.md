---
title: "Analítica en lenguaje natural sobre un modelo semántico, con MCP"
date: 2026-08-05T01:00:00+02:00
description: "Conectar la API de Claude y un servidor MCP al modelo semántico de Power BI en lugar de a la base de datos — por qué esa frontera es todo el diseño, y dónde sigue fallando."
menu:
  sidebar:
    name: "Analítica en lenguaje natural"
    identifier: natural-language-analytics-mcp-es
    weight: 30
tags: ["LLM", "MCP", "Power BI", "Python", "FastAPI"]
categories: ["Data Engineering"]
---

«Que la gente pueda preguntarle a los datos en lenguaje natural» es la petición
que recibe todo equipo de datos, y la implementación obvia —apuntar un modelo de
lenguaje al almacén y dejar que escriba SQL— es la que falla en producción. Esto
es lo que construí en su lugar en [MOD — Makers of Digital](https://mod.es), y un
relato honesto de lo que no hace.

Un modelo que escribe SQL contra tablas crudas tiene que redescubrir, en cada
pregunta, todo lo que el negocio ya decidió una vez: cuál de cuatro columnas de
fecha significa «la venta ocurrió», si las devoluciones se excluyen de los
ingresos, qué hace que un cliente esté activo, qué filas son de prueba. Dará una
respuesta, y esa respuesta será confiadamente errónea de un modo que exige que
quien pregunta ya sepa el número correcto para darse cuenta. Es el peor modo de
fallo posible en una herramienta cuyo propósito es ayudar a quien no lo sabe.

La frontera que sí funciona es el modelo semántico, porque ya contiene esas
decisiones: el margen es una medida con definición, el calendario sabe qué es un
trimestre fiscal, y la seguridad a nivel de fila sabe qué puede ver este usuario.
Así que el modelo de lenguaje no consulta la base de datos: consulta el modelo
semántico, a través de herramientas cuya superficie son las medidas y dimensiones
que existen.

{{< mermaid >}}
flowchart LR
  USER[Pregunta en lenguaje natural] --> API[Servicio FastAPI]
  API --> LLM[API de Claude]
  LLM --> MCP[Servidor MCP: metadatos y consulta]
  MCP --> SM[Modelo semantico de Power BI]
  SM --> RLS[La seguridad a nivel de fila se aplica aqui]
  MCP --> LLM
  LLM --> ANS[Respuesta con la consulta y las medidas usadas]
  ANS --> USER
{{< /mermaid >}}

Las decisiones: **la superficie de herramientas es la barrera, no el prompt** —un
prompt que pide prudencia es una sugerencia; una herramienta que solo puede
evaluar medidas que existen es una restricción, y si una pregunta necesita una
métrica que nadie definió, lo correcto es que el sistema lo diga en lugar de
inventar una aritmética verosímil. **La seguridad se queda donde ya estaba**: las
consultas se ejecutan como el usuario que pregunta, así que la seguridad a nivel
de fila se aplica sin que el servidor MCP sepa nada de permisos. **Cada respuesta
muestra su trabajo**, con el DAX que la produjo y las medidas implicadas. Y **es
un servicio, no una ventana de chat**: accesible desde las herramientas que la
gente ya tiene abiertas, que en la práctica son bots de Slack y Telegram y no otro
portal en el que entrar.

Dónde sigue fallando: las preguntas ambiguas reciben una interpretación en lugar
de una aclaración; las preguntas comparativas y de varios pasos se degradan, y el
fallo es silencioso; y la cobertura está limitada por el modelo semántico, lo cual
es una virtud hasta que alguien necesita el número que nadie modeló.

Lo que haría distinto: escribir las descripciones de las medidas **para el
modelo**, no para el tooltip —la calidad de las respuestas depende mucho más de
los metadatos que del prompt—, y registrar las preguntas desde el primer día. La
lista de cosas que la gente preguntó y el modelo semántico no supo responder
resultó ser el mejor backlog de modelado que he tenido.

---

**La versión completa está en inglés**, con el detalle de cada decisión y sus
contrapartidas: [Natural-language analytics over a semantic model, with MCP](/posts/natural-language-analytics-mcp/).
