const STORAGE_KEY = 'gsSupportTriage.v1';

const metricsEl = document.getElementById('metrics');
const queueEl = document.getElementById('queue');
const actionsEl = document.getElementById('actions');
const briefEl = document.getElementById('brief');
const exportPreviewEl = document.getElementById('export-preview');

const form = document.getElementById('case-form');
const searchInput = document.getElementById('search');
const filterStatus = document.getElementById('filter-status');
const filterOwner = document.getElementById('filter-owner');

const seedButton = document.getElementById('seed-data');
const clearButton = document.getElementById('clear-data');
const exportButton = document.getElementById('export-json');
const importInput = document.getElementById('import-json');
const copyBriefButton = document.getElementById('copy-brief');

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

function shiftDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function loadCases() {
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

function saveCases(cases) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
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

function renderBrief(cases) {
  const active = cases.filter((item) => item.status !== 'Resolved');
  const overdue = active.filter((item) => item.overdue);
  const dueSoon = active.filter((item) => item.dueSoon);
  const touchOverdue = active.filter((item) => item.touchOverdue);
  const highUrgency = active.filter((item) => ['High', 'Critical'].includes(item.urgency));
  const unassigned = active.filter((item) => !item.owner);

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
    'Watch list:',
    overdue.length ? `- Overdue cases: ${overdue.length}` : '- No overdue cases',
    unassigned.length ? `- Unassigned cases: ${unassigned.length}` : '- All cases have owners',
  ].join('\n');
}

function renderOwnerFilter(cases) {
  const owners = Array.from(new Set(cases.map((item) => item.owner).filter(Boolean))).sort();
  filterOwner.innerHTML = '<option value="all">All owners</option>';
  owners.forEach((owner) => {
    const option = document.createElement('option');
    option.value = owner;
    option.textContent = owner;
    filterOwner.appendChild(option);
  });
}

function render() {
  const cases = enrichCases(loadCases());
  renderMetrics(cases);
  renderOwnerFilter(cases);
  renderQueue(cases);
  renderActions(cases);
  renderBrief(cases);
}

function addCase(payload) {
  const cases = loadCases();
  cases.push({
    id: crypto.randomUUID(),
    ...payload,
  });
  saveCases(cases);
  render();
}

function seedData() {
  const cases = loadCases();
  const seeded = sampleCases.map((item) => ({
    id: crypto.randomUUID(),
    ...item,
  }));
  saveCases([...cases, ...seeded]);
  render();
}

function clearData() {
  localStorage.removeItem(STORAGE_KEY);
  render();
}

function handleExport() {
  const data = loadCases();
  const payload = JSON.stringify({ generatedAt: new Date().toISOString(), cases: data }, null, 2);
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
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.cases;
      if (!Array.isArray(incoming)) {
        throw new Error('Invalid payload');
      }
      saveCases(incoming);
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

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  addCase(payload);
  form.reset();
  initDates();
});

[searchInput, filterStatus, filterOwner].forEach((input) => {
  input.addEventListener('input', render);
  input.addEventListener('change', render);
});

seedButton.addEventListener('click', seedData);
clearButton.addEventListener('click', clearData);
exportButton.addEventListener('click', handleExport);
importInput.addEventListener('change', handleImport);
copyBriefButton.addEventListener('click', handleCopyBrief);

initDates();
render();
