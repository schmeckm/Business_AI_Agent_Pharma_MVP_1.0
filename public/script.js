// ===== Elemente =====
const feed = document.getElementById('log') || document.getElementById('feed');
const input = document.getElementById('cmd');
const sendBtn = document.getElementById('send');
const statusEl = document.getElementById('status') || document.createElement('span');
const aiEl = document.getElementById('ai') || document.getElementById('ai-status') || document.createElement('span');
const releasedEl = document.getElementById('releasedCount') || document.getElementById('released-count') || document.createElement('span');
const blockedEl  = document.getElementById('blockedCount')  || document.getElementById('blocked-count')  || document.createElement('span');
const filterEl   = document.getElementById('filter');
const autosizeEl = document.getElementById('autosize');

// Rollen-Buttons
const roleBtns = Array.from(document.querySelectorAll('.rolebtn, .toolbar [name="role"]'));
let currentRole = 'all';

// ===== Counters =====
let releasedCount = 0, blockedCount = 0;
function renderCounters(){ releasedEl.textContent = String(releasedCount); blockedEl.textContent = String(blockedCount); }
function resetCounters(){ releasedCount = 0; blockedCount = 0; renderCounters(); }

// ===== Helpers =====
function nowTime(){
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function shouldCollapse(text){ return (text.length > 400 || text.includes('\n')); }
function roleFromTopic(topic=''){
  if (topic.includes('/notify/qa')) return 'qa';
  if (topic.includes('/notify/purchasing')) return 'purch';
  return 'planner';
}
function makePre(kind, text, meta = {}){
  const pre = document.createElement('pre');
  pre.className = kind;                   // system | event | user
  pre.dataset.kind = kind;
  if (meta.topic) pre.dataset.topic = meta.topic;
  if (meta.search) pre.dataset.search = meta.search.toLowerCase();
  if (meta.role) pre.dataset.role = meta.role;
  pre.textContent = `[${nowTime()}] ${text}`;

  // Copy-Button
  const btn = document.createElement('button');
  btn.className = 'copy';
  btn.type = 'button';
  btn.textContent = 'Copy';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(()=>{
      btn.textContent = 'Copied';
      setTimeout(()=> btn.textContent = 'Copy', 900);
    });
  });
  pre.appendChild(btn);

  // Collapsible
  if (kind !== 'user' && shouldCollapse(text)) pre.classList.add('collapsed');
  pre.addEventListener('click', (e) => { if (e.target !== btn) pre.classList.toggle('collapsed'); });

  return pre;
}
function append(preEl){
  feed.appendChild(preEl);
  if (!autosizeEl || autosizeEl.checked) feed.scrollTop = feed.scrollHeight;
}
function push(kind, text, meta){ append(makePre(kind, text, meta)); applyFilters(); }

// ===== Text- und Rollen-Filter =====
function entryMatchesRole(el){
  if (currentRole === 'all') return true;
  const r = el.dataset.role || '';
  return r === currentRole || (currentRole==='planner' && r==='');
}
function entryMatchesText(el){
  if (!filterEl) return true;
  const q = filterEl.value.trim().toLowerCase();
  if (!q) return true;
  const hay = (el.dataset.topic || '') + ' ' + (el.dataset.search || el.textContent || '');
  return hay.toLowerCase().includes(q);
}
function applyFilters(){
  const nodes = feed.querySelectorAll('pre');
  nodes.forEach(n => { n.style.display = (entryMatchesRole(n) && entryMatchesText(n)) ? '' : 'none'; });
}
if (filterEl) filterEl.addEventListener('input', applyFilters);

// ===== WebSocket mit korrekter URL + Reconnect Backoff =====
let ws;
let backoff = 400;
function wsUrl(){
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}`; // nutzt aktuellen Host + Port (z.B. :5174)
}
function connect(){
  try {
    ws = new WebSocket(wsUrl());
  } catch (e) {
    scheduleReconnect(); return;
  }

  ws.onopen = () => {
    backoff = 400;
    if (statusEl){ statusEl.textContent = 'verbunden'; statusEl.classList?.add('on'); }
  };

  ws.onclose = () => {
    if (statusEl){ statusEl.textContent = 'getrennt'; statusEl.classList?.remove('on'); }
    scheduleReconnect();
  };

  ws.onmessage = (ev) => {
    let msg; try { msg = JSON.parse(ev.data); } catch { return; }

    if (msg.type === 'system') {
      const txt = String(msg.text || msg.message || '');
      push('system', txt, { search: txt, role: 'planner' });
      if (txt.includes('AI is ON')) { (aiEl.textContent = 'ON'); aiEl.classList?.add('on'); }
      return;
    }

    if (msg.type === 'chat') {
      const txt = String(msg.text || '');
      push('user', txt, { search: txt, role: 'planner' });
      return;
    }

    if (msg.type === 'event') {
      const body = (msg.payload !== undefined) ? msg.payload : msg.data;
      const topic = String(msg.topic || '');
      const pretty = `${topic}\n${JSON.stringify(body, null, 2)}`;
      const role = roleFromTopic(topic);
      push('event', pretty, { topic, search: JSON.stringify(body), role });

      // Counter
      if (topic.endsWith('/plan/started')) resetCounters();
      if (topic.includes('/order/') && topic.endsWith('/released')) { releasedCount++; renderCounters(); }
      if (topic.includes('/order/') && topic.endsWith('/blocked'))  { blockedCount++;  renderCounters(); }
    }
  };
}
function scheduleReconnect(){
  setTimeout(connect, Math.min(backoff *= 1.7, 8000));
}
connect();

// ===== Senden =====
function send(){
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  push('user', text, { search: text, role: 'planner' });
  // Server akzeptiert {type:'chat', text} (und auch {type:'cmd', text})
  ws?.send(JSON.stringify({ type: 'chat', text }));
  input.value = '';
  input.focus();
}
if (sendBtn) sendBtn.addEventListener('click', send);
if (input)   input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

// ===== Rollen-Buttons =====
roleBtns.forEach(btn => {
  // unterstützen sowohl Buttons (.rolebtn) als auch Radio-Inputs (name="role")
  const role = btn.dataset?.role || btn.value || 'all';
  btn.addEventListener('click', () => {
    currentRole = role;
    document.querySelectorAll('.rolebtn').forEach(b => b.classList?.toggle('active', b === btn));
    applyFilters();
  });
  if (btn.name === 'role') {
    btn.addEventListener('change', () => { currentRole = role; applyFilters(); });
  }
});
