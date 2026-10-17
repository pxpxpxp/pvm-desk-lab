# PVM Desk Lab

An interactive retro CRT monitor comparison and desk-fit planner.

Compare ten Sony, Olympus, JVC and Ikegami profiles using linked manufacturer documentation, explicit uncertainty labels, connection filters, a four-monitor comparison table and scaled cabinet envelopes.

## Site

Public site: https://pxpxpxp.github.io/pvm-desk-lab/

The static application is in `docs/`. Publish with GitHub Pages from the `main` branch and `/docs` folder. `.nojekyll` keeps the static files unchanged. No build step, runtime dependencies, API keys, analytics, or server database are required.

Shortlist, measurement units and planner dimensions are saved only in the visitor’s browser. The planner starts with example measurements; enter your own clear space and remaining load budget.

## Evidence

`docs/data.mjs` records sources and confidence for numerical specifications. Original manufacturer manuals and brochures, including archived copies, are linked within the site. Research checked October 17, 2026. Unknown values are left unresolved and never count as a successful fit. RGB card and adapter requirements are explicit.

The PVM-2030 VTR-input TVL rating is excluded from the common TVL filter. Some original JVC URLs are unavailable; the source records disclose the retrieval limitation. The artwork is illustrative; the planner uses cabinet envelopes, not measured feet or picture-quality simulations. Desk fit depends on your entered allowances and cannot certify ventilation or structural strength.

## Validation

Run `node --test test/*.test.mjs` or `npm test` with a modern Node.js runtime. Fourteen tests cover data/source integrity, filters, unknown handling, fit boundaries, combined layouts, conversions, saved settings and application event flows.

The rendering/event harness is not a browser. The deployed application’s filters, comparison view and desk-fit calculations were also verified in a browser on October 17, 2026. Full mobile and assistive-technology testing remains outstanding. CSS includes responsive layouts, reduced-motion support and keyboard focus styles.
