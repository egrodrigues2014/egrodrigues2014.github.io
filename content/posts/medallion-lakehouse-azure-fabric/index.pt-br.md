---
title: "Um lakehouse medallion no Azure e no Microsoft Fabric"
date: 2026-08-05T03:00:00+02:00
description: "Por que a separação bronze/prata/ouro, os modelos dbt e as cargas incrementais parametrizadas substituíram uma recarga completa noturna."
menu:
  sidebar:
    name: "Lakehouse medallion"
    identifier: medallion-lakehouse-azure-fabric-pt-br
    weight: 10
tags: ["Azure", "Microsoft Fabric", "dbt", "Apache Airflow", "Data Modelling"]
categories: ["Data Engineering"]
---

Na [MOD — Makers of Digital](https://mod.es), consultoria digital em Barcelona,
projeto e opero as plataformas de dados por trás de operações de agroalimentação,
varejo e food service. Este resumo conta a forma para a qual essas plataformas
convergiram.

Nenhum cliente é nomeado e todos os números são relativos: a arquitetura é minha
e posso descrevê-la; os dados deles, não.

O ponto de partida era o de sempre: um ERP como sistema de registro, um CRM,
algumas APIs REST e planilhas por unidade mantidas à mão. O reporting era uma
recarga completa noturna sobre um único banco de dados. Daí saíam três sintomas,
e só o primeiro é relatado como problema: a janela de atualização entrava no
horário comercial, então o dia começava com números defasados; mudar um relatório
exigia editar SQL onde ingestão, regras de negócio e apresentação viviam na mesma
view; e ninguém sabia dizer de onde vinha um número.

{{< mermaid >}}
flowchart LR
  ERP[ERP] --> ING
  CRM[CRM] --> ING
  API[APIs REST] --> ING
  OPS[(Bancos de dados operacionais)] --> ING
  ING[Ingestão: Data Factory e Airflow] --> BRONZE
  BRONZE[Bronze: bruto, somente append, ADLS Gen2] --> SILVER
  SILVER[Prata: conformado e com testes, dbt] --> GOLD
  GOLD[Ouro: esquemas estrela, Fabric e Azure SQL] --> BI[Modelo semântico do Power BI]
{{< /mermaid >}}

As três camadas são a separação medallion conhecida. O que a faz funcionar não é
a nomenclatura, e sim o contrato entre as camadas: bronze é uma zona de pouso
deliberadamente burra, porque é isso que permite corrigir um modelo e reprocessar
em vez de pedir de novo um extrato ao sistema de origem. A camada prata é onde o
dbt justifica seu lugar, com testes sobre chaves e integridade referencial e um
grafo de linhagem gerado em vez de descrito. E a camada ouro é modelada para a
pergunta, não para a origem: pode duplicar dados, porque essa é a sua função.

O resultado, em termos relativos: a janela de atualização caiu cerca de três
quartos — de um lote noturno que transbordava para a manhã a um ciclo de hora em
hora —, o gasto de computação diminuiu porque uma carga incremental lê uma fração
das linhas, e um número de relatório agora resolve para um modelo com nome e com
testes. Isso mudou as conversas mais do que a latência.

O que eu faria diferente: contratos de dados na fronteira bronze/prata desde o
primeiro dia. Nós os acrescentamos depois de uma mudança silenciosa de esquema do
ERP chegar até a prata enquanto o pipeline continuava verde. Uma execução verde e
errada é pior do que uma vermelha.

---

**A versão completa está em inglês**, com o detalhe de cada decisão e suas
contrapartidas: [A medallion lakehouse on Azure and Microsoft Fabric](/posts/medallion-lakehouse-azure-fabric/).
