const $ = id => document.getElementById(id);

const TIME_ZONE = 'Asia/Jerusalem';
const JERUSALEM_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

let idx = 0;
let todayIdx = -1;
let todayKey = '';

function getTimeZoneParts(date) {
  const parts = JERUSALEM_FORMATTER.formatToParts(date);
  const values = {};

  parts.forEach(part => {
    if (part.type !== 'literal') values[part.type] = part.value;
  });

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    isoDate: values.year + '-' + values.month + '-' + values.day,
  };
}

function getJerusalemDateKey(now) {
  return getTimeZoneParts(now || new Date()).isoDate;
}

function getDateIndex(dateKey) {
  return DATA.findIndex(d => d.date === dateKey);
}

function getTodayIndex(now) {
  return getDateIndex(getJerusalemDateKey(now || new Date()));
}

function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function parseTime(hhmm) {
  const [h, m, s = 0] = hhmm.split(':').map(Number);
  return { h, m, s };
}

function makeCalendarDate(dateStr) {
  const { year, month, day } = parseDate(dateStr);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function getTimeZoneOffsetMs(date) {
  const parts = getTimeZoneParts(date);
  const utcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return utcMs - date.getTime();
}

function makeZonedDate(dateStr, hhmm) {
  const { year, month, day } = parseDate(dateStr);
  const { h, m, s } = parseTime(hhmm);
  const baseUtcMs = Date.UTC(year, month - 1, day, h, m, s);
  let targetUtcMs = baseUtcMs;

  for (let i = 0; i < 2; i++) {
    const offsetMs = getTimeZoneOffsetMs(new Date(targetUtcMs));
    targetUtcMs = baseUtcMs - offsetMs;
  }

  return new Date(targetUtcMs);
}

function getDailyDua(now) {
  const dateKey = getJerusalemDateKey(now || new Date());
  const dayNumber = Math.floor(Date.parse(dateKey + 'T00:00:00Z') / 86400000);
  const duaIndex = ((dayNumber % DUAS.length) + DUAS.length) % DUAS.length;
  return DUAS[duaIndex];
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
  const dt = makeCalendarDate(d.date);

  $('dayName').textContent = LANG.days[dt.getUTCDay()];
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

  LANG.updateDua(getDailyDua());

  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
  });
}

function updateCountdown() {
  const now = new Date();
  const nextTodayKey = getJerusalemDateKey(now);
  const newTodayIdx = getDateIndex(nextTodayKey);
  const dayChanged = nextTodayKey !== todayKey;

  if (dayChanged) todayKey = nextTodayKey;

  if (newTodayIdx !== todayIdx || dayChanged) {
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

  const fajrDate = makeZonedDate(d.date, d.fajr);
  const magDate = makeZonedDate(d.date, d.mag);

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
    target = makeZonedDate(tomorrow.date, tomorrow.fajr);
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
todayKey = getJerusalemDateKey();
todayIdx = getDateIndex(todayKey);
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
