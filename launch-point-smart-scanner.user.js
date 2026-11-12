// ==UserScript==
// @name         Launch Point Smart Scanner
// @namespace    rescons
// @version      1.1.9
// @description  Scanner-first entry for the Launch Point Google Form.
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

  // Only run on these two forms. Check the URL here too since @match allows extra text.
  const ids = [
    '1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q',
    '1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ',
  ];
  const route = location.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/e\/([^/]+)\/(viewform|formResponse)$/);
  if (window.top !== window.self || location.origin !== 'https://docs.google.com' ||
      !route || !ids.includes(route[1]) || document.getElementById('lp-scanner')) return;

  const stations = ['Console Station 1', 'Console Station 2', 'Console Station 3', 'PC Station'];
  const actions = [
    'Check in to Lounge and Borrow Equipment',
    'Check out of Lounge and Return Equipment',
    'Check in to Lounge as additional person in a group',
    'Check in to Lounge as a "watcher"',
  ];
  // Match each equipment barcode to its station. 0, 1, and 2 mean Console 1, 2, and 3.
  const equipmentStations = Object.fromEntries([
    ['1088', 0], ['1089', 0], ['1090', 0],
    ['1082', 1], ['1083', 1], ['1084', 1],
    ['1085', 2], ['1086', 2], ['1087', 2],
  ].map(([barcode, index]) => [barcode, stations[index]]));
  // Ignore extra spaces and the required-field * when matching question names.
  const normalize = text => text.replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim();
  let form, fields, submitButton, busy = false, started = 0;

  // Find "Submit another response" for the same form.
  function confirmationLink() {
    return [...document.querySelectorAll('a[href]')].find(link => {
      const url = new URL(link.href, location.href);
      const match = url.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/e\/([^/]+)\/viewform$/);
      return url.origin === location.origin && match?.[1] === route[1] &&
        (url.searchParams.get('usp') === 'form_confirm' || /submit another response/i.test(link.textContent));
    });
  }
  // Wait for the recorded-response page before opening another form.
  function resetAfterConfirmation() {
    if (document.querySelector('form#mG61Hd') || !document.querySelector('.vHW8K')) return false;
    const link = confirmationLink();
    if (!link) return false;
    link.click();
    return true;
  }
  if (resetAfterConfirmation()) return;

  // Build the little scanner window. Keep its styles separate from the form.
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
  // Build elements directly because Google blocks inserting raw HTML here.
  function element(tag, attributes = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    node.append(...children);
    return node;
  }
  ui.append(style, element('section', { 'aria-label': 'Launch Point Scanner' },
    element('h2', { title: 'Drag to move' }, 'Launch Point Scanner'),
    element('label', { for: 'scan' }, 'Scan'),
    element('input', { id: 'scan', type: 'text', inputmode: 'numeric', autocomplete: 'off',
      spellcheck: 'false', 'aria-describedby': 'status' }),
    element('p', { id: 'status', role: 'status', 'aria-live': 'polite', hidden: '' }),
    element('details', {}, element('summary', {}, 'Help'),
      element('p', {}, 'Scan a barcode or move the window around.'),
      element('p', {}, 'A,D to Check in/out. S to Submit Form. Esc to Clear Field'),
      element('button', { id: 'retry', type: 'button', hidden: '' }, 'Unlock after checking submission'))));
  const $ = selector => ui.querySelector(selector);
  const scan = $('#scan');
  const title = $('h2');
  // Drag from the title and keep the window on screen. No saved position.
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
    // Keep dragging even if the pointer moves outside the title.
    title.setPointerCapture(event.pointerId);
  });
  title.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) moveWindow(event.clientX - drag.x, event.clientY - drag.y);
  });
  title.addEventListener('lostpointercapture', () => { drag = null; });
  window.addEventListener('resize', () => {
    if (!host.style.left) return;
    const bounds = host.getBoundingClientRect();
    moveWindow(bounds.left, bounds.top);
  });
  // Show text under Scan. An empty string clears it. Nothing gets sent anywhere.
  function setStatus(text = '') {
    const status = $('#status');
    if (status.textContent === text && status.hidden === !text) return;
    status.textContent = text;
    status.hidden = !text;
  }
  function setBusy(value) { busy = value; scan.disabled = value; }
  function focusScanner() { if (!busy) scan.focus({ preventScroll: true }); }
  // Find a question by name since the field IDs differ between the two forms.
  function question(title) {
    return [...form.querySelectorAll('[role="listitem"]')].find(item =>
      normalize(item.querySelector('[role="heading"]')?.textContent || '') === title);
  }
  // Find a multiple-choice option, like Check in or PC Station. This does not click it.
  function radio(group, value) {
    return [...group.querySelectorAll('[role="radio"]')].find(el => el.getAttribute('data-value') === value || el.getAttribute('aria-label') === value);
  }
  // Read which option is currently selected.
  function selected(group) {
    const el = group.querySelector('[role="radio"][aria-checked="true"]');
    return el?.getAttribute('data-value') || el?.getAttribute('aria-label') || '';
  }
  // Click the option, then wait for Google to register it.
  async function choose(group, value) {
    const el = radio(group, value);
    if (!el || el.getAttribute('aria-disabled') === 'true') throw new Error('Google Forms is not ready for this selection.');
    if (el.getAttribute('aria-checked') !== 'true') el.click();
    const deadline = Date.now() + 2500;
    while (selected(group) !== value && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    if (selected(group) !== value) throw new Error('Google Forms did not accept the selection. Try again after it finishes loading.');
    group.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  // Fill the box and tell Google the value changed, like typing it in.
  function setValue(input, value) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const values = inputs => inputs.map(input => input.value.trim()).filter(Boolean);
  // Get the stations for known equipment. Unknown barcodes do not pick a station.
  function detected() { return [...new Set(values(fields.equipment).map(code => equipmentStations[code]).filter(Boolean))]; }
  function conflict() {
    const found = detected();
    if (found.length > 1) return 'Equipment belongs to conflicting stations. Remove the mistaken barcode(s) in the form.';
    if (found.length && selected(fields.station) !== found[0]) return `Equipment requires ${found[0]}. Select it or remove the equipment.`;
    return '';
  }
  // Put the scan in the next empty ID or equipment box, then scroll to it.
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
  // Check before submitting with S since someone could have edited the form manually.
  async function validate() {
    if (!fields) throw new Error('Wait for Google Forms to finish loading.');
    if (scan.value.trim()) throw new Error('Press Enter to finish the current scan before submitting.');
    const students = values(fields.students), equipment = values(fields.equipment);
    if (!students.length) throw new Error('Scan at least one student ID.');
    if (students.some(value => !/^\d{15}$/.test(value))) throw new Error('Every student ID must have exactly 15 digits.');
    if (equipment.some(value => !/^\d{4}$/.test(value))) throw new Error('Every equipment barcode must have exactly 4 digits.');
    if (new Set(students).size !== students.length || new Set(equipment).size !== equipment.length) throw new Error('Remove duplicate barcodes before submitting.');
    if (!actions.includes(selected(fields.action))) throw new Error('Choose an action first (A or D).');
    // No station selected? Use PC.
    if (!selected(fields.station)) {
      await choose(fields.station, 'PC Station');
    }
    const stationError = conflict();
    if (stationError) throw new Error(stationError);
    // Close any gaps so the required first ID box is filled.
    fields.students.forEach((input, i) => setValue(input, students[i] || ''));
    fields.equipment.forEach((input, i) => setValue(input, equipment[i] || ''));
    if (!form.checkValidity()) throw new Error('Complete the required fields in the original Google Form.');
  }
  const stop = event => { event.preventDefault(); event.stopImmediatePropagation(); };
  // S runs our checks. Clicking Google's Submit button goes straight to Google.
  function submit() {
    if (!fields) { setStatus('Wait for Google Forms to finish loading.'); return; }
    safely(async () => {
      await validate();
      setBusy(true); started = Date.now();
      setStatus();
      submitButton.click();
    });
  }
  async function selectAction(value) { await choose(fields.action, value); setStatus(); focusScanner(); }
  // Do one thing at a time so S waits for the last scan or selection to finish.
  let operations = Promise.resolve();
  function safely(fn) {
    operations = operations.then(async () => {
      if (!fields || busy) return;
      try { await fn(); } catch (error) { setStatus(error.message); focusScanner(); }
    });
  }
  // Unlock only when asked. Retrying automatically could submit the same entry twice.
  $('#retry').onclick = () => {
    setBusy(false); $('#retry').hidden = true;
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
    // Leave typing alone in the form or when a scan is still being entered.
    const editing = target instanceof Element && target.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
    if (editing && (target !== scan || scan.value.length)) return;
    const key = event.key.toLowerCase();
    if (!['a', 'd', 's', 'p'].includes(key) || event.repeat) return;
    stop(event);
    if (key === 'a') safely(() => selectAction(actions[0]));
    if (key === 'd') safely(() => selectAction(actions[1]));
    if (key === 's') submit();
    if (key === 'p') safely(async () => { await choose(fields.station, 'PC Station'); setStatus(conflict()); focusScanner(); });
  }, true);

  // Wait for Google to load the fields. After that, watch for confirmation or errors.
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
      setStatus(); focusScanner();
    }
    if (busy && form.isConnected && form.querySelector('[aria-invalid="true"]')) {
      setBusy(false); setStatus('Google Forms rejected a field. Review the original form; your entries are retained.');
    }
    if (busy && Date.now() - started > 20000) {
      setStatus('No confirmation yet. Check the response log before unlocking in Help.');
      $('#retry').hidden = false;
    }
  }, 400);
})();
