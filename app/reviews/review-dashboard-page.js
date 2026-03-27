/* global fetch */

const AUTH_STATUS_ENDPOINT = '/api/auth/status';
const SESSION_ENDPOINT = '/api/me';
const SIGN_OUT_ENDPOINT = '/api/me/sign-out';
const ACCESS_ENDPOINT = '/api/access';
const DASHBOARD_ENDPOINT = '/api/custom-visuals/reviews/dashboard';

const STATUS_LABELS = Object.freeze({
  pending_review: 'Pending',
  review_running: 'Running',
  review_passed: 'Passed',
  review_failed: 'Failed',
});

const STATUS_TONES = Object.freeze({
  pending_review: 'warning',
  review_running: 'warning',
  review_passed: 'success',
  review_failed: 'danger',
});

const STATUS_ORDER = Object.freeze({
  pending_review: 0,
  review_running: 1,
  review_failed: 2,
  review_passed: 3,
});

const APPROVAL_TONES = Object.freeze({
  pending_human: 'warning',
  approved: 'success',
  rejected: 'danger',
});

export function initReviewDashboardPage(root = document.querySelector('[data-review-dashboard-page]')) {
  if (!root || root.dataset.reviewDashboardBound === 'true') return null;
  root.dataset.reviewDashboardBound = 'true';

  const refs = {
    gatePanel: root.querySelector('[data-role="gate-panel"]'),
    workspacePanel: root.querySelector('[data-role="workspace-panel"]'),
    accessChip: root.querySelector('[data-role="access-chip"]'),
    authCopy: root.querySelector('[data-role="auth-copy"]'),
    userSummary: root.querySelector('[data-role="user-summary"]'),
    gateEyebrow: root.querySelector('[data-role="gate-eyebrow"]'),
    gateTitle: root.querySelector('[data-role="gate-title"]'),
    gateCopy: root.querySelector('[data-role="gate-copy"]'),
    retryAccessButton: root.querySelector('[data-role="retry-access"]'),
    signOutButton: root.querySelector('[data-role="sign-out"]'),
    signOutDashboardButton: root.querySelector('[data-role="sign-out-dashboard"]'),
    pageStatus: root.querySelector('[data-role="page-status"]'),
    filterSummary: root.querySelector('[data-role="filter-summary"]'),
    statusFilterRail: root.querySelector('[data-role="status-filter-rail"]'),
    reviewSearch: root.querySelector('[data-role="review-search"]'),
    reviewSort: root.querySelector('[data-role="review-sort"]'),
    resetFiltersButton: root.querySelector('[data-role="reset-filters"]'),
    activeFilters: root.querySelector('[data-role="active-filters"]'),
    reviewList: root.querySelector('[data-role="review-list"]'),
    detailTitle: root.querySelector('[data-role="detail-title"]'),
    detailStatusChip: root.querySelector('[data-role="detail-status-chip"]'),
    detailCopy: root.querySelector('[data-role="detail-copy"]'),
    detailMeta: root.querySelector('[data-role="detail-meta"]'),
    detailSnapshotImage: root.querySelector('[data-role="detail-snapshot-image"]'),
    detailSnapshotEmpty: root.querySelector('[data-role="detail-snapshot-empty"]'),
    detailSnapshotSummary: root.querySelector('[data-role="detail-snapshot-summary"]'),
    detailApprovalSummary: root.querySelector('[data-role="detail-approval-summary"]'),
    detailDecisionNotes: root.querySelector('[data-role="detail-decision-notes"]'),
    detailApproveButton: root.querySelector('[data-role="detail-approve-button"]'),
    detailRejectButton: root.querySelector('[data-role="detail-reject-button"]'),
    detailErrors: root.querySelector('[data-role="detail-errors"]'),
    detailErrorsSummary: root.querySelector('[data-role="detail-errors-summary"]'),
    detailFindings: root.querySelector('[data-role="detail-findings"]'),
    detailFindingsSummary: root.querySelector('[data-role="detail-findings-summary"]'),
    detailReport: root.querySelector('[data-role="detail-report"]'),
    detailReportSummary: root.querySelector('[data-role="detail-report-summary"]'),
    detailCode: root.querySelector('[data-role="detail-code"]'),
    detailCodeSummary: root.querySelector('[data-role="detail-code-summary"]'),
    statTotal: root.querySelector('[data-role="stat-total"]'),
    statPending: root.querySelector('[data-role="stat-pending"]'),
    statRunning: root.querySelector('[data-role="stat-running"]'),
    statPassed: root.querySelector('[data-role="stat-passed"]'),
    statFailed: root.querySelector('[data-role="stat-failed"]'),
    statPassRate: root.querySelector('[data-role="stat-pass-rate"]'),
    statusCards: Array.from(root.querySelectorAll('[data-role="status-card"]')),
  };

  const state = {
    authStatus: null,
    session: null,
    access: null,
    dashboard: null,
    filters: {
      status: 'all',
      query: '',
      reason: '',
      ownerId: '',
      sort: refs.reviewSort?.value || 'queue-desc',
    },
    selectedKey: '',
    detailByKey: Object.create(null),
    charts: Object.create(null),
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

  function getReviewKey(review) {
    return review?.userId && review?.visualId ? `${review.userId}::${review.visualId}` : '';
  }

  function formatStatusLabel(status) {
    return STATUS_LABELS[status] || status || 'Unknown';
  }

  function formatStatusTone(status) {
    return STATUS_TONES[status] || 'neutral';
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

  function formatNumber(value, digits = 2) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(digits) : 'Unavailable';
  }

  function formatBoolean(value) {
    if (typeof value !== 'boolean') return 'Unavailable';
    return value ? 'Yes' : 'No';
  }

  function formatBytes(value) {
    const bytes = Number(value) || 0;
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${bytes} B`;
  }

  function normalizeAccess(accessPayload = {}) {
    const access = accessPayload?.customVisualReviews ?? {};
    return {
      available: Boolean(access.available),
      authenticated: Boolean(access.authenticated),
      allowed: Boolean(access.allowed),
      reason: typeof access.reason === 'string' ? access.reason : 'unconfigured',
    };
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
    await fetchAccessState();
  }

  async function fetchAccessState() {
    refs.userSummary.textContent = state.session?.user
      ? getDisplayName(state.session.user)
      : 'Not signed in';

    showGate({
      eyebrow: 'Checking session',
      title: 'Loading review dashboard…',
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
      refs.userSummary.textContent = session?.user ? getDisplayName(session.user) : 'Not signed in';
      refs.signOutButton.hidden = !session?.authenticated;

      if (!authStatus?.configured) {
        refs.authCopy.textContent = 'This reviewer workspace is not available on this deployment.';
        showGate({
          eyebrow: 'Unavailable',
          title: 'Review access is not ready on this deployment.',
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
          title: 'Sign in to open the review workspace.',
          copy: 'Open the app, sign in from the account panel, then return here.',
          chipLabel: 'Sign in required',
          chipTone: 'warning',
          showRetry: true,
          showSignOut: false,
        });
        return false;
      }

      if (!state.access.available) {
        refs.authCopy.textContent = 'The review dashboard is not available on this deployment.';
        showGate({
          eyebrow: 'Unavailable',
          title: 'Custom visual reviews are not ready on this deployment.',
          copy: 'This page will open once review access is configured.',
          chipLabel: 'Unavailable',
          chipTone: 'warning',
          showRetry: true,
          showSignOut: true,
        });
        return false;
      }

      if (!state.access.allowed) {
        refs.authCopy.textContent = 'You are signed in, but this account cannot open the review workspace.';
        showGate({
          eyebrow: 'Access denied',
          title: 'This account cannot review custom visuals yet.',
          copy: 'Use an approved account or ask an administrator to grant custom-visuals.review access.',
          chipLabel: 'Forbidden',
          chipTone: 'danger',
          showRetry: true,
          showSignOut: true,
        });
        return false;
      }

      refs.authCopy.textContent = 'Signed in and ready to inspect review outcomes.';
      refs.accessChip.textContent = 'Authorized';
      refs.accessChip.dataset.tone = 'success';
      refs.gatePanel.hidden = true;
      refs.workspacePanel.hidden = false;
      return true;
    } catch (error) {
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

  function destroyChart(chartKey) {
    if (!state.charts[chartKey]) return;
    state.charts[chartKey].destroy();
    delete state.charts[chartKey];
  }

  function getCssVar(name, fallback = '') {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function colorWithAlpha(color, alpha) {
    if (!color) return color;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const value = hex.length === 3
        ? hex.split('').map((part) => part + part).join('')
        : hex;
      const red = Number.parseInt(value.slice(0, 2), 16);
      const green = Number.parseInt(value.slice(2, 4), 16);
      const blue = Number.parseInt(value.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
    return color;
  }

  function createChart(chartKey, canvasId, config) {
    const Chart = globalThis.Chart;
    if (!Chart) return false;
    const canvas = root.querySelector(`#${canvasId}`);
    let context = null;
    try {
      context = canvas?.getContext?.('2d') ?? null;
    } catch {
      context = null;
    }
    if (!context) return false;
    destroyChart(chartKey);
    state.charts[chartKey] = new Chart(context, config);
    return true;
  }

  function getReviews() {
    return Array.isArray(state.dashboard?.reviews) ? state.dashboard.reviews : [];
  }

  function getVisibleReviews() {
    const query = state.filters.query.trim().toLowerCase();
    const reason = state.filters.reason.trim().toLowerCase();
    const ownerId = state.filters.ownerId.trim();

    const visible = getReviews().filter((review) => {
      if (state.filters.status !== 'all' && review.reviewStatus !== state.filters.status) {
        return false;
      }
      if (ownerId && review.owner.id !== ownerId) {
        return false;
      }
      if (reason) {
        const reasonMatch = [...review.reviewErrors, ...review.reviewFindings]
          .some((entry) => String(entry).toLowerCase() === reason);
        if (!reasonMatch) return false;
      }
      if (!query) return true;
      return [
        review.visualId,
        review.name,
        review.description,
        review.owner.label,
        review.owner.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });

    visible.sort((left, right) => {
      switch (state.filters.sort) {
        case 'requested-desc':
          return (Date.parse(right.reviewRequestedAt || right.savedAt || '') || 0)
            - (Date.parse(left.reviewRequestedAt || left.savedAt || '') || 0);
        case 'issues-desc':
          return right.issueCount - left.issueCount
            || (Date.parse(right.reviewRequestedAt || right.savedAt || '') || 0)
            - (Date.parse(left.reviewRequestedAt || left.savedAt || '') || 0);
        case 'size-desc':
          return right.codeSizeBytes - left.codeSizeBytes
            || right.codeLineCount - left.codeLineCount;
        case 'owner-asc':
          return left.owner.label.localeCompare(right.owner.label)
            || left.name.localeCompare(right.name);
        case 'name-asc':
          return left.name.localeCompare(right.name)
            || left.owner.label.localeCompare(right.owner.label);
        case 'queue-desc':
        default:
          return (STATUS_ORDER[left.reviewStatus] ?? 9) - (STATUS_ORDER[right.reviewStatus] ?? 9)
            || (Date.parse(right.reviewRequestedAt || right.savedAt || '') || 0)
            - (Date.parse(left.reviewRequestedAt || left.savedAt || '') || 0);
      }
    });

    return visible;
  }

  function renderSummary() {
    const summary = state.dashboard?.summary ?? {
      total: 0,
      pending: 0,
      running: 0,
      passed: 0,
      failed: 0,
      passRate: 0,
      oldestQueuedHours: null,
    };

    refs.statTotal.textContent = String(summary.total);
    refs.statPending.textContent = String(summary.pending);
    refs.statRunning.textContent = String(summary.running);
    refs.statPassed.textContent = String(summary.passed);
    refs.statFailed.textContent = String(summary.failed);
    refs.statPassRate.textContent = formatPercent(summary.passRate);

    refs.statusCards.forEach((card) => {
      card.dataset.active = state.filters.status === card.dataset.status ? 'true' : 'false';
    });

    const queueCopy = summary.queued
      ? `${summary.queued} review${summary.queued === 1 ? '' : 's'} still need attention. Oldest queued item: ${formatHours(summary.oldestQueuedHours)}.`
      : 'No queued reviews right now.';
    setPageStatus(queueCopy, summary.failed ? 'warning' : 'success');
  }

  function renderStatusFilterRail() {
    const summary = state.dashboard?.summary ?? {};
    const buttons = [
      createElement('button', {
        className: 'review-button review-button--compact',
        text: `All (${summary.total ?? 0})`,
        attrs: { type: 'button' },
        dataset: { active: state.filters.status === 'all' ? 'true' : 'false' },
      }),
      ...Object.keys(STATUS_LABELS).map((status) => createElement('button', {
        className: 'review-button review-button--compact',
        text: `${formatStatusLabel(status)} (${summary[status.replace('review_', '').replace('_review', '')] ?? state.dashboard?.charts?.byStatus?.find((entry) => entry.status === status)?.count ?? 0})`,
        attrs: { type: 'button' },
        dataset: {
          status,
          active: state.filters.status === status ? 'true' : 'false',
        },
      })),
    ];

    buttons[0].addEventListener('click', () => {
      state.filters.status = 'all';
      renderWorkspace();
    });

    buttons.slice(1).forEach((button) => {
      button.addEventListener('click', () => {
        state.filters.status = button.dataset.status;
        renderWorkspace();
      });
    });

    replaceChildren(refs.statusFilterRail, buttons);
  }

  function renderActiveFilters() {
    const chips = [];
    if (state.filters.status !== 'all') {
      chips.push(createFilterChip(`Status: ${formatStatusLabel(state.filters.status)}`, () => {
        state.filters.status = 'all';
        renderWorkspace();
      }));
    }
    if (state.filters.reason) {
      chips.push(createFilterChip(`Reason: ${state.filters.reason}`, () => {
        state.filters.reason = '';
        renderWorkspace();
      }));
    }
    if (state.filters.ownerId) {
      const review = getReviews().find((entry) => entry.owner.id === state.filters.ownerId);
      chips.push(createFilterChip(`Owner: ${review?.owner?.label || state.filters.ownerId}`, () => {
        state.filters.ownerId = '';
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

  function createFilterChip(text, onRemove) {
    const button = createElement('button', {
      className: 'review-button review-button--ghost review-button--compact',
      text,
      attrs: { type: 'button' },
    });
    button.addEventListener('click', onRemove);
    return button;
  }

  function isHumanDecisionFinal(review) {
    return Boolean(review?.approvalStatus && review.approvalStatus !== 'pending_human');
  }

  function getDecisionEnabled(review) {
    return ['review_passed', 'review_failed'].includes(review?.reviewStatus || '');
  }

  function getDisplayStatus(review) {
    if (isHumanDecisionFinal(review)) {
      return {
        label: review.approvalStatusLabel || review.approvalStatus || 'Decision recorded',
        tone: APPROVAL_TONES[review.approvalStatus] || 'neutral',
      };
    }
    return {
      label: formatStatusLabel(review?.reviewStatus),
      tone: formatStatusTone(review?.reviewStatus),
    };
  }

  function renderReviewList() {
    const visibleReviews = getVisibleReviews();
    refs.filterSummary.textContent = `${visibleReviews.length} review${visibleReviews.length === 1 ? '' : 's'} shown`;

    if (!visibleReviews.length) {
      replaceChildren(refs.reviewList, [
        createElement('div', {
          className: 'review-empty-state p-12',
          text: 'No reviews match the current filters.',
        }),
      ]);
      if (state.selectedKey && !visibleReviews.some((review) => getReviewKey(review) === state.selectedKey)) {
        state.selectedKey = '';
        renderDetailPlaceholder();
      }
      return;
    }

    const rows = visibleReviews.map((review) => {
      const key = getReviewKey(review);
      const button = createElement('button', {
        className: `review-list-row grid gap-10 p-12${state.selectedKey === key ? ' is-active' : ''}`,
        attrs: { type: 'button' },
      });

      const header = createElement('div', {
        className: 'flex flex-wrap items-start justify-between gap-8',
      });
      const titleGroup = createElement('div', { className: 'grid gap-4' });
      titleGroup.append(
        createElement('p', { className: 'review-row-title m-0', text: review.name }),
        createElement('p', { className: 'review-row-code m-0', text: `${review.visualId} · ${review.owner.label}` }),
      );

      const chip = createElement('span', {
        className: 'review-chip review-chip--compact',
        text: getDisplayStatus(review).label,
      });
      chip.dataset.tone = getDisplayStatus(review).tone;
      header.append(titleGroup, chip);

      const meta = createElement('div', {
        className: 'review-metric-grid',
      });

      [
        ['Requested', formatTimestamp(review.reviewRequestedAt || review.savedAt)],
        ['Issues', String(review.issueCount)],
        ['Code', `${formatBytes(review.codeSizeBytes)} · ${review.codeLineCount} lines`],
        ['Queued', formatHours(review.queueAgeHours)],
      ].forEach(([label, value]) => {
        const cell = createElement('div', { className: 'review-metric-cell grid gap-4' });
        cell.append(
          createElement('p', { className: 'review-label m-0', text: label }),
          createElement('p', { className: 'review-copy m-0', text: value }),
        );
        meta.append(cell);
      });

      if (review.description) {
        button.append(header, createElement('p', {
          className: 'review-copy m-0',
          text: review.description,
        }), meta);
      } else {
        button.append(header, meta);
      }

      button.addEventListener('click', () => {
        void selectReview(review);
      });
      return button;
    });

    replaceChildren(refs.reviewList, rows);

    if (!state.selectedKey || !visibleReviews.some((review) => getReviewKey(review) === state.selectedKey)) {
      void selectReview(visibleReviews[0]);
    }
  }

  function buildReportRows(review) {
    const report = review?.reviewReport ?? {};
    const summary = report?.summary ?? {};
    const render = report?.render ?? {};
    const rows = [
      ['Automation status', review?.reviewStatusLabel || formatStatusLabel(review?.reviewStatus)],
      ['Human decision', review?.approvalStatusLabel || 'Needs human review'],
      ['Verdict', report?.verdict],
      ['Mode', report?.mode],
      ['Runner', report?.runner],
      ['Environment', report?.environment],
      ['Runtime', Number.isFinite(report?.runtimeMs) ? `${formatNumber(report.runtimeMs, 1)} ms` : null],
      ['Audio mode', summary?.audioMode],
      ['Audio source', summary?.audioSource],
      ['Visual ID', summary?.visualId],
      ['Frames rendered', Number.isFinite(summary?.frameCount) ? String(summary.frameCount) : null],
      ['Render detected', typeof summary?.renderDetected === 'boolean' ? formatBoolean(summary.renderDetected) : null],
      ['Coverage ratio', summary?.coverageRatio != null ? formatNumber(summary.coverageRatio, 4) : null],
      ['Pixel change ratio', summary?.diffRatio != null ? formatNumber(summary.diffRatio, 4) : null],
      ['Mean pixel delta', render?.meanDelta != null ? formatNumber(render.meanDelta, 3) : null],
      ['Variance', summary?.variance != null ? formatNumber(summary.variance, 3) : null],
      ['Canvas size', Number.isFinite(render?.canvasWidth) && Number.isFinite(render?.canvasHeight) ? `${render.canvasWidth} × ${render.canvasHeight}` : null],
      ['Sample count', Number.isFinite(render?.sampleCount) ? String(render.sampleCount) : null],
      ['Network attempts', Number.isFinite(summary?.networkAttemptCount) ? String(summary.networkAttemptCount) : null],
      ['Page errors', Number.isFinite(summary?.pageErrorCount) ? String(summary.pageErrorCount) : null],
    ];

    return rows
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => ({
        key,
        value: String(value),
      }));
  }

  function renderDetailPlaceholder(message = 'Choose a submission to inspect its review outcome, metadata, report payload, and source code.') {
    refs.detailTitle.textContent = 'Select a review';
    refs.detailStatusChip.textContent = 'Idle';
    refs.detailStatusChip.dataset.tone = 'neutral';
    refs.detailCopy.textContent = message;
    replaceChildren(refs.detailMeta, [
      createElement('p', { className: 'review-copy m-0', text: 'No review selected yet.' }),
    ]);
    if (refs.detailSnapshotImage) {
      refs.detailSnapshotImage.hidden = true;
      refs.detailSnapshotImage.removeAttribute('src');
    }
    if (refs.detailSnapshotEmpty) {
      refs.detailSnapshotEmpty.hidden = false;
      refs.detailSnapshotEmpty.textContent = 'No snapshot loaded.';
    }
    if (refs.detailSnapshotSummary) {
      refs.detailSnapshotSummary.textContent = 'No snapshot loaded.';
    }
    if (refs.detailApprovalSummary) {
      refs.detailApprovalSummary.textContent = 'No decision recorded.';
    }
    if (refs.detailDecisionNotes) {
      refs.detailDecisionNotes.value = '';
      refs.detailDecisionNotes.disabled = true;
    }
    if (refs.detailApproveButton) refs.detailApproveButton.disabled = true;
    if (refs.detailRejectButton) refs.detailRejectButton.disabled = true;
    replaceChildren(refs.detailErrors, [
      createElement('div', { className: 'review-empty-state p-12', text: 'No errors loaded.' }),
    ]);
    refs.detailErrorsSummary.textContent = '0 items';
    replaceChildren(refs.detailFindings, [
      createElement('div', { className: 'review-empty-state p-12', text: 'No findings loaded.' }),
    ]);
    refs.detailFindingsSummary.textContent = '0 items';
    replaceChildren(refs.detailReport, [
      createElement('div', { className: 'review-empty-state p-12', text: 'No report loaded.' }),
    ]);
    refs.detailReportSummary.textContent = 'No report loaded.';
    refs.detailCode.textContent = 'Select a review to load the submitted source.';
    refs.detailCodeSummary.textContent = 'Code loads after you select a review.';
  }

  function renderIssueList(target, entries, emptyMessage) {
    if (!entries.length) {
      replaceChildren(target, [
        createElement('div', { className: 'review-empty-state p-12', text: emptyMessage }),
      ]);
      return;
    }

    replaceChildren(target, entries.map((entry) => {
      const row = createElement('div', {
        className: 'review-issue-row p-12',
      });
      row.textContent = entry;
      return row;
    }));
  }

  function renderDetail(review) {
    const displayStatus = getDisplayStatus(review);
    refs.detailTitle.textContent = review.name;
    refs.detailStatusChip.textContent = displayStatus.label;
    refs.detailStatusChip.dataset.tone = displayStatus.tone;
    refs.detailCopy.textContent = review.description || `${review.visualId} submitted by ${review.owner.label}`;

    const meta = createElement('div', { className: 'review-metric-grid' });
    [
      ['Owner', review.owner.label],
      ['Visual ID', review.visualId],
      ['Submitted', formatTimestamp(review.savedAt)],
      ['Requested', formatTimestamp(review.reviewRequestedAt || review.savedAt)],
      ['Queue Age', formatHours(review.queueAgeHours)],
      ['Code Size', formatBytes(review.codeSizeBytes)],
      ['Line Count', String(review.codeLineCount)],
      ['Issues', String(review.issueCount)],
      ['Automation', review.reviewStatusLabel || formatStatusLabel(review.reviewStatus)],
      ['Human Review', review.approvalStatusLabel || 'Needs human review'],
    ].forEach(([label, value]) => {
      const cell = createElement('div', { className: 'review-metric-cell grid gap-4' });
      cell.append(
        createElement('p', { className: 'review-label m-0', text: label }),
        createElement('p', { className: 'review-copy m-0', text: value }),
      );
      meta.append(cell);
    });
    replaceChildren(refs.detailMeta, [meta]);

    if (refs.detailSnapshotImage && refs.detailSnapshotEmpty && refs.detailSnapshotSummary) {
      const snapshotDataUrl = typeof review.snapshotDataUrl === 'string'
        ? review.snapshotDataUrl
        : '';
      if (snapshotDataUrl) {
        refs.detailSnapshotImage.src = snapshotDataUrl;
        refs.detailSnapshotImage.hidden = false;
        refs.detailSnapshotEmpty.hidden = true;
        refs.detailSnapshotSummary.textContent = 'Snapshot captured during the automation run.';
      } else {
        refs.detailSnapshotImage.hidden = true;
        refs.detailSnapshotImage.removeAttribute('src');
        refs.detailSnapshotEmpty.hidden = false;
        refs.detailSnapshotEmpty.textContent = 'No snapshot was stored for this run.';
        refs.detailSnapshotSummary.textContent = 'No snapshot stored.';
      }
    }

    if (refs.detailApprovalSummary) {
      const reviewerLabel = review.humanReview?.reviewerLabel ? ` by ${review.humanReview.reviewerLabel}` : '';
      const decidedAt = review.humanReview?.decidedAt ? ` on ${formatTimestamp(review.humanReview.decidedAt)}` : '';
      refs.detailApprovalSummary.textContent = review.humanReview?.status === 'pending_human'
        ? review.reviewStatus === 'review_failed'
          ? 'Automation failed. A human override is available.'
          : 'Automation passed. A human decision is still required.'
        : `${review.approvalStatusLabel || 'Decision recorded'}${reviewerLabel}${decidedAt}.`;
    }
    if (refs.detailDecisionNotes) {
      refs.detailDecisionNotes.disabled = !getDecisionEnabled(review);
      refs.detailDecisionNotes.value = review.humanReview?.notes || '';
    }
    if (refs.detailApproveButton) refs.detailApproveButton.disabled = !getDecisionEnabled(review);
    if (refs.detailRejectButton) refs.detailRejectButton.disabled = !getDecisionEnabled(review);

    refs.detailErrorsSummary.textContent = `${review.reviewErrors.length} item${review.reviewErrors.length === 1 ? '' : 's'}`;
    renderIssueList(refs.detailErrors, review.reviewErrors, 'No review errors for this submission.');

    refs.detailFindingsSummary.textContent = `${review.reviewFindings.length} item${review.reviewFindings.length === 1 ? '' : 's'}`;
    renderIssueList(refs.detailFindings, review.reviewFindings, 'No review findings for this submission.');

    const reportRows = buildReportRows(review);
    refs.detailReportSummary.textContent = reportRows.length
      ? `${reportRows.length} field${reportRows.length === 1 ? '' : 's'} shown`
      : 'No report payload for this submission.';
    if (reportRows.length) {
      replaceChildren(refs.detailReport, reportRows.map((entry) => {
        const row = createElement('div', { className: 'review-report-row grid gap-4 p-12' });
        row.append(
          createElement('p', { className: 'review-label m-0', text: entry.key }),
          createElement('p', { className: 'review-copy m-0', text: entry.value }),
        );
        return row;
      }));
    } else {
      replaceChildren(refs.detailReport, [
        createElement('div', { className: 'review-empty-state p-12', text: 'No report payload for this submission.' }),
      ]);
    }

    refs.detailCode.textContent = review.code || 'No code returned for this submission.';
    refs.detailCodeSummary.textContent = `${formatBytes(review.codeSizeBytes)} · ${review.codeLineCount} lines`;
  }

  async function submitDecision(decision) {
    const selectedReview = state.selectedKey ? state.detailByKey[state.selectedKey] : null;
    if (!selectedReview?.userId || !selectedReview?.visualId) return;
    const selectedKey = state.selectedKey;
    const notes = refs.detailDecisionNotes?.value?.trim?.() || '';
    await requestJson(
      `/api/custom-visuals/reviews/${encodeURIComponent(selectedReview.userId)}/${encodeURIComponent(selectedReview.visualId)}/decision`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ decision, notes }),
      }
    );
    await loadDashboard();
    const refreshedReview = state.dashboard?.reviews?.find((entry) => getReviewKey(entry) === selectedKey);
    if (refreshedReview) {
      await selectReview(refreshedReview);
    }
  }

  async function fetchReviewDetail(review) {
    const key = getReviewKey(review);
    if (!key) return null;
    if (state.detailByKey[key]?.code) {
      return state.detailByKey[key];
    }

    const payload = await requestJson(`/api/custom-visuals/reviews/${encodeURIComponent(review.userId)}/${encodeURIComponent(review.visualId)}`, {
      method: 'GET',
    });
    const detail = payload?.review ?? null;
    if (detail) {
      state.detailByKey[key] = detail;
    }
    return detail;
  }

  async function selectReview(review) {
    const key = getReviewKey(review);
    if (!key) return;
    state.selectedKey = key;
    renderReviewList();

    const cached = state.detailByKey[key];
    if (cached?.code) {
      renderDetail(cached);
      return;
    }

    renderDetailPlaceholder('Loading the selected review…');
    try {
      const detail = await fetchReviewDetail(review);
      if (state.selectedKey !== key) return;
      if (detail) {
        renderDetail(detail);
      } else {
        renderDetailPlaceholder('The selected review could not be loaded.');
      }
    } catch (error) {
      if (state.selectedKey !== key) return;
      renderDetailPlaceholder(error.message || 'The selected review could not be loaded.');
    }
  }

  function renderCharts() {
    const dashboard = state.dashboard ?? { charts: {} };
    const statusData = dashboard.charts?.byStatus ?? [];
    const timelineData = dashboard.charts?.submissionsTimeline ?? [];
    const failureData = dashboard.charts?.topFailureReasons ?? [];
    const ownerData = dashboard.charts?.topOwners ?? [];

    const primary = getCssVar('--color-primary', '#2758ff');
    const success = getCssVar('--color-success', '#1f8f52');
    const danger = getCssVar('--color-danger', '#b64141');
    const warning = getCssVar('--color-warning', '#c27a19');
    const text = getCssVar('--color-text-soft', '#546170');
    const grid = colorWithAlpha(getCssVar('--color-border', '#d0d7df'), 0.6);

    createChart('status', 'reviewStatusChart', {
      type: 'bar',
      data: {
        labels: statusData.map((entry) => entry.label),
        datasets: [{
          label: 'Reviews',
          data: statusData.map((entry) => entry.count),
          backgroundColor: statusData.map((entry) => ({
            pending_review: colorWithAlpha(warning, 0.65),
            review_running: colorWithAlpha(primary, 0.65),
            review_passed: colorWithAlpha(success, 0.65),
            review_failed: colorWithAlpha(danger, 0.7),
          }[entry.status] || colorWithAlpha(primary, 0.65))),
          borderColor: statusData.map((entry) => ({
            pending_review: warning,
            review_running: primary,
            review_passed: success,
            review_failed: danger,
          }[entry.status] || primary)),
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: text, precision: 0 },
            grid: { color: grid },
          },
          y: {
            ticks: { color: text },
            grid: { display: false },
          },
        },
        onClick: (_, elements) => {
          const index = elements?.[0]?.index;
          const entry = statusData[index];
          if (!entry) return;
          state.filters.status = entry.status;
          renderWorkspace();
        },
      },
    });

    createChart('timeline', 'reviewTimelineChart', {
      type: 'bar',
      data: {
        labels: timelineData.map((entry) => entry.date),
        datasets: [
          {
            label: 'Pending',
            data: timelineData.map((entry) => entry.pending),
            backgroundColor: colorWithAlpha(warning, 0.55),
          },
          {
            label: 'Running',
            data: timelineData.map((entry) => entry.running),
            backgroundColor: colorWithAlpha(primary, 0.45),
          },
          {
            label: 'Passed',
            data: timelineData.map((entry) => entry.passed),
            backgroundColor: colorWithAlpha(success, 0.55),
          },
          {
            label: 'Failed',
            data: timelineData.map((entry) => entry.failed),
            backgroundColor: colorWithAlpha(danger, 0.6),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: text },
            grid: { display: false },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: text, precision: 0 },
            grid: { color: grid },
          },
        },
      },
    });

    createChart('failure', 'reviewFailureChart', {
      type: 'bar',
      data: {
        labels: failureData.map((entry) => entry.label),
        datasets: [{
          label: 'Occurrences',
          data: failureData.map((entry) => entry.count),
          backgroundColor: colorWithAlpha(danger, 0.65),
          borderColor: danger,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: text, precision: 0 },
            grid: { color: grid },
          },
          y: {
            ticks: { color: text },
            grid: { display: false },
          },
        },
        onClick: (_, elements) => {
          const index = elements?.[0]?.index;
          const entry = failureData[index];
          if (!entry) return;
          state.filters.reason = entry.label.toLowerCase();
          state.filters.status = 'review_failed';
          renderWorkspace();
        },
      },
    });

    createChart('owners', 'reviewOwnerChart', {
      type: 'bar',
      data: {
        labels: ownerData.map((entry) => entry.label),
        datasets: [
          {
            label: 'Passed',
            data: ownerData.map((entry) => entry.passed),
            backgroundColor: colorWithAlpha(success, 0.6),
          },
          {
            label: 'Failed',
            data: ownerData.map((entry) => entry.failed),
            backgroundColor: colorWithAlpha(danger, 0.65),
          },
          {
            label: 'Queued',
            data: ownerData.map((entry) => entry.pending + entry.running),
            backgroundColor: colorWithAlpha(warning, 0.55),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: text },
            grid: { display: false },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: text, precision: 0 },
            grid: { color: grid },
          },
        },
        onClick: (_, elements) => {
          const index = elements?.[0]?.index;
          const entry = ownerData[index];
          if (!entry) return;
          state.filters.ownerId = entry.userId || '';
          renderWorkspace();
        },
      },
    });
  }

  function renderWorkspace() {
    renderSummary();
    renderStatusFilterRail();
    renderActiveFilters();
    renderCharts();
    renderReviewList();
  }

  async function loadDashboard() {
    const dashboard = await requestJson(DASHBOARD_ENDPOINT, { method: 'GET' });
    state.dashboard = dashboard ?? null;
    state.detailByKey = Object.create(null);
    state.selectedKey = '';
    renderWorkspace();
  }

  function bindEvents() {
    refs.retryAccessButton.addEventListener('click', () => {
      void bootstrap();
    });
    refs.signOutButton.addEventListener('click', () => {
      void signOutAndRefresh();
    });
    refs.signOutDashboardButton.addEventListener('click', () => {
      void signOutAndRefresh();
    });
    refs.reviewSearch.addEventListener('input', (event) => {
      state.filters.query = event.currentTarget.value.trim();
      renderWorkspace();
    });
    refs.reviewSort.addEventListener('change', (event) => {
      state.filters.sort = event.currentTarget.value;
      renderWorkspace();
    });
    refs.resetFiltersButton.addEventListener('click', () => {
      state.filters = {
        status: 'all',
        query: '',
        reason: '',
        ownerId: '',
        sort: 'queue-desc',
      };
      refs.reviewSearch.value = '';
      refs.reviewSort.value = 'queue-desc';
      renderWorkspace();
    });
    refs.statusCards.forEach((card) => {
      card.addEventListener('click', () => {
        state.filters.status = card.dataset.status || 'all';
        renderWorkspace();
      });
    });
    refs.detailApproveButton?.addEventListener('click', () => {
      void submitDecision('approved');
    });
    refs.detailRejectButton?.addEventListener('click', () => {
      void submitDecision('rejected');
    });
  }

  async function bootstrap() {
    const allowed = await fetchAccessState();
    if (!allowed) return;
    try {
      await loadDashboard();
    } catch (error) {
      setPageStatus(error.message || 'The dashboard could not load review data.', 'danger');
      replaceChildren(refs.reviewList, [
        createElement('div', { className: 'review-empty-state p-12', text: error.message || 'The dashboard could not load review data.' }),
      ]);
      renderDetailPlaceholder(error.message || 'The selected review could not be loaded.');
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
      initReviewDashboardPage();
    }, { once: true });
  } else {
    initReviewDashboardPage();
  }
}
