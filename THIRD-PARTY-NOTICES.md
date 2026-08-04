# Third-party notices

This site is built on work by other people. Their licences are reproduced here
because they require it, and because the credit is owed regardless.

## Toha theme

The site is built with [Toha](https://github.com/hugo-toha/toha), consumed as a
Hugo module and therefore not vendored into this repository. Two of its partials
*are* copied here verbatim, though, because the theme offers no extension point
for what they needed to do:

- `layouts/partials/opengraph.html` — copied so `hreflang` and the pre-launch
  `noindex` meta could be added to every page, including the home, which the
  theme renders through a standalone template that bypasses `baseof`.
- `layouts/partials/cards/accomplishments.html` — copied to add an issuer mark
  before each organisation name.

Both carry a `THEME-VERSION` marker, and `scripts/check-overrides.mjs` fails the
build if the theme is upgraded without the copies being re-diffed.

```
MIT License

Copyright (c) 2020 hugo-toha

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Landing page background

`assets/images/site/background.jpg` is still the image that shipped with the
theme's example site, and it requires attribution:

> Business vector created by studiogstock —
> [www.freepik.com](https://www.freepik.com/vectors/business)

This attribution stays as long as that file is in use. It is scheduled for
replacement along with the rest of the branding; when the file goes, this section
goes with it.

The site logo and favicon under `assets/images/site/` are likewise still the
theme's, pending the same replacement.

## Icons

- **Font Awesome Free** 6.7.2 — icons under CC BY 4.0, fonts under SIL OFL 1.1,
  code under MIT. Bundled through the theme's npm dependencies.
- **Simple Icons** — `assets/icons/{datacamp,udemy,anthropic}.svg`, released into
  the public domain under CC0 1.0. Each file was modified only to add
  `fill="currentColor"` and `em`-based dimensions so the mark follows the
  surrounding text colour and size.

The brands those marks represent remain trademarks of their respective owners.
They appear here nominatively — to identify the issuer of a credential actually
held — and imply no endorsement.

## Credential badges

`static/files/badges/` holds the badge artwork for credentials held by the site's
author, published by DataCamp and Microsoft. Redistributed here rather than
hotlinked so that a change to an issuer URL cannot break the page silently. The
marks belong to their respective owners.

## Fonts

**Mulish**, via `@fontsource/mulish`, under SIL OFL 1.1. Self-hosted through the
theme's mounts rather than loaded from a third-party CDN.
