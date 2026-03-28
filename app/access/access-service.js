import { bus, EVT } from '../event-bus.js';
import {
  ACCESS_STATE_KEYS,
  AUTH_REQUIRED_ACCESS_KEYS,
  PROTECTED_ACCESS_KEYS,
} from './workspace-registry.js';

const ACCESS_ENDPOINT = '/api/access';

const DEFAULT_FEATURE_ACCESS = Object.freeze({
  available: false,
  authenticated: false,
  allowed: false,
  reason: 'unconfigured',
});

const DEFAULT_AUTH_REQUIRED_FEATURE_ACCESS = Object.freeze({
  available: true,
  authenticated: false,
  allowed: false,
  reason: 'unauthenticated',
});

const DEFAULT_STATE = Object.freeze({
  status: 'idle',
  ...Object.fromEntries(
    ACCESS_STATE_KEYS.map((key) => [key, DEFAULT_FEATURE_ACCESS]),
  ),
  fetchedAt: 0,
  source: 'unset',
  error: null,
});

let state = createState();
let inFlight = null;
let authObserverBound = false;
let lastAuthIdentityKey = createAuthIdentityKey();
let refreshQueuedAfterFlight = false;
let lastRequestConfig = {
  endpoint: ACCESS_ENDPOINT,
  fetchImpl: null,
};

bindAuthObserver();

function createState() {
  const state = {
    ...DEFAULT_STATE,
  };
  AUTH_REQUIRED_ACCESS_KEYS.forEach((key) => {
    state[key] = { ...DEFAULT_AUTH_REQUIRED_FEATURE_ACCESS };
  });
  PROTECTED_ACCESS_KEYS.forEach((key) => {
    state[key] = { ...DEFAULT_FEATURE_ACCESS };
  });
  return state;
}

export function getAccessState() {
  const snapshot = {
    ...state,
  };
  ACCESS_STATE_KEYS.forEach((key) => {
    snapshot[key] = { ...state[key] };
  });
  return snapshot;
}

export function onAccessChange(handler) {
  if (typeof handler === 'function') {
    handler(getAccessState());
  }
  return bus.on(EVT.ACCESS_STATE_CHANGE, handler);
}

export async function ensureAccess(options = {}) {
  bindAuthObserver();
  lastRequestConfig = {
    endpoint: options.endpoint ?? ACCESS_ENDPOINT,
    fetchImpl: options.fetch ?? null,
  };

  if (state.status === 'ready' && !options.forceRefresh) {
    return getAccessState();
  }

  if (inFlight) {
    return inFlight;
  }

  updateState({ status: 'loading', error: null });

  const endpoint = options.endpoint ?? ACCESS_ENDPOINT;

  inFlight = (async () => {
    try {
      const result = await requestAccess(endpoint, options.fetch);
      updateState({ ...result, status: 'ready', source: 'remote', error: null });
    } catch (error) {
      console.warn('Falling back to local access state after API failure', error);
      const fallback = createFallbackAccess({ error });
      updateState({ ...fallback, status: 'ready', source: fallback.source ?? 'fallback', error });
    } finally {
      const shouldRefreshAgain = refreshQueuedAfterFlight;
      refreshQueuedAfterFlight = false;
      inFlight = null;
      if (shouldRefreshAgain) {
        void refreshAuthoritativeAccess();
      }
    }
    return getAccessState();
  })();

  return inFlight;
}

function bindAuthObserver() {
  if (authObserverBound) {
    return;
  }

  authObserverBound = true;
  bus.on(EVT.AUTH_STATE_CHANGE, authState => {
    const featureAccess = createAuthRequiredFeatureAccess(authState);
    const authRequiredUpdates = Object.fromEntries(
      AUTH_REQUIRED_ACCESS_KEYS.map((key) => [
        key,
        mergeFeatureAccess(state[key], featureAccess),
      ]),
    );
    updateState(authRequiredUpdates);

    const nextAuthIdentityKey = createAuthIdentityKey(authState);
    if (nextAuthIdentityKey === lastAuthIdentityKey) {
      return;
    }

    lastAuthIdentityKey = nextAuthIdentityKey;
    if (state.status === 'idle') {
      return;
    }
    if (inFlight) {
      refreshQueuedAfterFlight = true;
      return;
    }

    void refreshAuthoritativeAccess();
  });
}

function refreshAuthoritativeAccess() {
  return ensureAccess({
    forceRefresh: true,
    endpoint: lastRequestConfig.endpoint,
    fetch: lastRequestConfig.fetchImpl,
  }).catch(() => {});
}

function updateState(partial) {
  const next = {
    ...state,
    ...partial,
    fetchedAt: partial.fetchedAt ?? Date.now(),
  };
  ACCESS_STATE_KEYS.forEach((key) => {
    next[key] = normalizeFeatureAccess(partial[key] ?? state[key]);
  });
  state = next;
  bus.emit(EVT.ACCESS_STATE_CHANGE, getAccessState());
  return state;
}

async function requestAccess(endpoint, fetchImpl) {
  const fetcher = fetchImpl ?? globalThis.fetch;
  const response = await fetcher(endpoint, {
    method: 'GET',
    credentials: 'include',
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Access check failed with status ${response.status}`);
  }

  const payload = await response.json();
  return normalizeAccessResponse(payload);
}

function normalizeAccessResponse(payload = {}) {
  return Object.fromEntries(
    ACCESS_STATE_KEYS.map((key) => [key, normalizeFeatureAccess(payload[key])]),
  );
}

function createFallbackAccess({ error } = {}) {
  const featureAccess = createAuthRequiredFeatureAccess(resolveAuthFallbackSnapshot());
  const fallback = Object.fromEntries(
    PROTECTED_ACCESS_KEYS.map((key) => [key, normalizeFeatureAccess()]),
  );
  AUTH_REQUIRED_ACCESS_KEYS.forEach((key) => {
    fallback[key] = featureAccess;
  });
  return {
    ...fallback,
    error,
    fetchedAt: Date.now(),
    source: featureAccess.authenticated ? 'fallback:auth' : 'fallback',
  };
}

function resolveAuthFallbackSnapshot() {
  if (state.export?.authenticated || state.customVisuals?.authenticated) {
    return { authenticated: true };
  }

  try {
    const authState = document?.body?.dataset?.authState ?? '';
    return { authenticated: authState === 'authenticated' };
  } catch {
    return { authenticated: false };
  }
}

function mergeFeatureAccess(current, next) {
  const normalizedCurrent = normalizeFeatureAccess(current);
  const normalizedNext = normalizeFeatureAccess(next);
  return {
    ...normalizedCurrent,
    ...normalizedNext,
    available: normalizedCurrent.available || normalizedNext.available,
  };
}

function createAuthRequiredFeatureAccess(authState = {}) {
  const authenticated = coerceBoolean(authState?.authenticated && authState?.user?.id ? true : authState?.authenticated);
  return {
    available: true,
    authenticated,
    allowed: authenticated,
    reason: authenticated ? 'authorized' : 'unauthenticated',
  };
}

function createAuthIdentityKey(authState = {}) {
  const authenticated = coerceBoolean(authState?.authenticated && authState?.user?.id ? true : authState?.authenticated);
  const userId =
    typeof authState?.user?.id === 'string' ? authState.user.id.trim() : '';
  return `${authenticated ? '1' : '0'}:${userId}`;
}

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
}

function normalizeFeatureAccess(payload = {}) {
  return {
    available: coerceBoolean(payload.available),
    authenticated: coerceBoolean(payload.authenticated),
    allowed: coerceBoolean(payload.allowed),
    reason: typeof payload.reason === 'string' ? payload.reason : 'unconfigured',
  };
}

// Exposed only for tests
export function __resetAccessState() {
  state = createState();
  inFlight = null;
  lastAuthIdentityKey = createAuthIdentityKey();
  refreshQueuedAfterFlight = false;
  lastRequestConfig = {
    endpoint: ACCESS_ENDPOINT,
    fetchImpl: null,
  };
}
