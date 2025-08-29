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
    fetch('https://api.countapi.xyz/hit/'+encodeURIComponent(key)+'/visits')
      .then(r=>r.json())
      .then(j=>{ target.textContent = j.value })
      .catch(()=>{ target.textContent = 'n/a' });
  }

  // Duolingo widget is now rendered server-side from data/duolingo.json

  function init(){
    document.querySelectorAll('[data-widget]').forEach(function(el){
      if(el.dataset.inited) return; el.dataset.inited = '1';
      var t = el.dataset.widget;
      if(t==='time') initTime(el);
      if(t==='visitor') initVisitor(el);
  // duolingo handled server-side now
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
