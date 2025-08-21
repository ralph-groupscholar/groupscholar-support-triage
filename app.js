const STORAGE_KEY = 'gsSupportTriage.v1';
const EVENTS_KEY = 'gsSupportTriage.events.v1';

const metricsEl = document.getElementById('metrics');
const queueEl = document.getElementById('queue');
const actionsEl = document.getElementById('actions');
const briefEl = document.getElementById('brief');
const exportPreviewEl = document.getElementById('export-preview');
const ownerWorkloadEl = document.getElementById('owner-workload');
const riskRadarEl = document.getElementById('risk-radar');
const outreachPlanEl = document.getElementById('outreach-plan');
const slaOutlookEl = document.getElementById('sla-outlook');
const signalBreakdownEl = document.getElementById('signal-breakdown');
const agingSummaryEl = document.getElementById('aging-summary');
const channelMixEl = document.getElementById('channel-mix');
const coverageSuggestionsEl = document.getElementById('coverage-suggestions');
const responsePlaybookEl = document.getElementById('response-playbook');
const activityFeedEl = document.getElementById('activity-feed');
const resolutionVelocityEl = document.getElementById('resolution-velocity');
const slaComplianceEl = document.getElementById('sla-compliance');
const touchpointCadenceEl = document.getElementById('touchpoint-cadence');
const ownerFocusEl = document.getElementById('owner-focus');

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

const responsePlaybooks = {
  'Financial aid': {
    lead: 'Finance partner',
    steps: ['Confirm award status', 'Share disbursement timeline', 'Set follow-up date'],
  },
  'Academic support': {
    lead: 'Academic advisor',
    steps: ['Assess course risk', 'Schedule coaching session', 'Log progress checkpoint'],
  },
  Wellbeing: {
    lead: 'Care coordinator',
    steps: ['Check immediate safety', 'Provide resource options', 'Confirm next touchpoint'],
  },
  'Program operations': {
    lead: 'Program ops',
    steps: ['Clarify policy', 'Confirm timeline', 'Document resolution path'],
  },
  'Technology access': {
    lead: 'IT partner',
    steps: ['Verify device status', 'Confirm replacement path', 'Set return/check-in date'],
  },
  Other: {
    lead: 'Ops lead',
    steps: ['Acknowledge receipt', 'Define next step', 'Log follow-up owner'],
  },
};

const defaultPlaybook = {
  lead: 'Ops lead',
  steps: ['Acknowledge receipt', 'Confirm next step', 'Set follow-up date'],
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
  events: [],
  storage: {
    mode: 'local',
    label: 'Local browser storage',
    detail: 'No server connection detected yet.',
    healthy: false,
  },
};

const actionLabels = {
  created: 'New case',
  touched: 'Touch logged',
  resolved: 'Resolved',
  reopened: 'Reopened',
  reassigned: 'Reassigned',
  next_step: 'Next step',
  updated: 'Updated',
  seeded: 'Seeded',
};

function loadLocalEvents() {
  const raw = localStorage.getItem(EVENTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse saved events', error);
    return [];
  }
}

function saveLocalEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

function buildEvent(action, caseItem, detail, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    caseId: caseItem.id,
    scholar: caseItem.scholar,
    summary: caseItem.summary,
    urgency: caseItem.urgency,
    owner: caseItem.owner || '',
    action,
    detail,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function appendLocalEvent(event) {
  const events = loadLocalEvents();
  const next = [event, ...events].slice(0, 50);
  saveLocalEvents(next);
  return next;
}

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

async function readEvents() {
  if (state.storage.mode === 'remote') {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to load events');
      const payload = await response.json();
      return Array.isArray(payload.events) ? payload.events : [];
    } catch (error) {
      updateStorageStatus({
        mode: 'local',
        label: 'Local browser storage',
        detail: 'Server unreachable. Switched to offline mode.',
        healthy: false,
      });
    }
  }

  return loadLocalEvents();
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

async function updateCaseRecord(id, updates) {
  if (state.storage.mode === 'remote') {
    try {
      const response = await fetch(`/api/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Update failed');
      const data = await response.json();
      return data.case;
    } catch (error) {
      updateStorageStatus({
        mode: 'local',
        label: 'Local browser storage',
        detail: 'Server update failed. Saved locally instead.',
        healthy: false,
      });
    }
  }

  const cases = loadLocalCases();
  const index = cases.findIndex((item) => item.id === id);
  if (index === -1) return null;
  cases[index] = { ...cases[index], ...updates, id };
  saveLocalCases(cases);
  return cases[index];
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

function daysFromNow(dateString) {
  if (!dateString) return null;
  const target = new Date(dateString);
  const now = new Date();
  const diff = now.setHours(0, 0, 0, 0) - target.setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function diffDays(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function inLastDays(dateString, days) {
  const diff = daysFromNow(dateString);
  if (diff === null || Number.isNaN(diff)) return false;
  return diff >= 0 && diff <= days;
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

function formatDateLabel(dateString) {
  if (!dateString) return 'Unscheduled';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatEventTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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
    daysSinceCreated,
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
          <div class="queue-actions">
            <div class="muted">Quick actions</div>
            <div class="queue-action-buttons">
              ${
                item.status === 'Resolved'
                  ? `<button class="ghost tiny" data-action="reopen" data-id="${item.id}">Reopen</button>`
                  : `
                    <button class="ghost tiny" data-action="touch" data-id="${item.id}">Touch today</button>
                    <button class="ghost tiny danger" data-action="resolve" data-id="${item.id}">Resolve</button>
                  `
              }
            </div>
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

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function getVelocityStats(cases) {
  const intake7 = cases.filter((item) => inLastDays(item.created, 7)).length;
  const resolved = cases.filter((item) => item.status === 'Resolved');
  const resolved7 = resolved.filter((item) => inLastDays(item.lastTouch, 7)).length;
  const recentResolved = resolved.filter((item) => inLastDays(item.lastTouch, 30));
  const resolutionDays = recentResolved
    .map((item) => diffDays(item.created, item.lastTouch))
    .filter((value) => value !== null);

  const onTimeCandidates = recentResolved.filter((item) => item.due && item.lastTouch);
  const onTimeCount = onTimeCandidates.filter(
    (item) => new Date(item.lastTouch) <= new Date(item.due)
  ).length;
  const onTimeRate = onTimeCandidates.length
    ? Math.round((onTimeCount / onTimeCandidates.length) * 100)
    : null;

  return {
    intake7,
    resolved7,
    net7: resolved7 - intake7,
    medianResolution: median(resolutionDays),
    resolutionSample: resolutionDays.length,
    onTimeRate,
    onTimeSample: onTimeCandidates.length,
  };
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

function getOwnerLoads(active) {
  const loads = new Map();
  active.forEach((item) => {
    const owner = item.owner?.trim();
    if (!owner) return;
    loads.set(owner, (loads.get(owner) || 0) + 1);
  });
  return loads;
}

function buildCoverageSuggestions(active, limit = 4) {
  const unassigned = active.filter((item) => !item.owner || !item.owner.trim());
  if (!unassigned.length) {
    return { suggestions: [], reason: 'No unassigned cases right now.' };
  }

  const ownerLoads = getOwnerLoads(active);
  if (!ownerLoads.size) {
    return { suggestions: [], reason: 'No owners assigned yet. Add owners to generate suggestions.' };
  }

  const loadList = Array.from(ownerLoads.entries()).map(([owner, count]) => ({ owner, count }));
  const sortedUnassigned = [...unassigned].sort((a, b) => b.score - a.score).slice(0, limit);
  const suggestions = [];

  sortedUnassigned.forEach((item) => {
    loadList.sort((a, b) => a.count - b.count || a.owner.localeCompare(b.owner));
    const pick = loadList[0];
    suggestions.push({ item, owner: pick.owner, count: pick.count });
    pick.count += 1;
  });

  return { suggestions, reason: '' };
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

function renderCoverageSuggestions(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  if (!coverageSuggestionsEl) return;

  const { suggestions, reason } = buildCoverageSuggestions(active);
  if (!suggestions.length) {
    coverageSuggestionsEl.innerHTML = `<p class="muted">${reason || 'No coverage suggestions yet.'}</p>`;
    return;
  }

  coverageSuggestionsEl.innerHTML = suggestions
    .map(({ item, owner, count }) => {
      const statusLabel = item.overdue
        ? 'Overdue'
        : item.touchOverdue
          ? 'Touch overdue'
          : 'Needs owner';
      const statusClass = item.overdue ? 'danger' : item.touchOverdue ? 'warning' : 'ok';
      return `
        <div class="coverage-row">
          <div>
            <strong>${item.scholar}</strong>
            <span class="muted">${item.summary}</span>
            <span class="coverage-meta">${item.urgency} · ${item.category}</span>
          </div>
          <div class="coverage-actions">
            <span class="pill ${statusClass}">${statusLabel}</span>
            <span class="coverage-owner">Suggest: ${owner} (${count} active)</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderResponsePlaybook(cases) {
  if (!responsePlaybookEl) return;
  const active = cases.filter((item) => item.status !== 'Resolved');
  if (!active.length) {
    responsePlaybookEl.innerHTML = '<p class="muted">No active cases to guide yet.</p>';
    return;
  }

  const categoryCounts = active.reduce((acc, item) => {
    const category = item.category?.trim() || 'Unspecified';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3);

  responsePlaybookEl.innerHTML = topCategories
    .map(([category, count]) => {
      const playbook = responsePlaybooks[category] || defaultPlaybook;
      const highUrgencyCount = active.filter(
        (item) =>
          (item.category?.trim() || 'Unspecified') === category &&
          ['High', 'Critical'].includes(item.urgency)
      ).length;
      const highPct = Math.round((highUrgencyCount / count) * 100);
      return `
        <div class="playbook-card">
          <div class="playbook-header">
            <div>
              <h3>${category}</h3>
              <p>${count} active · ${highPct}% high urgency</p>
            </div>
            <span class="pill">Lead: ${playbook.lead}</span>
          </div>
          <ul class="playbook-steps">
            ${playbook.steps.map((step) => `<li>${step}</li>`).join('')}
          </ul>
        </div>
      `;
    })
    .join('');
}

function renderResolutionVelocity(cases) {
  if (!resolutionVelocityEl) return;
  const stats = getVelocityStats(cases);

  resolutionVelocityEl.innerHTML = `
    <div class="velocity-row">
      <div>
        <strong>Resolved (7d)</strong>
        <span class="muted">${stats.resolved7} cases closed</span>
      </div>
      <span class="pill ${stats.resolved7 ? 'ok' : ''}">${stats.resolved7}</span>
    </div>
    <div class="velocity-row">
      <div>
        <strong>Intake (7d)</strong>
        <span class="muted">${stats.intake7} new cases opened</span>
      </div>
      <span class="pill ${stats.intake7 ? 'warning' : ''}">${stats.intake7}</span>
    </div>
    <div class="velocity-row">
      <div>
        <strong>Backlog change</strong>
        <span class="muted">Net flow in the last 7 days</span>
      </div>
      <span class="pill ${stats.net7 >= 0 ? 'ok' : 'warning'}">${stats.net7 >= 0 ? '+' : ''}${stats.net7}</span>
    </div>
    <div class="velocity-row">
      <div>
        <strong>Median resolution</strong>
        <span class="muted">${stats.resolutionSample ? `${stats.resolutionSample} resolved cases (30d)` : 'No recent resolutions yet'}</span>
      </div>
      <span class="pill ${stats.medianResolution !== null ? 'ok' : ''}">${stats.medianResolution !== null ? `${stats.medianResolution}d` : 'n/a'}</span>
    </div>
  `;
}

function renderSlaCompliance(cases) {
  if (!slaComplianceEl) return;
  const active = cases.filter((item) => item.status !== 'Resolved');
  const touchOverdue = active.filter((item) => item.touchOverdue).length;
  const overdue = active.filter((item) => item.overdue).length;
  const upcoming = active.filter((item) => item.dueSoon || item.touchDueSoon).length;
  const touchCompliance = active.length
    ? Math.round(((active.length - touchOverdue) / active.length) * 100)
    : null;

  const stats = getVelocityStats(cases);

  slaComplianceEl.innerHTML = `
    <div class="compliance-row">
      <div>
        <strong>On-time resolutions</strong>
        <span class="muted">${stats.onTimeSample ? `${stats.onTimeSample} resolved cases (30d)` : 'No resolved cases with SLAs yet'}</span>
      </div>
      <span class="pill ${stats.onTimeRate !== null && stats.onTimeRate >= 80 ? 'ok' : 'warning'}">
        ${stats.onTimeRate !== null ? `${stats.onTimeRate}%` : 'n/a'}
      </span>
    </div>
    <div class="compliance-row">
      <div>
        <strong>Touchpoint compliance</strong>
        <span class="muted">${active.length} active cases monitored</span>
      </div>
      <span class="pill ${touchCompliance !== null && touchCompliance >= 80 ? 'ok' : 'warning'}">
        ${touchCompliance !== null ? `${touchCompliance}%` : 'n/a'}
      </span>
    </div>
    <div class="compliance-row">
      <div>
        <strong>Upcoming SLA risk</strong>
        <span class="muted">${upcoming} due soon · ${overdue} overdue</span>
      </div>
      <span class="pill ${upcoming || overdue ? 'warning' : 'ok'}">${upcoming + overdue}</span>
    </div>
  `;
}

function buildBreakdown(items, key, options = {}) {
  const counts = new Map();
  items.forEach((item) => {
    const raw = item[key];
    const label =
      typeof raw === 'string' && raw.trim() ? raw.trim() : raw ? String(raw) : 'Unspecified';
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  let entries = Array.from(counts.entries());
  if (options.order) {
    const ordered = [];
    options.order.forEach((label) => {
      const count = counts.get(label);
      if (count) ordered.push([label, count]);
    });
    const orderedLabels = new Set(options.order);
    const remainder = entries
      .filter(([label]) => !orderedLabels.has(label))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    entries = [...ordered, ...remainder];
  } else {
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  const total = items.length;
  const limit = options.limit ?? entries.length;
  const top = entries.slice(0, limit);
  const remainder = entries.slice(limit).reduce((acc, [, count]) => acc + count, 0);
  if (remainder) {
    top.push([options.remainderLabel || 'Other', remainder]);
  }

  return {
    total,
    rows: top.map(([label, count]) => ({
      label,
      count,
      pct: total ? Math.round((count / total) * 100) : 0,
    })),
  };
}

function renderBreakdownCard({ title, subtitle, data }) {
  const rows = data.rows
    .map(
      (row) => `
        <div class="signal-row">
          <span class="signal-label">${row.label}</span>
          <div class="signal-bar"><span style="width: ${row.pct}%;"></span></div>
          <span class="signal-count">${row.count} · ${row.pct}%</span>
        </div>
      `
    )
    .join('');

  return `
    <div class="signal-card">
      <div>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      ${rows || '<p class="muted">No data yet.</p>'}
    </div>
  `;
}

function renderSignalBreakdown(cases) {
  if (!signalBreakdownEl) return;
  const active = cases.filter((item) => item.status !== 'Resolved');

  if (!active.length) {
    signalBreakdownEl.innerHTML = '<p class="muted">No active cases to summarize yet.</p>';
    return;
  }

  const channelData = buildBreakdown(active, 'channel', {
    limit: 4,
    remainderLabel: 'Other channels',
  });
  const categoryData = buildBreakdown(active, 'category', {
    limit: 4,
    remainderLabel: 'Other categories',
  });
  const urgencyData = buildBreakdown(active, 'urgency', {
    order: ['Critical', 'High', 'Medium', 'Low'],
  });

  signalBreakdownEl.innerHTML = [
    renderBreakdownCard({
      title: 'Channel mix',
      subtitle: `${channelData.total} active cases`,
      data: channelData,
    }),
    renderBreakdownCard({
      title: 'Category mix',
      subtitle: 'Top support themes',
      data: categoryData,
    }),
    renderBreakdownCard({
      title: 'Urgency mix',
      subtitle: 'Operational pressure profile',
      data: urgencyData,
    }),
  ].join('');
}

function renderOutreachPlan(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  const candidates = active.filter(
    (item) =>
      item.overdue ||
      item.touchOverdue ||
      item.dueSoon ||
      item.touchDueSoon ||
      item.daysSinceLast >= 7 ||
      ['High', 'Critical'].includes(item.urgency)
  );
  const plan = candidates.sort((a, b) => b.score - a.score).slice(0, 6);

  if (!plan.length) {
    outreachPlanEl.innerHTML = '<p class="muted">No high-touch cases right now.</p>';
    return;
  }

  outreachPlanEl.innerHTML = plan
    .map(
      (item) => `
        <div class="plan-item">
          <div class="plan-main">
            <strong>${item.scholar}</strong>
            <span class="muted">${item.summary}</span>
            <span class="plan-owner">${item.owner || 'Unassigned'} · ${item.urgency}</span>
          </div>
          <div class="plan-tags">
            <span class="chip ${item.overdue ? 'danger' : item.dueSoon ? 'warning' : 'ok'}">
              ${item.due ? formatDelta(item.dueInDays) : 'Due date n/a'}
            </span>
            <span class="chip ${item.touchOverdue ? 'danger' : item.touchDueSoon ? 'warning' : 'ok'}">
              ${item.nextTouchDue ? `${formatDateLabel(item.nextTouchDue)} · ${formatDelta(item.daysToNextTouch, 'touch')}` : 'Touch SLA n/a'}
            </span>
          </div>
        </div>
      `
    )
    .join('');
}

function renderTouchpointCadence(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  if (!active.length) {
    touchpointCadenceEl.innerHTML = '<p class="muted">No active cases to measure cadence yet.</p>';
    return;
  }

  const urgencyOrder = ['Critical', 'High', 'Medium', 'Low'];
  const rows = urgencyOrder
    .map((urgency) => {
      const items = active.filter((item) => item.urgency === urgency);
      if (!items.length) return null;
      const total = items.length;
      const overdue = items.filter((item) => item.touchOverdue).length;
      const dueSoon = items.filter((item) => item.touchDueSoon).length;
      const averageTouch = Math.round(
        items.reduce((sum, item) => sum + item.daysSinceLast, 0) / total
      );
      const overduePct = Math.round((overdue / total) * 100);
      const dueSoonPct = Math.round((dueSoon / total) * 100);
      const okPct = Math.max(0, 100 - overduePct - dueSoonPct);

      return `
        <div class="cadence-row">
          <div class="cadence-meta">
            <strong>${urgency}</strong>
            <span class="muted">${total} cases · target ${touchSlaDays[urgency]}d · avg ${averageTouch}d since touch</span>
          </div>
          <div class="cadence-tags">
            <span class="pill ${overdue ? 'danger' : 'ok'}">Overdue ${overdue}</span>
            <span class="pill ${dueSoon ? 'warning' : 'ok'}">Due soon ${dueSoon}</span>
          </div>
          <div class="cadence-bar">
            <span class="overdue" style="width: ${overduePct}%"></span>
            <span class="soon" style="width: ${dueSoonPct}%"></span>
            <span class="ok" style="width: ${okPct}%"></span>
          </div>
        </div>
      `;
    })
    .filter(Boolean);

  if (!rows.length) {
    touchpointCadenceEl.innerHTML = '<p class="muted">No active cadence data yet.</p>';
    return;
  }

  touchpointCadenceEl.innerHTML = rows.join('');
}

function renderOwnerFocus(cases) {
  const active = cases.filter(
    (item) => item.status !== 'Resolved' && item.owner && item.owner.trim()
  );

  if (!active.length) {
    ownerFocusEl.innerHTML = '<p class="muted">No owners assigned yet.</p>';
    return;
  }

  const grouped = new Map();
  active.forEach((item) => {
    const owner = item.owner.trim();
    if (!grouped.has(owner)) grouped.set(owner, []);
    grouped.get(owner).push(item);
  });

  const focusCards = Array.from(grouped.entries())
    .map(([owner, items]) => {
      const total = items.length;
      const overdue = items.filter((item) => item.overdue).length;
      const touchOverdue = items.filter((item) => item.touchOverdue).length;
      const highUrgency = items.filter((item) =>
        ['High', 'Critical'].includes(item.urgency)
      ).length;
      const topCases = [...items].sort((a, b) => b.score - a.score).slice(0, 2);

      return {
        owner,
        total,
        overdue,
        touchOverdue,
        highUrgency,
        topCases,
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.overdue - a.overdue ||
        b.touchOverdue - a.touchOverdue ||
        a.owner.localeCompare(b.owner)
    )
    .slice(0, 4)
    .map(
      (entry) => `
        <div class="focus-card">
          <div class="focus-header">
            <div>
              <strong>${entry.owner}</strong>
              <span class="muted">${entry.total} active · ${entry.overdue} overdue · ${entry.touchOverdue} touch overdue</span>
            </div>
            <span class="pill ${entry.highUrgency ? 'warning' : 'ok'}">High urgency ${entry.highUrgency}</span>
          </div>
          <div class="focus-list">
            ${entry.topCases
              .map(
                (item) => `
                  <div class="focus-item">
                    <div class="focus-main">
                      <strong>${item.scholar}</strong>
                      <span class="muted">${item.summary}</span>
                    </div>
                    <div class="focus-tags">
                      <span class="chip ${item.overdue ? 'danger' : item.dueSoon ? 'warning' : 'ok'}">
                        ${item.due ? formatDelta(item.dueInDays) : 'Due n/a'}
                      </span>
                      <span class="chip ${item.touchOverdue ? 'danger' : item.touchDueSoon ? 'warning' : 'ok'}">
                        ${item.nextTouchDue ? formatDelta(item.daysToNextTouch, 'touch') : 'Touch n/a'}
                      </span>
                      <span class="badge ${item.band}">${item.urgency}</span>
                    </div>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>
      `
    );

  ownerFocusEl.innerHTML = focusCards.join('');
}

function renderAgingSummary(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  if (!active.length) {
    agingSummaryEl.innerHTML = '<p class="muted">No active cases to age yet.</p>';
    return;
  }

  const buckets = [
    { label: '0-2 days', min: 0, max: 2 },
    { label: '3-6 days', min: 3, max: 6 },
    { label: '7-13 days', min: 7, max: 13 },
    { label: '14+ days', min: 14, max: Infinity },
  ];

  const total = active.length;
  const medianAge = [...active]
    .map((item) => item.daysSinceCreated)
    .sort((a, b) => a - b)[Math.floor(total / 2)];

  agingSummaryEl.innerHTML = `
    <div class="aging-meta">
      <p class="muted">Median case age</p>
      <div class="aging-value">${medianAge}d</div>
    </div>
    <div class="aging-grid">
      ${buckets
        .map((bucket, index) => {
          const count = active.filter(
            (item) => item.daysSinceCreated >= bucket.min && item.daysSinceCreated <= bucket.max
          ).length;
          const percent = Math.round((count / total) * 100);
          const level = index === buckets.length - 1 ? 'danger' : index >= 2 ? 'warning' : 'ok';
          return `
            <div class="insight-row">
              <div>
                <strong>${bucket.label}</strong>
                <span class="muted">${count} cases</span>
              </div>
              <div class="insight-metric">
                <span class="pill ${count ? level : 'ok'}">${percent}%</span>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderChannelMix(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  if (!active.length) {
    channelMixEl.innerHTML = '<p class="muted">No active channels yet.</p>';
    return;
  }

  const total = active.length;
  const counts = active.reduce((acc, item) => {
    const channel = item.channel || 'Other';
    acc[channel] = (acc[channel] || 0) + 1;
    return acc;
  }, {});

  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  channelMixEl.innerHTML = rows
    .map(([channel, count]) => {
      const percent = Math.round((count / total) * 100);
      return `
        <div class="mix-row">
          <div class="mix-meta">
            <strong>${channel}</strong>
            <span class="muted">${count} cases · ${percent}%</span>
          </div>
          <div class="mix-bar">
            <span style="width: ${percent}%"></span>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderSlaOutlook(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  const events = [];

  active.forEach((item) => {
    if (item.due) {
      const dueIn = item.dueInDays;
      if (dueIn !== null && dueIn <= 3) {
        events.push({
          date: item.due,
          type: 'Case due',
          item,
          delta: dueIn,
        });
      }
    }
    if (item.nextTouchDue) {
      const touchIn = item.daysToNextTouch;
      if (touchIn !== null && touchIn <= 2) {
        events.push({
          date: item.nextTouchDue,
          type: 'Touchpoint',
          item,
          delta: touchIn,
        });
      }
    }
  });

  if (!events.length) {
    slaOutlookEl.innerHTML = '<p class="muted">No touchpoints or due dates in the next 72 hours.</p>';
    return;
  }

  const grouped = events.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

  slaOutlookEl.innerHTML = sortedDates
    .map((date) => {
      const items = grouped[date]
        .sort((a, b) => a.delta - b.delta)
        .map(
          (event) => `
            <div class="outlook-row">
              <div>
                <strong>${event.item.scholar}</strong>
                <span class="muted">${event.type} · ${event.item.owner || 'Unassigned'}</span>
              </div>
              <span class="pill ${event.delta < 0 ? 'danger' : event.delta === 0 ? 'warning' : ''}">
                ${formatDelta(event.delta, event.type === 'Touchpoint' ? 'touch' : 'due')}
              </span>
            </div>
          `
        )
        .join('');

      return `
        <div class="outlook-block">
          <div class="outlook-header">${formatDateLabel(date)}</div>
          ${items}
        </div>
      `;
    })
    .join('');
}

function renderActivityFeed() {
  if (!activityFeedEl) return;
  const events = loadLocalEvents();
  if (!events.length) {
    activityFeedEl.innerHTML = '<p class="muted">No recent activity yet.</p>';
    return;
  }

  const recent = events.slice(0, 8);
  activityFeedEl.innerHTML = recent
    .map((event) => {
      const label = actionLabels[event.action] || 'Update';
      const timestamp = formatEventTime(event.createdAt);
      const summary = event.summary || event.detail || 'Update logged.';
      const detail = event.summary && event.detail ? event.detail : '';
      const tags = [];
      if (event.owner) tags.push(`<span class="chip ok">Owner: ${event.owner}</span>`);
      if (event.urgency) {
        const urgencyClass =
          event.urgency === 'Critical' ? 'danger' : event.urgency === 'High' ? 'warning' : 'ok';
        tags.push(`<span class="chip ${urgencyClass}">${event.urgency}</span>`);
      }

      return `
        <div class="activity-item">
          <div class="activity-meta">
            <span class="pill">${label}</span>
            <span class="muted">${timestamp}</span>
          </div>
          <div class="activity-body">
            <strong>${event.scholar || 'System update'}</strong>
            <span>${summary}</span>
            ${detail ? `<span class="activity-detail">${detail}</span>` : ''}
            ${tags.length ? `<div class="activity-tags">${tags.join('')}</div>` : ''}
          </div>
        </div>
      `;
    })
    .join('');
}

function getTopBreakdown(items, key, order) {
  if (!items.length) return null;
  const counts = new Map();
  items.forEach((item) => {
    const raw = item[key];
    const label =
      typeof raw === 'string' && raw.trim() ? raw.trim() : raw ? String(raw) : 'Unspecified';
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  if (order) {
    for (const label of order) {
      if (counts.has(label)) {
        return { label, count: counts.get(label) };
      }
    }
  }

  const entries = Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  if (!entries.length) return null;
  return { label: entries[0][0], count: entries[0][1] };
}

function renderBrief(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  const overdue = active.filter((item) => item.overdue);
  const dueSoon = active.filter((item) => item.dueSoon);
  const touchOverdue = active.filter((item) => item.touchOverdue);
  const highUrgency = active.filter((item) => ['High', 'Critical'].includes(item.urgency));
  const unassigned = active.filter((item) => !item.owner);
  const topChannel = getTopBreakdown(active, 'channel');
  const topCategory = getTopBreakdown(active, 'category');
  const topUrgency = getTopBreakdown(active, 'urgency', ['Critical', 'High', 'Medium', 'Low']);
  const velocity = getVelocityStats(cases);
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

  const coverage = buildCoverageSuggestions(active, 2);
  const urgencyOrder = ['Critical', 'High', 'Medium', 'Low'];
  const touchpointHotspots = urgencyOrder
    .map((level) => {
      const count = active.filter((item) => item.urgency === level && item.touchOverdue).length;
      return { level, count };
    })
    .filter((entry) => entry.count > 0);
  const touchpointSummary = touchpointHotspots.length
    ? touchpointHotspots.map((entry) => `${entry.level} ${entry.count}`).join(', ')
    : null;
  const coverageLines = coverage.suggestions.length
    ? coverage.suggestions
        .map(
          ({ item, owner, count }) =>
            `- ${item.scholar}: suggest ${owner} (${count} active, ${item.urgency})`
        )
        .join('\n')
    : `- ${coverage.reason || 'No unassigned cases right now.'}`;

  briefEl.value = [
    `Support Triage Brief (${todayIso()})`,
    `Active cases: ${active.length}`,
    `Overdue: ${overdue.length}`,
    `High urgency: ${highUrgency.length}`,
    `Unassigned: ${unassigned.length}`,
    `Due soon (<=2d): ${dueSoon.length}`,
    `Touch overdue: ${touchOverdue.length}`,
    `Throughput (7d): ${velocity.resolved7} resolved vs ${velocity.intake7} intake (net ${velocity.net7 >= 0 ? '+' : ''}${velocity.net7})`,
    `Median resolution (30d): ${velocity.medianResolution !== null ? `${velocity.medianResolution}d` : 'n/a'}`,
    `On-time resolution (30d): ${velocity.onTimeRate !== null ? `${velocity.onTimeRate}%` : 'n/a'}`,
    `Touchpoint cadence: ${touchpointSummary || 'No overdue touchpoints by urgency'}`,
    '',
    'Top priorities:',
    topCases || '- None yet',
    '',
    'Owner load:',
    ownerSummary || '- No active owners yet',
    '',
    'Coverage suggestions:',
    coverageLines,
    '',
    'Signal mix:',
    topChannel
      ? `- Top channel: ${topChannel.label} (${topChannel.count})`
      : '- Top channel: n/a',
    topCategory
      ? `- Top category: ${topCategory.label} (${topCategory.count})`
      : '- Top category: n/a',
    topUrgency
      ? `- Leading urgency: ${topUrgency.label} (${topUrgency.count})`
      : '- Leading urgency: n/a',
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
  renderCoverageSuggestions(enriched);
  renderResponsePlaybook(enriched);
  renderResolutionVelocity(enriched);
  renderSlaCompliance(enriched);
  renderOutreachPlan(enriched);
  renderTouchpointCadence(enriched);
  renderOwnerFocus(enriched);
  renderAgingSummary(enriched);
  renderChannelMix(enriched);
  renderSignalBreakdown(enriched);
  renderSlaOutlook(enriched);
  renderActivityFeed();
  renderBrief(enriched);
}

async function refreshCases() {
  state.cases = await readCases();
  render();
}

async function handleAddCase(payload) {
  const created = await createCase(payload);
  state.cases = [...state.cases, created];
  appendLocalEvent(buildEvent('created', created, 'Case logged.'));
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

async function handleQuickAction(action, id) {
  const today = todayIso();
  let updates = {};
  let eventAction = '';
  let eventDetail = '';
  if (action === 'touch') {
    updates = { lastTouch: today };
    eventAction = 'touched';
    eventDetail = 'Touchpoint logged.';
  }
  if (action === 'resolve') {
    updates = { status: 'Resolved', lastTouch: today };
    eventAction = 'resolved';
    eventDetail = 'Case marked resolved.';
  }
  if (action === 'reopen') {
    updates = { status: 'Open', lastTouch: today };
    eventAction = 'reopened';
    eventDetail = 'Case reopened.';
  }

  if (!Object.keys(updates).length) return;

  const updated = await updateCaseRecord(id, updates);
  if (!updated) return;
  state.cases = state.cases.map((item) => (item.id === id ? updated : item));
  if (eventAction) {
    appendLocalEvent(buildEvent(eventAction, updated, eventDetail));
  }
  render();
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
queueEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  handleQuickAction(button.dataset.action, button.dataset.id);
});

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
