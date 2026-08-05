/*
  LOCAL OVERRIDE of the theme's assets/scripts/sections/projects.js.

  Copied verbatim from github.com/hugo-toha/toha/v4 @ THEME-VERSION: v4.16.0,
  with one deletion: the module no longer inserts
  https://buttons.github.io/buttons.js.

  Why this needed owning rather than configuring: upstream calls

      insertScript('github-buttons', 'https://buttons.github.io/buttons.js')

  at MODULE scope, outside the DOMContentLoaded handler and outside any check for
  whether a project actually declares `repo:`. assets/scripts/application.js
  imports './sections' unconditionally, so that request went out on every page of
  the site — home, posts, 404 — whether or not a GitHub star button existed to
  populate. Verified in the DOM: <script id="github-buttons"
  src="https://buttons.github.io/buttons.js"> was present on the home page while
  no project used `repo:` and no .github-button element was rendered.

  Leaving it would have contradicted the privacy decisions already taken here:
  analytics disabled, the embedpdf feature disabled specifically to stop a
  pdf.js request to jsDelivr, and all 25 skill marks self-hosted rather than
  pulled from a CDN. A star counter nothing uses is not worth an exception.

  Consequence to remember: if a `repo:` is ever added to projects.yaml, its star
  button will render as an empty <a class="github-button"> because the script
  that hydrates it is gone. Either restore the line for that case or keep using
  `url:`.

  Shadowing works the same way assets/styles/override.scss does — the project's
  assets/ takes precedence over the theme's for an identical path, so no template
  is involved. scripts/check-overrides.mjs covers this directory too, so the
  THEME-VERSION marker above is checked against go.mod like the layout copies.
*/
import Filterizr from 'filterizr'

document.addEventListener('DOMContentLoaded', () => {
  // ================== Project cards =====================

  // setup project filter buttons for all project sections
  const projectContainers = document.querySelectorAll('.filtr-projects')
  projectContainers.forEach((container) => {
    const sectionId = container.getAttribute('data-section')
    const cardHolder = document.getElementById(`project-card-holder-${sectionId}`)
    if (cardHolder != null && cardHolder.children.length !== 0) {
      // Create a unique selector for this section's controls
      const controlsSelector = `.project-filtr-control[data-section="${sectionId}"]`
      // eslint-disable-next-line no-new
      new Filterizr(container, {
        layout: 'sameWidth',
        controlsSelector
      })
    }
  })
})
