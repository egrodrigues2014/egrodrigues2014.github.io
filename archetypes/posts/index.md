---
# A directory archetype: `hugo new posts/my-post` creates
# content/posts/my-post/index.md, which is the page bundle Toha expects.
# Images live beside this file, and a `hero.{jpg,png,svg}` here is picked up
# automatically by helpers/get-hero.html — without one, the theme falls back to
# its own images/default-hero.jpg.
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
draft: true

# Shown on the post card, in <meta name="description"> and in the search index.
# Write it: the fallback is a truncated first paragraph, which reads badly.
description: ""

# Drives the left sidebar on post pages. `identifier` must be unique across all
# posts; `weight` orders the sidebar (ascending).
menu:
  sidebar:
    name: "{{ replace .Name "-" " " | title }}"
    identifier: {{ .Name }}
    weight: 10

tags: []
categories: []

# hero: "hero.jpg"   # only needed to point at a differently-named image
# math: true         # loads KaTeX for this page
# hidden: true        # keep out of the Recent Posts section
---

<!--
Translations live in this same directory as index.es.md and index.pt-br.md.
Posts are exempt from the cross-language parity the data/ tree enforces.

For an architecture diagram, use the theme's `mermaid` shortcode. Mermaid comes
from node_modules, so it is self-hosted and adds no third-party request. The
shortcode is not written out here because an archetype is run through the Go
template engine first, and shortcode delimiters would fail to parse.
-->
