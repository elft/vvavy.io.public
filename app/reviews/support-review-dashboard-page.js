/* global fetch */

import { getAccessibleWorkspaces } from '../access/workspace-registry.js';

const AUTH_STATUS_ENDPOINT = '/api/auth/status';
const SESSION_ENDPOINT = '/api/me';
const SIGN_OUT_ENDPOINT = '/api/me/sign-out';
const ACCESS_ENDPOINT = '/api/access';
const DASHBOARD_ENDPOINT = '/api/support-reviews/dashboard';

const STATUS_LABELS = Object.freeze({
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  needs_info: 'Needs Info',
  planned: 'Planned',
  in_progress: 'In Progress',
  fixed: 'Fixed',
  closed: 'Closed',
  not_planned: 'Not Planned',
});

const STATUS_TONES = Object.freeze({
  submitted: 'warning',
  reviewing: 'info',
  needs_info: 'warning',
  planned: 'info',
  in_progress: 'info',
  fixed: 'success',
  closed: 'neutral',
  not_planned: 'danger',
});

const STATUS_ORDER = Object.freeze({
  submitted: 0,
  reviewing: 1,
  needs_info: 2,
  planned: 3,
  in_progress: 4,
  fixed: 5,
  closed: 6,
  not_planned: 7,
});

const KIND_LABELS = Object.freeze({
  bug: 'Bug',
  feature: 'Feature',
});

const DASHBOARD_ACCESS_KEY = 'supportReviews';

export function initSupportReviewDashboardPage(root = document.querySelector('[data-support-review-dashboard-page]')) {
  if (!root || root.dataset.supportReviewDashboardBound === 'true') return null;
  root.dataset.supportReviewDashboardBound = 'true';

  const refs = {
    gatePanel: root.querySelector('[data-role="gate-panel"]'),
    workspacePanel: root.querySelector('[data-role="workspace-panel"]'),
    accessChip: root.querySelector('[data-role="access-chip"]'),
    authCopy: root.querySelector('[data-role="auth-copy"]'),
    userSummary: root.querySelector('[data-role="user-summary"]'),
    workspaceNavigation: root.querySelector('[data-role="workspace-navigation"]'),
    workspaceNavigationSummary: root.querySelector('[data-role="workspace-navigation-summary"]'),
    workspaceNavigationList: root.querySelector('[data-role="workspace-navigation-list"]'),
    gateEyebrow: root.querySelector('[data-role="gate-eyebrow"]'),
    gateTitle: root.querySelector('[data-role="gate-title"]'),
    gateCopy: root.querySelector('[data-role="gate-copy"]'),
    retryAccessButton: root.querySelector('[data-role="retry-access"]'),
    signOutButton: root.querySelector('[data-role="sign-out"]'),
    pageStatus: root.querySelector('[data-role="page-status"]'),
    filterSummary: root.querySelector('[data-role="filter-summary"]'),
    statusFilterRail: root.querySelector('[data-role="status-filter-rail"]'),
    kindFilterRail: root.querySelector('[data-role="kind-filter-rail"]'),
    reviewSearch: root.querySelector('[data-role="review-search"]'),
    reviewSort: root.querySelector('[data-role="review-sort"]'),
    resetFiltersButton: root.querySelector('[data-role="reset-filters"]'),
    activeFilters: root.querySelector('[data-role="active-filters"]'),
    reviewList: root.querySelector('[data-role="review-list"]'),
    detailTitle: root.querySelector('[data-role="detail-title"]'),
    detailStatusChip: root.querySelector('[data-role="detail-status-chip"]'),
    detailCopy: root.querySelector('[data-role="detail-copy"]'),
    detailMeta: root.querySelector('[data-role="detail-meta"]'),
    detailDescriptionSummary: root.querySelector('[data-role="detail-description-summary"]'),
    detailDescriptionEmpty: root.querySelector('[data-role="detail-description-empty"]'),
    detailContext: root.querySelector('[data-role="detail-context"]'),
    detailContextSummary: root.querySelector('[data-role="detail-context-summary"]'),
    detailActivity: root.querySelector('[data-role="detail-activity"]'),
    detailActivitySummary: root.querySelector('[data-role="detail-activity-summary"]'),
    detailNotes: root.querySelector('[data-role="detail-decision-notes"]'),
    detailNotesSummary: root.querySelector('[data-role="detail-notes-summary"]'),
    statTotal: root.querySelector('[data-role="stat-total"]'),
    statSubmitted: root.querySelector('[data-role="stat-submitted"]'),
    statReviewing: root.querySelector('[data-role="stat-reviewing"]'),
    statNeedsInfo: root.querySelector('[data-role="stat-needs-info"]'),
    statPlanned: root.querySelector('[data-role="stat-planned"]'),
    statInProgress: root.querySelector('[data-role="stat-in-progress"]'),
    statFixed: root.querySelector('[data-role="stat-fixed"]'),
    statClosedRate: root.querySelector('[data-role="stat-closed-rate"]'),
    statusCards: Array.from(root.querySelectorAll('[data-role="status-card"]')),
    statusButtons: Array.from(root.querySelectorAll('[data-role="detail-status-button"]')),
  };

  const state = {
    authStatus: null,
    session: null,
    access: null,
    accessState: null,
    dashboard: null,
    filters: {
      status: 'all',
      kind: 'all',
      query: '',
      sort: refs.reviewSort?.value || 'queue-desc',
    },
    selectedKey: '',
    detailByKey: Object.create(null),
    submittingStatus: '',
  };

  function createElement(tagName, {
    className = '',
    text = '',
    attrs = {},
    dataset = {},
  } = {}) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    Object.entries(attrs).forEach(([key, value]) => {
      if (value == null) return;
      if (value === true) {
        element.setAttribute(key, '');
        return;
      }
      element.setAttribute(key, String(value));
    });
    Object.entries(dataset).forEach(([key, value]) => {
      if (value != null) {
        element.dataset[key] = String(value);
      }
    });
    return element;
  }

  function replaceChildren(node, children = []) {
    if (!node) return;
    node.replaceChildren(...children.filter(Boolean));
  }

  function renderWorkspaceNavigation() {
    if (!refs.workspaceNavigation || !refs.workspaceNavigationSummary || !refs.workspaceNavigationList) {
      return;
    }

    const items = getAccessibleWorkspaces(state.accessState, {
      currentPath: '/reviews/support/',
    });
    refs.workspaceNavigation.hidden = !items.length;
    if (!items.length) {
      replaceChildren(refs.workspaceNavigationList, []);
      return;
    }

    refs.workspaceNavigationSummary.textContent = `${items.length} workspace${items.length === 1 ? '' : 's'} available to this account.`;
    const links = items.map((item) => createElement('a', {
      className: `review-button ${item.isCurrent ? 'review-button--primary' : 'review-button--ghost'}${item.isCurrent ? ' is-active' : ''}`,
      text: item.label,
      attrs: {
        href: item.href,
      },
    }));
    replaceChildren(refs.workspaceNavigationList, links);
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        accept: 'application/json',
        ...(options.headers ?? {}),
      },
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = new Error(payload?.error || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function getRequestKey(request) {
    return typeof request?.id === 'string' && request.id.trim() ? request.id.trim() : '';
  }

  function getDisplayName(user = null) {
    if (!user) return 'Unknown user';
    return user.displayUsername || user.username || user.name || user.email || user.id || 'Unknown user';
  }

  function formatTimestamp(value) {
    if (!value) return 'Unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  function formatHours(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable';
    if (value < 1) return '< 1 hour';
    const rounded = value < 24 ? value.toFixed(1) : Math.round(value);
    return `${rounded} hour${Number(rounded) === 1 ? '' : 's'}`;
  }

  function formatPercent(value) {
    return `${Number(value || 0).toFixed(1)}%`;
  }

  function normalizeAccess(accessPayload = {}) {
    const access = accessPayload?.[DASHBOARD_ACCESS_KEY]
      ?? accessPayload?.supportReviews
      ?? accessPayload?.supportReview
      ?? accessPayload?.support
      ?? {};
    return {
      available: Boolean(access.available),
      authenticated: Boolean(access.authenticated),
      allowed: Boolean(access.allowed),
      reason: typeof access.reason === 'string' ? access.reason : 'unconfigured',
    };
  }

  function normalizeDashboard(payload = {}) {
    const summary = payload?.summary && typeof payload.summary === 'object' && !Array.isArray(payload.summary)
      ? payload.summary
      : {};
    const rawRequests = Array.isArray(payload?.requests)
      ? payload.requests
      : Array.isArray(payload?.supportRequests)
        ? payload.supportRequests
        : Array.isArray(payload?.items)
          ? payload.items
          : [];
    const requests = rawRequests.map(normalizeRequest).filter((request) => Boolean(request.id));
    return {
      summary,
      requests,
      activity: Array.isArray(payload?.activity) ? payload.activity : [],
    };
  }

  function normalizeActivityEntry(entry = {}) {
    return {
      eventType: typeof entry.eventType === 'string' ? entry.eventType : typeof entry.type === 'string' ? entry.type : 'note_added',
      actorType: typeof entry.actorType === 'string' ? entry.actorType : 'system',
      actorLabel: typeof entry.actorLabel === 'string' ? entry.actorLabel : typeof entry.actor === 'string' ? entry.actor : '',
      body: typeof entry.body === 'string' ? entry.body : '',
      fromStatus: typeof entry.fromStatus === 'string' ? entry.fromStatus : '',
      toStatus: typeof entry.toStatus === 'string' ? entry.toStatus : '',
      createdAt: typeof entry.createdAt === 'string' || typeof entry.createdAt === 'number' ? entry.createdAt : null,
    };
  }

  function normalizeRequest(request = {}) {
    const rawContext = request?.context && typeof request.context === 'object' && !Array.isArray(request.context)
      ? request.context
      : request?.context_json && typeof request.context_json === 'object' && !Array.isArray(request.context_json)
        ? request.context_json
        : null;
    const activity = Array.isArray(request?.activity)
      ? request.activity.map(normalizeActivityEntry)
      : Array.isArray(request?.activityEntries)
        ? request.activityEntries.map(normalizeActivityEntry)
        : [];
    const humanReview = request?.humanReview && typeof request.humanReview === 'object' && !Array.isArray(request.humanReview)
      ? request.humanReview
      : {
          status: typeof request?.reviewerStatus === 'string' ? request.reviewerStatus : 'pending_human',
          label: typeof request?.reviewerStatusLabel === 'string' ? request.reviewerStatusLabel : 'Needs review',
          notes: typeof request?.notes === 'string' ? request.notes : '',
          decidedAt: request?.decidedAt ?? null,
          reviewerId: request?.reviewerId ?? null,
          reviewerLabel: request?.reviewerLabel ?? null,
        };

    return {
      id: typeof request?.id === 'string' ? request.id : '',
      kind: typeof request?.kind === 'string' ? request.kind : 'bug',
      description: typeof request?.description === 'string' ? request.description : '',
      descriptionPreview: typeof request?.descriptionPreview === 'string'
        ? request.descriptionPreview
        : previewText(typeof request?.description === 'string' ? request.description : ''),
      status: typeof request?.status === 'string' ? request.status : 'submitted',
      statusLabel: typeof request?.statusLabel === 'string' ? request.statusLabel : formatStatusLabel(request?.status),
      owner: normalizeOwner(request?.owner),
      createdAt: request?.createdAt ?? request?.submittedAt ?? null,
      updatedAt: request?.updatedAt ?? request?.reviewedAt ?? request?.createdAt ?? null,
      queueAgeHours: typeof request?.queueAgeHours === 'number' ? request.queueAgeHours : null,
      hasDiagnostics: Boolean(request?.hasDiagnostics || rawContext),
      activityCount: Number.isFinite(Number(request?.activityCount)) ? Number(request.activityCount) : activity.length,
      context: rawContext,
      humanReview,
      activity,
      reviewerNotes: typeof humanReview?.notes === 'string' ? humanReview.notes : '',
      hasDetailData: Boolean(
        rawContext
        || activity.length
        || request?.reviewerNotes
        || request?.notes
        || request?.detailsLoaded
      ),
    };
  }

  function normalizeOwner(owner = {}) {
    if (!owner || typeof owner !== 'object' || Array.isArray(owner)) {
      return {
        id: '',
        label: 'Unknown user',
        email: '',
      };
    }
    return {
      id: typeof owner.id === 'string' ? owner.id : '',
      label: owner.label || getDisplayName(owner),
      email: typeof owner.email === 'string' ? owner.email : '',
      username: typeof owner.username === 'string' ? owner.username : '',
      displayUsername: typeof owner.displayUsername === 'string' ? owner.displayUsername : '',
    };
  }

  function previewText(text = '', limit = 140) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    return normalized.length > limit ? `${normalized.slice(0, limit - 1).trim()}...` : normalized;
  }

  function formatStatusLabel(status) {
    return STATUS_LABELS[status] || status || 'Unknown';
  }

  function formatStatusTone(status) {
    return STATUS_TONES[status] || 'neutral';
  }

  function formatKindLabel(kind) {
    return KIND_LABELS[kind] || kind || 'Unknown';
  }

  function setPageStatus(message, tone = 'neutral') {
    if (!refs.pageStatus) return;
    refs.pageStatus.textContent = message;
    refs.pageStatus.dataset.tone = tone;
  }

  function showGate({
    eyebrow,
    title,
    copy,
    chipLabel,
    chipTone = '',
    showRetry = true,
    showSignOut = false,
  }) {
    refs.gateEyebrow.textContent = eyebrow;
    refs.gateTitle.textContent = title;
    refs.gateCopy.textContent = copy;
    refs.accessChip.textContent = chipLabel;
    refs.accessChip.dataset.tone = chipTone;
    refs.signOutButton.hidden = !showSignOut;
    refs.retryAccessButton.hidden = !showRetry;
    refs.gatePanel.hidden = false;
    refs.workspacePanel.hidden = true;
  }

  async function signOutAndRefresh() {
    try {
      await requestJson(SIGN_OUT_ENDPOINT, { method: 'POST' });
    } catch {
      // Ignore sign-out errors and refresh state anyway.
    }
    state.detailByKey = Object.create(null);
    state.selectedKey = '';
    state.accessState = null;
    renderWorkspaceNavigation();
    await fetchAccessState();
  }

  async function fetchAccessState() {
    refs.userSummary.textContent = state.session?.user
      ? getDisplayName(state.session.user)
      : 'Not signed in';

    showGate({
      eyebrow: 'Checking session',
      title: 'Loading support dashboard…',
      copy: 'This workspace opens after your account session is verified.',
      chipLabel: 'Checking access',
      chipTone: '',
      showRetry: false,
      showSignOut: false,
    });

    try {
      const [authStatus, session, accessPayload] = await Promise.all([
        requestJson(AUTH_STATUS_ENDPOINT, { method: 'GET' }),
        requestJson(SESSION_ENDPOINT, { method: 'GET' }),
        requestJson(ACCESS_ENDPOINT, { method: 'GET' }),
      ]);

      state.authStatus = authStatus ?? null;
      state.session = session ?? null;
      state.access = normalizeAccess(accessPayload);
      state.accessState = accessPayload ?? null;
      refs.userSummary.textContent = session?.user ? getDisplayName(session.user) : 'Not signed in';
      refs.signOutButton.hidden = !session?.authenticated;
      renderWorkspaceNavigation();

      if (!authStatus?.configured) {
        refs.authCopy.textContent = 'This reviewer workspace is not available on this deployment.';
        showGate({
          eyebrow: 'Unavailable',
          title: 'Support access is not ready on this deployment.',
          copy: 'This page will open once account access storage is configured.',
          chipLabel: 'Unavailable',
          chipTone: 'warning',
          showRetry: true,
          showSignOut: false,
        });
        return false;
      }

      if (!session?.authenticated || !session?.user?.id) {
        refs.authCopy.textContent = 'Sign in with your VVavy account, then return here to continue.';
        showGate({
          eyebrow: 'Sign in required',
          title: 'Sign in to open the support workspace.',
          copy: 'Open the app, sign in from the account panel, then return here.',
          chipLabel: 'Sign in required',
          chipTone: 'warning',
          showRetry: true,
          showSignOut: false,
        });
        return false;
      }

      if (!state.access.available) {
        refs.authCopy.textContent = 'The support dashboard is not available on this deployment.';
        showGate({
          eyebrow: 'Unavailable',
          title: 'Support reviews are not ready on this deployment.',
          copy: 'This page will open once support review access is configured.',
          chipLabel: 'Unavailable',
          chipTone: 'warning',
          showRetry: true,
          showSignOut: true,
        });
        return false;
      }

      if (!state.access.allowed) {
        refs.authCopy.textContent = 'You are signed in, but this account cannot open the support workspace.';
        showGate({
          eyebrow: 'Access denied',
          title: 'This account cannot review support requests yet.',
          copy: 'Use an approved account or ask an administrator to grant support.review access.',
          chipLabel: 'Forbidden',
          chipTone: 'danger',
          showRetry: true,
          showSignOut: true,
        });
        return false;
      }

      refs.authCopy.textContent = 'Signed in and ready to inspect support requests.';
      refs.accessChip.textContent = 'Authorized';
      refs.accessChip.dataset.tone = 'success';
      refs.gatePanel.hidden = true;
      refs.workspacePanel.hidden = false;
      return true;
    } catch (error) {
      state.accessState = null;
      renderWorkspaceNavigation();
      refs.authCopy.textContent = 'The dashboard could not verify reviewer access right now.';
      showGate({
        eyebrow: 'Connection issue',
        title: 'Could not verify access.',
        copy: error.message || 'Try again in a moment.',
        chipLabel: 'Error',
        chipTone: 'danger',
        showRetry: true,
        showSignOut: false,
      });
      return false;
    }
  }

  function getRequests() {
    return Array.isArray(state.dashboard?.requests) ? state.dashboard.requests : [];
  }

  function getVisibleRequests() {
    const query = state.filters.query.trim().toLowerCase();
    const visible = getRequests().filter((request) => {
      if (state.filters.status !== 'all' && request.status !== state.filters.status) return false;
      if (state.filters.kind !== 'all' && request.kind !== state.filters.kind) return false;
      if (!query) return true;
      return [
        formatKindLabel(request.kind),
        request.description,
        request.descriptionPreview,
        request.owner?.label,
        request.owner?.email,
        request.humanReview?.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });

    visible.sort((left, right) => {
      switch (state.filters.sort) {
        case 'updated-desc':
          return (Date.parse(right.updatedAt || right.createdAt || '') || 0)
            - (Date.parse(left.updatedAt || left.createdAt || '') || 0);
        case 'created-desc':
          return (Date.parse(right.createdAt || '') || 0)
            - (Date.parse(left.createdAt || '') || 0);
        case 'status-asc':
          return (STATUS_ORDER[left.status] ?? 99) - (STATUS_ORDER[right.status] ?? 99)
            || (Date.parse(right.updatedAt || right.createdAt || '') || 0)
              - (Date.parse(left.updatedAt || left.createdAt || '') || 0);
        case 'kind-asc':
          return String(left.kind).localeCompare(String(right.kind))
            || (Date.parse(right.updatedAt || right.createdAt || '') || 0)
              - (Date.parse(left.updatedAt || left.createdAt || '') || 0);
        case 'queue-desc':
        default:
          return (STATUS_ORDER[left.status] ?? 99) - (STATUS_ORDER[right.status] ?? 99)
            || (Date.parse(right.updatedAt || right.createdAt || '') || 0)
              - (Date.parse(left.updatedAt || left.createdAt || '') || 0);
      }
    });

    return visible;
  }

  function normalizeCount(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function resolveSummary() {
    const summary = state.dashboard?.summary ?? {};
    const requests = getRequests();
    const computed = requests.reduce((acc, request) => {
      acc.total += 1;
      acc[request.status] = (acc[request.status] ?? 0) + 1;
      return acc;
    }, {
      total: 0,
      submitted: 0,
      reviewing: 0,
      needs_info: 0,
      planned: 0,
      in_progress: 0,
      fixed: 0,
      closed: 0,
      not_planned: 0,
    });

    return {
      total: normalizeCount(summary.total, computed.total),
      submitted: normalizeCount(summary.submitted, computed.submitted),
      reviewing: normalizeCount(summary.reviewing, computed.reviewing),
      needs_info: normalizeCount(summary.needs_info, computed.needs_info),
      planned: normalizeCount(summary.planned, computed.planned),
      in_progress: normalizeCount(summary.in_progress, computed.in_progress),
      fixed: normalizeCount(summary.fixed, computed.fixed),
      closed: normalizeCount(summary.closed, computed.closed),
      not_planned: normalizeCount(summary.not_planned, computed.not_planned),
      closedRate: summary.closedRate != null
        ? normalizeCount(summary.closedRate, 0)
        : (computed.total ? ((computed.closed + computed.fixed) / computed.total) * 100 : 0),
      openCount: summary.openCount != null
        ? normalizeCount(summary.openCount, 0)
        : (computed.total - computed.closed - computed.fixed),
      oldestQueuedHours: summary.oldestQueuedHours ?? null,
    };
  }

  function renderSummary() {
    const summary = resolveSummary();
    refs.statTotal.textContent = String(summary.total);
    refs.statSubmitted.textContent = String(summary.submitted);
    refs.statReviewing.textContent = String(summary.reviewing);
    refs.statNeedsInfo.textContent = String(summary.needs_info);
    refs.statPlanned.textContent = String(summary.planned);
    refs.statInProgress.textContent = String(summary.in_progress);
    refs.statFixed.textContent = String(summary.fixed);
    refs.statClosedRate.textContent = formatPercent(summary.closedRate);

    refs.statusCards.forEach((card) => {
      card.dataset.active = state.filters.status === card.dataset.status ? 'true' : 'false';
    });

    const queueCopy = summary.openCount > 0
      ? `${summary.openCount} request${summary.openCount === 1 ? '' : 's'} still need attention. Oldest queued item: ${formatHours(summary.oldestQueuedHours)}.`
      : 'No open support requests right now.';
    setPageStatus(queueCopy, summary.openCount > 0 ? 'warning' : 'success');
  }

  function createFilterChip(text, onRemove) {
    const button = createElement('button', {
      className: 'review-button review-button--ghost review-button--compact',
      text,
      attrs: { type: 'button' },
    });
    button.addEventListener('click', onRemove);
    return button;
  }

  function renderStatusFilterRail() {
    const summary = resolveSummary();
    const statuses = ['all', ...Object.keys(STATUS_LABELS)];
    const buttons = statuses.map((status) => {
      const count = status === 'all' ? summary.total : summary[status] ?? 0;
      return createElement('button', {
        className: 'review-button review-button--compact',
        text: `${status === 'all' ? 'All' : formatStatusLabel(status)} (${count})`,
        attrs: { type: 'button' },
        dataset: {
          status,
          active: state.filters.status === status ? 'true' : 'false',
        },
      });
    });

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        state.filters.status = button.dataset.status;
        renderWorkspace();
      });
    });

    replaceChildren(refs.statusFilterRail, buttons);
  }

  function renderKindFilterRail() {
    const summary = getRequests().reduce((acc, request) => {
      acc[request.kind] = (acc[request.kind] ?? 0) + 1;
      return acc;
    }, { bug: 0, feature: 0 });

    const buttons = [
      createElement('button', {
        className: 'review-button review-button--compact',
        text: `All kinds (${getRequests().length})`,
        attrs: { type: 'button' },
        dataset: {
          kind: 'all',
          active: state.filters.kind === 'all' ? 'true' : 'false',
        },
      }),
      ...Object.keys(KIND_LABELS).map((kind) => createElement('button', {
        className: 'review-button review-button--compact',
        text: `${formatKindLabel(kind)} (${summary[kind] ?? 0})`,
        attrs: { type: 'button' },
        dataset: {
          kind,
          active: state.filters.kind === kind ? 'true' : 'false',
        },
      })),
    ];

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        state.filters.kind = button.dataset.kind;
        renderWorkspace();
      });
    });

    replaceChildren(refs.kindFilterRail, buttons);
  }

  function renderActiveFilters() {
    const chips = [];
    if (state.filters.status !== 'all') {
      chips.push(createFilterChip(`Status: ${formatStatusLabel(state.filters.status)}`, () => {
        state.filters.status = 'all';
        renderWorkspace();
      }));
    }
    if (state.filters.kind !== 'all') {
      chips.push(createFilterChip(`Kind: ${formatKindLabel(state.filters.kind)}`, () => {
        state.filters.kind = 'all';
        renderWorkspace();
      }));
    }
    if (state.filters.query) {
      chips.push(createFilterChip(`Search: ${state.filters.query}`, () => {
        state.filters.query = '';
        refs.reviewSearch.value = '';
        renderWorkspace();
      }));
    }
    replaceChildren(refs.activeFilters, chips);
  }

  function renderRequestList() {
    const visibleRequests = getVisibleRequests();
    refs.filterSummary.textContent = `${visibleRequests.length} request${visibleRequests.length === 1 ? '' : 's'} shown`;

    if (!visibleRequests.length) {
      replaceChildren(refs.reviewList, [
        createElement('div', {
          className: 'review-empty-state p-12',
          text: 'No requests match the current filters.',
        }),
      ]);
      if (state.selectedKey && !visibleRequests.some((request) => getRequestKey(request) === state.selectedKey)) {
        state.selectedKey = '';
        renderDetailPlaceholder();
      }
      return;
    }

    const rows = visibleRequests.map((request) => {
      const key = getRequestKey(request);
      const button = createElement('button', {
        className: `review-list-row grid gap-10 p-12${state.selectedKey === key ? ' is-active' : ''}`,
        attrs: { type: 'button' },
      });

      const header = createElement('div', {
        className: 'flex flex-wrap items-start justify-between gap-8',
      });
      const titleGroup = createElement('div', { className: 'grid gap-4' });
      titleGroup.append(
        createElement('p', { className: 'review-row-title m-0', text: formatKindLabel(request.kind) }),
        createElement('p', { className: 'review-row-code m-0', text: `${request.id} · ${request.owner.label}` }),
      );

      const statusChip = createElement('span', {
        className: 'review-chip review-chip--compact',
        text: formatStatusLabel(request.status),
      });
      statusChip.dataset.tone = formatStatusTone(request.status);
      header.append(titleGroup, statusChip);

      const meta = createElement('div', { className: 'review-metric-grid' });
      [
        ['Kind', formatKindLabel(request.kind)],
        ['Updated', formatTimestamp(request.updatedAt || request.createdAt)],
        ['Requested', formatTimestamp(request.createdAt)],
        ['Queue Age', formatHours(request.queueAgeHours)],
      ].forEach(([label, value]) => {
        const cell = createElement('div', { className: 'review-metric-cell grid gap-4' });
        cell.append(
          createElement('p', { className: 'review-label m-0', text: label }),
          createElement('p', { className: 'review-copy m-0', text: value }),
        );
        meta.append(cell);
      });

      const preview = createElement('p', {
        className: 'review-copy m-0',
        text: request.descriptionPreview || 'No description provided.',
      });

      button.append(header, preview, meta);
      button.addEventListener('click', () => {
        void selectRequest(request);
      });
      return button;
    });

    replaceChildren(refs.reviewList, rows);

    if (!state.selectedKey || !visibleRequests.some((request) => getRequestKey(request) === state.selectedKey)) {
      void selectRequest(visibleRequests[0]);
    }
  }

  function renderContextValueRow(label, value) {
    const row = createElement('div', { className: 'review-report-row grid gap-4 p-12' });
    row.append(
      createElement('p', { className: 'review-label m-0', text: label }),
      createElement('p', { className: 'review-copy m-0', text: value }),
    );
    return row;
  }

  function renderContext(context) {
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
      replaceChildren(refs.detailContext, [
        createElement('div', { className: 'review-empty-state p-12', text: 'No diagnostics attached to this request.' }),
      ]);
      refs.detailContextSummary.textContent = 'No diagnostics loaded.';
      return;
    }

    const rows = Object.entries(context)
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => {
        let rendered = value;
        if (typeof value === 'object') {
          rendered = JSON.stringify(value, null, 2);
        } else if (typeof value === 'boolean') {
          rendered = value ? 'Yes' : 'No';
        }
        return renderContextValueRow(key, String(rendered));
      });

    refs.detailContextSummary.textContent = rows.length
      ? `${rows.length} field${rows.length === 1 ? '' : 's'} shown`
      : 'No diagnostics attached to this request.';
    replaceChildren(refs.detailContext, rows.length
      ? rows
      : [createElement('div', { className: 'review-empty-state p-12', text: 'No diagnostics attached to this request.' })]);
  }

  function renderActivity(activity = []) {
    if (!activity.length) {
      replaceChildren(refs.detailActivity, [
        createElement('div', { className: 'review-empty-state p-12', text: 'No activity recorded yet.' }),
      ]);
      refs.detailActivitySummary.textContent = 'No activity loaded.';
      return;
    }

    const rows = activity.map((entry) => {
      const row = createElement('div', { className: 'review-report-row grid gap-4 p-12' });
      const headline = [
        entry.eventType,
        entry.actorLabel || entry.actorType,
        entry.createdAt ? formatTimestamp(entry.createdAt) : '',
      ].filter(Boolean).join(' · ');
      row.append(
        createElement('p', { className: 'review-label m-0', text: headline || 'Activity entry' }),
        createElement('p', {
          className: 'review-copy m-0',
          text: describeActivity(entry),
        }),
      );
      return row;
    });

    refs.detailActivitySummary.textContent = `${activity.length} item${activity.length === 1 ? '' : 's'}`;
    replaceChildren(refs.detailActivity, rows);
  }

  function describeActivity(entry = {}) {
    const pieces = [];
    if (entry.body) pieces.push(entry.body);
    if (entry.fromStatus || entry.toStatus) {
      pieces.push(`Status: ${formatStatusLabel(entry.fromStatus || 'submitted')} -> ${formatStatusLabel(entry.toStatus || 'submitted')}`);
    }
    if (!pieces.length) {
      pieces.push('Activity recorded.');
    }
    return pieces.join(' ');
  }

  function renderDetailPlaceholder(message = 'Choose a request to inspect its support details, diagnostics summary, and reviewer notes.') {
    refs.detailTitle.textContent = 'Select a request';
    refs.detailStatusChip.textContent = 'Idle';
    refs.detailStatusChip.dataset.tone = 'neutral';
    refs.detailCopy.textContent = message;
    replaceChildren(refs.detailMeta, [
      createElement('p', { className: 'review-copy m-0', text: 'No request selected yet.' }),
    ]);
    refs.detailDescriptionSummary.textContent = 'No description loaded.';
    refs.detailDescriptionEmpty.textContent = 'No request selected yet.';
    refs.detailDescriptionEmpty.hidden = false;
    refs.detailContextSummary.textContent = 'No diagnostics loaded.';
    replaceChildren(refs.detailContext, [
      createElement('div', { className: 'review-empty-state p-12', text: 'No diagnostics loaded.' }),
    ]);
    refs.detailActivitySummary.textContent = 'No activity loaded.';
    replaceChildren(refs.detailActivity, [
      createElement('div', { className: 'review-empty-state p-12', text: 'No activity loaded.' }),
    ]);
    if (refs.detailNotes) {
      refs.detailNotes.value = '';
      refs.detailNotes.disabled = true;
    }
  }

  function renderDetail(request) {
    refs.detailTitle.textContent = formatKindLabel(request.kind);
    refs.detailStatusChip.textContent = formatStatusLabel(request.status);
    refs.detailStatusChip.dataset.tone = formatStatusTone(request.status);
    refs.detailCopy.textContent = request.descriptionPreview || `${request.id} submitted by ${request.owner.label}`;

    const meta = createElement('div', { className: 'review-metric-grid' });
    [
      ['Owner', request.owner.label],
      ['Request ID', request.id],
      ['Kind', formatKindLabel(request.kind)],
      ['Submitted', formatTimestamp(request.createdAt)],
      ['Updated', formatTimestamp(request.updatedAt)],
      ['Queue Age', formatHours(request.queueAgeHours)],
      ['Diagnostics', request.hasDiagnostics ? 'Included' : 'Not included'],
      ['Activity', String(request.activityCount || request.activity.length || 0)],
      ['Reviewer State', request.humanReview?.label || request.statusLabel || formatStatusLabel(request.status)],
      ['Reviewer Notes', request.reviewerNotes ? 'Present' : 'None'],
    ].forEach(([label, value]) => {
      meta.append(renderContextValueRow(label, value));
    });
    replaceChildren(refs.detailMeta, [meta]);

    refs.detailDescriptionSummary.textContent = request.description ? 'Full description shown below.' : 'No description provided.';
    refs.detailDescriptionEmpty.textContent = request.description || 'No description provided.';
    refs.detailDescriptionEmpty.hidden = false;

    renderContext(request.context);
    renderActivity(request.activity);

    refs.detailNotesSummary.textContent = request.reviewerNotes ? 'Notes recorded.' : 'No notes recorded.';
    if (refs.detailNotes) {
      refs.detailNotes.disabled = false;
      refs.detailNotes.value = request.reviewerNotes || '';
    }
  }

  async function submitDecision(status) {
    const selectedRequest = state.selectedKey ? state.detailByKey[state.selectedKey] : null;
    if (!selectedRequest?.id || state.submittingStatus) return;
    const notes = refs.detailNotes?.value?.trim?.() || '';
    state.submittingStatus = status;
    refs.statusButtons.forEach((button) => {
      button.disabled = true;
    });
    setPageStatus(`Updating ${selectedRequest.id}...`, 'info');
    try {
      await requestJson(`/api/support-reviews/${encodeURIComponent(selectedRequest.id)}/decision`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status, notes }),
      });
      setPageStatus(`Updated ${selectedRequest.id} to ${formatStatusLabel(status)}.`, 'success');
      await loadDashboard();
      const refreshed = state.dashboard?.requests?.find((entry) => getRequestKey(entry) === selectedRequest.id);
      if (refreshed) {
        await selectRequest(refreshed);
      }
    } catch (error) {
      setPageStatus(error.message || 'Could not update the request.', 'danger');
    } finally {
      state.submittingStatus = '';
      refs.statusButtons.forEach((button) => {
        button.disabled = false;
      });
    }
  }

  async function fetchRequestDetail(request) {
    const key = getRequestKey(request);
    if (!key) return null;
    if (state.detailByKey[key]?.hasDetailData) {
      return state.detailByKey[key];
    }

    const payload = await requestJson(`/api/support-reviews/${encodeURIComponent(request.id)}`, {
      method: 'GET',
    });
    const detail = normalizeRequest(payload?.request ?? payload?.supportRequest ?? payload);
    detail.hasDetailData = true;
    if (detail?.id) {
      state.detailByKey[key] = detail;
    }
    return detail;
  }

  async function selectRequest(request) {
    const key = getRequestKey(request);
    if (!key) return;
    state.selectedKey = key;
    renderRequestList();

    const cached = state.detailByKey[key];
    if (cached?.hasDetailData) {
      renderDetail(cached);
      return;
    }

    renderDetailPlaceholder('Loading the selected request…');
    try {
      const detail = await fetchRequestDetail(request);
      if (state.selectedKey !== key) return;
      if (detail) {
        renderDetail(detail);
      } else {
        renderDetailPlaceholder('The selected request could not be loaded.');
      }
    } catch (error) {
      if (state.selectedKey !== key) return;
      renderDetailPlaceholder(error.message || 'The selected request could not be loaded.');
    }
  }

  function bindEvents() {
    refs.reviewSearch?.addEventListener('input', () => {
      state.filters.query = refs.reviewSearch.value || '';
      renderWorkspace();
    });

    refs.reviewSort?.addEventListener('change', () => {
      state.filters.sort = refs.reviewSort.value || 'queue-desc';
      renderWorkspace();
    });

    refs.resetFiltersButton?.addEventListener('click', () => {
      state.filters.status = 'all';
      state.filters.kind = 'all';
      state.filters.query = '';
      state.filters.sort = refs.reviewSort?.value || 'queue-desc';
      if (refs.reviewSearch) refs.reviewSearch.value = '';
      renderWorkspace();
    });

    refs.retryAccessButton?.addEventListener('click', () => {
      void bootstrap();
    });

    refs.signOutButton?.addEventListener('click', () => {
      void signOutAndRefresh();
    });

    refs.statusCards.forEach((card) => {
      card.addEventListener('click', () => {
        state.filters.status = card.dataset.status || 'all';
        renderWorkspace();
      });
    });

    refs.statusButtons.forEach((button) => {
      button.addEventListener('click', () => {
        void submitDecision(button.dataset.status || 'reviewing');
      });
    });
  }

  function renderWorkspace() {
    renderSummary();
    renderStatusFilterRail();
    renderKindFilterRail();
    renderActiveFilters();
    renderRequestList();
  }

  async function loadDashboard() {
    const dashboard = normalizeDashboard(await requestJson(DASHBOARD_ENDPOINT, { method: 'GET' }));
    state.dashboard = dashboard;
    state.detailByKey = Object.create(null);
    state.selectedKey = '';
    renderWorkspace();
  }

  async function bootstrap() {
    const allowed = await fetchAccessState();
    if (!allowed) return;
    try {
      await loadDashboard();
    } catch (error) {
      setPageStatus(error.message || 'The dashboard could not load support requests.', 'danger');
      replaceChildren(refs.reviewList, [
        createElement('div', { className: 'review-empty-state p-12', text: error.message || 'The dashboard could not load support requests.' }),
      ]);
      renderDetailPlaceholder(error.message || 'The selected request could not be loaded.');
    }
  }

  bindEvents();
  renderDetailPlaceholder();
  void bootstrap();

  return {
    reload: bootstrap,
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSupportReviewDashboardPage();
    }, { once: true });
  } else {
    initSupportReviewDashboardPage();
  }
}
