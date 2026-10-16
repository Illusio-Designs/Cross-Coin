// CrossCoin "Mint" design system CSS — extracted verbatim from the approved
// storefront design artifact, injected globally while a /test page is mounted
// (see TestLayout). Collisions resolve to these rules (injected late in the
// cascade); element rules only apply while a test page is on screen.
export const MINT_CSS = `
  /* =================================================================
     CrossCoin — "The Mint" identity.
     Brand palette from the live store: crimson #CE1E36 + indigo #180D3E,
     set on a warm paper cream. Currency/coin motif: stamped hard shadows,
     monospaced denominations, embossed medallions, a forex-style ticker.
     ================================================================= */
  :root {
    --crimson: #ce1e36;
    --crimson-700: #99122a;
    --indigo: #180d3e;
    --indigo-600: #2b1c63;
    --paper: #f5efe3;
    --paper-2: #efe7d6;
    --surface: #fffdf8;
    --ink: #17110b;
    --ink-soft: #544c41;
    --ink-faint: #8f8676;
    --line: #e4dac6;
    --line-ink: #231b12;
    --gold: #c9a25a;

    --bg: var(--paper);
    --fg: var(--ink);
    --accent: var(--crimson);
    --stamp: 4px 4px 0 var(--line-ink);
    --stamp-sm: 3px 3px 0 var(--line-ink);
    --maxw: 1180px;
    --ease: cubic-bezier(.22,.68,.24,1);
    --r: 4px;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --paper: #100b1f;
      --paper-2: #16102a;
      --surface: #1a1430;
      --ink: #f4eede;
      --ink-soft: #c5bcce;
      --ink-faint: #8f85a0;
      --line: #2e2650;
      --line-ink: #40366a;
      --crimson: #ff485f;
      --crimson-700: #ff6b7e;
      --indigo: #cbc0f0;
      --gold: #e3bd74;
      --bg: var(--paper);
      --fg: var(--ink);
      --stamp: 4px 4px 0 #000;
      --stamp-sm: 3px 3px 0 #000;
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --paper: #100b1f; --paper-2: #16102a; --surface: #1a1430;
    --ink: #f4eede; --ink-soft: #c5bcce; --ink-faint: #8f85a0;
    --line: #2e2650; --line-ink: #40366a;
    --crimson: #ff485f; --crimson-700: #ff6b7e; --indigo: #cbc0f0; --gold: #e3bd74;
    --bg: var(--paper); --fg: var(--ink);
    --stamp: 4px 4px 0 #000; --stamp-sm: 3px 3px 0 #000;
    color-scheme: dark;
  }

  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg);
    font-family: "Inter", system-ui, sans-serif; font-size: 15px; line-height: 1.6;
    -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  h1,h2,h3,h4,.disp { font-family: "Bricolage Grotesque", system-ui, sans-serif; font-weight: 700; letter-spacing: -0.02em; line-height: 1.02; margin: 0; text-wrap: balance; }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; display: block; }
  .mono { font-family: "Space Mono", ui-monospace, monospace; }
  .wrap { width: 100%; max-width: var(--maxw); margin-inline: auto;
    padding-left: max(20px, env(safe-area-inset-left,0px)); padding-right: max(20px, env(safe-area-inset-right,0px)); }
  .eyebrow { font-family: "Space Mono", monospace; font-size: 11.5px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--crimson); }
  .muted { color: var(--ink-soft); }
  [hidden] { display: none !important; }

  /* buttons */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px; font-weight: 600; font-size: 14px;
    padding: 13px 22px; border: 2px solid var(--line-ink); background: var(--surface); color: var(--ink);
    border-radius: var(--r); cursor: pointer; transition: transform .16s var(--ease), box-shadow .16s var(--ease), background .2s; box-shadow: var(--stamp-sm); font-family: inherit; }
  .btn:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 var(--line-ink); }
  .btn:active { transform: translate(1px,1px); box-shadow: 1px 1px 0 var(--line-ink); }
  .btn--crimson { background: var(--crimson); color: #fff; border-color: var(--line-ink); }
  .btn--indigo { background: var(--indigo); color: #fff; }
  :root[data-theme="dark"] .btn--indigo, :root:not([data-theme="light"]) .btn--indigo { color: var(--paper); }
  .btn--lg { padding: 16px 28px; font-size: 15px; }
  .btn--ghost { box-shadow: none; } .btn--ghost:hover { box-shadow: var(--stamp-sm); }
  .btn--block { width: 100%; }

  /* coin medallion */
  .coin { position: relative; border-radius: 50%; background:
      radial-gradient(circle at 34% 30%, #fff5, transparent 42%),
      conic-gradient(from 210deg, var(--crimson), var(--indigo), var(--crimson));
    display: grid; place-items: center; color: #fff; font-family: "Bricolage Grotesque"; font-weight: 800;
    box-shadow: inset 0 0 0 2px rgba(255,255,255,.3), inset 0 0 0 6px rgba(0,0,0,.12); }
  .coin::after { content: ""; position: absolute; inset: 7%; border-radius: 50%; border: 1px dashed rgba(255,255,255,.4); }

  /* ---------- ticker ---------- */
  .ticker { background: var(--indigo); color: #efe9ff; border-bottom: 2px solid var(--line-ink); overflow: hidden; }
  :root[data-theme="dark"] .ticker, :root:not([data-theme="light"]) .ticker { background: #0b0718; }
  .ticker__track { display: flex; gap: 40px; width: max-content; white-space: nowrap; padding: 8px 0; animation: tick 30s linear infinite; font-family: "Space Mono", monospace; font-size: 12px; letter-spacing: .04em; }
  .ticker:hover .ticker__track { animation-play-state: paused; }
  .ticker__track b { color: #fff; } .up { color: #74e39a; } .down { color: #ff8da0; }
  @keyframes tick { to { transform: translateX(-50%); } }

  /* ---------- header ---------- */
  header.site { position: sticky; top: env(safe-area-inset-top,0px); z-index: 50; background: color-mix(in srgb, var(--surface) 86%, transparent);
    backdrop-filter: blur(12px) saturate(140%); -webkit-backdrop-filter: blur(12px) saturate(140%); border-bottom: 2px solid var(--line-ink); }
  .nav { display: flex; align-items: center; gap: 26px; height: 66px; }
  .brand { display: flex; align-items: center; gap: 11px; font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 20px; letter-spacing: -0.03em; }
  .brand .coin { width: 30px; height: 30px; font-size: 13px; }
  .brand b { color: var(--crimson); }
  .nav__links { display: flex; gap: 22px; margin-left: 6px; }
  .nav__links a { font-size: 13.5px; font-weight: 600; color: var(--ink-soft); padding: 6px 0; position: relative; cursor: pointer; }
  .nav__links a:hover, .nav__links a.active { color: var(--ink); }
  .nav__links a::after { content:""; position:absolute; left:0; bottom:-2px; height:2px; width:0; background: var(--crimson); transition: width .25s var(--ease); }
  .nav__links a:hover::after, .nav__links a.active::after { width: 100%; }
  .nav__act { margin-left: auto; display: flex; align-items: center; gap: 4px; }
  .ibtn { width: 42px; height: 42px; display: grid; place-items: center; border: none; background: transparent; color: var(--ink); cursor: pointer; border-radius: var(--r); position: relative; transition: background .2s, transform .15s; }
  .ibtn:hover { background: var(--paper-2); transform: translateY(-1px); }
  .ibtn svg { width: 20px; height: 20px; }
  .badge-dot { position: absolute; top: 6px; right: 6px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; background: var(--crimson); color: #fff; font-size: 10px; font-weight: 700; display: grid; place-items: center; font-family: "Space Mono"; border: 2px solid var(--surface); }
  .burger { display: none; }

  /* ---------- generic section ---------- */
  main { display: block; }
  section.block { padding-block: 66px; }
  .sechead { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 30px; }
  .sechead h2 { font-size: clamp(27px, 4vw, 44px); }
  .sechead .idx { font-family: "Space Mono"; font-size: 12px; color: var(--ink-faint); }
  .seelink { font-weight: 700; color: var(--crimson); font-size: 13.5px; display: inline-flex; gap: 6px; align-items: center; cursor: pointer; border-bottom: 2px solid transparent; }
  .seelink:hover { border-color: var(--crimson); }

  /* ---------- HERO ---------- */
  .hero { position: relative; border-bottom: 2px solid var(--line-ink); overflow: hidden; background:
      radial-gradient(760px 420px at 88% 12%, color-mix(in srgb,var(--crimson) 16%, transparent), transparent 62%),
      radial-gradient(640px 420px at 2% 100%, color-mix(in srgb,var(--indigo) 20%, transparent), transparent 60%); }
  .hero .wrap { display: grid; grid-template-columns: 1.08fr .92fr; gap: 40px; align-items: center; padding-block: 60px 72px; }
  .hero .tagpill { display: inline-flex; gap: 8px; align-items: center; background: var(--surface); border: 2px solid var(--line-ink); border-radius: 999px; padding: 6px 13px 6px 7px; font-family: "Space Mono"; font-size: 11.5px; font-weight: 700; box-shadow: var(--stamp-sm); }
  .hero .tagpill i { background: var(--crimson); color: #fff; padding: 3px 8px; border-radius: 999px; font-style: normal; }
  .hero h1 { font-size: clamp(42px, 7.6vw, 86px); font-weight: 800; margin-top: 18px; }
  .hero h1 em { font-style: normal; color: var(--crimson); -webkit-text-stroke: 0; position: relative; }
  .hero h1 .ul { text-decoration: none; background: linear-gradient(var(--crimson),var(--crimson)) left bottom / 100% 6px no-repeat; }
  .hero p.lede { font-size: clamp(15px,1.7vw,18px); color: var(--ink-soft); max-width: 44ch; margin: 22px 0 28px; }
  .hero .cta { display: flex; gap: 12px; flex-wrap: wrap; }
  .hero .denoms { display: flex; gap: 10px; margin-top: 34px; flex-wrap: wrap; }
  .denom { border: 2px solid var(--line-ink); border-radius: var(--r); padding: 9px 13px; background: var(--surface); box-shadow: var(--stamp-sm); }
  .denom .n { font-family: "Bricolage Grotesque"; font-weight: 800; font-size: 20px; }
  .denom .l { font-family: "Space Mono"; font-size: 10.5px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .08em; }

  /* hero art: giant spinning coin + stamped tiles */
  .hero__art { position: relative; aspect-ratio: 1/1; display: grid; place-items: center; }
  .hero__coin { width: 72%; aspect-ratio: 1; border-radius: 50%; position: relative; animation: spin 26s linear infinite;
    background:
      radial-gradient(circle at 36% 30%, #ffffff55, transparent 40%),
      conic-gradient(from 200deg, var(--crimson), var(--indigo) 55%, var(--crimson-700) 85%, var(--crimson));
    box-shadow: var(--stamp), inset 0 0 0 3px rgba(255,255,255,.35), inset 0 0 0 12px rgba(0,0,0,.12); border: 2px solid var(--line-ink); }
  .hero__coin::before { content:""; position:absolute; inset: 9%; border-radius:50%; border: 2px dashed rgba(255,255,255,.4); }
  .hero__coin span { position:absolute; inset:0; display:grid; place-items:center; color:#fff; font-family:"Bricolage Grotesque"; font-weight:800; font-size: clamp(30px,8vw,64px); letter-spacing:-.04em; animation: spin 26s linear infinite reverse; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .hero__chip { position: absolute; background: var(--surface); border: 2px solid var(--line-ink); border-radius: var(--r); padding: 8px 12px; font-family:"Space Mono"; font-size: 11.5px; font-weight: 700; box-shadow: var(--stamp-sm); }
  .hero__chip.c1 { top: 4%; left: -2%; } .hero__chip.c2 { bottom: 10%; right: -3%; color: var(--crimson); } .hero__chip.c3 { bottom: -2%; left: 12%; }
  @media (prefers-reduced-motion: reduce){ .hero__coin, .hero__coin span { animation: none; } }

  /* ---------- category index ---------- */
  .catlist { border-top: 2px solid var(--line-ink); }
  .catrow { display: grid; grid-template-columns: 54px 1fr auto auto; align-items: center; gap: 18px; padding: 22px 4px;
    border-bottom: 2px solid var(--line-ink); cursor: pointer; transition: padding .3s var(--ease), background .3s; position: relative; }
  .catrow:hover { padding-left: 16px; background: var(--surface); }
  .catrow .no { font-family: "Space Mono"; font-size: 13px; color: var(--ink-faint); }
  .catrow h3 { font-size: clamp(22px, 3.4vw, 36px); transition: color .25s; }
  .catrow:hover h3 { color: var(--crimson); }
  .catrow .ct { font-family: "Space Mono"; font-size: 12px; color: var(--ink-faint); }
  .catrow .arw { width: 40px; height: 40px; border: 2px solid var(--line-ink); border-radius: 50%; display: grid; place-items: center; transition: transform .25s var(--ease), background .25s, color .25s; }
  .catrow:hover .arw { background: var(--crimson); color: #fff; transform: rotate(-45deg); }
  .catrow .swatch { position:absolute; right: 150px; top:50%; transform: translateY(-50%) scale(.6); width: 56px; height: 56px; border-radius: var(--r); opacity: 0; transition: .3s var(--ease); box-shadow: var(--stamp-sm); }
  .catrow:hover .swatch { opacity: 1; transform: translateY(-50%) scale(1); }
  @media (max-width: 680px){ .catrow .swatch { display:none; } .catrow { grid-template-columns: 38px 1fr auto; } .catrow .ct { display:none; } }

  /* ---------- product card ---------- */
  .pgrid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
  .prail { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(250px, 1fr); gap: 16px; overflow-x: auto; padding-bottom: 10px; scroll-snap-type: x mandatory; }
  .prail > * { scroll-snap-align: start; }
  .card { background: var(--surface); border: 2px solid var(--line-ink); border-radius: var(--r); overflow: hidden; box-shadow: var(--stamp-sm); transition: transform .18s var(--ease), box-shadow .18s var(--ease); display: flex; flex-direction: column; }
  .card:hover { transform: translate(-3px,-3px); box-shadow: 6px 6px 0 var(--line-ink); }
  .card__img { aspect-ratio: 1/1; position: relative; display: grid; place-items: center; border-bottom: 2px solid var(--line-ink); cursor: pointer; }
  .card__img .mint { position: absolute; width: 60%; aspect-ratio: 1; border-radius: 50%; opacity: .92; box-shadow: inset 0 0 0 2px rgba(255,255,255,.3), inset 0 0 0 10px rgba(0,0,0,.08); }
  .card__img .ring { position:absolute; inset: 14%; border-radius: 50%; border: 2px dashed rgba(0,0,0,.15); }
  .card__img .flag { position: absolute; top: 10px; left: 10px; background: var(--ink); color: var(--surface); font-family:"Space Mono"; font-size: 10px; font-weight:700; padding: 4px 8px; border-radius: 3px; letter-spacing:.04em; }
  .card__img .flag.sale { background: var(--crimson); color: #fff; }
  .card__wish { position: absolute; top: 9px; right: 9px; width: 34px; height: 34px; border-radius: 50%; background: var(--surface); border: 2px solid var(--line-ink); display: grid; place-items: center; cursor: pointer; transition: .2s; }
  .card__wish svg { width: 16px; height: 16px; } .card__wish.on { background: var(--crimson); color: #fff; }
  .card__body { padding: 13px 14px 15px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .card__body .kl { font-family:"Space Mono"; font-size: 10.5px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .08em; }
  .card__body h3 { font-family: "Inter"; font-size: 14.5px; font-weight: 650; letter-spacing: 0; cursor: pointer; }
  .stars { color: var(--crimson); font-size: 12px; letter-spacing: 1px; } .stars small { color: var(--ink-faint); font-family: "Space Mono"; margin-left: 5px; }
  .price { display: flex; align-items: baseline; gap: 8px; margin-top: auto; padding-top: 8px; font-family: "Space Mono"; }
  .price .now { font-weight: 700; font-size: 16px; } .price .was { color: var(--ink-faint); text-decoration: line-through; font-size: 12px; }
  .price .off { margin-left: auto; color: var(--crimson); font-weight: 700; font-size: 11px; }
  .card .add { margin: 0 14px 14px; }

  /* ---------- technologies / USP ---------- */
  .tech { background: var(--indigo); color: #efe9ff; border-block: 2px solid var(--line-ink); }
  :root[data-theme="dark"] .tech, :root:not([data-theme="light"]) .tech { background: #0b0718; }
  .tech .wrap { padding-block: 60px; }
  .tech h2 { color: #fff; }
  .techgrid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 30px; }
  .techcard { border: 2px solid rgba(255,255,255,.18); border-radius: var(--r); padding: 20px; background: rgba(255,255,255,.04); transition: transform .2s var(--ease); }
  .techcard:hover { transform: translateY(-4px); background: rgba(255,255,255,.08); }
  .techcard .mk { width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--gold); color: var(--gold); display: grid; place-items: center; margin-bottom: 14px; }
  .techcard .mk svg { width: 22px; height: 22px; }
  .techcard b { color: #fff; font-size: 15px; display: block; margin-bottom: 5px; font-family: "Bricolage Grotesque"; }
  .techcard span { color: #c6bce4; font-size: 13px; }

  /* ---------- reviews ---------- */
  .revgrid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
  .rev { background: var(--surface); border: 2px solid var(--line-ink); border-radius: var(--r); padding: 22px; box-shadow: var(--stamp-sm); }
  .rev p { margin: 11px 0 16px; font-size: 14.5px; }
  .rev .who { display: flex; align-items: center; gap: 11px; }
  .rev .av { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 700; font-family: "Bricolage Grotesque"; border: 2px solid var(--line-ink); }
  .rev .who b { font-size: 13.5px; } .rev .who span { font-size: 11.5px; color: var(--ink-faint); font-family: "Space Mono"; }

  /* ---------- journal ---------- */
  .jgrid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
  .post { border: 2px solid var(--line-ink); border-radius: var(--r); overflow: hidden; background: var(--surface); box-shadow: var(--stamp-sm); transition: transform .18s var(--ease), box-shadow .18s var(--ease); cursor: pointer; }
  .post:hover { transform: translate(-3px,-3px); box-shadow: 6px 6px 0 var(--line-ink); }
  .post__img { aspect-ratio: 16/10; border-bottom: 2px solid var(--line-ink); position: relative; }
  .post__b { padding: 16px 16px 18px; } .post__b .m { font-family:"Space Mono"; font-size: 11px; color: var(--crimson); text-transform: uppercase; letter-spacing: .06em; }
  .post__b h3 { font-family: "Inter"; font-size: 16px; font-weight: 650; margin-top: 7px; letter-spacing: -.01em; }

  /* ---------- faq ---------- */
  .faq { max-width: 820px; margin-inline: auto; }
  .qa { border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); margin-bottom: 12px; box-shadow: var(--stamp-sm); overflow: hidden; }
  .qa__q { width: 100%; text-align: left; background: none; border: none; padding: 17px 18px; font-size: 15px; font-weight: 650; font-family: "Bricolage Grotesque"; color: var(--ink); cursor: pointer; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
  .qa__q .pm { width: 26px; height: 26px; border: 2px solid var(--line-ink); border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; transition: transform .25s var(--ease), background .25s, color .25s; }
  .qa.open .qa__q .pm { background: var(--crimson); color: #fff; transform: rotate(45deg); }
  .qa__a { max-height: 0; overflow: hidden; transition: max-height .3s var(--ease); }
  .qa__a > div { padding: 0 18px 18px; color: var(--ink-soft); font-size: 14px; }

  /* ---------- newsletter / mint club ---------- */
  .mint { border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--crimson); color: #fff; padding: clamp(32px,5vw,58px); text-align: center; box-shadow: var(--stamp); position: relative; overflow: hidden; }
  .mint h2 { color: #fff; font-size: clamp(27px,3.8vw,44px); }
  .mint p { color: #ffdbe1; max-width: 46ch; margin: 13px auto 24px; }
  .mintform { display: flex; gap: 10px; max-width: 440px; margin: 0 auto; }
  .mintform input { flex: 1; min-width: 0; border: 2px solid var(--line-ink); border-radius: var(--r); padding: 14px 16px; font-family: "Space Mono"; font-size: 13px; background: #fff; color: var(--ink); }
  .mintform .btn { background: var(--indigo); color: #fff; }
  :root[data-theme="dark"] .mintform .btn, :root:not([data-theme="light"]) .mintform .btn { color: var(--paper); }

  /* ---------- footer ---------- */
  footer.site { background: var(--surface); border-top: 2px solid var(--line-ink); }
  .foot { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 30px; padding-block: 52px 30px; }
  .foot h4 { font-family: "Space Mono"; font-size: 11px; text-transform: uppercase; letter-spacing: .14em; color: var(--ink-faint); margin: 0 0 14px; }
  .foot a { display: block; color: var(--ink-soft); font-size: 14px; padding: 5px 0; cursor: pointer; transition: color .2s, transform .2s; }
  .foot a:hover { color: var(--crimson); transform: translateX(3px); }
  .foot .ab p { color: var(--ink-soft); font-size: 14px; max-width: 32ch; }
  .foot .soc { display: flex; gap: 9px; margin-top: 15px; }
  .foot .soc a { width: 40px; height: 40px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; box-shadow: var(--stamp-sm); }
  .foot .soc a:hover { background: var(--crimson); color: #fff; transform: translate(-2px,-2px); }
  .foot .soc svg { width: 18px; height: 18px; }
  .footend { border-top: 2px solid var(--line-ink); padding-block: 18px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-family: "Space Mono"; font-size: 11.5px; color: var(--ink-faint); }

  /* ================= SHOP ================= */
  .shophead { border-bottom: 2px solid var(--line-ink); padding-block: 30px; }
  .crumbs { font-family:"Space Mono"; font-size: 11.5px; color: var(--ink-faint); }
  .crumbs span { color: var(--crimson); }
  .shopbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 18px 0 26px; }
  .chip { font-family:"Space Mono"; font-size: 12px; font-weight: 700; padding: 8px 14px; border: 2px solid var(--line-ink); border-radius: 999px; background: var(--surface); cursor: pointer; box-shadow: var(--stamp-sm); transition: transform .14s, background .2s, color .2s; }
  .chip:hover { transform: translate(-2px,-2px); }
  .chip.on { background: var(--ink); color: var(--surface); }
  .sortsel { margin-left: auto; font-family:"Space Mono"; font-size: 12px; padding: 9px 12px; border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); color: var(--ink); box-shadow: var(--stamp-sm); }

  /* ================= PRODUCT ================= */
  .pd { display: grid; grid-template-columns: 1.05fr .95fr; gap: 42px; padding-block: 36px; align-items: start; }
  .gallery { position: sticky; top: 90px; }
  .gmain { aspect-ratio: 1/1; border: 2px solid var(--line-ink); border-radius: var(--r); box-shadow: var(--stamp); position: relative; display: grid; place-items: center; overflow: hidden; }
  .gmain .mint { width: 62%; aspect-ratio: 1; border-radius: 50%; box-shadow: inset 0 0 0 3px rgba(255,255,255,.3), inset 0 0 0 14px rgba(0,0,0,.08); }
  .gthumbs { display: flex; gap: 10px; margin-top: 12px; }
  .gthumb { width: 70px; height: 70px; border: 2px solid var(--line-ink); border-radius: var(--r); cursor: pointer; display: grid; place-items: center; transition: transform .15s; box-shadow: var(--stamp-sm); }
  .gthumb.on { outline: 2px solid var(--crimson); outline-offset: 2px; } .gthumb:hover { transform: translateY(-2px); }
  .gthumb .mint { width: 60%; aspect-ratio: 1; border-radius: 50%; }

  .buy .kl { font-family:"Space Mono"; font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--crimson); }
  .buy h1 { font-size: clamp(26px,4vw,40px); margin: 8px 0 10px; }
  .buy .prow { display: flex; align-items: baseline; gap: 12px; font-family:"Space Mono"; margin: 14px 0 6px; }
  .buy .prow .now { font-size: 26px; font-weight: 700; } .buy .prow .was { color: var(--ink-faint); text-decoration: line-through; }
  .buy .prow .off { background: var(--crimson); color: #fff; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 3px; }
  .buy .tax { font-size: 12px; color: var(--ink-faint); font-family:"Space Mono"; }
  .optlabel { font-family:"Space Mono"; font-size: 11.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); margin: 22px 0 10px; display: flex; justify-content: space-between; }
  .optlabel a { color: var(--crimson); cursor: pointer; text-transform: none; letter-spacing: 0; font-weight: 700; }
  .swatches { display: flex; gap: 10px; flex-wrap: wrap; }
  .sw { width: 42px; height: 42px; border-radius: 50%; border: 2px solid var(--line-ink); cursor: pointer; position: relative; box-shadow: var(--stamp-sm); }
  .sw.on::after { content:""; position: absolute; inset: -6px; border: 2px solid var(--crimson); border-radius: 50%; }
  .sizes { display: flex; gap: 8px; flex-wrap: wrap; }
  .size { min-width: 52px; padding: 11px 10px; text-align: center; border: 2px solid var(--line-ink); border-radius: var(--r); font-family:"Space Mono"; font-weight: 700; font-size: 13px; cursor: pointer; background: var(--surface); box-shadow: var(--stamp-sm); transition: transform .14s; }
  .size:hover { transform: translate(-2px,-2px); } .size.on { background: var(--ink); color: var(--surface); } .size.off { opacity: .35; text-decoration: line-through; cursor: not-allowed; box-shadow: none; }
  /* pack / bundle selector — mirrors Morbix pack pricing */
  .packs { display: grid; gap: 10px; margin-top: 10px; }
  .pack { display: flex; align-items: center; gap: 14px; border: 2px solid var(--line-ink); border-radius: var(--r); padding: 13px 15px; cursor: pointer; background: var(--surface); box-shadow: var(--stamp-sm); position: relative; transition: transform .14s; }
  .pack:hover { transform: translate(-2px,-2px); } .pack.on { outline: 2px solid var(--crimson); outline-offset: 2px; }
  .pack .radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line-ink); flex-shrink: 0; display: grid; place-items: center; }
  .pack.on .radio::after { content:""; width: 10px; height: 10px; border-radius: 50%; background: var(--crimson); }
  .pack b { font-family: "Bricolage Grotesque"; font-size: 15px; } .pack .d { font-size: 12.5px; color: var(--ink-soft); }
  .pack .pp { margin-left: auto; text-align: right; font-family:"Space Mono"; }
  .pack .pp .pnow { font-weight: 700; font-size: 16px; } .pack .pp .psave { font-size: 11px; color: var(--crimson); font-weight: 700; }
  .pack .tagbest { position: absolute; top: -11px; right: 14px; background: var(--indigo); color: #fff; font-family:"Space Mono"; font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 3px; letter-spacing: .06em; }
  :root[data-theme="dark"] .pack .tagbest, :root:not([data-theme="light"]) .pack .tagbest { color: var(--paper); }
  .qtyrow { display: flex; gap: 12px; align-items: center; margin: 22px 0 14px; }
  .qty { display: inline-flex; border: 2px solid var(--line-ink); border-radius: var(--r); box-shadow: var(--stamp-sm); overflow: hidden; }
  .qty button { width: 42px; height: 46px; border: none; background: var(--surface); color: var(--ink); font-size: 18px; cursor: pointer; } .qty button:hover { background: var(--paper-2); }
  .qty span { width: 46px; display: grid; place-items: center; font-family:"Space Mono"; font-weight: 700; border-inline: 2px solid var(--line-ink); }
  .usps { display: grid; gap: 10px; margin-top: 22px; }
  .usp { display: flex; gap: 10px; align-items: center; font-size: 13.5px; } .usp svg { width: 18px; height: 18px; color: var(--crimson); flex-shrink: 0; }
  .acc { margin-top: 24px; border-top: 2px solid var(--line-ink); }
  .acc__i { border-bottom: 2px solid var(--line-ink); }
  .acc__q { width: 100%; background: none; border: none; padding: 16px 2px; font-family:"Bricolage Grotesque"; font-weight: 650; font-size: 15px; color: var(--ink); display: flex; justify-content: space-between; cursor: pointer; }
  .acc__a { max-height: 0; overflow: hidden; transition: max-height .3s var(--ease); } .acc__a > div { padding: 0 2px 16px; color: var(--ink-soft); font-size: 14px; }

  /* ================= CART ================= */
  .cartpage { display: grid; grid-template-columns: 1.5fr .9fr; gap: 30px; padding-block: 36px; align-items: start; }
  .citem { display: grid; grid-template-columns: 92px 1fr auto; gap: 16px; padding: 18px 0; border-bottom: 2px solid var(--line-ink); align-items: center; }
  .citem .th { width: 92px; height: 92px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; box-shadow: var(--stamp-sm); }
  .citem .th .mint { width: 62%; aspect-ratio: 1; border-radius: 50%; }
  .citem h3 { font-family:"Inter"; font-size: 15px; font-weight: 650; } .citem .meta { font-family:"Space Mono"; font-size: 11.5px; color: var(--ink-faint); margin-top: 3px; }
  .citem .rm { background: none; border: none; color: var(--ink-faint); font-family:"Space Mono"; font-size: 11.5px; cursor: pointer; margin-top: 8px; padding: 0; } .citem .rm:hover { color: var(--crimson); }
  .citem .right { text-align: right; display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
  .citem .lp { font-family:"Space Mono"; font-weight: 700; }
  .summary { border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); padding: 22px; box-shadow: var(--stamp); position: sticky; top: 90px; }
  .summary h3 { font-size: 18px; margin-bottom: 14px; }
  .srow { display: flex; justify-content: space-between; font-family:"Space Mono"; font-size: 13.5px; padding: 7px 0; color: var(--ink-soft); }
  .srow.total { border-top: 2px solid var(--line-ink); margin-top: 8px; padding-top: 12px; font-size: 18px; color: var(--ink); font-weight: 700; }
  .promo { display: flex; gap: 8px; margin: 14px 0; }
  .promo input { flex: 1; min-width: 0; border: 2px solid var(--line-ink); border-radius: var(--r); padding: 11px 12px; font-family:"Space Mono"; font-size: 12px; background: var(--surface); color: var(--ink); text-transform: uppercase; }
  .freebar { height: 8px; border-radius: 99px; background: var(--paper-2); overflow: hidden; border: 2px solid var(--line-ink); margin: 6px 0 16px; }
  .freebar span { display: block; height: 100%; background: var(--crimson); transition: width .4s var(--ease); }

  /* ================= CHECKOUT (2-step) ================= */
  .cowrap { display: grid; grid-template-columns: 1.5fr .9fr; gap: 30px; padding-block: 28px 56px; align-items: start; }
  .stepper { display: flex; align-items: center; gap: 12px; margin: 22px 0 26px; }
  .stepper .st { display: flex; align-items: center; gap: 10px; font-family: "Space Mono"; font-size: 12px; font-weight: 700; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .06em; }
  .stepper .st .n { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--line-ink); display: grid; place-items: center; background: var(--surface); box-shadow: var(--stamp-sm); transition: .2s; }
  .stepper .st.on { color: var(--ink); } .stepper .st.on .n { background: var(--crimson); color: #fff; }
  .stepper .st.done .n { background: var(--ink); color: var(--surface); }
  .stepper .bar { flex: 1; height: 2px; background: var(--line-ink); }
  .costep { border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); padding: 22px; box-shadow: var(--stamp); }
  .costep h3 { font-size: 19px; margin-bottom: 4px; }
  .costep .hint { font-family:"Space Mono"; font-size: 11.5px; color: var(--ink-faint); margin-bottom: 16px; }
  .ffield { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .ffield label { font-family:"Space Mono"; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); }
  .ffield input { border: 2px solid var(--line-ink); border-radius: var(--r); padding: 12px 13px; font-family: inherit; font-size: 14px; background: var(--surface); color: var(--ink); box-shadow: var(--stamp-sm); }
  .ffield input:focus { outline: 2px solid var(--crimson); outline-offset: 1px; }
  .frow { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .pay { display: grid; gap: 12px; }
  .payopt { display: flex; align-items: center; gap: 13px; border: 2px solid var(--line-ink); border-radius: var(--r); padding: 15px; cursor: pointer; background: var(--surface); box-shadow: var(--stamp-sm); transition: transform .14s; }
  .payopt:hover { transform: translate(-2px,-2px); } .payopt.on { outline: 2px solid var(--crimson); outline-offset: 2px; }
  .payopt .radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line-ink); flex-shrink: 0; display: grid; place-items: center; }
  .payopt.on .radio::after { content:""; width: 10px; height: 10px; border-radius: 50%; background: var(--crimson); }
  .payopt .pi { width: 40px; height: 40px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; flex-shrink: 0; }
  .payopt .pi svg { width: 20px; height: 20px; }
  .payopt b { font-family: "Bricolage Grotesque"; font-size: 15px; display: block; } .payopt .d { font-size: 12.5px; color: var(--ink-soft); }
  .payopt .tag { margin-left: auto; font-family:"Space Mono"; font-size: 10px; font-weight: 700; color: var(--crimson); border: 2px solid var(--crimson); border-radius: 3px; padding: 3px 7px; }
  .corow { display: flex; gap: 10px; margin-top: 20px; }
  .coback { background: none; border: none; color: var(--ink-soft); font-family:"Space Mono"; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .coback:hover { color: var(--crimson); }
  .miniitem { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 2px solid var(--line); }
  .miniitem .th { width: 46px; height: 46px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; flex-shrink: 0; } .miniitem .th .mint { width: 60%; aspect-ratio:1; border-radius:50%; }
  .miniitem .nm { font-size: 13px; font-weight: 600; } .miniitem .mm { font-family:"Space Mono"; font-size: 10.5px; color: var(--ink-faint); }
  .miniitem .lp { margin-left: auto; font-family:"Space Mono"; font-weight: 700; font-size: 13px; }
  .cosuccess { text-align: center; padding: 40px 10px; }
  .cosuccess .seal { width: 84px; height: 84px; margin: 0 auto 18px; border-radius: 50%; display: grid; place-items: center; background: var(--crimson); color: #fff; box-shadow: var(--stamp); border: 2px solid var(--line-ink); }
  .cosuccess .seal svg { width: 40px; height: 40px; }
  @media (max-width: 860px){ .cowrap { grid-template-columns: 1fr; } .cosummary { position: static; } }
  @media (max-width: 520px){ .frow { grid-template-columns: 1fr; } }

  /* ---------- cart drawer ---------- */
  .scrim { position: fixed; inset: 0; background: rgba(10,6,20,.5); z-index: 60; opacity: 0; pointer-events: none; transition: opacity .3s; }
  .scrim.on { opacity: 1; pointer-events: auto; }
  .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 92vw); background: var(--surface); border-left: 2px solid var(--line-ink); z-index: 61; transform: translateX(100%); transition: transform .34s var(--ease); display: flex; flex-direction: column; padding-top: env(safe-area-inset-top,0px); }
  .drawer.on { transform: none; }
  .drawer__h { display: flex; align-items: center; justify-content: space-between; padding: 18px 18px; border-bottom: 2px solid var(--line-ink); }
  .drawer__h b { font-family: "Bricolage Grotesque"; font-size: 18px; }
  .drawer__body { flex: 1; overflow-y: auto; padding: 8px 18px; }
  .drawer__foot { border-top: 2px solid var(--line-ink); padding: 16px 18px calc(16px + env(safe-area-inset-bottom,0px)); }
  .ditem { display: grid; grid-template-columns: 62px 1fr auto; gap: 12px; padding: 14px 0; border-bottom: 2px solid var(--line); align-items: center; }
  .ditem .th { width: 62px; height: 62px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; } .ditem .th .mint { width: 60%; aspect-ratio:1; border-radius:50%; }
  .ditem h4 { font-family:"Inter"; font-size: 13.5px; font-weight: 600; margin: 0; } .ditem .m { font-family:"Space Mono"; font-size: 11px; color: var(--ink-faint); }
  .ditem .lp { font-family:"Space Mono"; font-weight: 700; font-size: 13px; }

  /* mobile nav */
  .mnav { position: fixed; inset: 0; z-index: 62; background: var(--surface); transform: translateX(100%); transition: transform .32s var(--ease); display: flex; flex-direction: column; padding: 18px max(20px,env(safe-area-inset-left,0px)); }
  .mnav.on { transform: none; }
  .mnav a { font-family: "Bricolage Grotesque"; font-size: 24px; font-weight: 700; padding: 16px 0; border-bottom: 2px solid var(--line); cursor: pointer; }

  /* toast */
  #toast { position: fixed; left: 50%; bottom: calc(22px + env(safe-area-inset-bottom,0px)); transform: translateX(-50%) translateY(16px); background: var(--ink); color: var(--surface); padding: 12px 20px; border-radius: var(--r); border: 2px solid var(--line-ink); font-family:"Space Mono"; font-size: 12.5px; font-weight: 700; box-shadow: var(--stamp); opacity: 0; pointer-events: none; transition: .28s var(--ease); z-index: 90; }
  #toast.on { opacity: 1; transform: translateX(-50%) translateY(0); }

  .reveal { opacity: 0; transform: translateY(20px); transition: opacity .6s var(--ease), transform .6s var(--ease); }
  .reveal.in { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce){ .reveal { opacity:1; transform:none; transition:none; } * { animation: none !important; } }

  @media (max-width: 1000px){ .pgrid, .techgrid { grid-template-columns: repeat(2,1fr); } .revgrid, .jgrid { grid-template-columns: 1fr; } }
  @media (max-width: 860px){
    .nav__links { display: none; } .burger { display: grid; }
    .hero .wrap { grid-template-columns: 1fr; padding-block: 44px 54px; } .hero__art { max-width: 400px; margin: 10px auto 0; order: -1; }
    .pd { grid-template-columns: 1fr; } .gallery { position: static; } .cartpage { grid-template-columns: 1fr; } .summary { position: static; }
    .foot { grid-template-columns: 1fr 1fr; } .foot .ab { grid-column: 1/-1; }
  }
  @media (max-width: 520px){ .pgrid { grid-template-columns: 1fr 1fr; } section.block { padding-block: 48px; } .sechead { flex-direction: column; align-items: flex-start; } .citem { grid-template-columns: 70px 1fr; } .citem .right { grid-column: 1/-1; flex-direction: row; justify-content: space-between; align-items: center; } .mintform { flex-direction: column; } }
  @media (max-width: 380px){ .pgrid, .techgrid { grid-template-columns: 1fr; } }
`;
