"""Chromecast: sender (header button, hello, jam, daily) against a fake Cast framework, and the receiver page fed with messages."""
import os, json
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
from playwright.sync_api import sync_playwright
URL='file://'+os.environ.get('FR_PAGE',ROOT+'/index.html')
RCV='file://'+ROOT+'/cast/receiver.html'
res=[]
def check(n,c,x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n+(' '+str(x) if (x and not c) else ''))
save={'done':[1,2,3,4],'passed':[1,2,3,4],'best':{},'intro':True,'story':'jordan','chSeen':[1],'tour':1,'warm':{'level':'intermediate','track':'finger','days':{}},
      'songs':[{'id':'s1','title':'Tune','text':'Tune\n\n[Verse]\nG\nla la\nD\nla la\nEm\nla la\nC\nla'}]}
FAKE="""
window.__sent=[]; window.__sessionOn=false; var listeners=[];
var sess={sendMessage:function(ns,o){ window.__sent.push({ns:ns,o:o}); return Promise.resolve(); }};
var ctx={setOptions:function(o){window.__opts=o}, addEventListener:function(t,f){listeners.push(f)}, getCurrentSession:function(){return window.__sessionOn?sess:null},
  requestSession:function(){ window.__sessionOn=true; listeners.forEach(function(f){f({sessionState:'SESSION_STARTED'})}); return Promise.resolve(); },
  endCurrentSession:function(){ window.__sessionOn=false; listeners.forEach(function(f){f({sessionState:'SESSION_ENDED'})}); }};
window.cast={framework:{CastContext:{getInstance:function(){return ctx}},CastContextEventType:{SESSION_STATE_CHANGED:'s'}}};
window.chrome=window.chrome||{}; window.chrome.cast={AutoJoinPolicy:{ORIGIN_SCOPED:'o'}};
"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); ctx=b.new_context(viewport={'width':1280,'height':900})
    ctx.add_init_script("window.__FRETROAD_TEST={}; try{ if(!localStorage.getItem('fretroad-v1')) localStorage.setItem('fretroad-v1',%s)}catch(e){}"%json.dumps(json.dumps(save))+FAKE)
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    check('no Cast button without an application ID',pg.evaluate("document.getElementById('castBtn').hidden")==True)
    pg.goto(URL+'?castid=ABC12345'); pg.wait_for_timeout(500)
    pg.evaluate("window.__onGCastApiAvailable(true)"); pg.wait_for_timeout(200)
    check('Cast button appears with an ID',pg.evaluate("document.getElementById('castBtn').hidden")==False)
    check('receiver app id passed to Cast',pg.evaluate("window.__opts.receiverApplicationId")=='ABC12345')
    pg.click('#castBtn'); pg.wait_for_timeout(700)
    hello=pg.evaluate("window.__sent.filter(m=>m.o.t==='hello').pop()")
    check('hello sent on connect with the player summary',hello and hello['ns']=='urn:x-cast:com.fretroad' and hello['o']['players'][0]['cleared']==4 and hello['o']['players'][0]['level']=='intermediate',hello)
    check('hello has no full save (no stop list, no song text)',hello and '"done"' not in json.dumps(hello['o']) and 'text' not in json.dumps(hello['o']))
    pg.evaluate("window.__sent.length=0")
    pg.evaluate("location.hash='jam-s1'"); pg.wait_for_timeout(600)
    pg.evaluate("window.__sent.length=0"); pg.click('#jGo'); pg.wait_for_timeout(500)
    jam=pg.evaluate("window.__sent.filter(m=>m.o.t==='jam').pop()")
    check('starting a jam while casting sends it with a future start time',jam and jam['o']['seq']==['G','D','Em','C'] and jam['o']['startAt']>jam['o']['sent']-1000 and jam['o']['bpm']>0,jam)
    pg.click('#jGo'); pg.wait_for_timeout(300)
    check('stopping returns the TV to the lobby',pg.evaluate("window.__sent.some(m=>m.o.t==='lobby')"))
    pg.evaluate("window.__sent.length=0; location.hash='warmup'"); pg.wait_for_timeout(600)
    pg.wait_for_selector('.wcard .cast-only:not([hidden])',timeout=3000); pg.click('.wcard .cast-only'); pg.wait_for_timeout(300)
    d=pg.evaluate("window.__sent.filter(m=>m.o.t==='daily').pop()")
    check('daily exercise sent with name, tab and plan',d and d['o']['name'] and len(d['o']['plan'])==3 and d['o']['secs']==300,d)
    check('sender: no errors',not errs,errs)
    # receiver
    r=ctx.new_page(); rerrs=[]; r.on('pageerror',lambda e:rerrs.append(str(e))); r.goto(RCV); r.wait_for_timeout(400)
    r.evaluate("""fretroadReceiver.handle('s1',{t:'hello',sent:Date.now(),device:'d1',players:[{id:'p1',name:'Ana',color:'#e6b95f',cleared:7,total:19,streak:3,level:'beginner',practisedToday:true,active:true},{id:'p2',name:'Ben',color:'#5fd0c0',cleared:2,total:19,streak:0,level:'',practisedToday:false,active:false}]});
      fretroadReceiver.handle('s2',{t:'hello',sent:Date.now(),device:'d2',players:[{id:'p1',name:'Cleo',color:'#f2708f',cleared:12,total:19,streak:9,level:'advanced',practisedToday:true,active:true}]})""")
    check('lobby lists players from two phones',r.locator('.pcard').count()==3)
    check('progress shown',r.locator('.pcard').first.inner_text().find('7 of 19')>-1)
    r.evaluate("fretroadReceiver.drop('s2')"); check('a phone leaving removes its players',r.locator('.pcard').count()==2)
    r.evaluate("fretroadReceiver.handle('s1',{t:'jam',sent:Date.now(),title:'Tune',seq:['G','D','Em','C'],shown:['G','D','Em','C'],bpm:240,bpb:4,bpc:4,countIn:1,startAt:Date.now()+400})")
    r.wait_for_timeout(100); check('jam screen shown with count-in',r.locator('#jam').is_visible() and not r.locator('#lobby').is_visible())
    r.wait_for_timeout(1500); first=r.inner_text('#jamNow'); check('after the count-in the first chord shows (%s)'%first,first=='G')
    r.wait_for_timeout(1100); second=r.inner_text('#jamNow'); check('and the chord changes in time (%s)'%second,second in ('D','Em'))
    r.evaluate("fretroadReceiver.handle('s1',{t:'daily',sent:Date.now(),name:'Spider walk',text:'x',tab:['A|-1-2-3-4-'],plan:['a','b','c'],bpm:50,level:'beginner',secs:300,startAt:Date.now()-10000})")
    r.wait_for_timeout(300); clock=r.inner_text('#dClock'); check('daily clock counts down from five minutes (%s)'%clock,clock in ('4:50','4:49','4:51'))
    r.evaluate("fretroadReceiver.handle('s1',{t:'lobby'})"); check('back to the lobby',r.locator('#lobby').is_visible())
    r.evaluate("fretroadReceiver.handle('s1',{t:'jam',seq:['<img src=x onerror=alert(1)>'],shown:['<img src=x onerror=alert(1)>'],bpm:90,startAt:Date.now()})"); r.wait_for_timeout(200)
    check('odd chord text is shown as text',r.locator('#jam img').count()==0)
    check('receiver: no errors',not rerrs,rerrs); b.close()
print('ui_cast:',('ALL PASS' if all(res) else 'FAILURES'))
