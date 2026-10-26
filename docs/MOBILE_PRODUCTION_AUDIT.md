# Mobile performance and production release — 2026-10-26

Baseline source: `b358c90b6c50cdf5dd818d082e6f3a2683aecff1` on main, also reported by the current Vercel production deployment. Vercel confirms Git deployments from this repository; merging main may automatically publish. No deployment API, promotion, DNS or protection setting is changed by this work.

## Public baseline

[PageSpeed Insights mobile report](https://pagespeed.web.dev/analysis/https-www-donturron-com-mx/vri56rp9a5?form_factor=mobile), October 26, 2026, 15:56 Mexico City: performance 78, FCP 2.7 s, LCP 4.2 s (calculator: 4241 ms), TBT 30 ms, CLS 0.013, Speed Index 5.0 s. Lighthouse 13.5.0, emulated Moto G Power, simulated Slow 4G. CrUX reports no field data. These are laboratory observations, not a measurement on a physical phone or a guarantee for every network.

LCP element: `.hero-photo`. The report identifies about 1950 ms of element render delay, 1380 ms potential render-blocking savings, and 450 KiB estimated image savings. The original emblem is 235064 bytes, and the original monogram is 70399 bytes. All original product photography remains intact.

## Implementation

- A native responsive picture delivers the emblem in AVIF with a WebP fallback; WebP derivatives serve the transparent monogram and first photograph of each product; originals remain available to galleries and zoom. Cards retain native lazy loading and use 320/640 px variants after filtering as well as in static HTML.
- One stylesheet with exactly the original cascade order instead of three requests. The three exact Latin variable font binaries observed in the baseline are served locally and preloaded. Their glyph coverage (including Spanish), weight axes and SHA-256 were verified with fontTools; the unmodified fonts retain their OFL licenses. This removes the external font CSS/request chain while preserving typography. Both asynchronous external loading (CLS 0.115) and blocking external loading (LCP 3.76 s) were rejected before merge.
- Essential mobile hero elements no longer wait for entrance animations. Desktop styling and motion remain available. The hidden duplicate emblem image was removed.
- Carousel loading/priority hints are set before assigning image sources. No gallery prefetch is added to the initial path. Selection storage, quantities, WhatsApp number and message construction are retained.
- Production metadata is generated from `semantic-release.json`. Canonicals, JSON-LD references and a ten-route sitemap use `https://www.donturron.com.mx`, confirmed by Vercel project-domain records. The apex redirects to www. No alternate domain is invented.
- `enableIndexing` is enabled. `enableCommerce`, `publishOffers` and `indexNow` remain false: no checkout or IndexNow service exists, and publication alone does not validate structured offers or stock. Telemetry remains opt-in and disabled without a configured backend. Planned January 2027 products keep their planned status; no tobacco sale, rating, certification or stock claim is introduced.

## Verification and limits

The local environment denies listening sockets, browser processes and outbound shell network access. Static generation, artifact validation, JavaScript syntax and non-network telemetry tests can run locally. GitHub Actions runs the existing visual/interaction suite, HTTP mobile checks, no-JS routes, favicon/footer checks, receiver tests, and three cold Lighthouse runs per source on the same runner. A CLS budget of 0.1 guards visual stability. Raw JSON reports and screenshots are retained as `mobile-evidence`. The script prints all samples and medians; local HTTP comparisons exclude CDN conditions. Public PageSpeed measurement must be repeated after the automatically deployed SHA is confirmed. The <3 s objective applies to LCP/essential content; below-fold images intentionally load on demand.
