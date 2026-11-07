/* Map page front door: a start button under the chapter text, a scroll-in tagline, and the FAQs link in the footer. Loaded before main.js so the first drawMap is already wrapped. */
(function(){
  var sub=document.getElementById('chSub'); if(!sub) return;
  var cta=document.createElement('div'); cta.className='hero-cta';
  var btn=document.createElement('button'); btn.className='btn primary'; btn.type='button';
  var note=document.createElement('small'); note.textContent='Free and open source. The mic only listens live and never records.';
  cta.appendChild(btn); cta.appendChild(note); sub.insertAdjacentElement('afterend',cta);
  function sync(){
    var id=currentId();
    if(id==null){ btn.textContent='Open the sandbox'; btn.onclick=function(){location.hash='sandbox'}; return; }
    var started=save.passed.length>0||save.done.length>0;
    btn.textContent=(started?'Continue at ':'Start with ')+placeName(id);
    btn.onclick=function(){location.hash=dest(id)};
  }
  var base=window.drawMap; window.drawMap=function(){ base.apply(this,arguments); sync(); };

  var p=document.querySelector('.tagline p');
  if(p){
    var ws=p.textContent.split(' '); p.textContent='';
    var spans=ws.map(function(w,i){ var s=document.createElement('span'); s.className='w'; s.textContent=w; s.style.transitionDelay=((i%8)*60)+'ms'; p.appendChild(s); p.appendChild(document.createTextNode(' ')); return s; });
    var all=function(){ spans.forEach(function(s){s.classList.add('on')}); };
    if(!('IntersectionObserver' in window)||(window.RM===true)||matchMedia('(prefers-reduced-motion: reduce)').matches) all();
    else{ var io=new IntersectionObserver(function(es){ if(es.some(function(e){return e.isIntersecting})){ all(); io.disconnect(); } },{rootMargin:'0px 0px -30% 0px'}); io.observe(p); }
  }
  var fb=document.getElementById('faqBtn'), fq=document.getElementById('faq');
  /* the questions stay hidden until the FAQs button is pressed; pressing it again hides them */
  if(fb&&fq) fb.addEventListener('click',function(){
    var show=fq.hidden; fq.hidden=!show; fb.setAttribute('aria-expanded',show?'true':'false');
    if(show){ var d=fq.querySelector('details'); if(d) d.open=true; fq.scrollIntoView({behavior:'instant',block:'start'}); }
  });
})();
