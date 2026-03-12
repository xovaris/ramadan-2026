const $ = id => document.getElementById(id);

let idx = 0;
let todayIdx = -1;
const sessionDua = DUAS[Math.floor(Math.random() * DUAS.length)];

function getTodayIndex() {
  const now = new Date();
  const today = now.getFullYear() + '-'
    + String(now.getMonth()+1).padStart(2,'0') + '-'
    + String(now.getDate()).padStart(2,'0');
  return DATA.findIndex(d => d.date === today);
}

function parseTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
}

function fmt12(hhmm) {
  const { h, m } = parseTime(hhmm);
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? LANG.am : LANG.pm;
  return { time: h12 + ':' + String(m).padStart(2,'0'), ampm };
}

function fastingDuration(fajr, mag) {
  const f = parseTime(fajr);
  const m = parseTime(mag);
  let mins = (m.h * 60 + m.m) - (f.h * 60 + f.m);
  const hrs = Math.floor(mins / 60);
  mins = mins % 60;
  return LANG.fastingFmt(hrs, mins);
}

function render(direction) {
  const card = $('card');
  const cls = direction === 'left' ? 'slide-left' : direction === 'right' ? 'slide-right' : null;

  if (cls) {
    card.classList.add(cls);
    setTimeout(() => {
      update();
      card.classList.remove(cls);
    }, 120);
  } else {
    update();
  }
}

function update() {
  const d = DATA[idx];
  const dt = new Date(d.date + 'T12:00:00');

  $('dayName').textContent = LANG.days[dt.getDay()];
  $('gregorian').textContent = LANG.dateFmt(dt);
  $('ramadanDay').textContent = LANG.ramadanDay(d.r);

  const fajr = fmt12(d.fajr);
  const mag = fmt12(d.mag);
  $('fajrTime').textContent = fajr.time;
  $('fajrAmpm').textContent = fajr.ampm;
  $('maghribTime').textContent = mag.time;
  $('maghribAmpm').textContent = mag.ampm;
  $('fastHours').textContent = fastingDuration(d.fajr, d.mag);

  const card = $('card');
  card.classList.toggle('today', idx === todayIdx);

  $('todayBtn').classList.toggle('visible', idx !== todayIdx && todayIdx >= 0);

  $('progress').style.width = (d.r / DATA.length * 100) + '%';

  LANG.updateDua(sessionDua);

  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
  });
}

function updateCountdown() {
  const newTodayIdx = getTodayIndex();
  if (newTodayIdx !== todayIdx) {
    const wasOnToday = idx === todayIdx;
    todayIdx = newTodayIdx;
    if (wasOnToday && todayIdx >= 0) idx = todayIdx;
    render();
  }

  if (todayIdx < 0) {
    $('countdownLabel').textContent = '';
    $('countdownTime').textContent = '';
    $('countdownTime').className = 'countdown-time';
    return;
  }

  const d = DATA[todayIdx];
  const now = new Date();
  const todayStr = d.date;

  const fajrDate = new Date(todayStr + 'T' + d.fajr + ':00');
  const magDate = new Date(todayStr + 'T' + d.mag + ':00');

  let label, target, colorClass;

  if (now < fajrDate) {
    label = LANG.countdown.suhoor;
    target = fajrDate;
    colorClass = 'fajr-color';
  } else if (now < magDate) {
    label = LANG.countdown.iftar;
    target = magDate;
    colorClass = 'maghrib-color';
  } else if (todayIdx < DATA.length - 1) {
    const tomorrow = DATA[todayIdx + 1];
    label = LANG.countdown.suhoor;
    target = new Date(tomorrow.date + 'T' + tomorrow.fajr + ':00');
    colorClass = 'fajr-color';
  } else {
    $('countdownLabel').textContent = '';
    $('countdownTime').className = 'countdown-time countdown-done';
    $('countdownTime').textContent = LANG.countdown.complete(d.r);
    return;
  }

  const diff = Math.max(0, Math.floor((target - now) / 1000));
  const hh = Math.floor(diff / 3600);
  const mm = Math.floor((diff % 3600) / 60);
  const ss = diff % 60;

  $('countdownLabel').textContent = label;
  $('countdownTime').className = 'countdown-time ' + colorClass;
  $('countdownTime').textContent =
    String(hh).padStart(2,'0') + ':' +
    String(mm).padStart(2,'0') + ':' +
    String(ss).padStart(2,'0');
}

// Build dots
const dotsEl = $('dots');
DATA.forEach(() => {
  const dot = document.createElement('div');
  dot.className = 'dot';
  dotsEl.appendChild(dot);
});

// Init
todayIdx = getTodayIndex();
idx = todayIdx >= 0 ? todayIdx : 0;
render();
updateCountdown();
setInterval(updateCountdown, 1000);

// Navigation
$('prev').addEventListener('click', () => {
  if (idx > 0) { idx--; render('right'); }
});
$('next').addEventListener('click', () => {
  if (idx < DATA.length - 1) { idx++; render('left'); }
});
$('todayBtn').addEventListener('click', () => {
  if (todayIdx >= 0) {
    const dir = idx > todayIdx ? 'right' : 'left';
    idx = todayIdx;
    render(dir);
  }
});

// Swipe
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    if (dx < 0 && idx < DATA.length - 1) { idx++; render('left'); }
    else if (dx > 0 && idx > 0) { idx--; render('right'); }
  }
});

// Keyboard
document.addEventListener('keydown', e => {
  if (e.key === LANG.prevKey && idx > 0) { idx--; render('right'); }
  if (e.key === LANG.nextKey && idx < DATA.length - 1) { idx++; render('left'); }
});

// Theme switching
const THEMES = ['light', 'dark', 'hc'];
const THEME_ICONS = { dark: '\u263D', light: '\u2600', hc: '\u25C9' };
const THEME_META = { dark: '#0a0a0c', light: '#faf7f2', hc: '#ffffff' };

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('themeToggle').textContent = THEME_ICONS[theme];
  document.querySelector('meta[name="theme-color"]').content = THEME_META[theme];
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content =
    theme === 'dark' ? 'black-translucent' : 'default';
  try { localStorage.setItem('theme', theme); } catch(e) {}
}

$('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  applyTheme(next);
});

// Restore saved theme
applyTheme((() => {
  try { const t = localStorage.getItem('theme'); return THEMES.includes(t) ? t : 'light'; }
  catch(e) { return 'light'; }
})());
