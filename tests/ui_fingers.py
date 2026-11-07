"""Daily finger exercises: a level question first, ten exercises per level, hammer-ons and pull-offs from intermediate up, one a day."""
import os, json
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
from playwright.sync_api import sync_playwright
URL='file://'+os.environ.get('FR_PAGE',ROOT+'/index.html')
res=[]
def check(n,c,x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' '+str(x) if (x and not c) else ''))
save={'done':[1,2,3,4,5],'passed':[1,2,3,4,5],'best':{},'intro':True,'story':'road','chSeen':[1],'tour':1}
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1200,'height':900})
    ctx.add_init_script("window.__FRETROAD_TEST={}; try{ if(!localStorage.getItem('fretroad-v1')) localStorage.setItem('fretroad-v1',%s)}catch(e){}"%json.dumps(json.dumps(save)))
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL+'#warmup'); pg.wait_for_selector('#v-warm:not([hidden]) .lvlpick')
    check('three levels offered',pg.locator('.lvlbtn').count()==3)
    d=pg.evaluate("(()=>{var o={};Object.keys(FINGER_EX).forEach(k=>{var a=FINGER_EX[k]; o[k]={n:a.length,ids:new Set(a.map(x=>x.id)).size,ho:a.filter(x=>/hammer|pull-off|h\\d|p\\d/.test(x.text+x.tab.join(''))).length,full:a.every(x=>x.text&&x.plan&&x.plan.length===3&&x.tab&&x.name)}});return o})()")
    for k in ('beginner','intermediate','advanced'): check('%s has ten complete exercises'%k,d[k]['n']==10 and d[k]['ids']==10 and d[k]['full'],d[k])
    check('beginner list has no hammer-ons or pull-offs',d['beginner']['ho']==0,d['beginner'])
    check('intermediate and advanced use hammer-ons and pull-offs',d['intermediate']['ho']>=8 and d['advanced']['ho']>=5,d)
    # every exercise carries a parsable animation (frets 0 to 12, six strings); beginner has no hammer-ons or pull-offs
    an=pg.evaluate("(()=>{var o={};Object.keys(FINGER_EX).forEach(k=>{o[k]=FINGER_EX[k].map(x=>{try{var ph=__FRETROAD_TEST.faParse(x.anim,{nofinger:x.nofinger}),st=[].concat.apply([],ph.map(p=>p.steps));return {id:x.id,n:st.length,ok:st.length>0&&st.every(t=>t.f>=0&&t.f<=12&&t.s>=0&&t.s<=5),tech:st.filter(t=>t.t).length}}catch(e){return {id:x.id,n:0,ok:false,err:String(e)}}})});return o})()")
    for k in ('beginner','intermediate','advanced'): check('%s: all ten exercises have an animation within the 12 frets'%k,len(an[k])==10 and all(e['ok'] for e in an[k]),an[k])
    check('beginner animations use no hammer-ons or pull-offs',all(e['tech']==0 for e in an['beginner']),an['beginner'])
    check('intermediate and advanced animations include hammer-ons or pull-offs',sum(1 for e in an['intermediate']+an['advanced'] if e['tech'])>=12)
    first=True
    for lvl in ('Beginner','Intermediate','Advanced'):
        pg.evaluate("showWarm()")
        if pg.locator('.lvlpick').count(): pg.locator('.lvlbtn:has-text("%s")'%lvl).click()
        else: pg.locator('.lvlseg:has-text("%s")'%lvl).click()
        pg.wait_for_selector('#v-warm .wcard')
        check('%s: exercise, tab and a 3-step plan are shown'%lvl,pg.locator('.wcard h2').inner_text() and pg.locator('.wtab').is_visible() and pg.locator('.wplan li').count()==3)
        check('%s: today is one of that level\'s pool'%lvl,pg.evaluate("warmPool('%s').some(x=>x.id===exerciseFor(new Date(),0).id)"%lvl.lower()))
        check('%s: level switcher shows three levels with this one selected'%lvl,pg.locator('.lvlseg').count()==3 and pg.locator('.lvlseg.on').inner_text()==lvl)
        check('%s: the animated neck is inside the card'%lvl,(pg.locator('.wcard #boardD').is_visible() and pg.locator('#boardD .orb.ghost').count()>=1) or pg.locator('.wcard #boardK').is_visible())
        check('%s: header metronome hidden, drill metronome box at the top right'%lvl,not pg.locator('#metroBtn').is_visible() and pg.evaluate("(()=>{var r=document.querySelector('#drMetro').getBoundingClientRect(); return r.width>0&&r.left>innerWidth/2&&r.top<400})()"))
        check('%s: the Daily animation has no separate Play button (the timer starts it)'%lvl,not pg.locator('#dPlay').is_visible())
        if first:
            first=False
            check('first visit explains where to change the level',pg.locator('.lvltip').is_visible() and 'Your level' in pg.locator('.lvltip').inner_text())
    pg.evaluate("showWarm()"); pg.wait_for_selector('#v-warm .wcard')
    check('the tip is shown once per visit, not on every return',pg.locator('.lvltip').count()==0)
    # switching level from the Daily screen changes the exercise pool and keeps the streak data
    pg.locator('.lvlseg:has-text("Advanced")').click(); pg.wait_for_selector('.lvlseg.on:has-text("Advanced")')
    check('level switch is saved',pg.evaluate("save.warm.level")=='advanced' and pg.evaluate("warmPool('advanced').some(x=>x.id===W.ex.id)"))
    # Start the timer: the neck animates and the click runs; pause stops both
    pg.locator('.wcard .btn:has-text("Start the timer")').click()
    pg.wait_for_function("window.__FRETROAD_TEST.FA.i>=3",timeout=15000)
    check('timer starts the animation and the click',pg.evaluate("__FRETROAD_TEST.FA.playing&&__FRETROAD_TEST.MT.on") and pg.locator('#boardD .orb.root').count()==1)
    pg.locator('.wcard .row .btn:has-text("Pause")').click()
    check('pause stops the animation and the click',not pg.evaluate("__FRETROAD_TEST.FA.playing") and not pg.evaluate("__FRETROAD_TEST.MT.on"))
    pg.evaluate("location.hash='map'"); pg.wait_for_selector('#v-map:not([hidden])')
    check('header metronome is back after leaving Daily',pg.locator('#metroBtn').is_visible() and not pg.locator('#drMetro').is_visible())
    pg.evaluate("document.querySelectorAll('.overlay').forEach(function(o){o.hidden=true}); showWarm()"); pg.wait_for_selector('#v-warm .wcard')
    # a ten-day run gives ten different exercises, then the next cycle reshuffles
    r=pg.evaluate("(()=>{var base=Math.ceil(Math.floor(Date.UTC(2026,0,1)/864e5)/13)*13,a=[],b=[];for(var i=0;i<13;i++){a.push(exerciseFor(new Date(Date.UTC(2026,0,1)+(base+i-Math.floor(Date.UTC(2026,0,1)/864e5))*864e5+43200000),0).id);b.push(exerciseFor(new Date(Date.UTC(2026,0,1)+(base+13+i-Math.floor(Date.UTC(2026,0,1)/864e5))*864e5+43200000),0).id)}return [a,b]})()")
    check('thirteen days, thirteen different exercises (ten fretting plus three picking)',len(set(r[0]))==13 and len(set(r[1]))==13,r)
    check('the next cycle uses the same thirteen, reordered',set(r[0])==set(r[1]) and r[0]!=r[1],r)
    pg.locator('.wcard .btn:has-text("Mark as practised")').click()
    check('logging works and the calendar names the exercise',pg.evaluate("warmFind(save.warm.days[dayKey()])!==null"))
    check('no errors',not errs,errs); b.close()
print('ui_fingers:',('ALL PASS' if all(res) else 'FAILURES'))
