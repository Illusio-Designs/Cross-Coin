// CrossCoin "Mint" design system CSS — scoped under .cc-test-root so the live
// site stylesheet cannot bleed into the /test preview (and vice-versa). Injected
// globally by TestLayout while a /test page is mounted. Display face: Fraunces.
export const MINT_CSS = `.cc-test-root{
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
    --teal: #0f766e;

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
/* The /test theme is driven ONLY by the time-based data-theme attribute set in
   TestLayout (dark 19:00-07:00, light by day). We deliberately do NOT key the
   dark palette off @media (prefers-color-scheme: dark): having both the OS
   preference and the clock control the palette made a dark-OS device render a
   mix of light and dark tokens during the day. Baseline (no attribute) = light
   on every device; the clock flips data-theme to "dark"/"light". */
.cc-test-root[data-theme="dark"]{
    --paper: #100b1f; --paper-2: #16102a; --surface: #1a1430;
    --ink: #f4eede; --ink-soft: #c5bcce; --ink-faint: #8f85a0;
    --line: #2e2650; --line-ink: #40366a;
    --crimson: #ff485f; --crimson-700: #ff6b7e; --indigo: #cbc0f0; --gold: #e3bd74; --teal: #0d9488;
    --bg: var(--paper); --fg: var(--ink);
    --stamp: 4px 4px 0 #000; --stamp-sm: 3px 3px 0 #000;
    color-scheme: dark;
  }
.cc-test-root *{ box-sizing: border-box; }
.cc-test-root{ margin: 0; background: var(--bg); color: var(--fg);
    font-family: "Inter", system-ui, sans-serif; font-size: 15px; line-height: 1.6;
    -webkit-font-smoothing: antialiased; overflow-x: hidden; }
.cc-test-root h1, .cc-test-root h2, .cc-test-root h3, .cc-test-root h4, .cc-test-root .disp{ font-family: "Fraunces", system-ui, sans-serif; font-weight: 700; letter-spacing: -0.02em; line-height: 1.02; margin: 0; text-wrap: balance; }
.cc-test-root a{ color: inherit; text-decoration: none; }
.cc-test-root img{ max-width: 100%; display: block; }
.cc-test-root .mono{ font-family: "Space Mono", ui-monospace, monospace; }
.cc-test-root .wrap{ width: 100%; max-width: var(--maxw); margin-inline: auto;
    padding-left: max(20px, env(safe-area-inset-left,0px)); padding-right: max(20px, env(safe-area-inset-right,0px)); }
.cc-test-root .eyebrow{ font-family: "Space Mono", monospace; font-size: 11.5px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--crimson); }
.cc-test-root .muted{ color: var(--ink-soft); }
.cc-test-root [hidden]{ display: none !important; }
.cc-test-root .btn{ display: inline-flex; align-items: center; justify-content: center; gap: 9px; font-weight: 600; font-size: 14px;
    padding: 13px 22px; border: 2px solid var(--line-ink); background: var(--surface); color: var(--ink);
    border-radius: var(--r); cursor: pointer; transition: transform .16s var(--ease), box-shadow .16s var(--ease), background .2s; box-shadow: var(--stamp-sm); font-family: inherit; }
.cc-test-root .btn:hover{ transform: translate(-2px,-2px); box-shadow: 5px 5px 0 var(--line-ink); }
.cc-test-root .btn:active{ transform: translate(1px,1px); box-shadow: 1px 1px 0 var(--line-ink); }
.cc-test-root .btn--crimson{ background: var(--crimson); color: #fff; border-color: var(--line-ink); }
.cc-test-root .btn--indigo{ background: var(--indigo); color: #fff; }
.cc-test-root[data-theme="dark"] .btn--indigo, .cc-test-root:not([data-theme="light"]) .btn--indigo{ color: var(--paper); }
.cc-test-root .btn--lg{ padding: 16px 28px; font-size: 15px; }
.cc-test-root .btn--ghost{ box-shadow: none; }
.cc-test-root .btn--ghost:hover{ box-shadow: var(--stamp-sm); }
.cc-test-root .btn--block{ width: 100%; }
.cc-test-root .coin{ position: relative; border-radius: 50%; background:
      radial-gradient(circle at 34% 30%, #fff5, transparent 42%),
      conic-gradient(from 210deg, var(--crimson), var(--indigo), var(--crimson));
    display: grid; place-items: center; color: #fff; font-family: "Fraunces"; font-weight: 800;
    box-shadow: inset 0 0 0 2px rgba(255,255,255,.3), inset 0 0 0 6px rgba(0,0,0,.12); }
.cc-test-root .coin::after{ content: ""; position: absolute; inset: 7%; border-radius: 50%; border: 1px dashed rgba(255,255,255,.4); }
.cc-test-root .ticker{ background: var(--indigo); color: #efe9ff; border-bottom: 2px solid var(--line-ink); overflow: hidden; }
.cc-test-root[data-theme="dark"] .ticker, .cc-test-root:not([data-theme="light"]) .ticker{ background: #0b0718; }
.cc-test-root .ticker__track{ display: flex; gap: 40px; width: max-content; white-space: nowrap; padding: 8px 0; animation: tick 30s linear infinite; font-family: "Space Mono", monospace; font-size: 12px; letter-spacing: .04em; }
.cc-test-root .ticker:hover .ticker__track{ animation-play-state: paused; }
.cc-test-root .ticker__track b{ color: #fff; }
.cc-test-root .up{ color: #74e39a; }
.cc-test-root .down{ color: #ff8da0; }
@keyframes tick{ to { transform: translateX(-50%); } }
.cc-test-root header.site{ position: sticky; top: env(safe-area-inset-top,0px); z-index: 50; background: color-mix(in srgb, var(--surface) 86%, transparent);
    backdrop-filter: blur(12px) saturate(140%); -webkit-backdrop-filter: blur(12px) saturate(140%); border-bottom: 2px solid var(--line-ink); }
.cc-test-root .nav{ display: flex; align-items: center; gap: 26px; height: 66px; }
.cc-test-root .brand{ display: flex; align-items: center; gap: 11px; font-family: "Fraunces"; font-weight: 800; font-size: 20px; letter-spacing: -0.03em; }
.cc-test-root .brand .coin{ width: 30px; height: 30px; font-size: 13px; }
.cc-test-root .brand b{ color: var(--crimson); }
.cc-test-root .nav__links{ display: flex; gap: 22px; margin-left: 6px; }
.cc-test-root .nav__links a{ font-size: 13.5px; font-weight: 600; color: var(--ink-soft); padding: 6px 0; position: relative; cursor: pointer; }
.cc-test-root .nav__links a:hover, .cc-test-root .nav__links a.active{ color: var(--ink); }
.cc-test-root .nav__links a::after{ content:""; position:absolute; left:0; bottom:-2px; height:2px; width:0; background: var(--crimson); transition: width .25s var(--ease); }
.cc-test-root .nav__links a:hover::after, .cc-test-root .nav__links a.active::after{ width: 100%; }
.cc-test-root .nav__act{ margin-left: auto; display: flex; align-items: center; gap: 4px; }
.cc-test-root .ibtn{ width: 42px; height: 42px; display: grid; place-items: center; border: none; background: transparent; color: var(--ink); cursor: pointer; border-radius: var(--r); position: relative; transition: background .2s, transform .15s; }
.cc-test-root .ibtn:hover{ background: var(--paper-2); transform: translateY(-1px); }
.cc-test-root .ibtn svg{ width: 23px; height: 23px; }
.cc-test-root .badge-dot{ position: absolute; top: 6px; right: 6px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; background: var(--crimson); color: #fff; font-size: 10px; font-weight: 700; display: grid; place-items: center; font-family: "Space Mono"; border: 2px solid var(--surface); }
.cc-test-root .burger{ display: none; }
.cc-test-root main{ display: block; }
.cc-test-root section.block{ padding-block: 66px; }
.cc-test-root .sechead{ display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 30px; }
.cc-test-root .sechead h2{ font-size: clamp(27px, 4vw, 44px); }
.cc-test-root .sechead .idx{ font-family: "Space Mono"; font-size: 12px; color: var(--ink-faint); }
.cc-test-root .seelink{ font-weight: 700; color: var(--crimson); font-size: 13.5px; display: inline-flex; gap: 6px; align-items: center; cursor: pointer; border-bottom: 2px solid transparent; }
.cc-test-root .seelink:hover{ border-color: var(--crimson); }
.cc-test-root .hero{ position: relative; border-bottom: 2px solid var(--line-ink); overflow: hidden; background:
      radial-gradient(760px 420px at 88% 12%, color-mix(in srgb,var(--crimson) 16%, transparent), transparent 62%),
      radial-gradient(640px 420px at 2% 100%, color-mix(in srgb,var(--indigo) 20%, transparent), transparent 60%); }
.cc-test-root .hero .wrap{ display: grid; grid-template-columns: 1.08fr .92fr; gap: 40px; align-items: center; padding-block: 60px 72px; }
.cc-test-root .hero .tagpill{ display: inline-flex; gap: 8px; align-items: center; background: var(--surface); border: 2px solid var(--line-ink); border-radius: 4px; padding: 6px 13px 6px 7px; font-family: "Space Mono"; font-size: 11.5px; font-weight: 700; box-shadow: var(--stamp-sm); }
.cc-test-root .hero .tagpill i{ background: var(--crimson); color: #fff; padding: 3px 8px; border-radius: 4px; font-style: normal; }
.cc-test-root .hero h1{ font-size: clamp(42px, 7.6vw, 86px); font-weight: 800; margin-top: 18px; }
.cc-test-root .hero h1 em{ font-style: normal; color: var(--crimson); -webkit-text-stroke: 0; position: relative; }
.cc-test-root .hero h1 .ul{ text-decoration: none; background: linear-gradient(var(--crimson),var(--crimson)) left bottom / 100% 6px no-repeat; }
.cc-test-root .hero p.lede{ font-size: clamp(15px,1.7vw,18px); color: var(--ink-soft); max-width: 44ch; margin: 22px 0 28px; }
.cc-test-root .hero .cta{ display: flex; gap: 12px; flex-wrap: wrap; }
.cc-test-root .hero .denoms{ display: flex; gap: 10px; margin-top: 34px; flex-wrap: wrap; }
.cc-test-root .denom{ border: 2px solid var(--line-ink); border-radius: var(--r); padding: 9px 13px; background: var(--surface); box-shadow: var(--stamp-sm); }
.cc-test-root .denom .n{ font-family: "Fraunces"; font-weight: 800; font-size: 20px; }
.cc-test-root .denom .l{ font-family: "Space Mono"; font-size: 10.5px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .08em; }
.cc-test-root .hero__art{ position: relative; aspect-ratio: 1/1; display: grid; place-items: center; }
.cc-test-root .hero__coin{ width: 72%; aspect-ratio: 1; border-radius: 50%; position: relative; animation: spin 26s linear infinite;
    background:
      radial-gradient(circle at 36% 30%, #ffffff55, transparent 40%),
      conic-gradient(from 200deg, var(--crimson), var(--indigo) 55%, var(--crimson-700) 85%, var(--crimson));
    box-shadow: var(--stamp), inset 0 0 0 3px rgba(255,255,255,.35), inset 0 0 0 12px rgba(0,0,0,.12); border: 2px solid var(--line-ink); }
.cc-test-root .hero__coin::before{ content:""; position:absolute; inset: 9%; border-radius:50%; border: 2px dashed rgba(255,255,255,.4); }
.cc-test-root .hero__coin span{ position:absolute; inset:0; display:grid; place-items:center; color:#fff; font-family:"Fraunces"; font-weight:800; font-size: clamp(30px,8vw,64px); letter-spacing:-.04em; animation: spin 26s linear infinite reverse; }
@keyframes spin{ to { transform: rotate(360deg); } }
.cc-test-root .hero__chip{ position: absolute; background: var(--surface); border: 2px solid var(--line-ink); border-radius: var(--r); padding: 8px 12px; font-family:"Space Mono"; font-size: 11.5px; font-weight: 700; box-shadow: var(--stamp-sm); }
.cc-test-root .hero__chip.c1{ top: 4%; left: -2%; }
.cc-test-root .hero__chip.c2{ bottom: 10%; right: -3%; color: var(--crimson); }
.cc-test-root .hero__chip.c3{ bottom: -2%; left: 12%; }
@media (prefers-reduced-motion: reduce){.cc-test-root .hero__coin, .cc-test-root .hero__coin span{ animation: none; }}
.cc-test-root .catlist{ border-top: 2px solid var(--line-ink); }
.cc-test-root .catrow{ display: grid; grid-template-columns: 54px 1fr auto auto; align-items: center; gap: 18px; padding: 22px 4px;
    border-bottom: 2px solid var(--line-ink); cursor: pointer; transition: padding .3s var(--ease), background .3s; position: relative; }
.cc-test-root .catrow:hover{ padding-left: 16px; background: var(--surface); }
.cc-test-root .catrow .no{ font-family: "Space Mono"; font-size: 13px; color: var(--ink-faint); }
.cc-test-root .catrow h3{ font-size: clamp(22px, 3.4vw, 36px); transition: color .25s; }
.cc-test-root .catrow:hover h3{ color: var(--crimson); }
.cc-test-root .catrow .ct{ font-family: "Space Mono"; font-size: 12px; color: var(--ink-faint); }
.cc-test-root .catrow .arw{ width: 40px; height: 40px; border: 2px solid var(--line-ink); border-radius: 50%; display: grid; place-items: center; transition: transform .25s var(--ease), background .25s, color .25s; }
.cc-test-root .catrow:hover .arw{ background: var(--crimson); color: #fff; transform: rotate(-45deg); }
.cc-test-root .catrow .swatch{ position:absolute; right: 150px; top:50%; transform: translateY(-50%) scale(.6); width: 56px; height: 56px; border-radius: var(--r); opacity: 0; transition: .3s var(--ease); box-shadow: var(--stamp-sm); }
.cc-test-root .catrow:hover .swatch{ opacity: 1; transform: translateY(-50%) scale(1); }
@media (max-width: 680px){.cc-test-root .catrow .swatch{ display:none; }
.cc-test-root .catrow{ grid-template-columns: 38px 1fr auto; }
.cc-test-root .catrow .ct{ display:none; }}
.cc-test-root .pgrid{ display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
.cc-test-root .prail{ display: grid; grid-auto-flow: column; grid-auto-columns: minmax(250px, 1fr); gap: 16px; overflow-x: auto; padding-bottom: 10px; scroll-snap-type: x mandatory; }
.cc-test-root .prail > *{ scroll-snap-align: start; }
.cc-test-root .cc-card{ background: var(--surface); border: 2px solid var(--line-ink); border-radius: var(--r); overflow: hidden; box-shadow: var(--stamp-sm); transition: transform .18s var(--ease), box-shadow .18s var(--ease); display: flex; flex-direction: column; }
.cc-test-root .cc-card:hover{ transform: translate(-3px,-3px); box-shadow: 6px 6px 0 var(--line-ink); }
.cc-test-root .cc-card__img{ aspect-ratio: 1/1; position: relative; display: grid; place-items: center; border-bottom: 2px solid var(--line-ink); cursor: pointer; }
.cc-test-root .cc-card__img .mint{ position: absolute; width: 60%; aspect-ratio: 1; border-radius: 50%; opacity: .92; box-shadow: inset 0 0 0 2px rgba(255,255,255,.3), inset 0 0 0 10px rgba(0,0,0,.08); }
.cc-test-root .cc-card__img .ring{ position:absolute; inset: 14%; border-radius: 50%; border: 2px dashed rgba(0,0,0,.15); }
.cc-test-root .cc-card__img .flag{ position: absolute; top: 10px; left: 10px; background: var(--ink); color: var(--surface); font-family:"Space Mono"; font-size: 10px; font-weight:700; padding: 4px 8px; border-radius: 3px; letter-spacing:.04em; }
.cc-test-root .cc-card__img .flag.sale{ background: var(--crimson); color: #fff; }
.cc-test-root .cc-card__wish{ position: absolute; top: 9px; right: 9px; width: 34px; height: 34px; border-radius: 50%; background: var(--surface); border: 2px solid var(--line-ink); display: grid; place-items: center; cursor: pointer; transition: .2s; }
.cc-test-root .cc-card__wish svg{ width: 16px; height: 16px; }
.cc-test-root .cc-card__wish.on{ background: var(--crimson); color: #fff; }
.cc-test-root .cc-card__body{ padding: 13px 14px 15px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
.cc-test-root .cc-card__body .kl{ font-family:"Space Mono"; font-size: 10.5px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .08em; }
.cc-test-root .cc-card__body h3{ font-family: "Inter"; font-size: 14.5px; font-weight: 650; letter-spacing: 0; cursor: pointer; }
.cc-test-root .stars{ color: var(--crimson); font-size: 12px; letter-spacing: 1px; }
.cc-test-root .stars small{ color: var(--ink-faint); font-family: "Space Mono"; margin-left: 5px; }
.cc-test-root .price{ display: flex; align-items: baseline; gap: 8px; margin-top: auto; padding-top: 8px; font-family: "Space Mono"; }
.cc-test-root .price .now{ font-weight: 700; font-size: 16px; }
.cc-test-root .price .was{ color: var(--ink-faint); text-decoration: line-through; font-size: 12px; }
.cc-test-root .price .off{ margin-left: auto; color: var(--crimson); font-weight: 700; font-size: 11px; }
.cc-test-root .cc-card .add{ margin: 0 14px 14px; }
.cc-test-root .tech{ background: var(--indigo); color: #efe9ff; border-block: 2px solid var(--line-ink); }
.cc-test-root[data-theme="dark"] .tech, .cc-test-root:not([data-theme="light"]) .tech{ background: #0b0718; }
.cc-test-root .tech .wrap{ padding-block: 60px; }
.cc-test-root .tech h2{ color: #fff; }
.cc-test-root .techgrid{ display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 30px; }
.cc-test-root .techcard{ border: 2px solid rgba(255,255,255,.18); border-radius: var(--r); padding: 20px; background: rgba(255,255,255,.04); transition: transform .2s var(--ease); }
.cc-test-root .techcard:hover{ transform: translateY(-4px); background: rgba(255,255,255,.08); }
.cc-test-root .techcard .mk{ width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--gold); color: var(--gold); display: grid; place-items: center; margin-bottom: 14px; }
.cc-test-root .techcard .mk svg{ width: 22px; height: 22px; }
.cc-test-root .techcard b{ color: #fff; font-size: 15px; display: block; margin-bottom: 5px; font-family: "Fraunces"; }
.cc-test-root .techcard span{ color: #c6bce4; font-size: 13px; }
.cc-test-root .revgrid{ display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.cc-test-root .rev{ border: 2px solid var(--line-ink); border-radius: var(--r); background: linear-gradient(160deg, color-mix(in srgb, var(--crimson) 8%, var(--surface)), var(--surface)); padding: 20px; box-shadow: var(--stamp-sm); }
.cc-test-root .rev__top{ display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.cc-test-root .rev .stars{ margin-bottom: 8px; }
.cc-test-root .rev p{ margin: 0; font-size: 14px; line-height: 1.55; }
.cc-test-root .rev .who{ display: flex; flex-direction: column; min-width: 0; }
.cc-test-root .rev .av{ width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 700; font-family: "Fraunces"; border: 2px solid var(--line-ink); flex: 0 0 auto; }
.cc-test-root .rev .who b{ font-size: 13.5px; }
.cc-test-root .rev .who span{ font-size: 11px; color: var(--ink-faint); font-family: "Space Mono"; }
.cc-test-root .rev .vbadge{ margin-left: auto; align-self: flex-start; font-family: "Space Mono"; font-size: 9.5px; font-weight: 700; letter-spacing: .04em; color: #fff; background: var(--teal); padding: 3px 8px; border-radius: 999px; flex: 0 0 auto; }
.cc-test-root .jgrid{ display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.cc-test-root .post{ border: 2px solid var(--line-ink); border-radius: var(--r); overflow: hidden; background: var(--surface); box-shadow: var(--stamp-sm); transition: transform .18s var(--ease), box-shadow .18s var(--ease); cursor: pointer; }
.cc-test-root .post:hover{ transform: translate(-3px,-3px); box-shadow: 6px 6px 0 var(--line-ink); }
.cc-test-root .post__img{ aspect-ratio: 16/10; border-bottom: 2px solid var(--line-ink); position: relative; }
.cc-test-root .post__b{ padding: 16px 16px 18px; }
.cc-test-root .post__b .m{ font-family:"Space Mono"; font-size: 11px; color: var(--crimson); text-transform: uppercase; letter-spacing: .06em; }
.cc-test-root .post__b h3{ font-family: "Inter"; font-size: 16px; font-weight: 650; margin-top: 7px; letter-spacing: -.01em; }
.cc-test-root .faq{ max-width: 820px; margin-inline: auto; }
.cc-test-root .qa{ border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); margin-bottom: 12px; box-shadow: var(--stamp-sm); overflow: hidden; }
.cc-test-root .qa__q{ width: 100%; text-align: left; background: none; border: none; padding: 17px 18px; font-size: 15px; font-weight: 650; font-family: "Fraunces"; color: var(--ink); cursor: pointer; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.cc-test-root .qa__q .pm{ width: 26px; height: 26px; border: 2px solid var(--line-ink); border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; transition: transform .25s var(--ease), background .25s, color .25s; }
.cc-test-root .qa.open .qa__q .pm{ background: var(--crimson); color: #fff; transform: rotate(45deg); }
.cc-test-root .qa__a{ max-height: 0; overflow: hidden; transition: max-height .3s var(--ease); }
.cc-test-root .qa__a > div{ padding: 0 18px 18px; color: var(--ink-soft); font-size: 14px; }
.cc-test-root .mint{ border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--crimson); color: #fff; padding: clamp(32px,5vw,58px); text-align: center; box-shadow: var(--stamp); position: relative; overflow: hidden; }
.cc-test-root .mint h2{ color: #fff; font-size: clamp(27px,3.8vw,44px); }
.cc-test-root .mint p{ color: #ffdbe1; max-width: 46ch; margin: 13px auto 24px; }
.cc-test-root .mintform{ display: flex; gap: 10px; max-width: 440px; margin: 0 auto; }
.cc-test-root .mintform input{ flex: 1; min-width: 0; border: 2px solid var(--line-ink); border-radius: var(--r); padding: 14px 16px; font-family: "Space Mono"; font-size: 13px; background: #fff; color: var(--ink); }
.cc-test-root .mintform .btn{ background: var(--indigo); color: #fff; }
.cc-test-root[data-theme="dark"] .mintform .btn, .cc-test-root:not([data-theme="light"]) .mintform .btn{ color: var(--paper); }
.cc-test-root footer.site{ background: var(--surface); border-top: 2px solid var(--line-ink); }
.cc-test-root .foot{ display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 30px; padding-block: 52px 30px; }
.cc-test-root .foot h4{ font-family: "Space Mono"; font-size: 11px; text-transform: uppercase; letter-spacing: .14em; color: var(--ink-faint); margin: 0 0 14px; }
.cc-test-root .foot a{ display: block; color: var(--ink-soft); font-size: 14px; padding: 5px 0; cursor: pointer; transition: color .2s, transform .2s; }
.cc-test-root .foot a:hover{ color: var(--crimson); transform: translateX(3px); }
.cc-test-root .foot .ab p{ color: var(--ink-soft); font-size: 14px; max-width: 32ch; }
.cc-test-root .foot .soc{ display: flex; gap: 9px; margin-top: 15px; }
.cc-test-root .foot .soc a{ width: 40px; height: 40px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; box-shadow: var(--stamp-sm); }
.cc-test-root .foot .soc a:hover{ background: var(--crimson); color: #fff; transform: translate(-2px,-2px); }
.cc-test-root .foot .soc svg{ width: 18px; height: 18px; }
.cc-test-root .footend{ border-top: 2px solid var(--line-ink); padding-block: 18px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-family: "Space Mono"; font-size: 11.5px; color: var(--ink-faint); }
.cc-test-root .shophead{ border-bottom: 2px solid var(--line-ink); padding-block: 30px; }
.cc-test-root .crumbs{ font-family:"Space Mono"; font-size: 11.5px; color: var(--ink-faint); }
.cc-test-root .crumbs span{ color: var(--crimson); }
.cc-test-root .shopbar{ display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 18px 0 26px; }
.cc-test-root .shopbar .dd.sort{ margin-left: auto; }
@media (max-width: 560px){ .cc-test-root .shopbar .dd.sort{ margin-left: 0; } }
.cc-test-root .chip{ font-family:"Space Mono"; font-size: 12px; font-weight: 700; padding: 8px 14px; border: 2px solid var(--line-ink); border-radius: 4px; background: var(--surface); cursor: pointer; box-shadow: var(--stamp-sm); transition: transform .14s, background .2s, color .2s; }
.cc-test-root .chip:hover{ transform: translate(-2px,-2px); }
.cc-test-root .chip.on{ background: var(--ink); color: var(--surface); }
.cc-test-root .sortsel{ margin-left: auto; font-family:"Space Mono"; font-size: 12px; padding: 9px 12px; border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); color: var(--ink); box-shadow: var(--stamp-sm); }
.cc-test-root .pd{ display: grid; grid-template-columns: 1.05fr .95fr; gap: 42px; padding-block: 36px; align-items: start; }
.cc-test-root .gallery{ position: sticky; top: 90px; }
.cc-test-root .gmain{ aspect-ratio: 1/1; border: 2px solid var(--line-ink); border-radius: var(--r); box-shadow: var(--stamp); position: relative; display: grid; place-items: center; overflow: hidden; }
.cc-test-root .gmain .mint{ width: 62%; aspect-ratio: 1; border-radius: 50%; box-shadow: inset 0 0 0 3px rgba(255,255,255,.3), inset 0 0 0 14px rgba(0,0,0,.08); }
.cc-test-root .gthumbs{ display: flex; gap: 10px; margin-top: 12px; }
.cc-test-root .gthumb{ width: 70px; height: 70px; flex: 0 0 auto; border: 2px solid var(--line-ink); border-radius: var(--r); cursor: pointer; display: grid; place-items: center; transition: transform .15s, border-color .15s; box-shadow: var(--stamp-sm); }
/* Selected thumb: crimson frame. A border (inside the box) shows reliably even
   inside the horizontally-scrolling .gthumbs; an outline/offset ring was being
   clipped by the scroll container. */
.cc-test-root .gthumb.on{ border-color: var(--crimson); box-shadow: 3px 3px 0 var(--crimson); }
.cc-test-root .gthumb:hover{ transform: translateY(-2px); }
.cc-test-root .gthumb .mint{ width: 60%; aspect-ratio: 1; border-radius: 50%; }
.cc-test-root .buy .kl{ font-family:"Space Mono"; font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--crimson); }
.cc-test-root .buy h1{ font-size: clamp(26px,4vw,40px); margin: 8px 0 10px; }
.cc-test-root .buy .prow{ display: flex; align-items: baseline; gap: 12px; font-family:"Space Mono"; margin: 14px 0 6px; }
.cc-test-root .buy .prow .now{ font-size: 26px; font-weight: 700; }
.cc-test-root .buy .prow .was{ color: var(--ink-faint); text-decoration: line-through; }
.cc-test-root .buy .prow .off{ background: var(--crimson); color: #fff; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 3px; }
.cc-test-root .buy .tax{ font-size: 12px; color: var(--ink-faint); font-family:"Space Mono"; }
.cc-test-root .optlabel{ font-family:"Space Mono"; font-size: 11.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); margin: 22px 0 10px; display: flex; justify-content: space-between; }
.cc-test-root .optlabel a{ color: var(--crimson); cursor: pointer; text-transform: none; letter-spacing: 0; font-weight: 700; }
.cc-test-root .swatches{ display: flex; gap: 10px; flex-wrap: wrap; }
.cc-test-root .sw{ width: 42px; height: 42px; border-radius: 50%; border: 2px solid var(--line-ink); cursor: pointer; position: relative; box-shadow: var(--stamp-sm); }
.cc-test-root .sw.on::after{ content:""; position: absolute; inset: -6px; border: 2px solid var(--crimson); border-radius: 50%; }
.cc-test-root .sizes{ display: flex; gap: 8px; flex-wrap: wrap; }
.cc-test-root .size{ min-width: 52px; padding: 11px 10px; text-align: center; border: 2px solid var(--line-ink); border-radius: var(--r); font-family:"Space Mono"; font-weight: 700; font-size: 13px; cursor: pointer; background: var(--surface); box-shadow: var(--stamp-sm); transition: transform .14s; }
.cc-test-root .size:hover{ transform: translate(-2px,-2px); }
.cc-test-root .size.on{ background: var(--ink); color: var(--surface); }
.cc-test-root .size.off{ opacity: .35; text-decoration: line-through; cursor: not-allowed; box-shadow: none; }
.cc-test-root .packs{ display: grid; gap: 10px; margin-top: 10px; }
.cc-test-root .pack{ display: flex; align-items: center; gap: 14px; border: 2px solid var(--line-ink); border-radius: var(--r); padding: 13px 15px; cursor: pointer; background: var(--surface); box-shadow: var(--stamp-sm); position: relative; transition: transform .14s; }
.cc-test-root .pack:hover{ transform: translate(-2px,-2px); }
.cc-test-root .pack.on{ outline: 2px solid var(--crimson); outline-offset: 2px; }
.cc-test-root .pack .radio{ width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line-ink); flex-shrink: 0; display: grid; place-items: center; }
.cc-test-root .pack.on .radio::after{ content:""; width: 10px; height: 10px; border-radius: 50%; background: var(--crimson); }
.cc-test-root .pack b{ font-family: "Fraunces"; font-size: 15px; }
.cc-test-root .pack .d{ font-size: 12.5px; color: var(--ink-soft); }
.cc-test-root .pack .pp{ margin-left: auto; text-align: right; font-family:"Space Mono"; }
.cc-test-root .pack .pp .pnow{ font-weight: 700; font-size: 16px; }
.cc-test-root .pack .pp .psave{ font-size: 11px; color: var(--crimson); font-weight: 700; }
.cc-test-root .pack .tagbest{ position: absolute; top: -11px; right: 14px; background: var(--indigo); color: #fff; font-family:"Space Mono"; font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 3px; letter-spacing: .06em; }
.cc-test-root[data-theme="dark"] .pack .tagbest, .cc-test-root:not([data-theme="light"]) .pack .tagbest{ color: var(--paper); }
.cc-test-root .qtyrow{ display: flex; gap: 12px; align-items: center; margin: 22px 0 14px; }
.cc-test-root .qty{ display: inline-flex; border: 2px solid var(--line-ink); border-radius: var(--r); box-shadow: var(--stamp-sm); overflow: hidden; }
.cc-test-root .qty button{ width: 42px; height: 46px; border: none; background: var(--surface); color: var(--ink); font-size: 18px; cursor: pointer; }
.cc-test-root .qty button:hover{ background: var(--paper-2); }
.cc-test-root .qty span{ width: 46px; display: grid; place-items: center; font-family:"Space Mono"; font-weight: 700; border-inline: 2px solid var(--line-ink); }
.cc-test-root .usps{ display: grid; gap: 10px; margin-top: 22px; }
.cc-test-root .usp{ display: flex; gap: 10px; align-items: center; font-size: 13.5px; }
.cc-test-root .usp svg{ width: 18px; height: 18px; color: var(--crimson); flex-shrink: 0; }
.cc-test-root .acc{ margin-top: 24px; border-top: 2px solid var(--line-ink); }
.cc-test-root .acc__i{ border-bottom: 2px solid var(--line-ink); }
.cc-test-root .acc__q{ width: 100%; background: none; border: none; padding: 16px 2px; font-family:"Fraunces"; font-weight: 650; font-size: 15px; color: var(--ink); display: flex; justify-content: space-between; cursor: pointer; }
.cc-test-root .acc__a{ max-height: 0; overflow: hidden; transition: max-height .3s var(--ease); }
.cc-test-root .acc__a > div{ padding: 0 2px 16px; color: var(--ink-soft); font-size: 14px; }
.cc-test-root .cartpage{ display: grid; grid-template-columns: 1.5fr .9fr; gap: 30px; padding-block: 36px; align-items: start; }
.cc-test-root .citem{ display: grid; grid-template-columns: 92px 1fr auto; gap: 16px; padding: 18px 0; border-bottom: 2px solid var(--line-ink); align-items: center; }
.cc-test-root .citem .th{ width: 92px; height: 92px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; box-shadow: var(--stamp-sm); }
.cc-test-root .citem .th .mint{ width: 62%; aspect-ratio: 1; border-radius: 50%; }
.cc-test-root .citem h3{ font-family:"Inter"; font-size: 15px; font-weight: 650; }
.cc-test-root .citem .meta{ font-family:"Space Mono"; font-size: 11.5px; color: var(--ink-faint); margin-top: 3px; }
.cc-test-root .citem .rm{ background: none; border: none; color: var(--ink-faint); font-family:"Space Mono"; font-size: 11.5px; cursor: pointer; margin-top: 8px; padding: 0; }
.cc-test-root .citem .rm:hover{ color: var(--crimson); }
.cc-test-root .citem .right{ text-align: right; display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
.cc-test-root .citem .lp{ font-family:"Space Mono"; font-weight: 700; }
.cc-test-root .summary{ border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); padding: 22px; box-shadow: var(--stamp); position: sticky; top: 90px; }
.cc-test-root .summary h3{ font-size: 18px; margin-bottom: 14px; }
.cc-test-root .srow{ display: flex; justify-content: space-between; font-family:"Space Mono"; font-size: 13.5px; padding: 7px 0; color: var(--ink-soft); }
.cc-test-root .srow.total{ border-top: 2px solid var(--line-ink); margin-top: 8px; padding-top: 12px; font-size: 18px; color: var(--ink); font-weight: 700; }
.cc-test-root .promo{ display: flex; gap: 8px; margin: 14px 0; }
.cc-test-root .promo input{ flex: 1; min-width: 0; border: 2px solid var(--line-ink); border-radius: var(--r); padding: 11px 12px; font-family:"Space Mono"; font-size: 12px; background: var(--surface); color: var(--ink); text-transform: uppercase; }
.cc-test-root .freebar{ height: 8px; border-radius: 99px; background: var(--paper-2); overflow: hidden; border: 2px solid var(--line-ink); margin: 6px 0 16px; }
.cc-test-root .freebar span{ display: block; height: 100%; background: var(--crimson); transition: width .4s var(--ease); }
.cc-test-root .cowrap{ display: grid; grid-template-columns: 1.5fr .9fr; gap: 30px; padding-block: 28px 56px; align-items: start; }
.cc-test-root .stepper{ display: flex; align-items: center; gap: 12px; margin: 22px 0 26px; }
.cc-test-root .stepper .st{ display: flex; align-items: center; gap: 10px; font-family: "Space Mono"; font-size: 12px; font-weight: 700; color: var(--ink-faint); text-transform: uppercase; letter-spacing: .06em; }
.cc-test-root .stepper .st .n{ width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--line-ink); display: grid; place-items: center; background: var(--surface); box-shadow: var(--stamp-sm); transition: .2s; }
.cc-test-root .stepper .st.on{ color: var(--ink); }
.cc-test-root .stepper .st.on .n{ background: var(--crimson); color: #fff; }
.cc-test-root .stepper .st.done .n{ background: var(--ink); color: var(--surface); }
.cc-test-root .stepper .bar{ flex: 1; height: 2px; background: var(--line-ink); }
.cc-test-root .costep{ border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); padding: 22px; box-shadow: var(--stamp); }
.cc-test-root .costep h3{ font-size: 19px; margin-bottom: 4px; }
.cc-test-root .costep .hint{ font-family:"Space Mono"; font-size: 11.5px; color: var(--ink-faint); margin-bottom: 16px; }
.cc-test-root .ffield{ display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.cc-test-root .ffield label{ font-family:"Space Mono"; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); }
.cc-test-root .ffield input{ border: 2px solid var(--line-ink); border-radius: var(--r); padding: 12px 13px; font-family: inherit; font-size: 14px; background: var(--surface); color: var(--ink); box-shadow: var(--stamp-sm); }
.cc-test-root .ffield input:focus{ outline: 2px solid var(--crimson); outline-offset: 1px; }
.cc-test-root .frow{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cc-test-root .pay{ display: grid; gap: 12px; }
.cc-test-root .payopt{ display: flex; align-items: center; gap: 13px; border: 2px solid var(--line-ink); border-radius: var(--r); padding: 15px; cursor: pointer; background: var(--surface); box-shadow: var(--stamp-sm); transition: transform .14s; }
.cc-test-root .payopt:hover{ transform: translate(-2px,-2px); }
.cc-test-root .payopt.on{ outline: 2px solid var(--crimson); outline-offset: 2px; }
.cc-test-root .payopt .radio{ width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line-ink); flex-shrink: 0; display: grid; place-items: center; }
.cc-test-root .payopt.on .radio::after{ content:""; width: 10px; height: 10px; border-radius: 50%; background: var(--crimson); }
.cc-test-root .payopt .pi{ width: 40px; height: 40px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; flex-shrink: 0; }
.cc-test-root .payopt .pi svg{ width: 20px; height: 20px; }
.cc-test-root .payopt b{ font-family: "Fraunces"; font-size: 15px; display: block; }
.cc-test-root .payopt .d{ font-size: 12.5px; color: var(--ink-soft); }
.cc-test-root .payopt .tag{ margin-left: auto; font-family:"Space Mono"; font-size: 10px; font-weight: 700; color: var(--crimson); border: 2px solid var(--crimson); border-radius: 3px; padding: 3px 7px; }
.cc-test-root .corow{ display: flex; gap: 10px; margin-top: 20px; }
.cc-test-root .coback{ background: none; border: none; color: var(--ink-soft); font-family:"Space Mono"; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.cc-test-root .coback:hover{ color: var(--crimson); }
.cc-test-root .miniitem{ display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 2px solid var(--line); }
.cc-test-root .miniitem .th{ width: 46px; height: 46px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; flex-shrink: 0; }
.cc-test-root .miniitem .th .mint{ width: 60%; aspect-ratio:1; border-radius:50%; }
.cc-test-root .miniitem .nm{ font-size: 13px; font-weight: 600; }
.cc-test-root .miniitem .mm{ font-family:"Space Mono"; font-size: 10.5px; color: var(--ink-faint); }
.cc-test-root .miniitem .lp{ margin-left: auto; font-family:"Space Mono"; font-weight: 700; font-size: 13px; }
.cc-test-root .cosuccess{ text-align: center; padding: 40px 10px; }
.cc-test-root .cosuccess .seal{ width: 84px; height: 84px; margin: 0 auto 18px; border-radius: 50%; display: grid; place-items: center; background: var(--crimson); color: #fff; box-shadow: var(--stamp); border: 2px solid var(--line-ink); }
.cc-test-root .cosuccess .seal svg{ width: 40px; height: 40px; }
@media (max-width: 860px){.cc-test-root .cowrap{ grid-template-columns: 1fr; }
.cc-test-root .cosummary{ position: static; }}
@media (max-width: 520px){.cc-test-root .frow{ grid-template-columns: 1fr; }}
.cc-test-root .scrim{ position: fixed; inset: 0; background: rgba(10,6,20,.5); z-index: 60; opacity: 0; pointer-events: none; transition: opacity .3s; }
.cc-test-root .scrim.on{ opacity: 1; pointer-events: auto; }
.cc-test-root .drawer{ position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 92vw); background: var(--surface); border-left: 2px solid var(--line-ink); z-index: 61; transform: translateX(100%); transition: transform .34s var(--ease); display: flex; flex-direction: column; padding-top: env(safe-area-inset-top,0px); }
.cc-test-root .drawer.on{ transform: none; }
.cc-test-root .drawer__h{ display: flex; align-items: center; justify-content: space-between; padding: 18px 18px; border-bottom: 2px solid var(--line-ink); }
.cc-test-root .drawer__h b{ font-family: "Fraunces"; font-size: 18px; }
.cc-test-root .drawer__body{ flex: 1; overflow-y: auto; padding: 8px 18px; }
.cc-test-root .drawer__foot{ border-top: 2px solid var(--line-ink); padding: 16px 18px calc(16px + env(safe-area-inset-bottom,0px)); }
.cc-test-root .ditem{ display: grid; grid-template-columns: 62px 1fr auto; gap: 12px; padding: 14px 0; border-bottom: 2px solid var(--line); align-items: center; }
.cc-test-root .ditem .th{ width: 62px; height: 62px; border: 2px solid var(--line-ink); border-radius: var(--r); display: grid; place-items: center; }
.cc-test-root .ditem .th .mint{ width: 60%; aspect-ratio:1; border-radius:50%; }
.cc-test-root .ditem h4{ font-family:"Inter"; font-size: 13.5px; font-weight: 600; margin: 0; }
.cc-test-root .ditem .m{ font-family:"Space Mono"; font-size: 11px; color: var(--ink-faint); }
.cc-test-root .ditem .lp{ font-family:"Space Mono"; font-weight: 700; font-size: 13px; }
.cc-test-root .mnav{ position: fixed; inset: 0; z-index: 62; background: var(--surface); transform: translateX(100%); transition: transform .32s var(--ease); display: flex; flex-direction: column; padding: 18px max(20px,env(safe-area-inset-left,0px)); }
.cc-test-root .mnav.on{ transform: none; }
.cc-test-root .mnav a{ font-family: "Fraunces"; font-size: 24px; font-weight: 700; padding: 16px 0; border-bottom: 2px solid var(--line); cursor: pointer; }
.cc-test-root #toast{ position: fixed; left: 50%; bottom: calc(22px + env(safe-area-inset-bottom,0px)); transform: translateX(-50%) translateY(16px); background: var(--ink); color: var(--surface); padding: 12px 20px; border-radius: var(--r); border: 2px solid var(--line-ink); font-family:"Space Mono"; font-size: 12.5px; font-weight: 700; box-shadow: var(--stamp); opacity: 0; pointer-events: none; transition: .28s var(--ease); z-index: 90; }
.cc-test-root #toast.on{ opacity: 1; transform: translateX(-50%) translateY(0); }
.cc-test-root .reveal{ opacity: 0; transform: translateY(20px); transition: opacity .6s var(--ease), transform .6s var(--ease); }
.cc-test-root .reveal.in{ opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce){.cc-test-root .reveal{ opacity:1; transform:none; transition:none; }
.cc-test-root *{ animation: none !important; }}
@media (max-width: 1000px){.cc-test-root .pgrid, .cc-test-root .techgrid{ grid-template-columns: repeat(2,1fr); }
.cc-test-root .revgrid, .cc-test-root .jgrid{ grid-template-columns: 1fr; }}
@media (max-width: 860px){.cc-test-root .nav__links{ display: none; }
.cc-test-root .burger{ display: grid; }
.cc-test-root .hero .wrap{ grid-template-columns: 1fr; padding-block: 44px 54px; }
.cc-test-root .hero__art{ max-width: 400px; margin: 10px auto 0; order: -1; }
.cc-test-root .pd{ grid-template-columns: 1fr; }
.cc-test-root .gallery{ position: static; }
.cc-test-root .cartpage{ grid-template-columns: 1fr; }
.cc-test-root .summary{ position: static; }
.cc-test-root .foot{ grid-template-columns: 1fr 1fr; }
.cc-test-root .foot .ab{ grid-column: 1/-1; }}
@media (max-width: 520px){.cc-test-root .pgrid{ grid-template-columns: 1fr 1fr; }
.cc-test-root section.block{ padding-block: 48px; }
.cc-test-root .sechead{ flex-direction: column; align-items: flex-start; }
.cc-test-root .citem{ grid-template-columns: 70px 1fr; }
.cc-test-root .citem .right{ grid-column: 1/-1; flex-direction: row; justify-content: space-between; align-items: center; }
.cc-test-root .mintform{ flex-direction: column; }}
@media (max-width: 380px){.cc-test-root .pgrid, .cc-test-root .techgrid{ grid-template-columns: 1fr; }}

/* --- PDP: gallery zoom, lightbox, sticky buy bar, size-chart modal, review form --- */
.cc-test-root .gmain{ position: relative; }
.cc-test-root .gzoom{ position: absolute; right: 10px; bottom: 10px; width: 34px; height: 34px; display: grid; place-items: center; background: var(--surface); border: 2px solid var(--line-ink); border-radius: 50%; color: var(--ink); box-shadow: var(--stamp-sm); pointer-events: none; }

.cc-test-root .pdpsticky{ position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; transform: translateY(120%); transition: transform .28s var(--ease); background: var(--surface); border-top: 2px solid var(--line-ink); box-shadow: 0 -6px 20px rgba(24,13,62,.16); padding-bottom: env(safe-area-inset-bottom,0px); }
.cc-test-root .pdpsticky.on{ transform: translateY(0); }
.cc-test-root .pdpsticky__in{ display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-block: 10px; }
.cc-test-root .pdpsticky__p{ display: flex; align-items: center; gap: 10px; min-width: 0; }
.cc-test-root .pdpsticky__thumb{ width: 46px; height: 46px; border: 2px solid var(--line-ink); border-radius: var(--r); overflow: hidden; flex: 0 0 auto; }
.cc-test-root .pdpsticky__thumb img{ width: 100%; height: 100%; object-fit: cover; }
.cc-test-root .pdpsticky__meta{ display: flex; flex-direction: column; min-width: 0; }
.cc-test-root .pdpsticky__meta b{ font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 42vw; }
.cc-test-root .pdpsticky__meta span{ font-family: "Space Mono"; color: var(--crimson); font-size: 13px; }
.cc-test-root .pdpsticky__btns{ display: flex; gap: 8px; flex: 0 0 auto; }
.cc-test-root .pdpsticky__btns .btn{ padding: 11px 16px; font-size: 12.5px; }
@media (max-width: 480px){ .cc-test-root .pdpsticky__btns .btn{ padding: 11px 13px; } .cc-test-root .pdpsticky__meta b{ max-width: 34vw; } }

.cc-test-root .lbox{ position: fixed; inset: 0; z-index: 90; background: rgba(10,6,24,.86); display: grid; place-items: center; padding: 24px; }
.cc-test-root .lbox__img{ max-width: min(92vw,720px); max-height: 84vh; border: 2px solid #fff; border-radius: var(--r); overflow: hidden; background: #fff; }
.cc-test-root .lbox__img img{ width: 100%; height: auto; max-height: 84vh; object-fit: contain; display: block; }
.cc-test-root .lbox__x{ position: absolute; top: calc(16px + env(safe-area-inset-top,0px)); right: 16px; width: 44px; height: 44px; border-radius: 50%; border: 2px solid #fff; background: transparent; color: #fff; display: grid; place-items: center; cursor: pointer; }
.cc-test-root .lbox__nav{ position: absolute; top: 50%; transform: translateY(-50%); width: 48px; height: 48px; border-radius: 50%; border: 2px solid #fff; background: rgba(0,0,0,.3); color: #fff; font-size: 30px; line-height: 1; cursor: pointer; }
.cc-test-root .lbox__prev{ left: 14px; } .cc-test-root .lbox__next{ right: 14px; }

.cc-test-root .scmodal{ position: fixed; inset: 0; z-index: 90; background: rgba(10,6,24,.6); display: grid; place-items: center; padding: 20px; }
.cc-test-root .scmodal__card{ background: var(--surface); border: 2px solid var(--line-ink); border-radius: var(--r); box-shadow: var(--stamp); max-width: 460px; width: 100%; padding: 22px; }
.cc-test-root .scmodal__head{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.cc-test-root .scmodal__head h3{ font-size: 18px; }
.cc-test-root .scmodal__head button{ background: none; border: none; cursor: pointer; color: var(--ink); }
.cc-test-root .scmodal__note{ color: var(--ink-soft); font-size: 13px; margin: 0 0 14px; }
.cc-test-root .sctable{ width: 100%; border-collapse: collapse; font-size: 13px; }
.cc-test-root .sctable th, .cc-test-root .sctable td{ border: 1.5px solid var(--line); padding: 8px 10px; text-align: left; }
.cc-test-root .sctable th{ background: var(--paper-2); font-family: "Space Mono"; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
.cc-test-root .scmodal__tip{ color: var(--ink-faint); font-size: 12px; font-family: "Space Mono"; margin: 12px 0 0; }

.cc-test-root .rvform{ border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); box-shadow: var(--stamp-sm); padding: 18px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px; }
.cc-test-root .rvform__stars{ display: flex; gap: 4px; }
.cc-test-root .rvstar{ background: none; border: none; font-size: 26px; line-height: 1; color: var(--line); cursor: pointer; padding: 0; }
.cc-test-root .rvstar.on{ color: var(--gold); }
.cc-test-root .rvform__grid{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.cc-test-root .rvform input, .cc-test-root .rvform textarea{ border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--bg); color: var(--ink); padding: 11px 12px; font: inherit; font-size: 13.5px; width: 100%; }
.cc-test-root .rvform textarea{ resize: vertical; }
@media (max-width: 520px){ .cc-test-root .rvform__grid{ grid-template-columns: 1fr; } }

/* --- Marketing modals: exit-intent + phone lead popup --- */
.cc-test-root .mkmodal{ position: fixed; inset: 0; z-index: 95; background: rgba(10,6,24,.62); display: grid; place-items: center; padding: 20px; }
.cc-test-root .mkmodal__card{ position: relative; background: var(--surface); border: 2px solid var(--line-ink); border-radius: var(--r); box-shadow: var(--stamp); max-width: 400px; width: 100%; padding: 28px 24px 24px; }
.cc-test-root .mkmodal__x{ position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--line-ink); background: var(--surface); color: var(--ink); display: grid; place-items: center; cursor: pointer; }
.cc-test-root .mkmodal__h{ font-family: "Fraunces", serif; font-weight: 700; font-size: 24px; margin: 8px 0 8px; text-wrap: balance; }
.cc-test-root .mkmodal__d{ color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 0 0 16px; }
.cc-test-root .mkcode{ display: flex; align-items: center; justify-content: center; gap: 10px; font-family: "Space Mono", monospace; font-weight: 700; font-size: 18px; letter-spacing: .1em; color: var(--crimson); border: 2px dashed var(--crimson); border-radius: var(--r); padding: 12px; margin-bottom: 16px; }
.cc-test-root .mkcode span{ font-size: 10.5px; letter-spacing: .05em; color: var(--ink-faint); border-left: 1.5px solid var(--line); padding-left: 10px; }
.cc-test-root .mklater{ display: block; width: 100%; margin-top: 10px; background: none; border: none; color: var(--ink-faint); font-family: "Space Mono", monospace; font-size: 11.5px; cursor: pointer; }

/* --- PDP per-pair colour picker (multi-pair packs) --- */
.cc-test-root .perpair{ margin-top: 6px; border: 2px solid var(--line); border-radius: var(--r); padding: 12px 14px; background: color-mix(in srgb, var(--gold) 6%, var(--surface)); }
.cc-test-root .perpair__row{ display: flex; align-items: center; gap: 12px; padding: 6px 0; }
.cc-test-root .perpair__n{ font-family: "Space Mono", monospace; font-size: 11px; color: var(--ink-faint); min-width: 54px; }
.cc-test-root .perpair__sw{ display: flex; flex-wrap: wrap; gap: 7px; }
.cc-test-root .perpair__dot{ width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--line-ink); cursor: pointer; padding: 0; }
.cc-test-root .perpair__dot.on{ box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--crimson); }

/* --- Cart bundle-pack group card --- */
.cc-test-root .packcolors{ display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 6px 0; }
.cc-test-root .packcolors__c{ display: inline-flex; align-items: center; gap: 6px; font-family: "Space Mono", monospace; font-size: 11px; color: var(--ink-soft); }
.cc-test-root .packcolors__c i{ width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid var(--line-ink); display: inline-block; }

/* --- Custom open/close dropdown (Stamped "A" style) --- */
.cc-test-root .dd{ position: relative; }
.cc-test-root .dd.sort{ width: 210px; max-width: 100%; }
.cc-test-root .dd__btn{ display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; cursor: pointer; text-align: left; font-family: "Space Mono", monospace; font-size: 14px; color: var(--ink); background: var(--surface); border: 2px solid var(--line-ink); border-radius: var(--r); box-shadow: var(--stamp-sm); padding: 13px 15px; }
.cc-test-root .dd.open .dd__btn, .cc-test-root .dd__btn:focus-visible{ outline: none; box-shadow: var(--stamp-sm), 0 0 0 3px color-mix(in srgb, var(--crimson) 45%, transparent); }
.cc-test-root .dd__chev{ flex: 0 0 auto; transition: transform .2s ease; font-size: 12px; line-height: 1; color: var(--ink-soft); }
.cc-test-root .dd.open .dd__chev{ transform: rotate(180deg); }
/* Panel grows to fit the longest option on one line (full category names on PC),
   never narrower than its button, capped so it can't overflow the viewport. */
.cc-test-root .dd__panel{ position: absolute; top: calc(100% + 6px); left: 0; right: auto; min-width: 100%; width: max-content; max-width: min(92vw, 520px); z-index: 20; background: var(--surface); border: 2px solid var(--line-ink); border-radius: var(--r); box-shadow: var(--stamp); padding: 5px; opacity: 0; transform: translateY(-6px) scaleY(.98); transform-origin: top; pointer-events: none; transition: opacity .16s ease, transform .16s ease; max-height: 320px; overflow: auto; }
.cc-test-root .dd.sort .dd__panel{ left: auto; right: 0; }
.cc-test-root .dd.open .dd__panel{ opacity: 1; transform: none; pointer-events: auto; }
.cc-test-root .dd__opt{ display: flex; align-items: center; justify-content: space-between; gap: 14px; width: 100%; white-space: nowrap; text-align: left; background: none; border: none; font-family: "Space Mono", monospace; font-size: 13.5px; color: var(--ink); padding: 10px 12px; border-radius: 2px; cursor: pointer; }
.cc-test-root .dd__opt:hover{ background: var(--paper-2); }
.cc-test-root .dd__opt.sel{ color: var(--crimson); font-weight: 700; }
.cc-test-root .dd__opt .tick{ opacity: 0; font-size: 12px; }
.cc-test-root .dd__opt.sel .tick{ opacity: 1; }

/* --- Home coupon strip (real live coupons, tap to copy) --- */
.cc-test-root .coupstrip{ overflow: hidden; border-block: 2px solid var(--line-ink); background: var(--indigo); }
.cc-test-root .coupstrip__track{ display: flex; gap: 0; width: max-content; animation: cccoup 32s linear infinite; }
.cc-test-root .coupstrip:hover .coupstrip__track{ animation-play-state: paused; }
.cc-test-root .coupstrip__item{ display: inline-flex; align-items: center; gap: 10px; padding: 13px 26px; background: none; border: none; border-right: 1px dashed rgba(255,255,255,.22); color: #efe9ff; cursor: pointer; font-family: "Space Mono", monospace; white-space: nowrap; }
.cc-test-root .coupstrip__tag{ font-size: 12px; opacity: .85; }
.cc-test-root .coupstrip__code{ font-weight: 700; font-size: 13px; letter-spacing: .08em; color: var(--gold); border: 1.5px dashed var(--gold); border-radius: var(--r); padding: 3px 9px; }
.cc-test-root .coupstrip__min{ font-size: 11px; opacity: .7; }
@keyframes cccoup{ from{ transform: translateX(0); } to{ transform: translateX(-50%); } }

/* --- Header typeahead search --- */
.cc-test-root .hsearch{ border-top: 2px solid var(--line); background: var(--surface); box-shadow: 0 8px 20px rgba(24,13,62,.1); }
.cc-test-root .hsearch__in{ padding-block: 14px; }
.cc-test-root .hsearch__bar{ display: flex; align-items: center; gap: 10px; border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--bg); padding: 10px 14px; color: var(--ink-faint); }
.cc-test-root .hsearch__bar input{ flex: 1; min-width: 0; border: none; background: none; color: var(--ink); font: inherit; font-size: 15px; outline: none; }
.cc-test-root .hsearch__x{ background: none; border: none; color: var(--ink-faint); cursor: pointer; display: grid; place-items: center; }
.cc-test-root .hsearch__res{ margin-top: 10px; display: flex; flex-direction: column; gap: 2px; max-height: 60vh; overflow-y: auto; }
.cc-test-root .hsearch__row{ display: flex; align-items: center; gap: 12px; padding: 8px; background: none; border: none; border-radius: var(--r); cursor: pointer; text-align: left; }
.cc-test-root .hsearch__row:hover{ background: var(--paper-2); }
.cc-test-root .hsearch__thumb{ width: 44px; height: 44px; border: 2px solid var(--line-ink); border-radius: var(--r); overflow: hidden; flex: 0 0 auto; }
.cc-test-root .hsearch__thumb img{ width: 100%; height: 100%; object-fit: cover; }
.cc-test-root .hsearch__meta{ display: flex; flex-direction: column; min-width: 0; }
.cc-test-root .hsearch__meta b{ font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cc-test-root .hsearch__meta span{ font-family: "Space Mono"; color: var(--crimson); font-size: 13px; }
.cc-test-root .hsearch__empty{ color: var(--ink-faint); font-size: 13px; padding: 10px 4px; }
.cc-test-root .hsearch__all{ margin-top: 6px; background: none; border: none; color: var(--crimson); font-family: "Space Mono"; font-size: 12.5px; font-weight: 700; cursor: pointer; text-align: left; padding: 8px; }

/* --- Shop: facet sidebar + pagination --- */
.cc-test-root .shoplayout{ display: grid; grid-template-columns: 240px 1fr; gap: 28px; align-items: start; }
.cc-test-root .shopaside{ position: sticky; top: 90px; }
.cc-test-root .shopfilters{ display: flex; flex-direction: column; gap: 20px; }
.cc-test-root .shopfilters__grp{ display: flex; flex-direction: column; gap: 8px; border-bottom: 2px solid var(--line); padding-bottom: 18px; }
.cc-test-root .shopfilters__h{ font-family: "Space Mono"; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 2px; }
.cc-test-root .facetrow{ text-align: left; background: none; border: none; padding: 5px 0; font-size: 13.5px; color: var(--ink-soft); cursor: pointer; font-family: inherit; }
.cc-test-root .facetrow.on{ color: var(--crimson); font-weight: 700; }
.cc-test-root .facetcheck{ display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: var(--ink-soft); cursor: pointer; padding: 4px 0; }
.cc-test-root .facetcheck input{ width: 17px; height: 17px; accent-color: var(--crimson); cursor: pointer; flex: 0 0 auto; }
.cc-test-root .facetcheck span{ min-width: 0; }
.cc-test-root .pricerow{ display: flex; align-items: center; gap: 8px; }
.cc-test-root .pricerow input{ width: 100%; border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--bg); color: var(--ink); padding: 8px 10px; font: inherit; font-size: 13px; }
.cc-test-root .pricerange{ width: 100%; accent-color: var(--crimson); }
.cc-test-root .swatchwrap{ display: flex; flex-direction: column; gap: 6px; }
.cc-test-root .swatchbtn{ display: flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 13px; color: var(--ink-soft); padding: 3px 0; }
.cc-test-root .swatchbtn span{ width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--line-ink); flex: 0 0 auto; }
.cc-test-root .swatchbtn.on{ color: var(--crimson); font-weight: 700; }
.cc-test-root .swatchbtn.on span{ box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--crimson); }
.cc-test-root .sizewrap{ display: flex; flex-wrap: wrap; gap: 8px; }
.cc-test-root .shopbar__count{ color: var(--ink-faint); font-size: 12px; margin-right: auto; }
.cc-test-root .shopbar__filter{ display: none; align-items: center; gap: 6px; padding: 9px 14px; font-size: 12.5px; }
.cc-test-root .pager{ display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; margin-top: 34px; }
.cc-test-root .pager .btn{ padding: 9px 14px; font-size: 12.5px; }
.cc-test-root .pager__n{ width: 38px; height: 38px; border: 2px solid var(--line-ink); background: var(--surface); color: var(--ink); border-radius: var(--r); cursor: pointer; font-family: "Space Mono"; font-size: 13px; }
.cc-test-root .pager__n.on{ background: var(--crimson); color: #fff; }
@media (max-width: 820px){
  .cc-test-root .shoplayout{ grid-template-columns: 1fr; }
  .cc-test-root .shopaside{ position: static; max-height: 0; overflow: hidden; transition: max-height .3s var(--ease); }
  .cc-test-root .shopaside.open{ max-height: 1200px; margin-bottom: 20px; }
  .cc-test-root .shopbar__filter{ display: inline-flex; }
}
/* --- Auth (login/register), thank-you, account hub (preview pages) --- */
.cc-test-root .authwrap{ display: grid; grid-template-columns: minmax(0,420px) 1fr; gap: 34px; align-items: start; max-width: 860px; margin: 0 auto; padding-block: 36px 70px; }
@media (max-width: 760px){ .cc-test-root .authwrap{ grid-template-columns: 1fr; gap: 20px; } }
.cc-test-root .authcard{ border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); box-shadow: var(--stamp); padding: 26px; }
.cc-test-root .authcard__h{ font-family: "Fraunces", serif; font-weight: 700; font-size: 26px; margin: 8px 0 6px; }
.cc-test-root .authcard__d{ color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 0 0 18px; }
.cc-test-root .authcard__alt{ margin-top: 18px; font-size: 13.5px; color: var(--ink-soft); }
.cc-test-root .authcard__alt a, .cc-test-root .authlink{ color: var(--crimson); font-weight: 600; cursor: pointer; background: none; border: none; font: inherit; padding: 0; }
.cc-test-root .authcard__note{ margin-top: 14px; font-size: 11px; color: var(--ink-faint); border-top: 1.5px solid var(--line); padding-top: 12px; }
.cc-test-root .authcard .ffield textarea{ width: 100%; border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--bg); color: var(--ink); padding: 11px 12px; font: inherit; font-size: 13.5px; resize: vertical; }
.cc-test-root .phoneinput{ display: flex; align-items: stretch; border: 2px solid var(--line-ink); border-radius: var(--r); overflow: hidden; background: var(--bg); }
.cc-test-root .phoneinput__cc{ display: grid; place-items: center; padding: 0 12px; font-family: "Space Mono", monospace; font-size: 13px; color: var(--ink-soft); background: var(--paper-2); border-right: 2px solid var(--line-ink); }
.cc-test-root .phoneinput input{ flex: 1; min-width: 0; border: none !important; background: transparent !important; box-shadow: none !important; padding: 12px 13px; font: inherit; font-size: 14px; color: var(--ink); }
.cc-test-root .otpboxes{ display: flex; gap: 8px; }
.cc-test-root .otpbox{ flex: 1; min-width: 0; aspect-ratio: 1 / 1; max-width: 52px; text-align: center; font-family: "Space Mono", monospace; font-size: 20px; font-weight: 700; color: var(--ink); border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--bg); box-shadow: var(--stamp-sm); }
.cc-test-root .otpbox:focus{ outline: none; border-color: var(--crimson); box-shadow: var(--stamp-sm), 0 0 0 3px color-mix(in srgb, var(--crimson) 35%, transparent); }
.cc-test-root .agecheck{ display: flex; align-items: center; gap: 9px; margin-top: 14px; font-size: 13px; color: var(--ink-soft); cursor: pointer; }
.cc-test-root .agecheck input{ width: 17px; height: 17px; accent-color: var(--crimson); flex: 0 0 auto; }
.cc-test-root .filefield{ font-family: "Space Mono", monospace; font-size: 12px; width: 100%; }
.cc-test-root .authperks{ list-style: none; margin: 0; padding: 18px 0 0; display: flex; flex-direction: column; gap: 14px; }
.cc-test-root .authperks li{ display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--ink-soft); }
.cc-test-root .authperks svg{ color: var(--crimson); flex: 0 0 auto; }
.cc-test-root .tyseal{ width: 72px; height: 72px; margin: 0 auto; border-radius: 50%; display: grid; place-items: center; color: #fff; background: var(--crimson); border: 2px solid var(--line-ink); box-shadow: var(--stamp); }
.cc-test-root .acctsignin{ display: flex; align-items: center; gap: 16px; flex-wrap: wrap; border: 2px solid var(--line-ink); border-radius: var(--r); background: var(--surface); box-shadow: var(--stamp-sm); padding: 18px; margin-top: 18px; }
.cc-test-root .acctsignin__ic{ width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: var(--paper-2); border: 2px solid var(--line-ink); color: var(--crimson); flex: 0 0 auto; }
.cc-test-root .acctsignin__t{ flex: 1 1 220px; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.cc-test-root .acctsignin__t b{ font-size: 15px; }
.cc-test-root .acctsignin__t span{ font-size: 13px; color: var(--ink-soft); line-height: 1.5; }
.cc-test-root .acctsignin__btns{ display: flex; gap: 8px; flex-wrap: wrap; }
.cc-test-root .acctorders{ margin-top: 24px; }
.cc-test-root .acctempty{ border: 2px dashed var(--line); border-radius: var(--r); padding: 18px; font-size: 13px; color: var(--ink-faint); }

.cc-test-root{min-height:100vh;}`;
