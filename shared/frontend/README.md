# shared/frontend — single source of truth for duplicated storefront code

The 7 storefronts are **separate Vercel projects**, each with its Root Directory
set to its own brand folder. A build for `Morbix/` cannot import files outside
`Morbix/`, so the brands cannot share a normal npm/workspace package without
changing Vercel dashboard settings on all 7 projects at once (risky, and there
is no staging environment to catch a mistake).

Instead, code that would otherwise be copy-pasted into every brand lives here
**once**, and a codegen script stamps a per-brand copy into each storefront.
Every brand still owns its file on disk, so each Vercel build is byte-identical
to before — **zero deploy risk** — while there is only one place to edit.

## Files

| Canonical | Copied into | Brands |
|---|---|---|
| `pixel.js` | `<brand>/[src/]utils/pixel.js` | Gripzus, Morbix, Soxbae, Knitwink, Velmique, Velquira |
| `SentryInit.jsx` | `<brand>/[src/]components/SentryInit.jsx` | all 7 |

`__BRAND__` in a canonical file is replaced with the brand slug at sync time.
Crosscoin uses its own tracking layer, so it is excluded from `pixel.js`.

## Workflow

1. Edit the canonical file here.
2. Run: `node scripts/sync-frontend-shared.mjs`
3. Commit the regenerated brand copies (they carry a `@generated` banner).

Do **not** hand-edit the generated `pixel.js` / `SentryInit.jsx` in a brand
folder — the next sync overwrites it. `node scripts/sync-frontend-shared.mjs --check`
fails if any copy has drifted (useful in CI).

## Google Tag Manager

`GoogleTagManager.jsx` and `googleTagManager.mjs` are copied into Morbix, Gripzus,
Soxbae, Knitwink, Velmique and Velquira. Crosscoin keeps
its existing server-rendered GTM bootstrap in `src/pages/_document.jsx`.

Set each brand's own `GTM_ID` (`GTM-…`) in Brand Settings. Missing IDs leave
GTM off. Advanced Consent Mode loads configured Google tags even before a
choice or after rejection, with analytics storage denied unless analytics is
accepted. Ad storage, ad user data and ad personalization are denied unless
marketing is accepted. Google may send limited cookieless measurement signals.
Custom tags in each GTM container must have appropriate consent checks.

Direct GA4, Meta and Clarity initialization is retained. Do not install the
same destinations again inside GTM without migrating their direct setup, or
events may be duplicated. No unconditional noscript iframe is added to the
client-loaded containers, since it cannot respect the stored consent choice.

Validate after deployment with Tag Assistant: check the brand's own container
ID, verify denied storage after rejection, then granted storage after acceptance.
