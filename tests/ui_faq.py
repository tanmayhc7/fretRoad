"""FAQs: the questions stay hidden until the FAQs button in the footer is pressed."""
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
    ctx.add_init_script("try{ if(!localStorage.getItem('fretroad-v1')) localStorage.setItem('fretroad-v1',%s)}catch(e){}"%json.dumps(json.dumps(save)))
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL+'#map'); pg.wait_for_selector('#mods .mod',state='attached')
    pg.evaluate("document.querySelectorAll('.overlay').forEach(function(o){o.hidden=true})")
    check('the button is called FAQs',pg.locator('#faqBtn').inner_text()=='FAQs')
    check('the questions are not visible by default',not pg.locator('#faq').is_visible())
    pg.locator('#faqBtn').click()
    check('FAQs shows the questions with the first one open',pg.locator('#faq').is_visible() and pg.locator('#faq details').first.evaluate('d=>d.open') and pg.locator('#faqBtn').get_attribute('aria-expanded')=='true')
    pg.locator('#faqBtn').click()
    check('pressing FAQs again hides them',not pg.locator('#faq').is_visible() and pg.locator('#faqBtn').get_attribute('aria-expanded')=='false')
    check('no errors',not errs,errs); b.close()
print('ui_faq:',('ALL PASS' if all(res) else 'FAILURES'))
