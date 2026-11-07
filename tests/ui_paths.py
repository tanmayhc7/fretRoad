"""Fret Paths drills: the animated fretboard walk, the exact route, and the drill-only metronome box."""
import os, json
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
from playwright.sync_api import sync_playwright
URL='file://'+os.environ.get('FR_PAGE',ROOT+'/index.html')
res=[]
def check(n,c,x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' '+str(x) if (x and not c) else ''))
save={'done':[1,2,3,4,5],'passed':[1,2,3,4,5],'best':{},'intro':True,'story':'road','chSeen':[1],'tour':1}
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); ctx=b.new_context(viewport={'width':1200,'height':900})
    ctx.add_init_script("window.__FRETROAD_TEST={}; try{ if(!localStorage.getItem('fretroad-v1')) localStorage.setItem('fretroad-v1',%s)}catch(e){}"%json.dumps(json.dumps(save)))
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL+'#map'); pg.wait_for_selector('#mods .mod',state='attached')
    pg.evaluate("document.querySelectorAll('.overlay').forEach(function(o){o.hidden=true})")
    check('five path drills are listed with no mic needed',pg.locator('.mod[data-id^="path"]').count()==5 and 'no mic' in pg.locator('.mod[data-id="pathfull"] .tag').inner_text())
    check('header metronome shows on the map',pg.locator('#metroBtn').is_visible())
    # the exact route
    r=pg.evaluate("(()=>{var f=__FRETROAD_TEST.pathBuild(['up','turn','top','back','low']).flat; var g=[]; for(var i=0;i<f.length;i+=4) g.push(f.slice(i,i+4).map(x=>x.s+':'+x.f).join(' ')); return {n:f.length,g:g}})()")
    exp=['5:1 5:2 5:3 5:4','4:2 4:3 4:4 4:5','3:3 3:4 3:5 3:6','2:4 2:5 2:6 2:7','1:5 1:6 1:7 1:8','0:6 0:7 0:8 0:9',
         '0:9 0:8 0:7 0:6',
         '0:6 0:7 0:8 0:9','1:6 1:7 1:8 1:9','2:6 2:7 2:8 2:9','3:6 3:7 3:8 3:9','4:6 4:7 4:8 4:9','5:6 5:7 5:8 5:9',
         '5:9 5:8 5:7 5:6','4:8 4:7 4:6 4:5','3:7 3:6 3:5 3:4','2:6 2:5 2:4 2:3','1:5 1:4 1:3 1:2','0:4 0:3 0:2 0:1',
         '0:1 0:2 0:3 0:4','1:1 1:2 1:3 1:4','2:1 2:2 2:3 2:4','3:1 3:2 3:3 3:4','4:1 4:2 4:3 4:4','5:1 5:2 5:3 5:4']
    check('full route: 100 notes in the requested order',r['n']==100 and r['g']==exp,r)
    pg.locator('.mod[data-id="pathfull"]').click(); pg.wait_for_selector('#v-path:not([hidden])')
    check('header metronome button is hidden on the drill screen',not pg.locator('#metroBtn').is_visible())
    check('drill metronome box is visible at the top right',pg.locator('#drMetro').is_visible() and pg.evaluate("(()=>{var r=document.querySelector('#drMetro').getBoundingClientRect(); return r.left>innerWidth/2&&r.top<260})()"))
    check('starts on the first group with ghost dots',pg.locator('#boardD .orb.ghost').count()==4,pg.locator('#boardD .orb').count())
    pg.locator('#dNext').click()
    check('Note > lights low E fret 1 (brass) with the caption',pg.locator('#boardD .orb.root').count()==1 and 'Low E string, fret 1' in pg.locator('#dNow').inner_text())
    for _ in range(4): pg.locator('#dNext').click()
    check('fifth note moves to the A string fret 2',pg.locator('#boardD .orb.root').count()==1 and 'A string, fret 2' in pg.locator('#dNow').inner_text(),pg.locator('#dNow').inner_text())
    check('the finger is named',('Index finger' in pg.locator('#dNowSub').inner_text()))
    pg.locator('#dPrev').click()
    check('Note < steps back',pg.locator('#dSeq .chip.on').inner_text()=='4' and 'Low E string, fret 4' in pg.locator('#dNow').inner_text())
    # metronome box controls drive the shared state
    pg.fill('#dmBpmN','200'); pg.locator('#dmBpmN').dispatch_event('change')
    check('tempo box sets MT.bpm',pg.evaluate("__FRETROAD_TEST.MT.bpm")==200)
    pg.locator('#dmPlus').click(); check('+ raises the tempo',pg.evaluate("__FRETROAD_TEST.MT.bpm")==201)
    pg.fill('#dmBpmN','240'); pg.locator('#dmBpmN').dispatch_event('change')
    # play: count-in then notes advance on their own, click runs
    pg.locator('#dRestart').click(); pg.locator('#dPlay').click()
    pg.wait_for_function("window.__FRETROAD_TEST.PS.i>=6",timeout=8000)
    check('Play walks the notes by itself',pg.evaluate("__FRETROAD_TEST.PS.i")>=6 and pg.locator('#boardD .orb.root').count()==1)
    check('the click starts with Play and the box shows Stop',pg.evaluate("__FRETROAD_TEST.MT.on") and pg.locator('#dmGo').inner_text()=='Stop')
    pg.locator('#dPlay').click()
    check('Pause stops the notes and the click it started',not pg.evaluate("__FRETROAD_TEST.PS.playing") and not pg.evaluate("__FRETROAD_TEST.MT.on"))
    i0=pg.evaluate("__FRETROAD_TEST.PS.i"); pg.wait_for_timeout(500)
    check('nothing moves while paused',pg.evaluate("__FRETROAD_TEST.PS.i")==i0)
    # leaving restores the header metronome
    pg.evaluate("location.hash='map'"); pg.wait_for_selector('#v-map:not([hidden])')
    check('header metronome is back on the map',pg.locator('#metroBtn').is_visible() and not pg.locator('#drMetro').is_visible())
    for pid in ('pathdiagup','pathspiderlow','pathspidertop','pathdiagback'):
        pg.evaluate("location.hash='practice-%s'"%pid); pg.wait_for_selector('#v-path:not([hidden]) .orb.ghost')
        n=pg.evaluate("__FRETROAD_TEST.PS.flat.length"); check(pid+' loads (%d notes)'%n,n in (28,24))
    check('no errors',not errs,errs); b.close()
print('ui_paths:',('ALL PASS' if all(res) else 'FAILURES'))
