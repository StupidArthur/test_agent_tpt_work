(() => {
  const vis = e => e && e.getClientRects().length > 0;
  const t = e => ((e && e.innerText) || '').replace(/\s+/g, ' ').trim();
  const rect = e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; };

  const composer = document.querySelector('div[contenteditable=true]');
  const form = composer ? composer.closest('form') : null;
  const btns = form ? [...form.querySelectorAll('button')].filter(vis) : [];

  // 模型选择器：输入框右上方区域
  const modelish = [...document.querySelectorAll('button,[role=button]')].filter(vis)
    .map(b => ({ txt: t(b).slice(0, 24), aria: b.getAttribute('aria-label') || '', haspopup: b.getAttribute('aria-haspopup') || '', ...rect(b) }))
    .filter(b => b.y > 450 && b.y < 720 && b.x > 900);

  // 发送按钮候选
  const submitCands = [...document.querySelectorAll('button[type=submit],button[aria-label*=发送],button[class*=primary]')].filter(vis)
    .map(b => ({ tag: b.tagName, type: b.type, aria: b.getAttribute('aria-label') || '', cls: (b.className || '').toString().slice(0, 50), disabled: b.disabled, ...rect(b) }));

  return {
    win: [innerWidth, innerHeight],
    composer: composer && vis(composer) ? rect(composer) : null,
    composerCls: composer ? (composer.className || '').toString().slice(0, 60) : null,
    formBtns: btns.map(b => ({ aria: b.getAttribute('aria-label') || '', cls: (b.className || '').toString().slice(0, 44), disabled: b.disabled, ...rect(b) })),
    modelish,
    submitCands,
    hasOldSendClass: !!document.querySelector('button.uV2eYG_primary')
  };
})()
