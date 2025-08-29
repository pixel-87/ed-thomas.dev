// widgets.js - initialize small data-attribute widgets
(function(){
  function initTime(el){
    function pad(n){return n<10?"0"+n:n}
    function update(){
      var d=new Date();
      var target = el.querySelector('.time-value');
      if(target) target.textContent = d.getHours()+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
    }
    update(); setInterval(update,1000);
  }

  function initVisitor(el){
    var key = el.dataset.key || 'ed-thomas.dev';
    var target = el.querySelector('.visitor-count');
    if(!target) return;
    // Placeholder implementation: avoid external API call for now.
    // When you add a self-hosted counter later, replace this with the proper fetch.
    target.textContent = 'n/a';
    target.setAttribute('title', 'visitor counter placeholder');
  }

  // Duolingo widget is now rendered server-side from data/duolingo.json
  // We'll fetch an external gist (raw JSON) and update any duo-streak elements.
  const DUO_GIST_RAW = 'https://gist.githubusercontent.com/pixel-87/f4db826c7a94c24c6dde14ce28cd86dd/raw/duolingo.json';
  const DUO_CACHE_KEY = 'duo_json_v1';
  const DUO_TTL = 6 * 60 * 60 * 1000; // 6 hours

  async function fetchDuo() {
    try {
      const cached = localStorage.getItem(DUO_CACHE_KEY);
      if (cached) {
        try {
          const o = JSON.parse(cached);
          if (Date.now() - o.t < DUO_TTL) return o.data;
        } catch (e) { /* fall through */ }
      }
      const r = await fetch(DUO_GIST_RAW, { cache: 'no-store' });
      if (!r.ok) throw new Error('duo fetch failed');
      const text = await r.text();
      const streak = parseInt(text.trim(), 10);
      if (Number.isNaN(streak)) throw new Error('invalid streak number');
      const parsed = { streak: streak };
      localStorage.setItem(DUO_CACHE_KEY, JSON.stringify({ t: Date.now(), data: parsed }));
      return parsed;
    } catch (e) {
      try { const stale = JSON.parse(localStorage.getItem(DUO_CACHE_KEY)); return stale && stale.data; } catch(e){}
      return null;
    }
  }

  function initDuolingo(el){
    var target = el.querySelector('.duo-streak');
    if(!target) return;
    // populate from server-rendered value first, then attempt fetch to refresh
    fetchDuo().then(function(data){ if(data && data.streak !== undefined) target.textContent = String(data.streak); }).catch(()=>{});
  }

  function init(){
    document.querySelectorAll('[data-widget]').forEach(function(el){
      if(el.dataset.inited) return; el.dataset.inited = '1';
      var t = el.dataset.widget;
  if(t==='time') initTime(el);
  if(t==='visitor') initVisitor(el);
  if(t==='duolingo') initDuolingo(el);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
