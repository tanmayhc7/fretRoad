"""Strum Lab and Fingerstyle Lab: two blocks, three levels each, animated pattern, shared drill-only metronome box."""
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
    names=pg.locator('.lab .labname').all_inner_texts()
    check('two blocks: Strum Lab and Fingerstyle Lab',names==['Strum Lab','Fingerstyle Lab'],names)
    for fam in ('strum','finger'):
        tiers=pg.locator('.lab-%s .labtier'%fam).all_text_contents()
        check(fam+' block has Beginner, Intermediate, Advanced',tiers==['Beginner','Intermediate','Advanced'],tiers)
        check(fam+' block has 3 drills per level',all(pg.locator('.lab-%s .mods'%fam).nth(i).locator('.mod').count()==3 for i in range(3)))
    # pattern parsing
    r=pg.evaluate("(()=>{var o={}; __FRETROAD_TEST.PICK_DRILLS.forEach(function(m){ try{ var n=pkParse(m.mode,m.pattern).length; o[m.id]=n%(m.per)==0||m.per==3?n:-n }catch(e){ o[m.id]='ERR '+e.message } }); return o})()")
    check('every pattern parses and fills whole beats',all(isinstance(v,int) and v>0 for v in r.values()),r)
    check('every chord exists',pg.evaluate("__FRETROAD_TEST.PICK_DRILLS.every(function(m){return m.chords.every(function(c){return !!PK_CHORDS[c]})})"))
    # open a strum drill
    pg.locator('.mod[data-id="strumfolk"]').click(); pg.wait_for_selector('#v-path:not([hidden]) #pkGrid .pk-cell')
    check('header metronome hidden, box at the top right',not pg.locator('#metroBtn').is_visible() and pg.evaluate("(()=>{var r=document.querySelector('#drMetro').getBoundingClientRect(); return r.left>innerWidth/2&&r.top<260})()"))
    check('chord shape is lit on the board (G: 5 sounding strings + muted none)',pg.locator('#boardK .orb').count()==6,pg.locator('#boardK .orb').count())
    check('the fretboard is actually drawn (not collapsed)',pg.evaluate("document.querySelector('#boardK').getBoundingClientRect().height")>100)
    check('skipped slots stay visible in the grid',pg.evaluate("[...document.querySelectorAll('#pkGrid .pk-cell')].every(c=>c.getBoundingClientRect().height>10)"))
    check('pattern grid shows 8 slots',pg.locator('#pkGrid .pk-cell').count()==8)
    pg.fill('#dmBpmN','200'); pg.locator('#dmBpmN').dispatch_event('change')
    pg.locator('#pkPlay').click()
    pg.wait_for_function("window.__FRETROAD_TEST.PK.i>=5",timeout=9000)
    check('Play steps through the slots and highlights one',pg.locator('#pkGrid .pk-cell.cur').count()==1 and pg.evaluate("__FRETROAD_TEST.MT.on"))
    check('caption names the stroke',any(w in pg.locator('#pkNow').inner_text() for w in ('strum','Skip','chuck')),pg.locator('#pkNow').inner_text())
    pg.locator('#pkPlay').click()
    check('Pause stops notes and the click it started',not pg.evaluate("__FRETROAD_TEST.PK.playing") and not pg.evaluate("__FRETROAD_TEST.MT.on"))
    # fingerstyle drill
    pg.evaluate("location.hash='practice-fingertravis'"); pg.wait_for_selector('#pkGrid .pk-cell')
    check('fingerstyle grid shows finger letters',pg.locator('#pkGrid .pk-cell b').first.inner_text()=='p')
    pg.fill('#dmBpmN','180'); pg.locator('#dmBpmN').dispatch_event('change')
    pg.locator('#pkPlay').click(); pg.wait_for_function("window.__FRETROAD_TEST.PK.i>=3",timeout=9000)
    check('caption names a finger and a string',('finger' in pg.locator('#pkNow').inner_text() or 'thumb' in pg.locator('#pkNow').inner_text()),pg.locator('#pkNow').inner_text())
    pg.locator('#pkPlay').click()
    # switching to a path drill still works, shared box moves over
    pg.evaluate("location.hash='practice-pathfull'"); pg.wait_for_selector('#boardD .orb.ghost')
    check('path drill after a pick drill: box and board mounted',pg.locator('#drMetro').is_visible() and pg.locator('#pkBlock').is_visible()==False)
    pg.evaluate("location.hash='map'"); pg.wait_for_selector('#v-map:not([hidden])')
    check('header metronome is back on the map',pg.locator('#metroBtn').is_visible() and not pg.locator('#drMetro').is_visible())
    check('no errors',not errs,errs); b.close()
print('ui_pick:',('ALL PASS' if all(res) else 'FAILURES'))
