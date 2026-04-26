import type { AnalyticsPageId, AnalyticsScopeType } from '../../types';

export const ANALYTICS_SCOPE_LABELS: Record<AnalyticsScopeType, string> = {
  consumer: 'Consumer',
  seller: 'Seller',
  provider: 'Provider',
  affiliate: 'Affiliate',
  shipper: 'Shipper',
  admin: 'Admin'
};

export const ANALYTICS_SCOPE_PAGES: Record<AnalyticsScopeType, Array<{ id: AnalyticsPageId; label: string }>> = {
  consumer: [
    { id: 'overview', label: 'Overview' },
    { id: 'spend', label: 'Spend' },
    { id: 'rentals', label: 'Rentals' },
    { id: 'discovery', label: 'Discovery' }
  ],
  seller: [
    { id: 'overview', label: 'Overview' },
    { id: 'traffic', label: 'Traffic' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'sales-units', label: 'Sales Units' },
    { id: 'conversion', label: 'Conversion' },
    { id: 'products', label: 'Products' },
    { id: 'intelligence', label: 'Intelligence' }
  ],
  provider: [
    { id: 'overview', label: 'Overview' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'clients', label: 'Clients' }
  ],
  affiliate: [
    { id: 'overview', label: 'Overview' },
    { id: 'traffic', label: 'Traffic' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'payouts', label: 'Payouts' }
  ],
  shipper: [
    { id: 'overview', label: 'Overview' },
    { id: 'sla', label: 'SLA' },
    { id: 'regions', label: 'Regions' },
    { id: 'exceptions', label: 'Exceptions' }
  ],
  admin: [
    { id: 'overview', label: 'Overview' },
    { id: 'commerce', label: 'Commerce' },
    { id: 'operations', label: 'Operations' },
    { id: 'trust', label: 'Trust' },
    { id: 'payouts', label: 'Payouts' }
  ]
};

export const getScopePageList = (scopeType: AnalyticsScopeType) => ANALYTICS_SCOPE_PAGES[scopeType] || [];

export const isScopePage = (scopeType: AnalyticsScopeType, pageId?: string | null): pageId is AnalyticsPageId =>
  Boolean(pageId && getScopePageList(scopeType).some((page) => page.id === pageId));

export const getDefaultScopePage = (scopeType: AnalyticsScopeType): AnalyticsPageId =>
  getScopePageList(scopeType)[0]?.id || 'overview';

export const buildAnalyticsPath = (scopeType: AnalyticsScopeType, pageId: AnalyticsPageId) =>
  scopeType === 'admin' ? `/admin/analytics/${pageId}` : `/profile/analytics/${scopeType}/${pageId}`;

export const buildAnalyticsWidgetPath = (
  scopeType: AnalyticsScopeType,
  pageId: AnalyticsPageId,
  widgetId: string
) =>
  scopeType === 'admin'
    ? `/admin/analytics/${pageId}/card/${encodeURIComponent(widgetId)}`
    : `/profile/analytics/${scopeType}/${pageId}/card/${encodeURIComponent(widgetId)}`;
