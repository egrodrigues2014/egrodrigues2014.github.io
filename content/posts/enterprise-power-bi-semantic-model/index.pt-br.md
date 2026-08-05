---
title: "Um modelo semântico corporativo de Power BI que aguenta o contato com os usuários"
date: 2026-08-05T02:00:00+02:00
description: "Composite Import mais DirectQuery, segurança em nível de linha, atualização incremental e gateways — e os padrões DAX que evitaram reescrever o modelo a cada trimestre."
menu:
  sidebar:
    name: "Modelo semântico do Power BI"
    identifier: enterprise-power-bi-semantic-model-pt-br
    weight: 20
tags: ["Power BI", "DAX", "Azure", "Data Modelling"]
categories: ["Business Intelligence"]
---

A camada ouro de um lakehouse não é o que as pessoas usam. O que elas usam é um
modelo semântico, e a diferença entre um modelo que dura e um que é reescrito a
cada trimestre está quase toda em decisões tomadas antes da primeira medida.

Este é o modelo pelo qual respondo na [MOD — Makers of Digital](https://mod.es),
para operações de agroalimentação, varejo e food service. Nenhum cliente é
nomeado; os números são relativos.

O problema do modelo que já existia não era técnico. A camada de relatórios havia
crescido como camadas de relatórios crescem: vários `.pbix`, cada um com sua
própria cópia do calendário, sua própria definição de "cliente ativo" e seu
próprio agendamento de atualização. Dois discordavam sobre a margem, e ambos
estavam certos segundo a própria lógica. A falha real é que a definição de uma
métrica morava no arquivo que quem precisava dela abrisse.

{{< mermaid >}}
flowchart LR
  GOLD[(Esquemas estrela da camada ouro)] --> IMP[Particoes Import: historico]
  GOLD --> DQ[DirectQuery: periodo aberto]
  IMP --> MODEL[Modelo semantico composite]
  DQ --> MODEL
  MODEL --> RLS[Seguranca em nivel de linha]
  RLS --> RPT[Relatorios e apps]
  GW[Gateway on-premises] --> DQ
  PIPE[Pipelines de implantacao: dev, test, prod] --> MODEL
{{< /mermaid >}}

As decisões que sustentam o modelo: **composite Import mais DirectQuery**, com o
corte por tempo — períodos fechados são importados, o período aberto vai em
DirectQuery —, que é a que eu defenderia com mais força e também a que custa
mais, porque um modelo composite tem dois perfis de desempenho num mesmo
artefato. **Atualização incremental** particionada por mês, com a armadilha do
folding de `RangeStart`/`RangeEnd`: se os parâmetros não dobram para a origem, o
Power BI traz tudo e filtra em memória, a atualização fica mais lenta em vez de
mais rápida e nada avisa. **Segurança em nível de linha no modelo**, com o
mapeamento usuário-escopo como tabela e não como filtro DAX fixo, de modo que
acrescentar uma região seja uma mudança de dados. E **padrões DAX escolhidos por
legibilidade**: medidas base que fazem uma coisa só, variáveis sobre
subexpressões repetidas, e relações muitos-para-muitos com tabela ponte explícita
em vez de ligar o filtro bidirecional para um visual funcionar.

O resultado: uma única definição de cada métrica, então dois relatórios que
discordam passaram a ser um bug com dono em vez de uma diferença de opinião; a
duração da atualização caiu bastante quando o incremental passou a dobrar de
verdade; e os autores de relatórios pararam de modelar e passaram a compor
medidas que já existem.

O que eu faria diferente: escrever as definições das métricas na linguagem do
negócio **antes** de construir o modelo. Nós as derivamos dos relatórios
existentes, o que significou herdar suas discordâncias e resolvê-las depois, com
pressa. E testar a segurança em nível de linha desde o primeiro papel, não desde
o quinto: é a única parte de um modelo de Power BI em que um erro é um vazamento
de dados, e não um número errado.

---

**A versão completa está em inglês**, com o detalhe de cada decisão e suas
contrapartidas: [An enterprise Power BI semantic model that survives contact with users](/posts/enterprise-power-bi-semantic-model/).
