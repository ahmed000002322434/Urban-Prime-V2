import type { SpotlightAttribution } from '../types';
import type { SpotlightItem, SpotlightProductLink } from '../services/spotlightService';

const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const buildSpotlightAttribution = (
  item: Pick<SpotlightItem, 'id'>,
  product: Pick<SpotlightProductLink, 'id' | 'campaign_key'>
): SpotlightAttribution => ({
  spotlightContentId: item.id,
  spotlightProductLinkId: product.id,
  campaignKey: product.campaign_key || null,
  expiresAt: new Date(Date.now() + ATTRIBUTION_WINDOW_MS).toISOString()
});

export const buildSpotlightItemHref = (itemId: string, attribution: SpotlightAttribution) => {
  const params = new URLSearchParams();
  params.set('spotlight_content_id', attribution.spotlightContentId);
  if (attribution.spotlightProductLinkId) {
    params.set('spotlight_product_link_id', attribution.spotlightProductLinkId);
  }
  if (attribution.campaignKey) {
    params.set('spotlight_campaign_key', attribution.campaignKey);
  }
  if (attribution.expiresAt) {
    params.set('spotlight_attribution_expires_at', attribution.expiresAt);
  }
  return `/item/${encodeURIComponent(itemId)}?${params.toString()}`;
};
