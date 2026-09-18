import type { Posture } from "./types";

const CSS = `
:root{
  --bg:#28044A; --bg-deep:#1b0233; --brand:#4a1fb8; --violet:#9179eb;
  --mint:#A6FFA3; --pink:#ff5ac8;
  --text:rgba(255,255,255,.86); --muted:rgba(255,255,255,.55); --soft:rgba(255,255,255,.72);
  --glass:rgba(255,255,255,.08); --glass-strong:rgba(255,255,255,.14);
  --stroke:rgba(255,255,255,.18); --stroke-soft:rgba(255,255,255,.10);
  --mono:"SFMono-Regular",ui-monospace,Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
/* The base colour lives on <html> so no part of a long page can fall back to
   white: a fixed-attachment background on <body> only paints the viewport. */
html{background:var(--bg-deep);color-scheme:dark}
body{
  margin:0; padding:0; color:var(--text);
  font-family:Signika,"Segoe UI",system-ui,-apple-system,sans-serif;
  background:
    radial-gradient(120% 90% at 15% -10%, rgba(145,121,235,.38), transparent 60%),
    radial-gradient(100% 80% at 90% 0%, rgba(255,90,200,.18), transparent 55%),
    linear-gradient(180deg,var(--bg) 0%, var(--bg-deep) 100%);
  background-attachment:fixed; background-repeat:no-repeat; min-height:100vh;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1020px;margin:0 auto;padding:clamp(20px,4vw,44px) 18px 64px}
header.hero{margin-bottom:30px}
.eyebrow{
  display:inline-flex;align-items:center;gap:8px;font-size:.74rem;letter-spacing:.14em;
  text-transform:uppercase;color:var(--mint);border:1px solid rgba(166,255,163,.32);
  background:rgba(166,255,163,.08);padding:5px 11px;border-radius:999px;margin-bottom:16px;
}
h1{font-size:clamp(1.65rem,4.4vw,2.7rem);line-height:1.12;margin:0 0 12px;font-weight:650;letter-spacing:-.02em}
h1 .accent{background:linear-gradient(100deg,var(--mint),var(--violet));-webkit-background-clip:text;background-clip:text;color:transparent}
.lede{color:var(--soft);font-size:clamp(.96rem,1.6vw,1.06rem);line-height:1.62;max-width:62ch;margin:0}
.card{
  background:var(--glass);border:1px solid var(--stroke);border-radius:16px;
  padding:clamp(16px,2.6vw,24px);margin:20px 0;
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  box-shadow:0 1px 0 rgba(255,255,255,.14) inset, 0 10px 34px rgba(20,0,60,.30);
}
h2{font-size:1.16rem;margin:0 0 4px;font-weight:620;letter-spacing:-.01em;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
h2 .num{
  font-family:var(--mono);font-size:.72rem;color:var(--bg-deep);background:var(--mint);
  border-radius:6px;padding:2px 7px;font-weight:700;
}
.sub{color:var(--muted);font-size:.87rem;margin:0 0 16px;line-height:1.55}
.tablewrap{overflow-x:auto;border:1px solid var(--stroke-soft);border-radius:12px}
table{border-collapse:collapse;width:100%;min-width:660px;font-size:.8rem}
th{
  text-align:left;padding:10px 12px;font-weight:600;font-size:.68rem;letter-spacing:.09em;
  text-transform:uppercase;color:var(--muted);background:rgba(255,255,255,.05);
  border-bottom:1px solid var(--stroke-soft);white-space:nowrap;
}
td{padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top;line-height:1.5}
tr:last-child td{border-bottom:none}
code,.mono{font-family:var(--mono);font-size:.76rem}
td .expr{color:var(--mint);word-break:break-word;display:block;max-width:44ch}
.pill{
  display:inline-block;font-size:.66rem;padding:3px 8px;border-radius:999px;white-space:nowrap;
  font-weight:600;letter-spacing:.03em;border:1px solid transparent;
}
.pill.zone{background:rgba(255,90,200,.15);color:#ffb7e6;border-color:rgba(255,90,200,.35)}
.pill.host{background:rgba(145,121,235,.18);color:#cfc2ff;border-color:rgba(145,121,235,.4)}
.pill.on{background:rgba(166,255,163,.14);color:var(--mint);border-color:rgba(166,255,163,.35)}
.pill.off{background:rgba(255,255,255,.08);color:var(--muted);border-color:var(--stroke-soft)}
.act{font-family:var(--mono);font-size:.72rem;color:#ffd9a0;white-space:nowrap}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}
button{
  font:inherit;font-size:.85rem;font-weight:560;cursor:pointer;color:var(--bg-deep);
  background:linear-gradient(180deg,#d6ffd4,var(--mint));
  border:1px solid rgba(255,255,255,.45);border-radius:11px;padding:11px 14px;
  box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 4px 14px rgba(166,255,163,.22);
  transition:transform .12s ease, box-shadow .12s ease, opacity .12s ease;width:100%;
}
button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 8px 22px rgba(166,255,163,.4)}
button:active:not(:disabled){transform:translateY(0)}
button:disabled{opacity:.5;cursor:progress}
button.ghost{
  background:var(--glass-strong);color:var(--text);border-color:var(--stroke);
  box-shadow:0 1px 0 rgba(255,255,255,.18) inset;
}
.out{
  margin-top:14px;font-family:var(--mono);font-size:.76rem;line-height:1.65;
  background:rgba(0,0,0,.30);border:1px solid var(--stroke-soft);border-radius:11px;
  padding:13px 14px;white-space:pre-wrap;word-break:break-word;color:var(--soft);
  min-height:46px;max-height:340px;overflow:auto;
}
.out .ok{color:var(--mint)} .out .bad{color:#ff9db0} .out .dim{color:var(--muted)}
.field{width:100%;font:inherit;font-size:.86rem;color:var(--text);background:rgba(0,0,0,.26);
  border:1px solid var(--stroke);border-radius:11px;padding:11px 13px;margin-bottom:10px;resize:vertical}
.field:focus{outline:none;border-color:rgba(166,255,163,.5)}
select.field{cursor:pointer}
select.field option{background:var(--bg-deep);color:var(--text)}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:4px}
.row button{width:auto;min-width:168px;flex:0 1 auto}
.ts-holder{margin:10px 0 2px;min-height:0}
.settings{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.setting{
  background:rgba(0,0,0,.24);border:1px solid var(--stroke-soft);border-radius:10px;
  padding:8px 12px;font-size:.77rem;display:flex;gap:8px;align-items:center;
}
.setting b{font-weight:600;color:var(--text)} .setting span{font-family:var(--mono);color:var(--mint);font-size:.73rem}
.note{
  font-size:.79rem;color:var(--muted);line-height:1.6;margin-top:14px;
  border-left:2px solid rgba(145,121,235,.5);padding-left:12px;
}
footer{margin-top:40px;padding-top:22px;border-top:1px solid var(--stroke-soft);
  display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;
  font-size:.83rem;color:var(--muted)}
footer a{color:var(--mint);text-decoration:none;border-bottom:1px solid rgba(166,255,163,.3)}
footer a:hover{border-bottom-color:var(--mint)}
.built{font-size:.79rem;color:var(--muted)}
@media(max-width:560px){
  .row button{width:100%;min-width:0}
  .wrap{padding-left:16px;padding-right:16px}
}
`;

// Client-side script. Written without template literals so it can live inside
// this module's template literal without escaping games.
const JS = `
var $=function(s){return document.querySelector(s)};
function esc(s){return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
function ray(r){var v=r.headers.get('cf-ray');return v?' <span class="dim">cf-ray '+esc(v)+'</span>':''}
function cls(code){return (code>=200&&code<300)?'ok':'bad'}
function line(label,code,extra,r){
  return '<span class="'+cls(code)+'">'+esc(label)+' &rarr; '+code+'</span>'+(extra?' '+extra:'')+(r?ray(r):'');
}
function busy(btn,fn){
  btn.disabled=true;
  Promise.resolve().then(fn).catch(function(e){console.error(e)}).then(function(){btn.disabled=false});
}

function probe(btn,path,opts,label,outSel){
  var out=$(outSel);
  busy(btn,function(){
    out.innerHTML='<span class="dim">requesting '+esc(path)+' ...</span>';
    var t=Date.now();
    return fetch(path,opts||{}).then(function(r){
      var ms=Date.now()-t;
      out.innerHTML=line(label,r.status,'<span class="dim">'+ms+'ms</span>',r);
      if(r.status===403){out.innerHTML+='\\n<span class="dim">blocked by a Terraform-managed WAF custom rule</span>'}
    }).catch(function(e){out.innerHTML='<span class="bad">network error: '+esc(e.message)+'</span>'});
  });
}

function burst(btn){
  var out=$('#out-burst');
  busy(btn,function(){
    out.innerHTML='<span class="dim">sending 30 requests to /api/ping ...</span>';
    // Sequential on purpose. Fired in parallel, all 30 can reach the edge
    // before the rate-limit counter catches up, and every one comes back 200.
    var rs=[];
    function step(i){
      if(i>=30)return Promise.resolve();
      return fetch('/api/ping?i='+i,{cache:'no-store'}).then(function(r){
        rs.push(r);
        out.innerHTML='<span class="dim">sent '+(i+1)+'/30 ...</span>';
        return step(i+1);
      });
    }
    return step(0).then(function(){
      var ok=0,limited=0,other=0,firstRay='',lastRay='';
      rs.forEach(function(r){
        if(r.status===200){ok++;if(!firstRay)firstRay=r.headers.get('cf-ray')||''}
        else if(r.status===429){limited++;lastRay=r.headers.get('cf-ray')||''}
        else other++;
      });
      var html='<span class="ok">200 OK: '+ok+'</span>\\n<span class="'+(limited>0?'bad':'dim')+'">429 rate limited: '+limited+'</span>';
      if(other)html+='\\n<span class="dim">other: '+other+'</span>';
      html+='\\n<span class="dim">rule: 5 requests / 10s per IP, block for 10s</span>';
      if(firstRay)html+='\\n<span class="dim">first 200 cf-ray '+esc(firstRay)+'</span>';
      if(lastRay)html+='\\n<span class="dim">a 429 cf-ray '+esc(lastRay)+'</span>';
      if(!limited)html+='\\n<span class="dim">no 429 yet - the 10s window may have just reset, try again</span>';
      out.innerHTML=html;
    });
  });
}

function cacheTest(btn){
  var out=$('#out-cache');
  busy(btn,function(){
    out.innerHTML='<span class="dim">fetching /static/logo.svg twice ...</span>';
    var u='/static/logo.svg?cb='+Date.now();
    return fetch(u,{cache:'no-store'}).then(function(r1){
      var s1=r1.headers.get('cf-cache-status')||'(none)';
      var y1=r1.headers.get('cf-ray')||'';
      return new Promise(function(res){setTimeout(res,700)}).then(function(){
        return fetch(u,{cache:'no-store'}).then(function(r2){
          var s2=r2.headers.get('cf-cache-status')||'(none)';
          var y2=r2.headers.get('cf-ray')||'';
          out.innerHTML=
            '<span class="dim">request 1</span> cf-cache-status <span class="'+(s1==='HIT'?'ok':'dim')+'">'+esc(s1)+'</span> <span class="dim">cf-ray '+esc(y1)+'</span>\\n'+
            '<span class="dim">request 2</span> cf-cache-status <span class="'+(s2==='HIT'?'ok':'dim')+'">'+esc(s2)+'</span> <span class="dim">cf-ray '+esc(y2)+'</span>\\n'+
            (s2==='HIT'?'<span class="ok">served from Workers Cache, enabled by cache_options in Terraform</span>\\n<span class="dim">note: the zone cache rule does not govern Worker-generated responses - see the README</span>'
                       :'<span class="dim">not a HIT yet - try again</span>');
        });
      });
    }).catch(function(e){out.innerHTML='<span class="bad">error: '+esc(e.message)+'</span>'});
  });
}

// ── Workers AI, gated by Turnstile ──
function token(){
  try{return (window.turnstile&&window.turnstile.getResponse&&window.turnstile.getResponse())||''}catch(e){return ''}
}
function resetTs(){try{window.turnstile&&window.turnstile.reset&&window.turnstile.reset()}catch(e){}}

function ai(btn,url,body,outSel){
  var out=$(outSel);
  var t=token();
  if(!t){out.innerHTML='<span class="bad">Turnstile has not issued a token yet. Wait for the widget to finish, then retry.</span>';return}
  body.token=t;
  busy(btn,function(){
    out.innerHTML='<span class="dim">verifying with Turnstile, then asking Workers AI ...</span>';
    return fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json().then(function(j){return {r:r,j:j}})})
      .then(function(x){
        resetTs();
        if(!x.r.ok){out.innerHTML='<span class="bad">'+x.r.status+': '+esc(x.j.error||'failed')+'</span>'+ray(x.r);return}
        out.innerHTML=esc(x.j.answer)+'\\n\\n<span class="dim">model '+esc(x.j.model)+ray(x.r)+'</span>';
      })
      .catch(function(e){resetTs();out.innerHTML='<span class="bad">error: '+esc(e.message)+'</span>'});
  });
}

document.addEventListener('DOMContentLoaded',function(){
  $('#b-wp').onclick=function(){probe(this,'/wp-admin',{cache:'no-store'},'GET /wp-admin','#out-wp')};
  $('#b-env').onclick=function(){probe(this,'/.env',{cache:'no-store'},'GET /.env','#out-wp')};
  $('#b-hdr').onclick=function(){probe(this,'/api/ping',{cache:'no-store',headers:{'x-edge-guard-test':'block'}},'GET /api/ping + x-edge-guard-test: block','#out-hdr')};
  $('#b-hdr-ok').onclick=function(){probe(this,'/api/ping',{cache:'no-store'},'GET /api/ping (no header)','#out-hdr')};
  $('#b-burst').onclick=function(){burst(this)};
  $('#b-cache').onclick=function(){cacheTest(this)};
  $('#b-explain').onclick=function(){ai(this,'/api/ai/explain',{index:$('#rule-pick').value},'#out-explain')};
  $('#b-draft').onclick=function(){
    var q=$('#draft-input').value.trim();
    if(!q){$('#out-draft').innerHTML='<span class="bad">Describe the rule you want first.</span>';return}
    ai(this,'/api/ai/draft',{prompt:q},'#out-draft');
  };
});
`;

function scopePill(scope: string): string {
  return scope === "zone-wide"
    ? '<span class="pill zone">zone-wide</span>'
    : '<span class="pill host">host-scoped</span>';
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

export function renderPage(p: Posture): string {
  const rows = p.rules
    .map(
      (r) => `<tr>
      <td><code>${esc(r.phase)}</code></td>
      <td>${scopePill(r.scope)}</td>
      <td><code class="expr">${esc(r.expression)}</code></td>
      <td class="act">${esc(r.action)}</td>
      <td>${esc(r.description)}</td>
    </tr>`,
    )
    .join("");

  const options = p.rules
    .map((r, i) => `<option value="${i}">${esc(r.description)}</option>`)
    .join("");

  const settings = p.zone_settings
    .map(
      (s) =>
        `<div class="setting"><b>${esc(s.setting)}</b><span>${esc(s.value)}</span>${scopePill(s.scope)}</div>`,
    )
    .join("");

  const bfm = p.bot_fight_mode.enabled
    ? '<span class="pill on">enabled</span>'
    : '<span class="pill off">not enabled</span>';

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Edge Guard — a Cloudflare zone managed entirely by Terraform</title>
<meta name="description" content="A proof of concept: WAF custom rules, rate limiting, cache rules, Bot Fight Mode, zone TLS settings, Turnstile and a Workers AI assistant, all declared in Terraform.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Signika:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="/static/logo.svg" type="image/svg+xml">
<style>${CSS}</style>
</head><body>
<div class="wrap">

  <header class="hero">
    <div class="eyebrow">terraform · cloudflare provider v5</div>
    <h1>Edge Guard: a Cloudflare zone<br>managed <span class="accent">entirely by Terraform</span></h1>
    <p class="lede">
      Every rule below is declared in HCL and applied with <code>terraform apply</code> — the WAF rules, the
      rate limit, the cache rule, the zone TLS settings, Turnstile, and this Worker with its bindings.
      The table is not hand-written: it is rendered from a <code>POSTURE</code> binding that Terraform fills
      with <code>jsonencode()</code> of the same locals the rulesets consume, so the page cannot drift from
      what was actually applied.
    </p>
  </header>

  <section class="card">
    <h2><span class="num">01</span> Posture</h2>
    <p class="sub">
      Zone <code>${esc(p.zone)}</code> on the <b>${esc(p.plan)}</b> plan. The zone hosts two apps:
      the main site on the apex and <code>www</code> (owned by wrangler), and Edge Guard on
      <code>${esc(p.hostname)}</code> (owned by Terraform). Rules marked
      <span class="pill host">host-scoped</span> only match Edge Guard; rules marked
      <span class="pill zone">zone-wide</span> deliberately protect the whole zone, main site included.
    </p>
    <div class="tablewrap">
      <table>
        <thead><tr><th>Phase</th><th>Scope</th><th>Expression</th><th>Action</th><th>Description</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="settings">
      ${settings}
      <div class="setting"><b>Bot Fight Mode</b>${bfm}<span class="pill zone">zone-wide</span></div>
    </div>
    <p class="note">
      ${esc(p.bot_fight_mode.description)}<br>${esc(p.ddos_note)}
    </p>
  </section>

  <section class="card">
    <h2><span class="num">02</span> Try to get blocked</h2>
    <p class="sub">These buttons hit this zone from your browser. The status code comes back from Cloudflare's edge, not from this page.</p>

    <div class="grid">
      <div>
        <button id="b-wp">Probe /wp-admin</button>
        <button id="b-env" class="ghost" style="margin-top:8px">Probe /.env</button>
        <div class="out" id="out-wp"><span class="dim">expect 403 — zone-wide probe rule</span></div>
      </div>
      <div>
        <button id="b-hdr">Send test header</button>
        <button id="b-hdr-ok" class="ghost" style="margin-top:8px">Same request, no header</button>
        <div class="out" id="out-hdr"><span class="dim">expect 403 with the header, 200 without</span></div>
      </div>
      <div>
        <button id="b-burst">Burst /api/ping &times;30</button>
        <div class="out" id="out-burst"><span class="dim">expect a mix of 200 and 429</span></div>
      </div>
      <div>
        <button id="b-cache">Fetch /static/logo.svg twice</button>
        <div class="out" id="out-cache"><span class="dim">watching cf-cache-status</span></div>
      </div>
    </div>
  </section>

  <section class="card">
    <h2><span class="num">03</span> Ask Workers AI</h2>
    <p class="sub">
      Both endpoints are protected by Turnstile in managed mode and verified server-side with
      <code>siteverify</code> before the model is ever called. Model: <code>${esc(p.ai_model)}</code>.
    </p>

    <div class="ts-holder">
      <div class="cf-turnstile" data-sitekey="${esc(p.turnstile.sitekey)}" data-theme="dark"></div>
    </div>

    <div style="margin-top:18px">
      <label class="sub" for="rule-pick" style="display:block;margin-bottom:6px">Explain this rule</label>
      <select class="field" id="rule-pick">${options}</select>
      <div class="row"><button id="b-explain">Explain the rule</button></div>
      <div class="out" id="out-explain"><span class="dim">pick a rule and ask</span></div>
    </div>

    <div style="margin-top:22px">
      <label class="sub" for="draft-input" style="display:block;margin-bottom:6px">Draft a rule from plain English</label>
      <textarea class="field" id="draft-input" rows="3" placeholder="e.g. block POST requests to /admin from outside Portugal"></textarea>
      <div class="row"><button id="b-draft">Draft expression + Terraform</button></div>
      <div class="out" id="out-draft"><span class="dim">returns a Rules-language expression and a cloudflare_ruleset block — review it before applying</span></div>
    </div>
  </section>

  <footer>
    <div>
      <a href="https://github.com/diogodebastos/cf-edge-guard" target="_blank" rel="noopener">github.com/diogodebastos/cf-edge-guard</a>
      &nbsp;·&nbsp;
      <a href="https://diogodebastos.com" target="_blank" rel="noopener">diogodebastos.com</a>
    </div>
    <div class="built">Built AI-native with Claude Code</div>
  </footer>

</div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script>${JS}</script>
</body></html>`;
}
