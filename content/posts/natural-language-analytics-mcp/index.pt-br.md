---
title: "Analítica em linguagem natural sobre um modelo semântico, com MCP"
date: 2026-08-05T01:00:00+02:00
description: "Conectar a API do Claude e um servidor MCP ao modelo semântico do Power BI em vez de ao banco de dados — por que essa fronteira é todo o projeto, e onde ele ainda falha."
menu:
  sidebar:
    name: "Analítica em linguagem natural"
    identifier: natural-language-analytics-mcp-pt-br
    weight: 30
tags: ["LLM", "MCP", "Power BI", "Python", "FastAPI"]
categories: ["Data Engineering"]
---

"Deixe as pessoas perguntarem aos dados em linguagem natural" é o pedido que todo
time de dados recebe, e a implementação óbvia — apontar um modelo de linguagem
para o armazém e deixá-lo escrever SQL — é a que falha em produção. Foi isto que
construí em seu lugar na [MOD — Makers of Digital](https://mod.es), com um relato
honesto do que ele não faz.

Um modelo que escreve SQL contra tabelas brutas precisa redescobrir, em cada
pergunta, tudo o que o negócio já decidiu uma vez: qual de quatro colunas de data
significa "a venda aconteceu", se devoluções saem da receita, o que torna um
cliente ativo, quais linhas são de teste. Ele dará uma resposta, e essa resposta
estará confiantemente errada de um modo que exige que quem pergunta já saiba o
número certo para perceber. É o pior modo de falha possível numa ferramenta cujo
propósito é ajudar quem não sabe.

A fronteira que funciona é o modelo semântico, porque ele já contém essas
decisões: a margem é uma medida com definição, o calendário sabe o que é um
trimestre fiscal, e a segurança em nível de linha sabe o que este usuário pode
ver. Então o modelo de linguagem não consulta o banco: consulta o modelo
semântico, por ferramentas cuja superfície são as medidas e dimensões que existem.

{{< mermaid >}}
flowchart LR
  USER[Pergunta em linguagem natural] --> API[Servico FastAPI]
  API --> LLM[API do Claude]
  LLM --> MCP[Servidor MCP: metadados e consulta]
  MCP --> SM[Modelo semantico do Power BI]
  SM --> RLS[A seguranca em nivel de linha se aplica aqui]
  MCP --> LLM
  LLM --> ANS[Resposta com a consulta e as medidas usadas]
  ANS --> USER
{{< /mermaid >}}

As decisões: **a superfície de ferramentas é a barreira, não o prompt** — um
prompt pedindo cautela é uma sugestão; uma ferramenta que só avalia medidas
existentes é uma restrição, e se uma pergunta exige uma métrica que ninguém
definiu, o correto é o sistema dizer isso em vez de inventar uma aritmética
plausível. **A segurança fica onde já estava**: as consultas rodam como o usuário
que pergunta, então a segurança em nível de linha se aplica sem o servidor MCP
saber nada sobre permissões. **Toda resposta mostra seu trabalho**, com o DAX que
a produziu e as medidas envolvidas. E **é um serviço, não uma janela de chat**:
acessível pelas ferramentas que as pessoas já têm abertas, o que na prática
significa bots de Slack e Telegram, não mais um portal para entrar.

Onde ainda falha: perguntas ambíguas recebem uma interpretação em vez de um
pedido de esclarecimento; perguntas comparativas e de vários passos se degradam, e
a falha é silenciosa; e a cobertura é limitada pelo modelo semântico, o que é uma
virtude até alguém precisar do número que ninguém modelou.

O que eu faria diferente: escrever as descrições das medidas **para o modelo**, não
para o tooltip — a qualidade das respostas depende muito mais dos metadados do que
do prompt —, e registrar as perguntas desde o primeiro dia. A lista de coisas que
as pessoas perguntaram e o modelo semântico não soube responder acabou sendo o
melhor backlog de modelagem que já tive.

---

**A versão completa está em inglês**, com o detalhe de cada decisão e suas
contrapartidas: [Natural-language analytics over a semantic model, with MCP](/posts/natural-language-analytics-mcp/).
