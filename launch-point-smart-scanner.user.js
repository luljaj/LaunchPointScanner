// ==UserScript==
// @name         Launch Point Smart Scanner
// @namespace    launch-point-staff
// @version      1.1.5
// @description  Scanner-first entry for the two authorized Launch Point Google Forms.
// @match        https://docs.google.com/forms/d/e/1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q/viewform
// @match        https://docs.google.com/forms/d/e/1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q/viewform?*
// @match        https://docs.google.com/forms/d/e/1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q/formResponse*
// @match        https://docs.google.com/forms/d/e/1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ/viewform
// @match        https://docs.google.com/forms/d/e/1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ/viewform?*
// @match        https://docs.google.com/forms/d/e/1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ/formResponse*
// @match        https://docs.google.com/forms/u/*/d/e/1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q/viewform*
// @match        https://docs.google.com/forms/u/*/d/e/1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q/formResponse*
// @match        https://docs.google.com/forms/u/*/d/e/1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ/viewform*
// @match        https://docs.google.com/forms/u/*/d/e/1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ/formResponse*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  // Runtime verification also rejects suffixes accepted by the metadata wildcards.
  const ids = [
    '1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q',
    '1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ',
  ];
  const route = location.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/e\/([^/]+)\/(viewform|formResponse)$/);
  if (window.top !== window.self || location.origin !== 'https://docs.google.com' ||
      !route || !ids.includes(route[1]) || document.getElementById('lp-scanner')) return;

  const blankURL = `${location.origin}/forms/d/e/${route[1]}/viewform`;
  const markerKey = `lp-scanner-pending:${route[1]}`;
  const stations = ['Console Station 1', 'Console Station 2', 'Console Station 3', 'PC Station'];
  const actions = [
    'Check in to Lounge and Borrow Equipment',
    'Check out of Lounge and Return Equipment',
    'Check in to Lounge as additional person in a group',
    'Check in to Lounge as a "watcher"',
  ];
  const equipmentStations = Object.fromEntries([
    ['1088', 0], ['1089', 0], ['1090', 0],
    ['1082', 1], ['1083', 1], ['1084', 1],
    ['1085', 2], ['1086', 2], ['1087', 2],
  ].map(([barcode, index]) => [barcode, stations[index]]));
  const normalize = text => text.replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim();
  let form, fields, submitButton, busy = false, started = 0;

  // Only a timestamp is stored. Student IDs and equipment never enter script storage.
  function pending(value) {
    try {
      if (value === null) sessionStorage.removeItem(markerKey);
      else if (value !== undefined) sessionStorage.setItem(markerKey, String(value));
      return Number(sessionStorage.getItem(markerKey)) || 0;
    } catch { return 0; }
  }

  function confirmationLink() {
    return [...document.querySelectorAll('a[href]')].find(link => {
      const url = new URL(link.href, location.href);
      const match = url.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/e\/([^/]+)\/viewform$/);
      return url.origin === location.origin && match?.[1] === route[1] &&
        (url.searchParams.get('usp') === 'form_confirm' || /submit another response/i.test(link.textContent));
    });
  }
  function resetAfterConfirmation() {
    if (document.querySelector('form#mG61Hd') || !document.querySelector('.vHW8K')) return false;
    const link = confirmationLink();
    const timestamp = pending();
    if (!link && !(timestamp > 0 && Date.now() - timestamp < 600000)) return false;
    pending(null);
    // Follow Google's actual link, including its account path and form_confirm query.
    if (link) link.click();
    else location.replace(blankURL);
    return true;
  }
  if (resetAfterConfirmation()) return;

  const host = document.createElement('aside');
  host.id = 'lp-scanner';
  document.body.append(host);
  const ui = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host{position:fixed;top:16px;right:16px;width:248px;max-width:calc(100vw - 32px);z-index:2147483647;color:#1d1d1f;font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box} section{padding:16px;background:rgba(250,250,252,.96);border:1px solid #00000012;border-radius:16px;box-shadow:0 4px 20px #00000012;max-height:calc(100dvh - 32px);overflow:auto;backdrop-filter:blur(12px)}
    h2{font-size:15px;font-weight:600;letter-spacing:-.02em;margin:0 0 12px;cursor:grab;touch-action:none;user-select:none} h2:active{cursor:grabbing} label{display:block;font-size:12px;font-weight:500;margin-bottom:5px}
    input{width:100%;font:inherit;font-variant-numeric:tabular-nums;color:inherit;background:#fff;border:1px solid #00000026;border-radius:8px;padding:8px 10px;outline:none}
    input:focus-visible,summary:focus-visible,button:focus-visible{outline:3px solid #007aff60;outline-offset:2px} input:disabled{opacity:.55}
    details{margin-top:10px;color:#515158;font-size:12px} summary{cursor:pointer;width:fit-content} p{margin:8px 0}
    #status{font-size:12px;color:#a12622;margin:9px 0 0;overflow-wrap:anywhere} [hidden]{display:none!important}
    button{font:inherit;padding:6px 8px;background:#fff;border:1px solid #0003;border-radius:7px;cursor:pointer}
    @media(prefers-reduced-transparency:reduce){section{background:#fafafc;backdrop-filter:none}}
    @media(prefers-contrast:more){section,input{border-color:#515158;background:#fff}}
  `;
  // DOM construction avoids HTML injection sinks and Google Forms' Trusted Types CSP.
  function element(tag, attributes = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    node.append(...children);
    return node;
  }
  const button = (id, text, attributes = {}) => element('button', { id, type: 'button', ...attributes }, text);
  ui.append(style, element('section', { 'aria-label': 'Launch Point Scanner' },
    element('h2', { title: 'Drag to move' }, 'Launch Point Scanner'),
    element('label', { for: 'scan' }, 'Scan'),
    element('input', { id: 'scan', type: 'text', inputmode: 'numeric', autocomplete: 'off',
      spellcheck: 'false', 'aria-describedby': 'status' }),
    element('p', { id: 'status', role: 'status', 'aria-live': 'polite', hidden: '' }),
    element('details', {}, element('summary', {}, 'Help'),
      element('p', {}, 'Scan a barcode or move the window around.'),
      element('p', {}, 'A,W to Check in/out. D to Submit Form. Esc to Clear Field'),
      button('retry', 'Unlock after checking submission', { hidden: '' }))));
  const $ = selector => ui.querySelector(selector);
  const scan = $('#scan');
  const title = $('h2');
  let drag = null;
  function moveWindow(left, top) {
    const bounds = host.getBoundingClientRect();
    host.style.left = `${Math.max(8, Math.min(left, innerWidth - bounds.width - 8))}px`;
    host.style.top = `${Math.max(8, Math.min(top, innerHeight - bounds.height - 8))}px`;
    host.style.right = 'auto';
  }
  title.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const bounds = host.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    title.setPointerCapture(event.pointerId);
  });
  title.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) moveWindow(event.clientX - drag.x, event.clientY - drag.y);
  });
  title.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    title.releasePointerCapture(event.pointerId);
    drag = null;
  });
  title.addEventListener('lostpointercapture', () => { drag = null; });
  window.addEventListener('resize', () => {
    if (!host.style.left) return;
    const bounds = host.getBoundingClientRect();
    moveWindow(bounds.left, bounds.top);
  });
  function setStatus(text = '') {
    const status = $('#status');
    if (status.textContent === text && status.hidden === !text) return;
    status.textContent = text;
    status.hidden = !text;
  }
  function clearStatus() { setStatus(); }
  function setBusy(value) { busy = value; scan.disabled = value; }
  function focusScanner() { if (!busy) scan.focus({ preventScroll: true }); }
  function question(title) {
    return [...form.querySelectorAll('[role="listitem"]')].find(item =>
      normalize(item.querySelector('[role="heading"]')?.textContent || '') === title);
  }
  function radio(group, value) {
    return [...group.querySelectorAll('[role="radio"]')].find(el => el.getAttribute('data-value') === value || el.getAttribute('aria-label') === value);
  }
  function selected(group) {
    const el = group.querySelector('[role="radio"][aria-checked="true"]');
    return el?.getAttribute('data-value') || el?.getAttribute('aria-label') || '';
  }
  async function choose(group, value) {
    const el = radio(group, value);
    if (!el || el.getAttribute('aria-disabled') === 'true') throw new Error('Google Forms is not ready for this selection.');
    if (el.getAttribute('aria-checked') !== 'true') el.click();
    const deadline = Date.now() + 2500;
    while (selected(group) !== value && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    if (selected(group) !== value) throw new Error('Google Forms did not accept the selection. Try again after it finishes loading.');
    group.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  function setValue(input, value) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const values = inputs => inputs.map(input => input.value.trim()).filter(Boolean);
  function detected() { return [...new Set(values(fields.equipment).map(code => equipmentStations[code]).filter(Boolean))]; }
  function conflict() {
    const found = detected();
    if (found.length > 1) return 'Equipment belongs to conflicting stations. Remove the mistaken barcode(s) in the form.';
    if (found.length && selected(fields.station) !== found[0]) return `Equipment requires ${found[0]}. Select it or remove the equipment.`;
    return '';
  }
  function finishScan() {
    if (!fields || busy) return;
    const value = scan.value.trim();
    scan.value = '';
    if (!value) return;
    safely(async () => {
      const inputs = /^\d{15}$/.test(value) ? fields.students : /^\d{4}$/.test(value) ? fields.equipment : null;
      if (!inputs) throw new Error('Invalid barcode');
      if (values(inputs).includes(value)) throw new Error('That barcode is already entered.');
      const empty = inputs.find(input => !input.value.trim());
      if (!empty) throw new Error(`All four ${inputs === fields.students ? 'student ID' : 'equipment'} fields are full.`);
      setValue(empty, value);
      const found = detected();
      if (inputs === fields.equipment && equipmentStations[value] && found.length === 1) await choose(fields.station, found[0]);
      empty.scrollIntoView({ block: 'center', behavior: 'instant' });
      setStatus(conflict());
      focusScanner();
    });
  }
  async function validate() {
    if (!fields) throw new Error('Wait for Google Forms to finish loading.');
    if (scan.value.trim()) throw new Error('Press Enter to finish the current scan before submitting.');
    const students = values(fields.students), equipment = values(fields.equipment);
    if (!students.length) throw new Error('Scan at least one student ID.');
    if (students.some(value => !/^\d{15}$/.test(value))) throw new Error('Every student ID must have exactly 15 digits.');
    if (equipment.some(value => !/^\d{4}$/.test(value))) throw new Error('Every equipment barcode must have exactly 4 digits.');
    if (new Set(students).size !== students.length || new Set(equipment).size !== equipment.length) throw new Error('Remove duplicate barcodes before submitting.');
    if (!actions.includes(selected(fields.action))) throw new Error('Choose an action first (A or W).');
    if (!selected(fields.station)) {
      await choose(fields.station, 'PC Station');
    }
    const stationError = conflict();
    if (stationError) throw new Error(stationError);
    // Keep the required first ID populated after manual edits in the original form.
    fields.students.forEach((input, i) => setValue(input, students[i] || ''));
    fields.equipment.forEach((input, i) => setValue(input, equipment[i] || ''));
    if (!form.checkValidity()) throw new Error('Complete the required fields in the original Google Form.');
  }
  const stop = event => { event.preventDefault(); event.stopImmediatePropagation(); };
  let allowSubmitClick = false;
  document.addEventListener('click', event => {
    if (!fields || !submitButton || !event.composedPath().includes(submitButton) || allowSubmitClick) return;
    stop(event); submit();
  }, true);
  document.addEventListener('submit', event => {
    if (!fields || event.target !== form || busy) return;
    stop(event); submit();
  }, true);
  function submit() {
    if (!fields) { setStatus('Wait for Google Forms to finish loading.'); return; }
    safely(async () => {
      await validate();
      setBusy(true); started = Date.now(); pending(started);
      clearStatus();
      allowSubmitClick = true;
      try { submitButton.click(); } finally { allowSubmitClick = false; }
    });
  }
  async function selectAction(value) { await choose(fields.action, value); clearStatus(); focusScanner(); }
  // Google lazily loads radio controllers. Serialize scans and shortcuts so D waits
  // for an earlier station/action click to finish, even on the first interaction.
  let operations = Promise.resolve();
  function safely(fn) {
    operations = operations.then(async () => {
      if (!fields || busy) return;
      try { await fn(); } catch (error) { setStatus(error.message); focusScanner(); }
    });
  }
  $('#retry').onclick = () => {
    setBusy(false); pending(null); $('#retry').hidden = true;
    setStatus('Unlocked. Check the original form and response log before submitting again.'); focusScanner();
  };
  document.addEventListener('keydown', event => {
    if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
    const target = event.composedPath()[0];
    if (event.key === 'Enter') {
      if (ui.contains(target) && target !== scan) return;
      stop(event); // Never let a scanner suffix submit the form or activate a focused button.
      if (target === scan && !event.repeat) finishScan();
      return;
    }
    if (event.key === 'Escape' && target === scan) { stop(event); scan.value = ''; focusScanner(); return; }
    const editing = target instanceof Element && target.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
    if (editing && (target !== scan || scan.value.length)) return;
    const key = event.key.toLowerCase();
    if (!['a', 'w', 'd', 'p'].includes(key) || event.repeat) return;
    stop(event);
    if (key === 'a') safely(() => selectAction(actions[0]));
    if (key === 'w') safely(() => selectAction(actions[1]));
    if (key === 'd') submit();
    if (key === 'p') safely(async () => { await choose(fields.station, 'PC Station'); setStatus(conflict()); focusScanner(); });
  }, true);

  const bootTime = Date.now();
  const timer = setInterval(() => {
    if (resetAfterConfirmation()) { clearInterval(timer); return; }
    if (!fields) {
      form = document.querySelector('form#mG61Hd');
      if (!form) {
        if (Date.now() - bootTime > 30000) setStatus('No editable Google Form found. Check access and whether the form is accepting responses.');
        return;
      }
      const students = [1, 2, 3, 4].map(i => question(`Student ID Card Number ${i}`)?.querySelector('input[type="text"]'));
      const equipment = [1, 2, 3, 4].map(i => question(`Equipment Barcode ${i}`)?.querySelector('input[type="text"]'));
      const action = question('Action'), station = question('Console Station or PC');
      submitButton = form.querySelector('[role="button"][jsname="M2UYVd"]');
      if ([...students, ...equipment].some(input => !input || input.disabled) || !action || !station || !submitButton ||
          actions.some(value => !radio(action, value)) || stations.some(value => !radio(station, value))) {
        if (Date.now() - bootTime > 30000) setStatus('The form is still loading or its fields have changed. Scanner paused; use the original form.');
        return;
      }
      fields = { students, equipment, action, station };
      clearStatus(); focusScanner();
    }
    if (busy && form.isConnected && form.querySelector('[aria-invalid="true"]')) {
      setBusy(false); pending(null); setStatus('Google Forms rejected a field. Review the original form; your entries are retained.');
    }
    if (busy && Date.now() - started > 20000) {
      setStatus('No confirmation yet. Check the response log before unlocking in Help.');
      $('#retry').hidden = false;
    }
  }, 400);
})();
