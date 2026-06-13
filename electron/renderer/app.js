const RAINBOW = ['#FF5252', '#FFB74D', '#FFD54F', '#69F0AE', '#40C4FF', '#7C4DFF', '#E040FB'];
let currentTabs = [];
let liveTimer = null;
let otherSitesList = [];
let otherExpanded = false;

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  if (total < 60) return total + 's';
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return m + 'm ' + s + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseTabTitle(title) {
  const parts = title.split(' - ');
  if (parts.length >= 2) {
    return { site: parts[parts.length - 1].trim(), page: parts.slice(0, -1).join(' - ').trim() };
  }
  return { site: title, page: '' };
}

function computeDuration(tabs, index) {
  if (index === 0) return formatDuration(Date.now() - tabs[0].timestamp) + ' (active)';
  return formatDuration(tabs[index - 1].timestamp - tabs[index].timestamp);
}

function getSiteDurationMs(tabs, index) {
  if (index === 0) return Date.now() - tabs[0].timestamp;
  return tabs[index - 1].timestamp - tabs[index].timestamp;
}

function computeSiteDurations(tabs) {
  if (tabs.length === 0) { otherSitesList = []; return []; }
  const msBySite = new Map();
  for (let i = 0; i < tabs.length; i++) {
    const { site } = parseTabTitle(tabs[i].tabTitle);
    const key = site || '(unknown)';
    msBySite.set(key, (msBySite.get(key) || 0) + getSiteDurationMs(tabs, i));
  }
  const sorted = Array.from(msBySite.entries()).sort((a, b) => b[1] - a[1]).filter(([, ms]) => ms > 0);
  otherSitesList = [];
  otherExpanded = false;
  if (sorted.length <= 7) return sorted.map(([site, totalMs], i) => ({ site, totalMs, color: RAINBOW[i % RAINBOW.length] }));
  const top7 = sorted.slice(0, 7).map(([site, totalMs], i) => ({ site, totalMs, color: RAINBOW[i] }));
  const otherMs = sorted.slice(7).reduce((sum, [, ms]) => sum + ms, 0);
  otherSitesList = sorted.slice(7).map(([site, totalMs]) => ({ site, totalMs, color: '#555' }));
  return [...top7, { site: 'Other', totalMs: otherMs, color: '#555' }];
}

function renderDonutChart(sites) {
  const container = document.getElementById('chart-container');
  const section = document.getElementById('chart-section');
  if (!container || !section) return;
  if (sites.length === 0) { section.style.display = 'none'; return; }
  const total = sites.reduce((s, st) => s + st.totalMs, 0);
  if (total <= 0) { section.style.display = 'none'; return; }
  section.style.display = '';

  const cx = 100, cy = 100, r = 72, sw = 20;
  const circumference = 2 * Math.PI * r;
  let svg = '<svg viewBox="0 0 200 200" class="donut">';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="' + sw + '" />';
  let offset = 0;
  for (const st of sites) {
    const dash = (st.totalMs / total) * circumference;
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + st.color + '" stroke-width="' + sw + '" stroke-dasharray="' + dash + ' ' + (circumference - dash) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" class="donut-segment" />';
    offset += dash;
  }
  svg += '<text x="' + cx + '" y="' + cy + ' - 8" text-anchor="middle" fill="#fff" font-size="22" font-weight="600">' + formatDuration(total) + '</text>';
  svg += '<text x="' + cx + '" y="' + cy + ' + 12" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="11">total</text>';
  svg += '</svg>';

  let legend = '<div class="chart-legend">';
  for (const st of sites) {
    const pct = Math.round((st.totalMs / total) * 100);
    const isOther = st.site === 'Other';
    legend += '<div class="legend-item' + (isOther ? ' legend-other' : '') + '" data-other="' + isOther + '">';
    legend += '<span class="legend-dot" style="background:' + st.color + '"></span>';
    legend += '<span class="legend-label">' + escapeHtml(st.site) + '</span>';
    legend += '<span class="legend-value">' + formatDuration(st.totalMs) + '</span>';
    legend += '<span class="legend-pct">' + pct + '%</span>';
    if (isOther && otherSitesList.length > 0) legend += '<span style="font-size:10px;color:rgba(255,255,255,0.3);margin-left:2px">&#9656;</span>';
    legend += '</div>';
    if (isOther && otherExpanded) {
      for (const sub of otherSitesList) {
        const subPct = Math.round((sub.totalMs / total) * 100);
        legend += '<div class="legend-item" style="padding-left:16px;opacity:0.75">';
        legend += '<span class="legend-dot" style="background:' + sub.color + ';opacity:0.4"></span>';
        legend += '<span class="legend-label" style="font-size:10px">' + escapeHtml(sub.site) + '</span>';
        legend += '<span class="legend-value">' + formatDuration(sub.totalMs) + '</span>';
        legend += '<span class="legend-pct">' + subPct + '%</span>';
        legend += '</div>';
      }
    }
  }
  legend += '</div>';
  container.innerHTML = svg + legend;

  const otherRow = container.querySelector('.legend-other');
  if (otherRow) {
    otherRow.addEventListener('click', function() {
      otherExpanded = !otherExpanded;
      renderDonutChart(computeSiteDurations(currentTabs));
    });
  }
}

function renderTabs(tabs) {
  currentTabs = tabs;
  const list = document.getElementById('tab-list');
  const count = document.getElementById('toggle-count');
  if (!list || !count) return;

  document.getElementById('stat-tabs').textContent = tabs.length;
  const browsers = new Set(tabs.map(t => t.browser));
  document.getElementById('stat-browsers').textContent = browsers.size;

  if (tabs.length === 0) {
    list.innerHTML = '<p class="empty-state">No tabs captured yet. Switch to a browser tab to start tracking.</p>';
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    renderDonutChart([]);
    return;
  }

  count.textContent = String(tabs.length);

  list.innerHTML = tabs.map(function(t, i) {
    const { site, page } = parseTabTitle(t.tabTitle);
    const display = page ? escapeHtml(site) + ' &mdash; ' + escapeHtml(page) : escapeHtml(site);
    return '<div class="tab-entry">' +
      '<span class="browser-badge ' + t.browser + '">' + t.browser + '</span>' +
      '<div class="tab-info">' +
        '<span class="tab-title" title="' + escapeHtml(t.tabTitle) + '">' + display + '</span>' +
        '<span class="tab-duration">' + computeDuration(tabs, i) + '</span>' +
      '</div>' +
      '<span class="tab-time">' + formatTime(t.timestamp) + '</span>' +
    '</div>';
  }).join('');

  renderDonutChart(computeSiteDurations(tabs));

  if (!liveTimer) {
    liveTimer = setInterval(function() {
      if (currentTabs.length > 0) {
        var durEls = document.querySelectorAll('.tab-duration');
        durEls.forEach(function(el, i) {
          if (i < currentTabs.length) el.textContent = computeDuration(currentTabs, i);
        });
        renderDonutChart(computeSiteDurations(currentTabs));
      }
    }, 1000);
  }

  document.getElementById('stat-switches').textContent = tabs.length;
}

function init() {
  var api = window.tabDashboard;
  if (!api) return;

  api.getTabs().then(function(tabs) { renderTabs(tabs); });
  api.onTabsInit(function(tabs) { renderTabs(tabs); });
  api.onTabsUpdate(function(tabs) { renderTabs(tabs); });
  api.onPermissionStatus(function(ok) {
    var banner = document.getElementById('permission-banner');
    if (banner) banner.classList.toggle('hidden', ok);
  });
  api.getPermission().then(function(ok) {
    var banner = document.getElementById('permission-banner');
    if (banner) banner.classList.toggle('hidden', ok);
  });

  document.getElementById('clear-btn').addEventListener('click', function() {
    api.clearTabs();
    renderTabs([]);
  });

  document.getElementById('open-prefs-btn').addEventListener('click', function() {
    api.openAccessibilityPrefs();
  });

  document.getElementById('toggle-tabs').addEventListener('click', function() {
    var wrap = document.getElementById('tab-list-wrap');
    var icon = document.getElementById('toggle-icon');
    var open = wrap.classList.toggle('open');
    icon.classList.toggle('open', open);
  });
}

document.addEventListener('DOMContentLoaded', init);
