import { AdEvent, Campaign } from "@/lib/types";

export interface CampaignStats {
  campaignId: string;
  brandName: string;
  impressions: number;
  pauseViews: number;
  clicks: number;
  audioPlays: number;
  /** clicks / impressions, 0-1 */
  clickRate: number;
  /** Mean exposure score over impressions that carried one, 0-100 */
  avgExposure: number | null;
  byCity: Record<string, number>;
  bySlot: Record<string, number>;
}

export interface AnalyticsSummary {
  totals: { impressions: number; pauseViews: number; clicks: number; audioPlays: number };
  campaigns: CampaignStats[];
}

const bump = (record: Record<string, number>, key: string) => ({ ...record, [key]: (record[key] ?? 0) + 1 });

function emptyStats(campaignId: string, brandName: string): CampaignStats {
  return {
    campaignId, brandName,
    impressions: 0, pauseViews: 0, clicks: 0, audioPlays: 0,
    clickRate: 0, avgExposure: null, byCity: {}, bySlot: {},
  };
}

export function summarizeEvents(events: readonly AdEvent[], campaigns: readonly Campaign[]): AnalyticsSummary {
  const names = new Map(campaigns.map((campaign) => [campaign.id, campaign.brandName]));
  const stats = new Map<string, CampaignStats>();
  const exposure = new Map<string, number[]>();

  for (const event of events) {
    const current = stats.get(event.campaignId) ?? emptyStats(event.campaignId, names.get(event.campaignId) ?? event.campaignId);
    const next: CampaignStats =
      event.type === "IMPRESSION"
        ? { ...current, impressions: current.impressions + 1, byCity: bump(current.byCity, event.city), bySlot: bump(current.bySlot, event.slotId) }
        : event.type === "PAUSE_VIEW"
          ? { ...current, pauseViews: current.pauseViews + 1 }
          : event.type === "CLICK"
            ? { ...current, clicks: current.clicks + 1 }
            : { ...current, audioPlays: current.audioPlays + 1 };
    stats.set(event.campaignId, next);

    if (event.type === "IMPRESSION" && typeof event.exposureScore === "number") {
      exposure.set(event.campaignId, [...(exposure.get(event.campaignId) ?? []), event.exposureScore]);
    }
  }

  const campaignStats = [...stats.values()]
    .map((entry) => {
      const scores = exposure.get(entry.campaignId) ?? [];
      return {
        ...entry,
        clickRate: entry.impressions ? entry.clicks / entry.impressions : 0,
        avgExposure: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
      };
    })
    .sort((left, right) => right.impressions - left.impressions);

  return {
    totals: campaignStats.reduce(
      (totals, entry) => ({
        impressions: totals.impressions + entry.impressions,
        pauseViews: totals.pauseViews + entry.pauseViews,
        clicks: totals.clicks + entry.clicks,
        audioPlays: totals.audioPlays + entry.audioPlays,
      }),
      { impressions: 0, pauseViews: 0, clicks: 0, audioPlays: 0 },
    ),
    campaigns: campaignStats,
  };
}
