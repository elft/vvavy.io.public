export const AUTH_REQUIRED_ACCESS_KEYS = Object.freeze([
  'export',
  'customVisuals',
]);

export const PROTECTED_WORKSPACE_DEFINITIONS = Object.freeze([
  Object.freeze({
    accessKey: 'analyticsDashboard',
    href: '/analytics/',
    label: 'Analytics',
    description: 'Reporting and usage trends',
  }),
  Object.freeze({
    accessKey: 'customVisualReviews',
    href: '/reviews/',
    label: 'Visual Reviews',
    description: 'Review custom visual submissions',
  }),
  Object.freeze({
    accessKey: 'supportReviews',
    href: '/reviews/support/',
    label: 'Support Reviews',
    description: 'Triage support requests',
  }),
  Object.freeze({
    accessKey: 'authorizationAdmin',
    href: '/admin/',
    label: 'Access Admin',
    description: 'Manage role and feature access',
  }),
]);

export const PROTECTED_ACCESS_KEYS = Object.freeze(
  PROTECTED_WORKSPACE_DEFINITIONS.map((definition) => definition.accessKey),
);

export const ACCOUNT_ACCESS_KEYS = Object.freeze([
  'workspaces',
]);

export const ACCESS_STATE_KEYS = Object.freeze([
  ...AUTH_REQUIRED_ACCESS_KEYS,
  ...ACCOUNT_ACCESS_KEYS,
  ...PROTECTED_ACCESS_KEYS,
]);

export function getAccessibleWorkspaces(accessState = {}, { currentPath = '' } = {}) {
  const normalizedCurrentPath = normalizeWorkspacePath(currentPath);
  return PROTECTED_WORKSPACE_DEFINITIONS
    .filter((definition) => isAccessAllowed(accessState?.[definition.accessKey]))
    .map((definition) => ({
      ...definition,
      isCurrent: normalizeWorkspacePath(definition.href) === normalizedCurrentPath,
    }));
}

export function isAccessAllowed(access = {}) {
  return Boolean(access?.available && access?.authenticated && access?.allowed);
}

function normalizeWorkspacePath(path = '') {
  const trimmed = typeof path === 'string' ? path.trim() : '';
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}
