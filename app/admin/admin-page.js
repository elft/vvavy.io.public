/* global fetch, FormData, URL */

import { getAccessibleWorkspaces } from '../access/workspace-registry.js';

const AUTH_STATUS_ENDPOINT = '/api/auth/status';
const SESSION_ENDPOINT = '/api/me';
const SIGN_OUT_ENDPOINT = '/api/me/sign-out';
const ACCESS_ENDPOINT = '/api/access';
const PERMISSIONS_ENDPOINT = '/api/admin/authorization/permissions';
const USERS_ENDPOINT = '/api/admin/authorization/users';
const USER_REPORTS_ENDPOINT = '/api/admin/authorization/reports/users';

export function initAdminPage(root = document.querySelector('[data-admin-page]')) {
  if (!root || root.dataset.adminPageBound === 'true') return null;
  root.dataset.adminPageBound = 'true';

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
    openAppLink: root.querySelector('[data-role="open-app-link"]'),
    permissionCount: root.querySelector('[data-role="permission-count"]'),
    recentUserCount: root.querySelector('[data-role="recent-user-count"]'),
    selectedUserCount: root.querySelector('[data-role="selected-user-count"]'),
    reportRangeSelect: root.querySelector('[data-role="report-range-select"]'),
    reportSummary: root.querySelector('[data-role="report-summary"]'),
    reportModeCopy: root.querySelector('[data-role="report-mode-copy"]'),
    reportStatus: root.querySelector('[data-role="report-status"]'),
    reportTotalUsers: root.querySelector('[data-role="report-total-users"]'),
    reportUsersWithLastActive: root.querySelector('[data-role="report-users-with-last-active"]'),
    reportUsersCreatedInRange: root.querySelector('[data-role="report-users-created-in-range"]'),
    reportUsersLastActiveInRange: root.querySelector('[data-role="report-users-last-active-in-range"]'),
    pageStatus: root.querySelector('[data-role="page-status"]'),
    permissionForm: root.querySelector('[data-role="permission-form"]'),
    permissionSearch: root.querySelector('[data-role="permission-search"]'),
    permissionList: root.querySelector('[data-role="permission-list"]'),
    permissionFilterSummary: root.querySelector('[data-role="permission-filter-summary"]'),
    userSearchForm: root.querySelector('[data-role="user-search-form"]'),
    userSearch: root.querySelector('[data-role="user-search"]'),
    userList: root.querySelector('[data-role="user-list"]'),
    userFilterSummary: root.querySelector('[data-role="user-filter-summary"]'),
    selectedUserName: root.querySelector('[data-role="selected-user-name"]'),
    selectedUserCopy: root.querySelector('[data-role="selected-user-copy"]'),
    selectedUserMeta: root.querySelector('[data-role="selected-user-meta"]'),
    assignmentList: root.querySelector('[data-role="assignment-list"]'),
  };

  const state = {
    authStatus: null,
    session: null,
    access: null,
    permissions: [],
    permissionQuery: '',
    users: [],
    userQuery: '',
    selectedUserId: '',
    selectedUserDetail: null,
    pendingAssignmentKeys: new Set(),
    reportRangeDays: '90',
    userReports: null,
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

  function renderWorkspaceNavigation() {
    if (!refs.workspaceNavigation || !refs.workspaceNavigationSummary || !refs.workspaceNavigationList) {
      return;
    }

    const items = getAccessibleWorkspaces(state.access, {
      currentPath: '/admin/',
    });
    refs.workspaceNavigation.hidden = !items.length;
    if (!items.length) {
      replaceChildren(refs.workspaceNavigationList, []);
      return;
    }

    refs.workspaceNavigationSummary.textContent = `${items.length} workspace${items.length === 1 ? '' : 's'} available to this account.`;
    const links = items.map((item) => createElement('a', {
      className: `admin-button ${item.isCurrent ? 'admin-button--primary' : 'admin-button--ghost'}`,
      text: item.label,
      attrs: {
        href: item.href,
      },
    }));
    replaceChildren(refs.workspaceNavigationList, links);
  }

  function getAuthorizationAdminAccess() {
    return state.access?.authorizationAdmin ?? {
      available: false,
      authenticated: false,
      allowed: false,
      reason: 'unconfigured',
    };
  }

  function getDisplayName(user = null) {
    if (!user) return 'Unknown user';
    return user.displayUsername || user.username || user.name || user.email || user.id || 'Unknown user';
  }

  function getPermissionByKey(permissionKey) {
    return state.permissions.find((permission) => permission.key === permissionKey) ?? null;
  }

  function getPermissionDisplayName(permissionKey) {
    return getPermissionByKey(permissionKey)?.label || permissionKey || 'permission';
  }

  function formatTimestamp(value) {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  function getCssVar(name, fallback = '') {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function colorWithAlpha(color, alpha) {
    if (!color) return color;
    const normalized = color.trim();
    if (normalized.startsWith('#')) {
      const hex = normalized.slice(1);
      const value = hex.length === 3
        ? hex.split('').map((part) => part + part).join('')
        : hex;
      const red = Number.parseInt(value.slice(0, 2), 16);
      const green = Number.parseInt(value.slice(2, 4), 16);
      const blue = Number.parseInt(value.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
    if (normalized.startsWith('rgb(')) {
      return normalized.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    if (normalized.startsWith('rgba(')) {
      const parts = normalized.slice(5, -1).split(',').slice(0, 3).map((part) => part.trim());
      return `rgba(${parts.join(', ')}, ${alpha})`;
    }
    return normalized;
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
      const message = payload?.error || `Request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function setStatus(message, tone = 'neutral') {
    if (!refs.pageStatus) return;
    refs.pageStatus.textContent = message;
    refs.pageStatus.dataset.tone = tone;
  }

  function setReportStatus(message, tone = 'neutral') {
    if (!refs.reportStatus) return;
    refs.reportStatus.textContent = message;
    refs.reportStatus.dataset.tone = tone;
  }

  function destroyChart(chartKey) {
    if (!state.charts[chartKey]) return;
    state.charts[chartKey].destroy();
    delete state.charts[chartKey];
  }

  function buildReportChartOptions(yAxisTitle) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisTitle,
          },
        },
      },
    };
  }

  function createReportChart(chartKey, canvasId, config) {
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

  function renderUserReportCharts() {
    const report = state.userReports;
    destroyChart('usersCreatedChart');
    destroyChart('usersLastActiveChart');

    if (!report?.series?.length) {
      return null;
    }

    if (!globalThis.Chart) {
      return 'Chart.js is unavailable, so this section is showing totals without charts.';
    }

    const labels = report.series.map((day) => day.date);
    const createdColor = getCssVar('--color-primary', '#3f5f82');
    const activeColor = getCssVar('--color-accent', '#5f7ca3');
    const lastActiveFill = colorWithAlpha(getCssVar('--color-warning', '#b6842a'), 0.16);

    const createdChartReady = createReportChart('usersCreatedChart', 'usersCreatedChart', {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Users created',
          data: report.series.map((day) => day.usersCreated || 0),
          borderColor: createdColor,
          backgroundColor: colorWithAlpha(createdColor, 0.16),
          tension: 0.25,
          fill: true,
        }],
      },
      options: buildReportChartOptions('Accounts'),
    });

    const lastActiveChartReady = createReportChart('usersLastActiveChart', 'usersLastActiveChart', {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Users by current last active date',
          data: report.series.map((day) => day.usersLastActive || 0),
          backgroundColor: lastActiveFill,
          borderColor: activeColor,
          borderWidth: 1,
        }],
      },
      options: buildReportChartOptions('Accounts'),
    });

    if (!createdChartReady || !lastActiveChartReady) {
      return 'Charts could not be rendered in this browser, so this section is showing totals only.';
    }

    return null;
  }

  function renderUserReports() {
    if (!refs.reportTotalUsers || !refs.reportSummary || !refs.reportModeCopy) return;
    const report = state.userReports;
    refs.reportTotalUsers.textContent = String(report?.summary?.totalUsers ?? 0);
    refs.reportUsersWithLastActive.textContent = String(report?.summary?.usersWithLastActive ?? 0);
    refs.reportUsersCreatedInRange.textContent = String(report?.summary?.usersCreatedInRange ?? 0);
    refs.reportUsersLastActiveInRange.textContent = String(report?.summary?.usersLastActiveInRange ?? 0);

    refs.reportSummary.textContent = report
      ? `${report.from} → ${report.to} (${report.days} days)`
      : 'No report loaded yet.';
    refs.reportModeCopy.textContent = report?.lastActiveSeriesMode === 'current_snapshot'
      ? 'Last active counts reflect the current user snapshot, not a historical daily activity log.'
      : 'The last active report is ready.';

    const chartStatus = renderUserReportCharts();
    if (!report) {
      setReportStatus('Load a user report to see account creation and last-active trends.', 'neutral');
    } else if (chartStatus) {
      setReportStatus(chartStatus, 'warning');
    } else {
      setReportStatus(`Showing ${report.from} → ${report.to}.`, 'success');
    }
  }

  function renderAccessState() {
    const access = getAuthorizationAdminAccess();
    refs.userSummary.textContent = state.session?.user
      ? getDisplayName(state.session.user)
      : state.session?.authenticated && state.session?.user?.email
        ? state.session.user.email
        : state.session?.authenticated
          ? 'Signed in'
          : 'Not signed in';
    refs.signOutButton.hidden = !state.session?.authenticated;

    if (!access.available) {
      refs.accessChip.textContent = 'Unavailable';
      refs.accessChip.dataset.tone = 'danger';
      refs.authCopy.textContent = 'This workspace is not available on this deployment yet.';
      refs.gateEyebrow.textContent = 'Unavailable';
      refs.gateTitle.textContent = 'Access admin is not ready on this deployment.';
      refs.gateCopy.textContent = 'This page will open once account access storage is configured.';
      refs.gatePanel.hidden = false;
      refs.workspacePanel.hidden = true;
      return;
    }

    if (!access.authenticated) {
      refs.accessChip.textContent = 'Sign in required';
      refs.accessChip.dataset.tone = 'warning';
      refs.authCopy.textContent = 'Sign in with your VVavy account, then return here to continue.';
      refs.gateEyebrow.textContent = 'No active session';
      refs.gateTitle.textContent = 'Sign in to open access admin.';
      refs.gateCopy.textContent = 'Open the app, sign in, then come back here to load the workspace.';
      refs.gatePanel.hidden = false;
      refs.workspacePanel.hidden = true;
      return;
    }

    refs.userSummary.textContent = getDisplayName(state.session?.user ?? null);

    if (!access.allowed) {
      refs.accessChip.textContent = 'Forbidden';
      refs.accessChip.dataset.tone = 'danger';
      refs.authCopy.textContent = 'You are signed in, but this account cannot open the workspace.';
      refs.gateEyebrow.textContent = 'Access unavailable';
      refs.gateTitle.textContent = 'This account cannot open access admin yet.';
      refs.gateCopy.textContent = 'Use an approved admin account or ask an administrator to enable access for this account.';
      refs.gatePanel.hidden = false;
      refs.workspacePanel.hidden = true;
      return;
    }

    refs.accessChip.textContent = 'Authorized';
    refs.accessChip.dataset.tone = 'success';
    refs.authCopy.textContent = 'You can review access definitions and update assignments from this workspace.';
    refs.gatePanel.hidden = true;
    refs.workspacePanel.hidden = false;
  }

  function filterPermissions() {
    const query = state.permissionQuery.trim().toLowerCase();
    if (!query) return [...state.permissions];
    return state.permissions.filter(permission => {
      return [permission.key, permission.label, permission.description, permission.category]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query));
    });
  }

  function renderPermissions() {
    const visiblePermissions = filterPermissions();
    refs.permissionCount.textContent = String(state.permissions.length);
    refs.permissionFilterSummary.textContent = `${visiblePermissions.length} result${visiblePermissions.length === 1 ? '' : 's'}`;

    if (!visiblePermissions.length) {
      replaceChildren(refs.permissionList, [
        createElement('div', {
          className: 'admin-empty-state p-12',
          text: 'No permission definitions match the current search.',
        }),
      ]);
      return;
    }

    const items = visiblePermissions.map(permission => {
      const row = createElement('article', { className: 'admin-list-row grid gap-8 p-12' });
      const top = createElement('div', { className: 'flex flex-wrap items-center justify-between gap-8' });
      const titleWrap = createElement('div', { className: 'grid gap-4' });
      titleWrap.append(
        createElement('p', { className: 'admin-row-title m-0', text: permission.label }),
        createElement('p', { className: 'admin-row-code m-0', text: permission.key }),
      );
      const badges = createElement('div', { className: 'flex flex-wrap items-center gap-8' });
      badges.append(
        createElement('span', {
          className: 'admin-chip admin-chip--compact',
          text: permission.system ? 'System' : 'Custom',
        }),
        createElement('span', {
          className: 'admin-chip admin-chip--compact',
          text: `${permission.assignmentCount || 0} assigned`,
        }),
      );
      top.append(titleWrap, badges);

      row.append(top);
      if (permission.description) {
        row.append(createElement('p', { className: 'admin-copy m-0', text: permission.description }));
      }
      row.append(
        createElement('p', {
          className: 'admin-row-meta m-0',
          text: permission.lastGrantedAt
            ? `Last granted ${formatTimestamp(permission.lastGrantedAt)}`
            : 'Not assigned yet',
        })
      );
      return row;
    });

    replaceChildren(refs.permissionList, items);
  }

  function renderUsers() {
    refs.recentUserCount.textContent = String(state.users.length);
    refs.userFilterSummary.textContent = `${state.users.length} user${state.users.length === 1 ? '' : 's'}`;

    if (!state.users.length) {
      replaceChildren(refs.userList, [
        createElement('div', {
          className: 'admin-empty-state p-12',
          text: 'No users match the current search.',
        }),
      ]);
      return;
    }

    const items = state.users.map(user => {
      const isSelected = state.selectedUserId === user.id;
      const button = createElement('button', {
        className: `admin-user-button grid gap-4 p-12${isSelected ? ' is-selected' : ''}`,
        attrs: {
          type: 'button',
        },
        dataset: {
          userId: user.id,
        },
      });
      button.append(
        createElement('span', { className: 'admin-row-title', text: getDisplayName(user) }),
        createElement('span', { className: 'admin-row-meta', text: user.email || user.id }),
        createElement('span', {
          className: 'admin-row-meta',
          text: user.lastActiveAt ? `Active ${formatTimestamp(user.lastActiveAt)}` : 'No recent activity recorded',
        }),
      );
      button.addEventListener('click', () => {
        void selectUser(user.id);
      });
      return button;
    });

    replaceChildren(refs.userList, items);
  }

  function renderSelectedUser() {
    const detail = state.selectedUserDetail;
    refs.selectedUserCount.textContent = detail?.user?.id ? '1' : '0';

    if (!detail?.user?.id) {
      refs.selectedUserName.textContent = 'Choose a user';
      refs.selectedUserCopy.textContent = 'Search for an account to review and update its assignments.';
      replaceChildren(refs.selectedUserMeta, [
        createElement('p', { className: 'admin-copy m-0', text: 'No account selected yet.' }),
      ]);
      replaceChildren(refs.assignmentList, [
        createElement('div', {
          className: 'admin-empty-state p-12',
          text: 'Select an account to load its current assignments.',
        }),
      ]);
      return;
    }

    const user = detail.user;
    const assignments = new Map(
      (detail.entitlements ?? []).map(entry => [entry.entitlementKey, entry])
    );

    refs.selectedUserName.textContent = getDisplayName(user);
    refs.selectedUserCopy.textContent = `${assignments.size} permission assignment${assignments.size === 1 ? '' : 's'} active for this account.`;

    replaceChildren(refs.selectedUserMeta, [
      createElement('p', {
        className: 'admin-copy m-0',
        text: `Account: ${user.email || getDisplayName(user)}`,
      }),
      createElement('p', {
        className: 'admin-copy m-0',
        text: user.lastActiveAt ? `Last active ${formatTimestamp(user.lastActiveAt)}` : 'No recent activity recorded',
      }),
    ]);

    const visiblePermissions = filterPermissions();
    if (!visiblePermissions.length) {
      replaceChildren(refs.assignmentList, [
        createElement('div', {
          className: 'admin-empty-state p-12',
          text: 'Adjust the permission search to see assignable permissions for this account.',
        }),
      ]);
      return;
    }

    const rows = visiblePermissions.map(permission => {
      const assigned = assignments.get(permission.key);
      const pending = state.pendingAssignmentKeys.has(permission.key);
      const row = createElement('label', { className: 'admin-assignment-row grid gap-8 p-12' });
      const top = createElement('div', { className: 'flex items-start justify-between gap-12' });
      const copy = createElement('div', { className: 'grid gap-4' });
      copy.append(
        createElement('p', { className: 'admin-row-title m-0', text: permission.label }),
        createElement('p', { className: 'admin-row-code m-0', text: permission.key }),
      );
      if (permission.description) {
        copy.append(createElement('p', { className: 'admin-copy m-0', text: permission.description }));
      }

      const toggle = createElement('input', {
        attrs: {
          type: 'checkbox',
        },
      });
      toggle.checked = Boolean(assigned);
      toggle.disabled = pending;
      toggle.addEventListener('change', () => {
        void updateAssignment(permission.key, toggle.checked);
      });

      top.append(copy, toggle);
      row.append(top);
      row.append(createElement('p', {
        className: 'admin-row-meta m-0',
        text: assigned
          ? `Enabled ${formatTimestamp(assigned.updatedAt)}`
          : 'Not enabled',
      }));
      return row;
    });

    replaceChildren(refs.assignmentList, rows);
  }

  async function loadPermissions() {
    const payload = await requestJson(PERMISSIONS_ENDPOINT, {
      method: 'GET',
    });
    state.permissions = Array.isArray(payload?.permissions) ? payload.permissions : [];
    renderPermissions();
    renderSelectedUser();
  }

  async function loadUsers(query = '') {
    const url = new URL(USERS_ENDPOINT, window.location.origin);
    if (query.trim()) {
      url.searchParams.set('query', query.trim());
      url.searchParams.set('limit', '20');
    }
    const payload = await requestJson(url.pathname + url.search, {
      method: 'GET',
    });
    state.users = Array.isArray(payload?.users) ? payload.users : [];
    state.userQuery = query;
    renderUsers();
  }

  async function loadUserReports(days = state.reportRangeDays) {
    const normalizedDays = String(days || state.reportRangeDays || '90');
    state.reportRangeDays = normalizedDays;
    if (refs.reportRangeSelect) {
      refs.reportRangeSelect.value = normalizedDays;
    }

    setReportStatus('Loading user report…');
    try {
      const url = new URL(USER_REPORTS_ENDPOINT, window.location.origin);
      url.searchParams.set('days', normalizedDays);
      const payload = await requestJson(url.pathname + url.search, {
        method: 'GET',
      });
      state.userReports = payload && typeof payload === 'object' ? payload : null;
      renderUserReports();
    } catch (error) {
      state.userReports = null;
      renderUserReports();
      setReportStatus(error.message || 'Unable to load user reports.', 'danger');
    }
  }

  async function selectUser(userId) {
    if (!userId) return;
    state.selectedUserId = userId;
    renderUsers();
    setStatus('Loading account assignments…');
    try {
      state.selectedUserDetail = await requestJson(`${USERS_ENDPOINT}/${encodeURIComponent(userId)}`, {
        method: 'GET',
      });
      renderSelectedUser();
      setStatus(`Loaded assignments for ${getDisplayName(state.selectedUserDetail.user)}.`, 'success');
    } catch (error) {
      state.selectedUserDetail = null;
      renderSelectedUser();
      setStatus(error.message || 'Unable to load the selected account.', 'danger');
    }
  }

  async function updateAssignment(entitlementKey, enabled) {
    if (!state.selectedUserId) return;
    const permissionLabel = getPermissionDisplayName(entitlementKey);
    state.pendingAssignmentKeys.add(entitlementKey);
    renderSelectedUser();
    setStatus(`${enabled ? 'Updating' : 'Removing'} ${permissionLabel}…`);

    try {
      state.selectedUserDetail = await requestJson(
        `${USERS_ENDPOINT}/${encodeURIComponent(state.selectedUserId)}/entitlements`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entitlementKey,
            enabled,
          }),
        }
      );
      await loadPermissions();
      renderUsers();
      setStatus(
        `${enabled ? 'Enabled' : 'Removed'} ${permissionLabel} for ${getDisplayName(state.selectedUserDetail.user)}.`,
        'success',
      );
    } catch (error) {
      setStatus(error.message || 'Unable to update this assignment.', 'danger');
    } finally {
      state.pendingAssignmentKeys.delete(entitlementKey);
      renderSelectedUser();
    }
  }

  async function bootstrapWorkspace() {
    setStatus('Loading definitions and recent accounts…');
    await Promise.all([
      loadPermissions(),
      loadUsers(''),
    ]);
    await loadUserReports(state.reportRangeDays);
    setStatus('Access admin is ready.', 'success');
  }

  async function handleSignOut() {
    await requestJson(SIGN_OUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    state.selectedUserId = '';
    state.selectedUserDetail = null;
    await bootstrap();
  }

  async function bootstrap() {
    setStatus('Checking your session…');
    try {
      const [authStatus, session, access] = await Promise.all([
        requestJson(AUTH_STATUS_ENDPOINT, { method: 'GET' }),
        requestJson(SESSION_ENDPOINT, { method: 'GET' }),
        requestJson(ACCESS_ENDPOINT, { method: 'GET' }),
      ]);
      state.authStatus = authStatus;
      state.session = session;
      state.access = access;
      renderWorkspaceNavigation();
      renderAccessState();
      renderPermissions();
      renderUsers();
      renderSelectedUser();
      renderUserReports();

      if (getAuthorizationAdminAccess().allowed) {
        await bootstrapWorkspace();
      } else {
        setStatus('This session cannot open access admin.', 'warning');
      }
    } catch (error) {
      state.access = null;
      renderWorkspaceNavigation();
      refs.accessChip.textContent = 'Error';
      refs.accessChip.dataset.tone = 'danger';
      refs.authCopy.textContent = 'Unable to load this workspace right now.';
      refs.gateEyebrow.textContent = 'Request failed';
      refs.gateTitle.textContent = 'Access admin could not be loaded.';
      refs.gateCopy.textContent = error.message || 'Retry the request when the Worker is available again.';
      refs.gatePanel.hidden = false;
      refs.workspacePanel.hidden = true;
      setStatus(error.message || 'Unable to load the page.', 'danger');
    }
  }

  refs.retryAccessButton?.addEventListener('click', () => {
    void bootstrap();
  });

  refs.signOutButton?.addEventListener('click', () => {
    void handleSignOut();
  });

  refs.permissionSearch?.addEventListener('input', (event) => {
    state.permissionQuery = event.target.value || '';
    renderPermissions();
    renderSelectedUser();
  });

  refs.permissionForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus('Creating definition…');
    try {
      await requestJson(PERMISSIONS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: form.get('permissionKey'),
          label: form.get('permissionLabel'),
          description: form.get('permissionDescription'),
        }),
      });
      event.currentTarget.reset();
      await loadPermissions();
      renderSelectedUser();
      setStatus('Definition created.', 'success');
    } catch (error) {
      setStatus(error.message || 'Unable to create this definition.', 'danger');
    }
  });

  refs.userSearchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void loadUsers(refs.userSearch?.value || '');
  });

  refs.reportRangeSelect?.addEventListener('change', (event) => {
    void loadUserReports(event.target.value || state.reportRangeDays);
  });

  void bootstrap();
  return {
    reload: bootstrap,
  };
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAdminPage();
    }, { once: true });
  } else {
    initAdminPage();
  }
}
