const STORAGE_KEY = 'gsSupportTriage.v1';

const metricsEl = document.getElementById('metrics');
const queueEl = document.getElementById('queue');
const actionsEl = document.getElementById('actions');
const briefEl = document.getElementById('brief');
const exportPreviewEl = document.getElementById('export-preview');
const ownerWorkloadEl = document.getElementById('owner-workload');
const riskRadarEl = document.getElementById('risk-radar');

const form = document.getElementById('case-form');
const searchInput = document.getElementById('search');
const filterStatus = document.getElementById('filter-status');
const filterOwner = document.getElementById('filter-owner');

const seedButton = document.getElementById('seed-data');
const clearButton = document.getElementById('clear-data');
const exportButton = document.getElementById('export-json');
const importInput = document.getElementById('import-json');
const copyBriefButton = document.getElementById('copy-brief');

const storageStatusEl = document.getElementById('storage-status');
const storageDetailEl = document.getElementById('storage-detail');
const storageDotEl = document.getElementById('storage-dot');
const storageFootEl = document.getElementById('storage-foot');

const todayIso = () => new Date().toISOString().slice(0, 10);

const urgencyWeights = {
  Low: 1,
  Medium: 2,
  High: 4,
  Critical: 6,
};

const touchSlaDays = {
  Low: 7,
  Medium: 4,
  High: 2,
  Critical: 1,
};

const sampleCases = [
  {
    scholar: 'Avery Hill',
    summary: 'Tuition payment gap for spring term',
    channel: 'Email',
    category: 'Financial aid',
    urgency: 'High',
    status: 'Open',
    owner: 'Maya',
    nextStep: 'Confirm balance and send payment plan options',
    created: shiftDate(-6),
    lastTouch: shiftDate(-4),
    due: shiftDate(2),
  },
  {
    scholar: 'Luis Carter',
    summary: 'Housing insecurity update from advisor',
    channel: 'Phone',
    category: 'Wellbeing',
    urgency: 'Critical',
    status: 'Open',
    owner: 'Jordan',
    nextStep: 'Escalate to care partner and document resources',
    created: shiftDate(-2),
    lastTouch: shiftDate(-1),
    due: shiftDate(1),
  },
  {
    scholar: 'Renee Brooks',
    summary: 'Laptop repair request stalled',
    channel: 'Form',
    category: 'Technology access',
    urgency: 'Medium',
    status: 'Pending',
    owner: '',
    nextStep: 'Assign owner and confirm loaner availability',
    created: shiftDate(-12),
    lastTouch: shiftDate(-8),
    due: shiftDate(-1),
  },
  {
    scholar: 'Sami Patel',
    summary: 'Missed tutoring sessions, check-in needed',
    channel: 'Slack',
    category: 'Academic support',
    urgency: 'Low',
    status: 'Open',
    owner: 'Nia',
    nextStep: 'Schedule reset call and confirm attendance plan',
    created: shiftDate(-14),
    lastTouch: shiftDate(-10),
    due: shiftDate(4),
  },
];

const state = {
  cases: [],
  storage: {
    mode: 'local',
    label: 'Local browser storage',
    detail: 'No server connection detected yet.',
    healthy: false,
  },
};

function shiftDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function loadLocalCases() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse saved cases', error);
    return [];
  }
}

function saveLocalCases(cases) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 2000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function updateStorageStatus(next) {
  state.storage = { ...state.storage, ...next };
  if (storageStatusEl) storageStatusEl.textContent = state.storage.label;
  if (storageDetailEl) storageDetailEl.textContent = state.storage.detail;
  if (storageFootEl) storageFootEl.textContent = state.storage.label;
  if (storageDotEl) {
    storageDotEl.classList.toggle('ok', state.storage.healthy);
    storageDotEl.classList.toggle('warn', !state.storage.healthy);
  }
}

async function detectStorage() {
  try {
    const response = await fetchWithTimeout('/api/health');
    if (!response.ok) throw new Error('Health check failed');
    const data = await response.json();
    updateStorageStatus({
      mode: 'remote',
      label: 'Shared support database',
      detail: `Server storage: ${data.storage}`,
      healthy: true,
    });
  } catch (error) {
    updateStorageStatus({
      mode: 'local',
      label: 'Local browser storage',
      detail: 'Server unavailable. Running in offline mode.',
      healthy: false,
    });
  }
}

async function readCases() {
  if (state.storage.mode === 'remote') {
    try {
      const response = await fetch('/api/cases');
      if (!response.ok) throw new Error('Failed to load cases');
      const payload = await response.json();
      return Array.isArray(payload.cases) ? payload.cases : [];
    } catch (error) {
      updateStorageStatus({
        mode: 'local',
        label: 'Local browser storage',
        detail: 'Server unreachable. Switched to offline mode.',
        healthy: false,
      });
    }
  }

  return loadLocalCases();
}

async function createCase(payload) {
  if (state.storage.mode === 'remote') {
    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Create failed');
      const data = await response.json();
      return data.case;
    } catch (error) {
      updateStorageStatus({
        mode: 'local',
        label: 'Local browser storage',
        detail: 'Server write failed. Saved locally instead.',
        healthy: false,
      });
    }
  }

  const cases = loadLocalCases();
  const record = { id: crypto.randomUUID(), ...payload };
  cases.push(record);
  saveLocalCases(cases);
  return record;
}

async function replaceCases(list) {
  if (state.storage.mode === 'remote') {
    try {
      const response = await fetch('/api/cases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases: list }),
      });
      if (!response.ok) throw new Error('Replace failed');
      const data = await response.json();
      return Array.isArray(data.cases) ? data.cases : list;
    } catch (error) {
      updateStorageStatus({
        mode: 'local',
        label: 'Local browser storage',
        detail: 'Server replace failed. Stored locally.',
        healthy: false,
      });
    }
  }

  saveLocalCases(list);
  return list;
}

async function seedCases() {
  if (state.storage.mode === 'remote') {
    try {
      const response = await fetch('/api/seed', { method: 'POST' });
      if (!response.ok) throw new Error('Seed failed');
      await refreshCases();
      return;
    } catch (error) {
      updateStorageStatus({
        mode: 'local',
        label: 'Local browser storage',
        detail: 'Server seed failed. Seeding locally instead.',
        healthy: false,
      });
    }
  }

  const cases = loadLocalCases();
  const seeded = sampleCases.map((item) => ({ id: crypto.randomUUID(), ...item }));
  saveLocalCases([...cases, ...seeded]);
  await refreshCases();
}

async function clearCases() {
  if (state.storage.mode === 'remote') {
    try {
      const response = await fetch('/api/cases', { method: 'DELETE' });
      if (!response.ok) throw new Error('Clear failed');
      await refreshCases();
      return;
    } catch (error) {
      updateStorageStatus({
        mode: 'local',
        label: 'Local browser storage',
        detail: 'Server clear failed. Clearing locally instead.',
        healthy: false,
      });
    }
  }

  localStorage.removeItem(STORAGE_KEY);
  await refreshCases();
}

function daysBetween(dateString) {
  if (!dateString) return 0;
  const start = new Date(dateString);
  const now = new Date();
  const diff = now.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function addDays(dateString, days) {
  if (!dateString) return '';
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDelta(delta, prefix = 'due') {
  if (delta === null || Number.isNaN(delta)) return '';
  if (delta === 0) return `${prefix} today`;
  if (delta > 0) return `${prefix} in ${delta}d`;
  return `${prefix} overdue by ${Math.abs(delta)}d`;
}

function computePriority(caseItem) {
  const urgencyWeight = urgencyWeights[caseItem.urgency] || 1;
  const daysSinceLast = daysBetween(caseItem.lastTouch);
  const daysSinceCreated = daysBetween(caseItem.created);
  const dueInDays = daysUntil(caseItem.due);
  const overdue = dueInDays !== null && dueInDays < 0;
  const dueSoon = dueInDays !== null && dueInDays >= 0 && dueInDays <= 2;
  const touchWindow = touchSlaDays[caseItem.urgency] ?? 4;
  const nextTouchDue = caseItem.lastTouch ? addDays(caseItem.lastTouch, touchWindow) : '';
  const daysToNextTouch = nextTouchDue ? daysUntil(nextTouchDue) : null;
  const touchOverdue = daysToNextTouch !== null && daysToNextTouch < 0;
  const touchDueSoon = daysToNextTouch !== null && daysToNextTouch >= 0 && daysToNextTouch <= 1;
  const score =
    urgencyWeight * 10 +
    daysSinceLast +
    Math.floor(daysSinceCreated / 5) +
    (overdue ? 12 : 0) +
    (dueSoon ? 5 : 0) +
    (touchOverdue ? 8 : 0);
  const adjustedScore = caseItem.status === 'Resolved' ? score - 20 : score;

  let band = 'low';
  if (adjustedScore >= 45) band = 'high';
  else if (adjustedScore >= 28) band = 'medium';

  let recommendation = 'Monitor and respond within 48 hours.';
  if (overdue) recommendation = 'Overdue: update scholar and log next step.';
  else if (touchOverdue) recommendation = 'Touchpoint overdue: reach out today.';
  else if (dueSoon) recommendation = 'Due soon: confirm delivery plan.';
  else if (daysSinceLast >= 7) recommendation = 'Stale touchpoint: send a check-in today.';
  else if (caseItem.urgency === 'High' || caseItem.urgency === 'Critical')
    recommendation = 'Escalate: confirm owner response and next step.';

  return {
    score: adjustedScore,
    band,
    overdue,
    dueSoon,
    dueInDays,
    nextTouchDue,
    daysToNextTouch,
    touchOverdue,
    touchDueSoon,
    daysSinceLast,
    recommendation,
  };
}

function enrichCases(cases) {
  return cases.map((caseItem) => ({
    ...caseItem,
    ...computePriority(caseItem),
  }));
}

function renderMetrics(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  const overdue = active.filter((item) => item.overdue).length;
  const dueSoon = active.filter((item) => item.dueSoon).length;
  const touchOverdue = active.filter((item) => item.touchOverdue).length;
  const unassigned = active.filter((item) => !item.owner).length;
  const highUrgency = active.filter((item) => ['High', 'Critical'].includes(item.urgency)).length;
  const stale = active.filter((item) => item.daysSinceLast >= 7).length;

  const metrics = [
    { label: 'Active cases', value: active.length },
    { label: 'Overdue', value: overdue },
    { label: 'Due soon', value: dueSoon },
    { label: 'Touch overdue', value: touchOverdue },
    { label: 'Unassigned', value: unassigned },
    { label: 'High urgency', value: highUrgency },
    { label: 'Stale touchpoints', value: stale },
  ];

  metricsEl.innerHTML = metrics
    .map(
      (metric) => `
        <div class="metric-card">
          <h3>${metric.label}</h3>
          <p>${metric.value}</p>
        </div>
      `
    )
    .join('');
}

function renderQueue(cases) {
  const query = searchInput.value.toLowerCase();
  const statusFilter = filterStatus.value;
  const ownerFilter = filterOwner.value;

  const filtered = cases
    .filter((item) =>
      [item.scholar, item.summary].some((field) => field.toLowerCase().includes(query))
    )
    .filter((item) => (statusFilter === 'all' ? true : item.status === statusFilter))
    .filter((item) => (ownerFilter === 'all' ? true : item.owner === ownerFilter))
    .sort((a, b) => b.score - a.score);

  queueEl.innerHTML = filtered
    .map(
      (item) => `
        <div class="queue-card">
          <div>
            <div class="title">${item.scholar} · ${item.summary}</div>
            <div class="muted">${item.category} · ${item.channel}</div>
          </div>
          <div>
            <div class="badge ${item.band}">${item.urgency} · ${item.score}</div>
          </div>
          <div>
            <div class="muted">Owner</div>
            <div>${item.owner || 'Unassigned'}</div>
          </div>
          <div>
            <div class="muted">Last touch</div>
            <div>${item.lastTouch || 'None'} (${item.daysSinceLast}d)</div>
            <div class="chip ${item.touchOverdue ? 'danger' : item.touchDueSoon ? 'warning' : 'ok'}">
              ${item.nextTouchDue ? `${item.nextTouchDue} · ${formatDelta(item.daysToNextTouch, 'touch')}` : 'Touch SLA: n/a'}
            </div>
          </div>
          <div>
            <div class="muted">Case due</div>
            <div>${item.due || 'Not set'}</div>
            <div class="chip ${item.overdue ? 'danger' : item.dueSoon ? 'warning' : 'ok'}">
              ${item.due ? formatDelta(item.dueInDays) : 'SLA: n/a'}
            </div>
          </div>
          <div>
            <div class="muted">Next step</div>
            <div>${item.nextStep || 'TBD'}</div>
          </div>
        </div>
      `
    )
    .join('');

  if (!filtered.length) {
    queueEl.innerHTML = '<p class="muted">No cases match the current filters.</p>';
  }
}

function renderActions(cases) {
  const actionItems = cases
    .filter((item) => item.status !== 'Resolved')
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  actionsEl.innerHTML = actionItems
    .map(
      (item) => `
        <div class="action-item">
          <strong>${item.scholar}</strong>
          <span>${item.summary}</span>
          <span class="muted">${item.recommendation}</span>
        </div>
      `
    )
    .join('');

  if (!actionItems.length) {
    actionsEl.innerHTML = '<p class="muted">No active cases yet.</p>';
  }
}

function renderOwnerWorkload(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  const stats = new Map();

  active.forEach((item) => {
    const owner = item.owner?.trim() || 'Unassigned';
    if (!stats.has(owner)) {
      stats.set(owner, { owner, total: 0, overdue: 0, highUrgency: 0, touchOverdue: 0 });
    }
    const entry = stats.get(owner);
    entry.total += 1;
    if (item.overdue) entry.overdue += 1;
    if (item.touchOverdue) entry.touchOverdue += 1;
    if (['High', 'Critical'].includes(item.urgency)) entry.highUrgency += 1;
  });

  const rows = Array.from(stats.values()).sort((a, b) => {
    if (a.owner === 'Unassigned') return -1;
    if (b.owner === 'Unassigned') return 1;
    return b.total - a.total || a.owner.localeCompare(b.owner);
  });

  if (!rows.length) {
    ownerWorkloadEl.innerHTML = '<p class="muted">No active cases to assign yet.</p>';
    return;
  }

  ownerWorkloadEl.innerHTML = rows
    .map(
      (row) => `
        <div class="workload-row">
          <div class="workload-meta">
            <strong>${row.owner}</strong>
            <span class="muted">${row.total} active · ${row.overdue} overdue · ${row.highUrgency} high urgency</span>
          </div>
          <div class="workload-badges">
            <span class="pill ${row.overdue ? 'danger' : ''}">Overdue ${row.overdue}</span>
            <span class="pill ${row.touchOverdue ? 'warning' : ''}">Touch ${row.touchOverdue}</span>
            <span class="pill ${row.highUrgency ? 'warning' : ''}">High ${row.highUrgency}</span>
          </div>
        </div>
      `
    )
    .join('');
}

function renderRiskRadar(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  const overdue = active.filter((item) => item.overdue).length;
  const dueSoon = active.filter((item) => item.dueSoon).length;
  const touchOverdue = active.filter((item) => item.touchOverdue).length;
  const unassigned = active.filter((item) => !item.owner).length;
  const highUrgency = active.filter((item) => ['High', 'Critical'].includes(item.urgency)).length;
  const stale = active.filter((item) => item.daysSinceLast >= 7).length;

  const risks = [
    { label: 'Overdue cases', value: overdue, level: overdue ? 'danger' : 'ok' },
    { label: 'Touch overdue', value: touchOverdue, level: touchOverdue ? 'danger' : 'ok' },
    { label: 'Unassigned cases', value: unassigned, level: unassigned ? 'danger' : 'ok' },
    { label: 'Due in 2 days', value: dueSoon, level: dueSoon ? 'warning' : 'ok' },
    { label: 'High urgency', value: highUrgency, level: highUrgency ? 'warning' : 'ok' },
    { label: 'Stale touchpoints', value: stale, level: stale ? 'warning' : 'ok' },
  ];

  riskRadarEl.innerHTML = risks
    .map(
      (risk) => `
        <div class="risk-row">
          <div class="workload-meta">
            <strong>${risk.label}</strong>
            <span class="muted">${risk.value} flagged</span>
          </div>
          <div class="risk-badges">
            <span class="pill ${risk.level}">${risk.level === 'ok' ? 'Clear' : 'Needs attention'}</span>
          </div>
        </div>
      `
    )
    .join('');
}

function renderBrief(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  const overdue = active.filter((item) => item.overdue);
  const dueSoon = active.filter((item) => item.dueSoon);
  const touchOverdue = active.filter((item) => item.touchOverdue);
  const highUrgency = active.filter((item) => ['High', 'Critical'].includes(item.urgency));
  const unassigned = active.filter((item) => !item.owner);
  const ownerLoad = active.reduce((acc, item) => {
    const owner = item.owner?.trim() || 'Unassigned';
    acc[owner] = (acc[owner] || 0) + 1;
    return acc;
  }, {});
  const ownerSummary = Object.entries(ownerLoad)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([owner, count]) => `- ${owner}: ${count} active`)
    .join('\n');

  const topCases = active
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => `- ${item.scholar}: ${item.summary} (${item.urgency}, owner: ${item.owner || 'unassigned'})`)
    .join('\n');

  briefEl.value = [
    `Support Triage Brief (${todayIso()})`,
    `Active cases: ${active.length}`,
    `Overdue: ${overdue.length}`,
    `High urgency: ${highUrgency.length}`,
    `Unassigned: ${unassigned.length}`,
    `Due soon (<=2d): ${dueSoon.length}`,
    `Touch overdue: ${touchOverdue.length}`,
    '',
    'Top priorities:',
    topCases || '- None yet',
    '',
    'Owner load:',
    ownerSummary || '- No active owners yet',
    '',
    'Watch list:',
    overdue.length ? `- Overdue cases: ${overdue.length}` : '- No overdue cases',
    unassigned.length ? `- Unassigned cases: ${unassigned.length}` : '- All cases have owners',
  ].join('\n');
}

function renderOwnerFilter(cases) {
  const owners = Array.from(new Set(cases.map((item) => item.owner).filter(Boolean))).sort();
  const selected = filterOwner.value;
  filterOwner.innerHTML = '<option value="all">All owners</option>';
  owners.forEach((owner) => {
    const option = document.createElement('option');
    option.value = owner;
    option.textContent = owner;
    filterOwner.appendChild(option);
  });
  if (owners.includes(selected)) {
    filterOwner.value = selected;
  }
}

function render() {
  const enriched = enrichCases(state.cases);
  renderMetrics(enriched);
  renderOwnerFilter(enriched);
  renderQueue(enriched);
  renderActions(enriched);
  renderOwnerWorkload(enriched);
  renderRiskRadar(enriched);
  renderBrief(enriched);
}

async function refreshCases() {
  state.cases = await readCases();
  render();
}

async function handleAddCase(payload) {
  const created = await createCase(payload);
  state.cases = [...state.cases, created];
  render();
}

async function handleExport() {
  const payload = JSON.stringify(
    { generatedAt: new Date().toISOString(), cases: state.cases },
    null,
    2
  );
  exportPreviewEl.textContent = payload;

  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `support-triage-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.cases;
      if (!Array.isArray(incoming)) {
        throw new Error('Invalid payload');
      }
      state.cases = await replaceCases(incoming);
      render();
    } catch (error) {
      alert('Import failed. Please check the JSON format.');
      console.error(error);
    }
  };
  reader.readAsText(file);
}

function handleCopyBrief() {
  navigator.clipboard.writeText(briefEl.value).then(() => {
    copyBriefButton.textContent = 'Copied';
    setTimeout(() => {
      copyBriefButton.textContent = 'Copy brief';
    }, 1200);
  });
}

function initDates() {
  const createdInput = document.getElementById('created');
  const lastTouchInput = document.getElementById('last-touch');
  const today = todayIso();
  createdInput.value = today;
  lastTouchInput.value = today;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  await handleAddCase(payload);
  form.reset();
  initDates();
});

[searchInput, filterStatus, filterOwner].forEach((input) => {
  input.addEventListener('input', render);
  input.addEventListener('change', render);
});

seedButton.addEventListener('click', () => {
  seedCases();
});
clearButton.addEventListener('click', () => {
  clearCases();
});
exportButton.addEventListener('click', handleExport);
importInput.addEventListener('change', handleImport);
copyBriefButton.addEventListener('click', handleCopyBrief);

async function init() {
  initDates();
  updateStorageStatus({
    mode: 'local',
    label: 'Checking storage...',
    detail: 'Attempting to reach support database.',
    healthy: false,
  });
  await detectStorage();
  await refreshCases();
}

init();
