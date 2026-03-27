const AUTH_STATUS_ENDPOINT = '/api/auth/status';
const SESSION_ENDPOINT = '/api/me';
const SIGN_OUT_ENDPOINT = '/api/me/sign-out';
const ACCESS_ENDPOINT = '/api/access';
const ANALYTICS_RANGE_ENDPOINT = '/api/analytics/range';
const VISUALS_ENDPOINT = '/visuals.json';

const RANGE_CACHE_KEY = 'analyticsRangeCacheV3';
const FAVORITE_RANGES_KEY = 'favoriteRangesV3';
const VISUALS_CACHE_KEY = 'analyticsKnownVisualsV2';

const SECTION_TOGGLE_SELECTOR = '[data-section-toggle]';
const FAVORITE_TABLE_IDS = new Set(['todayFavoritesTable', 'globalFavoritesTable']);
const TABLE_CONTROL_CONFIG = Object.freeze([
  ['todayVisualsTable', 'todayVisualsSearch', 'todayVisualsSort'],
  ['todaySourcesTable', 'todaySourcesSearch', 'todaySourcesSort'],
  ['topVisualsTable', 'topVisualsSearch', 'topVisualsSort'],
  ['topSourcesTable', 'topSourcesSearch', 'topSourcesSort'],
  ['todayFavoritesTable', 'todayFavoritesSearch', 'todayFavoritesSort'],
  ['globalFavoritesTable', 'globalFavoritesSearch', 'globalFavoritesSort'],
]);

let registeredSelectionPlugin = false;

export function initAnalyticsDashboardPage(root = document.querySelector('[data-analytics-dashboard-page]')) {
  if (!root || root.dataset.analyticsDashboardBound === 'true') return null;
  root.dataset.analyticsDashboardBound = 'true';

  const refs = {
    root,
    gatePanel: root.querySelector('[data-role="gate-panel"]'),
    dashboardPanel: root.querySelector('[data-role="dashboard-panel"]'),
    accessChip: root.querySelector('[data-role="access-chip"]'),
    authCopy: root.querySelector('[data-role="auth-copy"]'),
    userSummary: root.querySelector('[data-role="user-summary"]'),
    rangeSummary: root.querySelector('[data-role="range-summary"]'),
    gateEyebrow: root.querySelector('[data-role="gate-eyebrow"]'),
    gateTitle: root.querySelector('[data-role="gate-title"]'),
    gateCopy: root.querySelector('[data-role="gate-copy"]'),
    retryAccessButton: root.querySelector('[data-role="retry-access"]'),
    signOutButton: root.querySelector('[data-role="sign-out"]'),
    signOutDashboardButton: root.querySelector('[data-role="sign-out-dashboard"]'),
    openAppLink: root.querySelector('[data-role="open-app-link"]'),
    fromDate: root.querySelector('#fromDate'),
    toDate: root.querySelector('#toDate'),
    favoritesSelect: root.querySelector('#favoritesSelect'),
    saveFavoriteButton: root.querySelector('#saveFavorite'),
    loadDataButton: root.querySelector('#loadData'),
    clearSelectionButton: root.querySelector('#clearSelection'),
    errorMessage: root.querySelector('#errorMessage'),
    loadingMessage: root.querySelector('#loading'),
    selectionStatus: root.querySelector('#selectionStatus'),
    visualTopN: root.querySelector('#visualTopN'),
    sourceTopN: root.querySelector('#sourceTopN'),
    statsGrid: root.querySelector('#statsGrid'),
    todayVisualsCustomOnly: root.querySelector('#todayVisualsCustomOnly'),
    visualTotalLabel: root.querySelector('#visualTotalLabel'),
    sourceTotalLabel: root.querySelector('#sourceTotalLabel'),
  };

  const state = {
    authStatus: null,
    session: null,
    access: null,
    accessLoading: false,
    charts: Object.create(null),
    tableStates: Object.create(null),
    knownVisualIds: new Set(),
    rangeSelectionAnchor: null,
    lastRenderedDailyData: null,
    dashboard: {
      loadedRange: null,
      selectedRange: null,
      loadedDailyData: [],
    },
  };

  function setDefaultDateRange() {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    const defaultTo = formatDateKey(today);
    const defaultFromDate = new Date(today);
    defaultFromDate.setUTCDate(defaultFromDate.getUTCDate() - 29);
    refs.fromDate.value = formatDateKey(defaultFromDate);
    refs.toDate.value = defaultTo;
  }

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
    node.replaceChildren(...children.filter(Boolean));
  }

  function getCssVar(name, fallback = '') {
    const resolved = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return resolved || fallback;
  }

  function colorWithAlpha(color, alpha) {
    if (!color) return color;
    const normalized = color.trim();
    if (normalized.startsWith('#')) {
      const hex = normalized.slice(1);
      const value = hex.length === 3
        ? hex.split('').map(part => part + part).join('')
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
      const parts = normalized.slice(5, -1).split(',').slice(0, 3).map(part => part.trim());
      return `rgba(${parts.join(', ')}, ${alpha})`;
    }
    return normalized;
  }

  function formatDateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function parseDateKey(value) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getTodayDateKey() {
    return formatDateKey(new Date());
  }

  function getDateRangeKeys(from, to) {
    const start = parseDateKey(from);
    const end = parseDateKey(to);
    if (!start || !end || start > end) return [];
    const keys = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      keys.push(formatDateKey(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return keys;
  }

  function getFavoriteRanges() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(FAVORITE_RANGES_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveFavoriteRanges(ranges) {
    window.localStorage.setItem(FAVORITE_RANGES_KEY, JSON.stringify(ranges));
  }

  function renderFavoritesSelect() {
    const options = [
      createElement('option', { text: 'Saved ranges', attrs: { value: '' } }),
      ...getFavoriteRanges().map((range) => {
        return createElement('option', {
          text: `${range.from} → ${range.to}`,
          attrs: { value: `${range.from}|${range.to}` },
        });
      }),
    ];
    replaceChildren(refs.favoritesSelect, options);
  }

  function saveCurrentRangeAsFavorite() {
    const from = refs.fromDate.value;
    const to = refs.toDate.value;
    if (!from || !to) return;
    const favorites = getFavoriteRanges();
    const exists = favorites.some((range) => range.from === from && range.to === to);
    if (!exists) {
      favorites.push({ from, to });
      favorites.sort((left, right) => `${right.from}|${right.to}`.localeCompare(`${left.from}|${left.to}`));
      saveFavoriteRanges(favorites);
      renderFavoritesSelect();
    }
    refs.favoritesSelect.value = `${from}|${to}`;
  }

  function getVisualsCacheStore() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(VISUALS_CACHE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function storeKnownVisualIds(ids) {
    const store = getVisualsCacheStore();
    store[window.location.origin.toLowerCase()] = Array.from(ids);
    window.localStorage.setItem(VISUALS_CACHE_KEY, JSON.stringify(store));
  }

  function getStoredKnownVisualIds() {
    const store = getVisualsCacheStore();
    const cached = store[window.location.origin.toLowerCase()];
    return Array.isArray(cached) ? new Set(cached) : new Set();
  }

  async function loadKnownVisualIds() {
    const cached = getStoredKnownVisualIds();
    if (cached.size) {
      state.knownVisualIds = cached;
    }
    try {
      const payload = await requestJson(VISUALS_ENDPOINT, { method: 'GET' });
      const ids = new Set((payload?.visuals ?? []).map((item) => item.id).filter(Boolean));
      if (ids.size) {
        state.knownVisualIds = ids;
        storeKnownVisualIds(ids);
      }
    } catch {
      if (!state.knownVisualIds.size) {
        state.knownVisualIds = new Set();
      }
    }
  }

  function getRangeCacheStore() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RANGE_CACHE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveRangeCacheStore(store) {
    window.localStorage.setItem(RANGE_CACHE_KEY, JSON.stringify(store));
  }

  function getEndpointCacheBucket() {
    const cacheStore = getRangeCacheStore();
    const cacheKey = window.location.origin.toLowerCase();
    if (!cacheStore[cacheKey]) {
      cacheStore[cacheKey] = { daysByDate: {}, updatedAt: null };
    }
    return { cacheStore, cacheKey, bucket: cacheStore[cacheKey] };
  }

  function upsertRangeIntoCache(payload) {
    const { cacheStore, cacheKey, bucket } = getEndpointCacheBucket();
    bucket.daysByDate = bucket.daysByDate || {};
    for (const day of payload?.daily_data || []) {
      if (!day?.date) continue;
      bucket.daysByDate[day.date] = {
        ...(bucket.daysByDate[day.date] || {}),
        ...day,
      };
    }
    bucket.updatedAt = new Date().toISOString();
    cacheStore[cacheKey] = bucket;
    saveRangeCacheStore(cacheStore);
  }

  function readRangeFromCache(dateKeys, { allowMutableToday = false } = {}) {
    const { bucket } = getEndpointCacheBucket();
    const daysByDate = bucket.daysByDate || {};
    const missingKeys = [];
    const dailyData = [];
    const todayKey = getTodayDateKey();

    for (const key of dateKeys) {
      if (key === todayKey && !allowMutableToday) {
        missingKeys.push(key);
        continue;
      }
      if (daysByDate[key]) {
        dailyData.push(daysByDate[key]);
      } else {
        missingKeys.push(key);
      }
    }

    return { dailyData, missingKeys };
  }

  function groupMissingSegments(dateKeys, missingKeys) {
    const missingSet = new Set(missingKeys);
    const segments = [];
    let current = null;

    for (const key of dateKeys) {
      if (!missingSet.has(key)) {
        if (current) {
          segments.push(current);
          current = null;
        }
        continue;
      }

      if (!current) {
        current = { from: key, to: key };
      } else {
        current.to = key;
      }
    }

    if (current) segments.push(current);
    return segments;
  }

  async function requestJson(url, init = {}) {
    const response = await globalThis.fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
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

  function normalizeAccess(accessPayload = {}) {
    const dashboard = accessPayload?.analyticsDashboard ?? {};
    return {
      available: Boolean(dashboard.available),
      authenticated: Boolean(dashboard.authenticated),
      allowed: Boolean(dashboard.allowed),
      reason: typeof dashboard.reason === 'string' ? dashboard.reason : 'unknown',
    };
  }

  function setChip(label, tone = '') {
    refs.accessChip.textContent = label;
    if (tone) {
      refs.accessChip.dataset.tone = tone;
    } else {
      delete refs.accessChip.dataset.tone;
    }
  }

  function showGate({
    eyebrow,
    title,
    copy,
    chipLabel,
    chipTone = '',
    showOpenApp = true,
    showRetry = true,
    showSignOut = false,
  }) {
    refs.gatePanel.hidden = false;
    refs.dashboardPanel.hidden = true;
    refs.gateEyebrow.textContent = eyebrow;
    refs.gateTitle.textContent = title;
    refs.gateCopy.textContent = copy;
    refs.openAppLink.hidden = !showOpenApp;
    refs.retryAccessButton.hidden = !showRetry;
    refs.signOutButton.hidden = !showSignOut;
    setChip(chipLabel, chipTone);
  }

  function showLoading(show) {
    refs.loadingMessage.hidden = !show;
    refs.loadDataButton.disabled = show;
  }

  function clearError() {
    refs.errorMessage.hidden = true;
    refs.errorMessage.textContent = '';
  }

  function showError(message) {
    refs.errorMessage.hidden = false;
    refs.errorMessage.textContent = message;
  }

  function updateUserSummary() {
    const user = state.session?.user;
    if (!user?.id) {
      refs.userSummary.textContent = 'Not signed in';
      return;
    }
    refs.userSummary.textContent = user.displayUsername || user.email || user.id;
  }

  function updateRangeSummary() {
    if (!state.dashboard.loadedRange) {
      refs.rangeSummary.textContent = 'Last 30 days by default';
      return;
    }
    refs.rangeSummary.textContent = `${state.dashboard.loadedRange.from} → ${state.dashboard.loadedRange.to}`;
  }

  async function fetchAccessState() {
    state.accessLoading = true;
    updateUserSummary();
    showGate({
      eyebrow: 'Checking session',
      title: 'Loading report access…',
      copy: 'This dashboard opens after your account session is verified.',
      chipLabel: 'Checking access',
      chipTone: '',
      showOpenApp: false,
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

      updateUserSummary();

      if (!authStatus?.configured) {
        refs.authCopy.textContent = 'This reporting workspace is not available on this deployment.';
        showGate({
          eyebrow: 'Unavailable',
          title: 'Reports are not ready on this deployment.',
          copy: 'This page will open once account access is configured for the deployment.',
          chipLabel: 'Unavailable',
          chipTone: 'warning',
          showOpenApp: false,
          showRetry: true,
          showSignOut: false,
        });
        return false;
      }

      if (!session?.authenticated || !session?.user?.id) {
        refs.authCopy.textContent = 'Sign in with your VVavy account, then return here to load reports.';
        showGate({
          eyebrow: 'Sign in required',
          title: 'Sign in to open reports.',
          copy: 'Open the app, sign in from the account panel, then return here.',
          chipLabel: 'Sign in required',
          chipTone: 'warning',
          showOpenApp: true,
          showRetry: true,
          showSignOut: false,
        });
        return false;
      }

      if (!state.access.allowed) {
        refs.authCopy.textContent = 'Your account session is active, but this account cannot open reports.';
        showGate({
          eyebrow: 'Access denied',
          title: 'This account cannot view reports yet.',
          copy: 'Use an approved account or ask an administrator to enable access for this account.',
          chipLabel: 'Forbidden',
          chipTone: 'danger',
          showOpenApp: false,
          showRetry: true,
          showSignOut: true,
        });
        return false;
      }

      refs.authCopy.textContent = 'Signed in and ready to load reporting data.';
      refs.gatePanel.hidden = true;
      refs.dashboardPanel.hidden = false;
      setChip('Authorized', 'success');
      return true;
    } catch (error) {
      refs.authCopy.textContent = 'The dashboard could not verify report access right now.';
      showGate({
        eyebrow: 'Connection issue',
        title: 'Could not verify access.',
        copy: error.message || 'Try again in a moment.',
        chipLabel: 'Error',
        chipTone: 'danger',
        showOpenApp: false,
        showRetry: true,
        showSignOut: false,
      });
      return false;
    } finally {
      state.accessLoading = false;
    }
  }

  async function signOutAndRefresh() {
    try {
      await requestJson(SIGN_OUT_ENDPOINT, {
        method: 'POST',
      });
    } catch (error) {
      showError(error.message || 'Sign out failed.');
      return;
    }
    state.session = null;
    state.access = null;
    await fetchAccessState();
  }

  async function fetchRangeSegment(segment) {
    const payload = await requestJson(
      `${ANALYTICS_RANGE_ENDPOINT}?from=${encodeURIComponent(segment.from)}&to=${encodeURIComponent(segment.to)}`,
      { method: 'GET' },
    );
    upsertRangeIntoCache(payload);
  }

  async function getRangeData(from, to) {
    const dateKeys = getDateRangeKeys(from, to);
    if (!dateKeys.length) {
      throw new Error('Please choose a valid date range.');
    }

    let { dailyData, missingKeys } = readRangeFromCache(dateKeys);
    if (missingKeys.length > 0) {
      const segments = groupMissingSegments(dateKeys, missingKeys);
      for (const segment of segments) {
        await fetchRangeSegment(segment);
      }
      ({ dailyData, missingKeys } = readRangeFromCache(dateKeys, { allowMutableToday: true }));
    }

    if (missingKeys.length > 0) {
      throw new Error(`Range data is still missing for ${missingKeys.join(', ')}`);
    }

    const keyed = new Map(dailyData.map(day => [day.date, day]));
    return dateKeys.map(key => keyed.get(key)).filter(Boolean);
  }

  function mergeDurationEntries(target, entries = []) {
    for (const item of entries) {
      if (!item?.name) continue;
      const current = target[item.name] || { selections: 0, total_duration_ms: 0 };
      current.selections += Number(item.selections || 0);
      current.total_duration_ms += Number(item.total_duration_ms || 0);
      target[item.name] = current;
    }
    return target;
  }

  function mergeCountEntries(target, entries = [], valueKey = 'saves') {
    for (const item of entries) {
      if (!item?.name) continue;
      target[item.name] = (target[item.name] || 0) + Number(item[valueKey] || 0);
    }
    return target;
  }

  function formatDurationMap(map) {
    return Object.entries(map)
      .map(([name, entry]) => {
        const selections = Number(entry.selections || 0);
        const totalDurationMs = Number(entry.total_duration_ms || 0);
        const avgDurationMs = selections > 0 ? totalDurationMs / selections : 0;
        return {
          name,
          selections,
          total_duration_ms: totalDurationMs,
          avg_duration_minutes: (avgDurationMs / 60000).toFixed(2),
        };
      })
      .sort((left, right) => {
        if (right.selections !== left.selections) {
          return right.selections - left.selections;
        }
        return right.total_duration_ms - left.total_duration_ms;
      });
  }

  function formatCountMap(map) {
    return Object.entries(map)
      .map(([name, saves]) => ({ name, saves: Number(saves || 0) }))
      .sort((left, right) => right.saves - left.saves);
  }

  function aggregateRangeData(dailyData) {
    const visualsMap = {};
    const sourcesMap = {};
    const favoritesMap = {};
    const savedVisualsMap = {};

    const summary = dailyData.reduce((accumulator, day) => {
      accumulator.unique_sessions += Number(day.unique_sessions || day.session_count || 0);
      accumulator.session_count += Number(day.session_count || day.unique_sessions || 0);
      accumulator.page_views += Number(day.page_views || 0);
      accumulator.total_session_duration_ms += Number(day.total_session_duration_ms || 0);
      accumulator.playback_starts += Number(day.playback_starts || 0);
      accumulator.exports += Number(day.exports || 0);
      accumulator.custom_visual_creates += Number(day.custom_visual_creates || 0);
      accumulator.custom_visual_previews += Number(day.custom_visual_previews || 0);
      accumulator.custom_visual_saves += Number(day.custom_visual_saves || 0);
      accumulator.favorite_clicks += Number(day.favorite_clicks || 0);
      mergeDurationEntries(visualsMap, day.visuals);
      mergeDurationEntries(sourcesMap, day.sources);
      mergeCountEntries(savedVisualsMap, day.saved_visuals, 'saves');
      mergeCountEntries(favoritesMap, day.favorites, 'saves');
      return accumulator;
    }, {
      unique_sessions: 0,
      session_count: 0,
      page_views: 0,
      total_session_duration_ms: 0,
      playback_starts: 0,
      exports: 0,
      custom_visual_creates: 0,
      custom_visual_previews: 0,
      custom_visual_saves: 0,
      favorite_clicks: 0,
    });

    const sessionBase = summary.unique_sessions || summary.session_count || 0;
    const avgDurationMs = sessionBase > 0 ? summary.total_session_duration_ms / sessionBase : 0;

    return {
      summary: {
        ...summary,
        avg_session_duration_minutes: Number((avgDurationMs / 60000).toFixed(2)),
      },
      visuals: formatDurationMap(visualsMap),
      sources: formatDurationMap(sourcesMap),
      favorites: formatCountMap(favoritesMap),
      savedVisuals: formatCountMap(savedVisualsMap),
    };
  }

  function updateSelectionStatus() {
    const loaded = state.dashboard.loadedRange;
    const selected = state.dashboard.selectedRange;

    if (!loaded || !selected) {
      refs.selectionStatus.textContent = 'Loaded range: none';
      refs.clearSelectionButton.disabled = true;
      return;
    }

    const isFullRange = selected.from === loaded.from && selected.to === loaded.to;
    refs.selectionStatus.textContent = isFullRange
      ? `Loaded range: ${loaded.from} → ${loaded.to}. Click a chart twice to filter a sub-range.`
      : `Chart filter: ${selected.from} → ${selected.to} inside ${loaded.from} → ${loaded.to}`;
    refs.clearSelectionButton.disabled = isFullRange;
  }

  function getChartSelectionHandler(labels) {
    return (_, elements) => {
      if (!elements?.length || !labels?.length) return;
      const clickedLabel = labels[elements[0].index];
      if (!clickedLabel) return;

      if (!state.rangeSelectionAnchor) {
        state.rangeSelectionAnchor = clickedLabel;
        state.dashboard.selectedRange = { from: clickedLabel, to: clickedLabel };
      } else {
        const from = state.rangeSelectionAnchor < clickedLabel ? state.rangeSelectionAnchor : clickedLabel;
        const to = state.rangeSelectionAnchor > clickedLabel ? state.rangeSelectionAnchor : clickedLabel;
        state.dashboard.selectedRange = { from, to };
        state.rangeSelectionAnchor = null;
      }

      applySelectedRange();
    };
  }

  function buildSharedChartOptions(labels, yAxisTitle, stacked = false) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: getChartSelectionHandler(labels),
      plugins: {
        legend: { display: true, position: 'top' },
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
          stacked,
          title: { display: true, text: 'Date' },
        },
        y: {
          stacked,
          beginAtZero: true,
          title: { display: true, text: yAxisTitle },
        },
      },
    };
  }

  function buildStackedChartOptions(labels, yAxisTitle) {
    const options = buildSharedChartOptions(labels, yAxisTitle, true);
    options.plugins.legend = {
      display: true,
      position: 'right',
      labels: { boxWidth: 12, font: { size: 11 }, padding: 8 },
      onClick(event, legendItem, legend) {
        const chart = legend.chart;
        const index = legendItem.datasetIndex;
        if (event.native && (event.native.ctrlKey || event.native.metaKey)) {
          const isolate = chart.data.datasets.every((_, datasetIndex) => (
            datasetIndex === index ? chart.isDatasetVisible(datasetIndex) : !chart.isDatasetVisible(datasetIndex)
          ));
          chart.data.datasets.forEach((_, datasetIndex) => {
            chart.setDatasetVisibility(datasetIndex, isolate || datasetIndex === index);
          });
        } else {
          chart.setDatasetVisibility(index, !chart.isDatasetVisible(index));
        }
        chart.update();
      },
    };
    options.plugins.tooltip.footer = (items) => `Total: ${items.reduce((sum, item) => sum + item.parsed.y, 0)}`;
    return options;
  }

  function getPaletteColor(index) {
    const palette = [
      getCssVar('--color-primary', '#3f5f82'),
      getCssVar('--color-accent', '#5f7ca3'),
      getCssVar('--color-heat-mid', '#ff9f31'),
      getCssVar('--color-heat-high', '#e34125'),
      getCssVar('--color-secondary', '#7a8ca2'),
      getCssVar('--color-success', '#567a65'),
      getCssVar('--color-warning', '#b6842a'),
      getCssVar('--color-danger', '#be5b67'),
    ];
    return palette[index % palette.length];
  }

  function ensureChartSupport() {
    const chartLibrary = globalThis.Chart;
    if (!chartLibrary) {
      throw new Error('Chart.js did not load for the analytics dashboard.');
    }
    if (registeredSelectionPlugin) return chartLibrary;

    chartLibrary.register({
      id: 'analyticsRangeSelectionPlugin',
      beforeDatasetsDraw(chart) {
        const selection = state.dashboard.selectedRange;
        const labels = chart?.data?.labels;
        const xScale = chart?.scales?.x;
        const area = chart?.chartArea;
        if (!selection || !labels || !xScale || !area || labels.length === 0) return;
        const firstIndex = labels.indexOf(selection.from);
        const lastIndex = labels.indexOf(selection.to);
        const loaded = state.dashboard.loadedRange;
        const fullRange = loaded && selection.from === loaded.from && selection.to === loaded.to;
        if (firstIndex === -1 || lastIndex === -1 || fullRange) return;

        const start = Math.min(firstIndex, lastIndex);
        const end = Math.max(firstIndex, lastIndex);
        const ctx = chart.ctx;
        const left = start === 0 ? area.left : (xScale.getPixelForValue(start - 1) + xScale.getPixelForValue(start)) / 2;
        const right = end === labels.length - 1 ? area.right : (xScale.getPixelForValue(end) + xScale.getPixelForValue(end + 1)) / 2;

        ctx.save();
        ctx.fillStyle = colorWithAlpha(getCssVar('--color-primary', '#3f5f82'), 0.14);
        ctx.fillRect(left, area.top, Math.max(0, right - left), area.bottom - area.top);
        ctx.restore();
      },
    });

    registeredSelectionPlugin = true;
    return chartLibrary;
  }

  function destroyChart(chartId) {
    if (!state.charts[chartId]) return;
    state.charts[chartId].destroy();
    delete state.charts[chartId];
  }

  function buildTopNDatasets(dailyData, key, topN) {
    const labels = dailyData.map((day) => day.date);
    const totals = {};

    for (const day of dailyData) {
      for (const item of day[key] || []) {
        if (!item?.name) continue;
        totals[item.name] = (totals[item.name] || 0) + Number(item.selections || 0);
      }
    }

    const sorted = Object.entries(totals).sort((left, right) => right[1] - left[1]);
    const topNames = sorted.slice(0, topN).map(([name]) => name);
    const othersCount = Math.max(0, sorted.length - topNames.length);
    const datasets = topNames.map((name, index) => ({
      label: name,
      data: dailyData.map((day) => {
        const entry = (day[key] || []).find((value) => value.name === name);
        return entry ? Number(entry.selections || 0) : 0;
      }),
      backgroundColor: getPaletteColor(index),
      stack: key,
    }));

    if (othersCount > 0) {
      datasets.push({
        label: `Others (${othersCount})`,
        data: dailyData.map((day) => {
          return (day[key] || [])
            .filter((value) => !topNames.includes(value.name))
            .reduce((sum, value) => sum + Number(value.selections || 0), 0);
        }),
        backgroundColor: getCssVar('--color-border-strong', '#999999'),
        stack: key,
      });
    }

    return { labels, datasets, total: sorted.length };
  }

  function createStatsCards(summary) {
    const stats = [
      ['Sessions', summary.unique_sessions],
      ['Page Views', summary.page_views],
      ['Avg Duration', `${summary.avg_session_duration_minutes} min`],
      ['Playbacks', summary.playback_starts],
      ['Exports', summary.exports],
      ['Creates', summary.custom_visual_creates],
      ['Previews', summary.custom_visual_previews || 0],
      ['Saves', summary.custom_visual_saves],
      ['Fav Clicks', summary.favorite_clicks || 0],
    ];

    replaceChildren(refs.statsGrid, stats.map(([label, value]) => {
      const card = createElement('article', { className: 'analytics-stat-card grid gap-6 p-12' });
      card.append(
        createElement('p', { className: 'analytics-label m-0', text: label }),
        createElement('p', { className: 'analytics-stat-value m-0', text: String(value) }),
      );
      return card;
    }));
  }

  function createDailyActivityChart(dailyData) {
    const Chart = ensureChartSupport();
    destroyChart('hourlyChart');
    const labels = dailyData.map((day) => day.date);
    state.charts.hourlyChart = new Chart(document.getElementById('hourlyChart').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Sessions',
            data: dailyData.map((day) => day.unique_sessions || day.session_count || 0),
            borderColor: getCssVar('--color-primary', '#3f5f82'),
            backgroundColor: colorWithAlpha(getCssVar('--color-primary', '#3f5f82'), 0.14),
            tension: 0.25,
            fill: true,
          },
          {
            label: 'Page Views',
            data: dailyData.map((day) => day.page_views || 0),
            borderColor: getCssVar('--color-accent', '#5f7ca3'),
            backgroundColor: colorWithAlpha(getCssVar('--color-accent', '#5f7ca3'), 0.12),
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: buildSharedChartOptions(labels, 'Count'),
    });
  }

  function createSessionsChart(dailyData) {
    const Chart = ensureChartSupport();
    destroyChart('sessionsChart');
    const labels = dailyData.map((day) => day.date);
    state.charts.sessionsChart = new Chart(document.getElementById('sessionsChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Sessions',
            data: dailyData.map((day) => day.unique_sessions || day.session_count || 0),
            backgroundColor: getCssVar('--color-primary', '#3f5f82'),
          },
          {
            label: 'Views',
            data: dailyData.map((day) => day.page_views || 0),
            backgroundColor: getCssVar('--color-accent', '#5f7ca3'),
          },
        ],
      },
      options: buildSharedChartOptions(labels, 'Count'),
    });
  }

  function createDurationChart(dailyData) {
    const Chart = ensureChartSupport();
    destroyChart('durationChart');
    const labels = dailyData.map((day) => day.date);
    state.charts.durationChart = new Chart(document.getElementById('durationChart').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Minutes',
          data: dailyData.map((day) => Number(day.avg_session_duration_minutes || 0)),
          borderColor: getCssVar('--color-danger', '#be5b67'),
          backgroundColor: colorWithAlpha(getCssVar('--color-danger', '#be5b67'), 0.14),
          tension: 0.25,
          fill: true,
        }],
      },
      options: buildSharedChartOptions(labels, 'Minutes'),
    });
  }

  function createCustomVisualsChart(dailyData) {
    const Chart = ensureChartSupport();
    destroyChart('customVisualsChart');
    const labels = dailyData.map((day) => day.date);
    state.charts.customVisualsChart = new Chart(document.getElementById('customVisualsChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Creates',
            data: dailyData.map((day) => day.custom_visual_creates || 0),
            backgroundColor: getCssVar('--color-success', '#567a65'),
          },
          {
            label: 'Previews',
            data: dailyData.map((day) => day.custom_visual_previews || 0),
            backgroundColor: getCssVar('--color-secondary', '#7a8ca2'),
          },
          {
            label: 'Saves',
            data: dailyData.map((day) => day.custom_visual_saves || 0),
            backgroundColor: getCssVar('--color-accent', '#5f7ca3'),
          },
        ],
      },
      options: buildSharedChartOptions(labels, 'Count'),
    });
  }

  function createActionsChart(dailyData) {
    const Chart = ensureChartSupport();
    destroyChart('actionsChart');
    const labels = dailyData.map((day) => day.date);
    state.charts.actionsChart = new Chart(document.getElementById('actionsChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Playbacks',
            data: dailyData.map((day) => day.playback_starts || 0),
            backgroundColor: getCssVar('--color-warning', '#b6842a'),
          },
          {
            label: 'Exports',
            data: dailyData.map((day) => day.exports || 0),
            backgroundColor: getCssVar('--color-danger', '#be5b67'),
          },
        ],
      },
      options: buildSharedChartOptions(labels, 'Count'),
    });
  }

  function createDailyVisualsAndSourcesCharts(dailyData) {
    const Chart = ensureChartSupport();
    destroyChart('hourlyVisualsChart');
    destroyChart('hourlySourcesChart');
    state.lastRenderedDailyData = dailyData;

    const visualTopN = Number.parseInt(refs.visualTopN.value, 10) || 10;
    const sourceTopN = Number.parseInt(refs.sourceTopN.value, 10) || 10;

    const visualPayload = buildTopNDatasets(dailyData, 'visuals', visualTopN);
    refs.visualTotalLabel.textContent = `${visualPayload.total} total`;
    state.charts.hourlyVisualsChart = new Chart(document.getElementById('hourlyVisualsChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: visualPayload.labels,
        datasets: visualPayload.datasets,
      },
      options: buildStackedChartOptions(visualPayload.labels, 'Selections'),
    });

    const sourcePayload = buildTopNDatasets(dailyData, 'sources', sourceTopN);
    refs.sourceTotalLabel.textContent = `${sourcePayload.total} total`;
    state.charts.hourlySourcesChart = new Chart(document.getElementById('hourlySourcesChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: sourcePayload.labels,
        datasets: sourcePayload.datasets,
      },
      options: buildStackedChartOptions(sourcePayload.labels, 'Selections'),
    });
  }

  function initializeTableState(tableId, data) {
    state.tableStates[tableId] = {
      allData: data.map(entry => ({ ...entry })),
      filteredData: data.map(entry => ({ ...entry })),
      currentPage: 1,
      itemsPerPage: 20,
      sortBy: 'rank-asc',
      searchQuery: '',
      customOnly: false,
    };
  }

  function renderTable(tableId) {
    const table = document.getElementById(tableId);
    const tableState = state.tableStates[tableId];
    if (!table || !tableState) return;

    const totalItems = tableState.filteredData.length;
    const totalPages = Math.ceil(totalItems / tableState.itemsPerPage);
    const startIndex = totalItems === 0 ? 0 : (tableState.currentPage - 1) * tableState.itemsPerPage;
    const endIndex = Math.min(startIndex + tableState.itemsPerPage, totalItems);
    const pageData = tableState.filteredData.slice(startIndex, endIndex);
    const countElement = document.getElementById(tableId.replace('Table', 'Count'));

    if (countElement) {
      countElement.textContent = totalItems === 0 ? '0 results' : `${startIndex + 1}-${endIndex} of ${totalItems}`;
    }

    if (pageData.length === 0) {
      const body = createElement('tbody');
      const row = createElement('tr');
      const cell = createElement('td', {
        className: 'analytics-empty-state',
        text: 'No results',
        attrs: {
          colspan: FAVORITE_TABLE_IDS.has(tableId) ? 3 : 5,
        },
      });
      row.append(cell);
      body.append(row);
      replaceChildren(table, [body]);
      updatePagination(tableId, 0, 0);
      return;
    }

    const headRow = createElement('tr');
    const headerLabels = FAVORITE_TABLE_IDS.has(tableId)
      ? ['#', 'Name', 'Count']
      : ['#', 'Name', 'Selections', 'Avg Duration', 'Total Duration'];

    for (const label of headerLabels) {
      headRow.append(createElement('th', { text: label }));
    }

    const thead = createElement('thead');
    thead.append(headRow);

    const tbody = createElement('tbody');
    for (const item of pageData) {
      const rank = tableState.allData.findIndex((entry) => entry.name === item.name) + 1;
      const row = createElement('tr');
      const rankCell = createElement('td');
      rankCell.append(createElement('span', {
        className: 'analytics-rank-badge',
        text: String(rank),
        dataset: { rank: String(rank) },
      }));
      row.append(rankCell);

      const nameCell = createElement('td');
      const name = createElement('span', {
        className: 'analytics-name',
        text: item.name || 'Unknown',
      });
      nameCell.append(name);
      if (tableId === 'todayVisualsTable' && state.knownVisualIds.size > 0 && !state.knownVisualIds.has(item.name)) {
        nameCell.append(createElement('span', { className: 'analytics-custom-badge', text: 'Custom' }));
      }
      row.append(nameCell);

      if (FAVORITE_TABLE_IDS.has(tableId)) {
        row.append(createElement('td', { text: Number(item.selections || 0).toLocaleString() }));
      } else {
        row.append(createElement('td', { text: Number(item.selections || 0).toLocaleString() }));
        row.append(createElement('td', { text: `${item.avg_duration_minutes || '0.00'} min` }));
        row.append(createElement('td', {
          text: `${item.total_duration_ms ? (Number(item.total_duration_ms) / 60000).toFixed(2) : '0.00'} min`,
        }));
      }

      tbody.append(row);
    }

    replaceChildren(table, [thead, tbody]);
    updatePagination(tableId, tableState.currentPage, totalPages);
  }

  function changePage(tableId, page) {
    const tableState = state.tableStates[tableId];
    if (!tableState) return;
    const totalPages = Math.ceil(tableState.filteredData.length / tableState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    tableState.currentPage = page;
    renderTable(tableId);
  }

  function updatePagination(tableId, currentPage, totalPages) {
    const paginationElement = document.getElementById(tableId.replace('Table', 'Pagination'));
    if (!paginationElement) return;

    if (totalPages <= 1) {
      replaceChildren(paginationElement);
      return;
    }

    const children = [];
    const createPageButton = (label, page, disabled = false, active = false) => {
      const button = createElement('button', {
        className: `analytics-button analytics-button--ghost analytics-button--compact${active ? ' is-active' : ''}`,
        text: label,
        attrs: { type: 'button' },
      });
      button.disabled = disabled;
      button.addEventListener('click', () => changePage(tableId, page));
      return button;
    };

    children.push(createPageButton('‹', currentPage - 1, currentPage === 1));

    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let page = startPage; page <= endPage; page += 1) {
      children.push(createPageButton(String(page), page, false, page === currentPage));
    }

    children.push(createPageButton('›', currentPage + 1, currentPage === totalPages));
    children.push(createElement('span', {
      className: 'analytics-copy',
      text: `Page ${currentPage}/${totalPages}`,
    }));

    replaceChildren(paginationElement, children);
  }

  function sortData(tableId, sortBy, { skipRender = false } = {}) {
    const tableState = state.tableStates[tableId];
    if (!tableState) return;
    tableState.sortBy = sortBy;
    const [field, direction] = sortBy.split('-');

    tableState.filteredData.sort((left, right) => {
      let leftValue = 0;
      let rightValue = 0;
      if (field === 'rank') {
        leftValue = tableState.allData.findIndex((entry) => entry.name === left.name);
        rightValue = tableState.allData.findIndex((entry) => entry.name === right.name);
      } else if (field === 'name') {
        leftValue = (left.name || '').toLowerCase();
        rightValue = (right.name || '').toLowerCase();
      } else if (field === 'selections') {
        leftValue = Number(left.selections || 0);
        rightValue = Number(right.selections || 0);
      } else if (field === 'duration') {
        leftValue = Number.parseFloat(left.avg_duration_minutes) || 0;
        rightValue = Number.parseFloat(right.avg_duration_minutes) || 0;
      }

      if (leftValue === rightValue) return 0;
      return direction === 'asc'
        ? (leftValue > rightValue ? 1 : -1)
        : (leftValue < rightValue ? 1 : -1);
    });

    tableState.currentPage = 1;
    if (!skipRender) renderTable(tableId);
  }

  function applyTodayVisualsFilter() {
    const tableState = state.tableStates.todayVisualsTable;
    if (!tableState) return;
    const query = (tableState.searchQuery || '').toLowerCase().trim();
    tableState.filteredData = tableState.allData.filter((item) => {
      const matchesSearch = !query || (item.name || '').toLowerCase().includes(query);
      const isCustom = state.knownVisualIds.size > 0 && !state.knownVisualIds.has(item.name);
      return matchesSearch && (!tableState.customOnly || isCustom);
    });
    tableState.currentPage = 1;
    if (tableState.sortBy) {
      sortData('todayVisualsTable', tableState.sortBy, { skipRender: true });
    }
    renderTable('todayVisualsTable');
  }

  function filterData(tableId, query) {
    const tableState = state.tableStates[tableId];
    if (!tableState) return;
    tableState.searchQuery = query;

    if (tableId === 'todayVisualsTable') {
      applyTodayVisualsFilter();
      return;
    }

    const normalized = query.toLowerCase().trim();
    tableState.filteredData = !normalized
      ? [...tableState.allData]
      : tableState.allData.filter((item) => (item.name || '').toLowerCase().includes(normalized));

    if (tableState.sortBy) {
      sortData(tableId, tableState.sortBy, { skipRender: true });
    }
    renderTable(tableId);
  }

  function createDataTable(tableId, data) {
    initializeTableState(tableId, Array.isArray(data) ? data : []);
    const searchInput = document.getElementById(tableId.replace('Table', 'Search'));
    const sortSelect = document.getElementById(tableId.replace('Table', 'Sort'));
    const tableState = state.tableStates[tableId];

    if (searchInput) {
      tableState.searchQuery = searchInput.value || '';
    }
    if (sortSelect?.value) {
      tableState.sortBy = sortSelect.value;
      sortData(tableId, sortSelect.value, { skipRender: true });
    }

    if (tableId === 'todayVisualsTable') {
      applyTodayVisualsFilter();
    } else if (tableState.searchQuery) {
      filterData(tableId, tableState.searchQuery);
    } else {
      renderTable(tableId);
    }
  }

  function createFavoritesTable(tableId, data) {
    const entries = (Array.isArray(data) ? data : []).map((item) => ({
      name: item.name,
      selections: item.saves != null ? item.saves : (item.clicks != null ? item.clicks : 0),
      avg_duration_minutes: null,
      total_duration_ms: null,
    }));
    createDataTable(tableId, entries);
  }

  function renderDashboard(selectedDailyData) {
    const selectedAggregate = aggregateRangeData(selectedDailyData);
    const loadedAggregate = aggregateRangeData(state.dashboard.loadedDailyData);

    createStatsCards(selectedAggregate.summary);
    createDailyActivityChart(selectedDailyData);
    createDailyVisualsAndSourcesCharts(selectedDailyData);
    createSessionsChart(selectedDailyData);
    createDurationChart(selectedDailyData);
    createCustomVisualsChart(selectedDailyData);
    createActionsChart(selectedDailyData);

    createDataTable('todayVisualsTable', selectedAggregate.visuals);
    createDataTable('todaySourcesTable', selectedAggregate.sources);
    createDataTable('topVisualsTable', loadedAggregate.visuals);
    createDataTable('topSourcesTable', loadedAggregate.sources);
    createFavoritesTable('todayFavoritesTable', selectedAggregate.favorites);
    createFavoritesTable('globalFavoritesTable', selectedAggregate.savedVisuals);

    updateSelectionStatus();
  }

  function applySelectedRange() {
    if (!state.dashboard.loadedDailyData.length || !state.dashboard.selectedRange) return;
    const selectedDailyData = state.dashboard.loadedDailyData.filter((day) => {
      return day.date >= state.dashboard.selectedRange.from && day.date <= state.dashboard.selectedRange.to;
    });
    renderDashboard(selectedDailyData);
  }

  async function loadData({ forceAccessRefresh = false } = {}) {
    if (forceAccessRefresh) {
      const allowed = await fetchAccessState();
      if (!allowed) return;
    }
    if (!state.access?.allowed) return;

    clearError();
    const from = refs.fromDate.value;
    const to = refs.toDate.value;

    if (!from || !to || from > to) {
      showError('Please choose a valid from/to range.');
      return;
    }

    showLoading(true);
    state.rangeSelectionAnchor = null;

    try {
      await loadKnownVisualIds();
      const dailyData = await getRangeData(from, to);
      state.dashboard.loadedRange = { from, to };
      state.dashboard.selectedRange = { from, to };
      state.dashboard.loadedDailyData = dailyData;
      updateRangeSummary();
      renderDashboard(dailyData);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        await fetchAccessState();
      }
      showError(error.message || 'Could not load analytics data.');
    } finally {
      showLoading(false);
    }
  }

  function bindTableControls() {
    for (const [tableId, searchId, sortId] of TABLE_CONTROL_CONFIG) {
      const searchInput = document.getElementById(searchId);
      const sortSelect = document.getElementById(sortId);
      if (searchInput) {
        searchInput.addEventListener('input', (event) => {
          filterData(tableId, event.currentTarget.value || '');
        });
      }
      if (sortSelect) {
        sortSelect.addEventListener('change', (event) => {
          sortData(tableId, event.currentTarget.value || 'rank-asc');
        });
      }
    }
  }

  function bindSectionToggles() {
    root.querySelectorAll(SECTION_TOGGLE_SELECTOR).forEach((button) => {
      button.addEventListener('click', () => {
        const content = button.nextElementSibling;
        const expanded = button.getAttribute('aria-expanded') !== 'false';
        button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (content) {
          content.hidden = expanded;
        }
      });
    });
  }

  async function bootstrap() {
    setDefaultDateRange();
    renderFavoritesSelect();
    updateSelectionStatus();
    bindTableControls();
    bindSectionToggles();

    refs.retryAccessButton.addEventListener('click', () => {
      clearError();
      void fetchAccessState();
    });
    refs.signOutButton.addEventListener('click', () => {
      void signOutAndRefresh();
    });
    refs.signOutDashboardButton.addEventListener('click', () => {
      void signOutAndRefresh();
    });
    refs.loadDataButton.addEventListener('click', () => {
      void loadData();
    });
    refs.clearSelectionButton.addEventListener('click', () => {
      if (!state.dashboard.loadedRange) return;
      state.rangeSelectionAnchor = null;
      state.dashboard.selectedRange = {
        from: state.dashboard.loadedRange.from,
        to: state.dashboard.loadedRange.to,
      };
      applySelectedRange();
    });
    refs.saveFavoriteButton.addEventListener('click', saveCurrentRangeAsFavorite);
    refs.favoritesSelect.addEventListener('change', (event) => {
      if (!event.currentTarget.value) return;
      const [from, to] = event.currentTarget.value.split('|');
      if (!from || !to) return;
      refs.fromDate.value = from;
      refs.toDate.value = to;
      void loadData();
    });
    refs.todayVisualsCustomOnly.addEventListener('click', () => {
      const tableState = state.tableStates.todayVisualsTable;
      if (!tableState) return;
      tableState.customOnly = !tableState.customOnly;
      refs.todayVisualsCustomOnly.dataset.active = tableState.customOnly ? 'true' : 'false';
      applyTodayVisualsFilter();
    });
    refs.visualTopN.addEventListener('change', () => {
      if (state.lastRenderedDailyData) {
        createDailyVisualsAndSourcesCharts(state.lastRenderedDailyData);
      }
    });
    refs.sourceTopN.addEventListener('change', () => {
      if (state.lastRenderedDailyData) {
        createDailyVisualsAndSourcesCharts(state.lastRenderedDailyData);
      }
    });

    const allowed = await fetchAccessState();
    if (allowed) {
      await loadData();
    }
  }

  void bootstrap();
  return {
    reloadAccess: fetchAccessState,
    loadData,
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAnalyticsDashboardPage();
    }, { once: true });
  } else {
    initAnalyticsDashboardPage();
  }
}
