"""Electric guitar: pickups and tone. Interactive lesson: selector, tone and volume knobs, play the strings, checklist, blind test."""
import os, json
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
from playwright.sync_api import sync_playwright
URL='file://'+os.environ.get('FR_PAGE',ROOT+'/index.html')
res=[]
def check(n,c,x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' '+str(x) if (x and not c) else ''))
save={'done':[1,2,3,4,5],'passed':[1,2,3,4,5],'best':{},'intro':True,'story':'road','chSeen':[1],'tour':1}
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for mobile in (False,True):
        kw=dict(viewport={'width':390,'height':844},is_mobile=True,has_touch=True) if mobile else dict(viewport={'width':1200,'height':900})
        ctx=b.new_context(**kw)
        ctx.add_init_script("window.__FRETROAD_TEST={}; try{ if(!localStorage.getItem('fretroad-v1')) localStorage.setItem('fretroad-v1',%s)}catch(e){}"%json.dumps(json.dumps(save)))
        pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(URL+'#map'); pg.wait_for_selector('#mods .mod',state='attached')
        pg.evaluate("document.querySelectorAll('.overlay').forEach(function(o){o.hidden=true})")
        tag='mobile' if mobile else 'desktop'
        if not mobile:
            check('Practice lists the lesson, open from the start, no guitar needed','no guitar needed' in pg.locator('.mod[data-id="electricpickups"] .tag').inner_text())
        pg.evaluate("location.hash='practice-electricpickups'"); pg.wait_for_selector('#v-elec:not([hidden]) #elGt')
        check(tag+': no sideways scrolling',pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        check(tag+': the header metronome is not hidden here',pg.locator('#metroBtn').is_visible() or mobile)
        if mobile:
            check('mobile: no errors',not errs,errs); ctx.close(); continue
        # physics: bridge is brighter than neck, in-between positions differ, tone knob darkens
        r=pg.evaluate("(()=>{var T=__FRETROAD_TEST,o={}; ['strat','lp'].forEach(function(g){ o[g]=EL_G[g].pos.map(function(P,i){return +T.elBright(g,i,110,10).toFixed(2)}); }); o.tone=[T.elBright('strat',0,110,0),T.elBright('strat',0,110,10)]; return o})()")
        check('strat: bridge brighter than middle, brighter than neck',r['strat'][0]>r['strat'][2]>r['strat'][4],r)
        check('strat: the in-between positions are not the same as either pickup alone',r['strat'][1]!=r['strat'][0] and r['strat'][1]!=r['strat'][2] and r['strat'][3]!=r['strat'][4],r)
        check('les paul: bridge brighter than neck',r['lp'][0]>r['lp'][2],r)
        check('humbucker bridge is darker than the single-coil bridge',r['lp'][0]<r['strat'][0],r)
        check('turning tone down darkens the sound',r['tone'][0]<r['tone'][1]-0.3,r)
        check('5 positions on the Strat, 3 on the Les Paul',pg.locator('#elPosBtns .el-p').count()==5 and pg.locator('#elPlate .el-notch').count()==5)
        # selector
        pg.locator('#elPosBtns .el-p').nth(4).click()
        check('choosing Neck lights only the neck pickup and moves the lever',pg.evaluate("[...document.querySelectorAll('#elGt .el-pk.on')].map(g=>g.dataset.pk).join()")=='neck' and pg.locator('#elLever').get_attribute('aria-valuenow')=='5')
        pg.locator('#elPosBtns .el-p').nth(1).click()
        check('position 2 lights bridge and middle',pg.evaluate("[...document.querySelectorAll('#elGt .el-pk.on')].map(g=>g.dataset.pk).sort().join()")=='bridge,mid')
        pg.locator('#elPlate .el-notch').nth(2).click()
        check('clicking a notch on the switch selects it',pg.locator('#elPosName').inner_text().startswith('3'))
        pg.locator('#elLever').focus(); pg.keyboard.press('ArrowRight')
        check('keyboard moves the lever',pg.locator('#elPosName').inner_text().startswith('4'))
        # knobs
        pg.locator('#elK_tone').focus()
        for _ in range(7): pg.keyboard.press('ArrowLeft')
        check('tone knob: keyboard turns it down',pg.evaluate("EL.tone")==3 and pg.locator('#elK_tone').get_attribute('aria-valuenow')=='3')
        bb=pg.locator('#elK_vol').bounding_box(); cx,cy=bb['x']+bb['width']/2,bb['y']+bb['height']/2
        pg.mouse.move(cx,cy-20); pg.mouse.down(); pg.mouse.move(cx-30,cy); pg.mouse.up()
        check('volume knob: dragging it to the left lowers it',pg.evaluate("EL.vol")<=3.5,pg.evaluate("EL.vol"))
        pg.evaluate("EL.vol=8; elDraw()")
        # play: strings, chords, drive
        pg.locator('#elPosBtns .el-p').nth(0).click(); pg.locator('.el-s').nth(1).click()
        check('playing with the bridge pickup ticks step 1',pg.locator('#elSteps li').nth(0).get_attribute('class')=='on')
        pg.locator('#elGt .el-sg').nth(3).dispatch_event('pointerdown')
        check('the strings on the picture can be clicked too',pg.evaluate("EL.note")=='D string')
        pg.locator('#elPosBtns .el-p').nth(4).click(); pg.locator('#elEm').click()
        pg.locator('#elPosBtns .el-p').nth(1).click(); pg.locator('#elEm').click()
        pg.locator('#elDrive').check(); pg.locator('#elPw').click()
        check('tone below 4 plus all the steps complete the lesson',pg.evaluate("EL_STEPS.every(x=>EL.steps[x.id])") and pg.evaluate("!!save.elecDone"))
        pg.locator('#elTypes .lvlseg').nth(1).click()
        check('Les Paul-style: 3 positions, two humbuckers',pg.locator('#elPosBtns .el-p').count()==3 and pg.locator('#elGt .el-pk').count()==2)
        # hear all + blind test
        pg.locator('#elAll').click(); check('Hear every position plays through the switch',pg.evaluate("EL.timers.length")>=3)
        pg.locator('.el-s').first.click()
        pg.locator('#elBlind').click()
        check('blind test hides the position',pg.locator('#elPosName').inner_text()=='Blind test' and pg.evaluate("document.querySelectorAll('#elGt .el-pk.on').length")==0)
        pg.locator('#elPosBtns .el-p').nth(0).click()
        check('answering reveals the position and keeps score',('so far' in pg.locator('#elBlindMsg').inner_text()) and pg.evaluate("EL.score.n")==1,pg.locator('#elBlindMsg').inner_text())
        # leaving stops the sequence
        pg.locator('#elAll').click(); pg.evaluate("location.hash='map'"); pg.wait_for_selector('#v-map:not([hidden])')
        check('leaving the lesson clears the timers',pg.evaluate("EL.timers.length")==0)
        check('no errors',not errs,errs); ctx.close()
    b.close()
print('ui_elec:',('ALL PASS' if all(res) else 'FAILURES'))
