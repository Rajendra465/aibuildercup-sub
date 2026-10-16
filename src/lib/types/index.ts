export interface Movie {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  canonicalVideoUrl: string;
  posterUrl?: string;
  manifestVersion: number;
  promptVersion: number;
  status: "draft" | "ready" | "archived";
  createdAt: string;
  updatedAt: string;
}

export type SlotType =
  | "CITY_ESTABLISHING"
  | "LOCALIZED_PROP"
  | "DIEGETIC_SCREEN"
  | "ADSPOT_BILLBOARD";

export interface AdaptiveSlot {
  id: string;
  movieId: string;
  label: string;
  type: SlotType;

  startSeconds: number;
  endSeconds: number;
  generationLeadSeconds: number;
  generationDeadlineSeconds: number;

  narrativePurpose: string;

  editableFields: string[];
  immutableFacts: string[];
  prohibitedChanges: string[];

  visualConstraints: {
    preserveDuration: boolean;
    preserveCameraMotion: boolean;
    preserveLighting: boolean;
    preserveCharacters: boolean;
    preserveForegroundObjects: boolean;
    maxProminence?: number;
  };

  /** Director-owned ad rules for ADSPOT_BILLBOARD slots. */
  adPolicy?: SlotAdPolicy;

  supportedLocales: string[];

  canonicalFallbackUrl: string;
  referenceImageUrls?: string[];
  referenceVideoUrl?: string;

  generationStrategy:
    | "IMAGE_THEN_VIDEO"
    | "VIDEO_EDIT"
    | "IMAGE_COMPOSITE"
    | "PREGENERATED_ONLY";

  isEnabled: boolean;
}

export interface ViewerProfile {
  id: string;
  displayName: string;
  city: string;
  country: string;
  locale: string;
  languageLabel: string;
  culturalContext?: string[];

  accessibility?: {
    highContrastText?: boolean;
    simplifiedVisualClues?: boolean;
  };

  /** standard = brand ads, ad_free = neutral art, kids = public-service only */
  adPreference?: AdPreference;
}

export type AdPreference = "standard" | "ad_free" | "kids";

export type GenerationJobStatus =
  | "QUEUED"
  | "GENERATING_IMAGE"
  | "IMAGE_READY"
  | "GENERATING_VIDEO"
  | "VALIDATING"
  | "READY"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export interface ValidationResult {
  fileExists: boolean;
  durationValid: boolean;
  aspectRatioValid: boolean;
  requiredFactsPresent: boolean;
  prohibitedElementsAbsent: boolean;
  languageMatch: boolean;
  locationMatch: boolean;
  modelReviewSummary?: string;
  passed: boolean;
}

export interface GenerationJob {
  id: string;
  movieId: string;
  slotId: string;
  profileId?: string;
  profileSnapshot: ViewerProfile;

  status: GenerationJobStatus;

  cacheKey: string;
  modelImage?: string;
  modelVideo?: string;

  imagePrompt?: string;
  videoPrompt?: string;

  imageAssetUrl?: string;
  videoAssetUrl?: string;

  startedAt?: string;
  createdAt?: string;
  completedAt?: string;
  failureReason?: string;

  validation?: ValidationResult;
  approved: boolean;

  /** Campaign rendered into this cut (ad slots only). "neutral" / "psa:<id>" for non-commercial cuts. */
  adKey?: string;
  exposure?: ExposureReport;
  audioAssetUrl?: string;
}

// ---------------------------------------------------------------------------
// Ads
// ---------------------------------------------------------------------------

export type AdCategory =
  | "food_beverage"
  | "alcohol"
  | "travel"
  | "automotive"
  | "finance"
  | "tech"
  | "retail"
  | "entertainment"
  | "telecom"
  | "health"
  | "gambling"
  | "public_service";

export interface SlotAdPolicy {
  blockedCategories: AdCategory[];
  /** Max share of the frame (0-1) an ad may occupy. */
  maxProminence: number;
  /** Require human approval before a cut plays. */
  requireApproval: boolean;
}

export interface Campaign {
  id: string;
  brandName: string;
  productName: string;
  tagline: string;
  category: AdCategory;
  isPublicService: boolean;

  logoUrl?: string;
  productImageUrl?: string;
  brandColors: string[];

  ctaLabel: string;
  landingUrl: string;

  /** Empty = everywhere. Matched case-insensitively. */
  targetCities: string[];
  targetCountries: string[];
  targetLocales: string[];

  /** Contexts the brand refuses to appear next to, e.g. "violence". */
  avoidContexts: string[];

  /** ISO dates (inclusive). Empty = always on. */
  flightStart?: string;
  flightEnd?: string;
  seasonLabel?: string;

  /** Higher wins ties. */
  bidWeight: number;
  /** Optional line read out by the diegetic audio ad. */
  audioScript?: string;

  createdAt: string;
}

export interface SceneSafetyProfile {
  slotId: string;
  mood: string;
  themes: string[];
  sensitiveContexts: string[];
  summary: string;
  source: "gemini" | "heuristic";
  analyzedAt: string;
}

export interface SafetyVerdict {
  safe: boolean;
  reasons: string[];
}

export type AdDecisionKind = "CAMPAIGN" | "PUBLIC_SERVICE" | "NEUTRAL" | "NONE";

export interface AdDecision {
  slotId: string;
  kind: AdDecisionKind;
  /** Stable key for caching: campaign id, "neutral", or "none". */
  adKey: string;
  campaign?: Campaign;
  score?: number;
  /** Plain-language reasons shown in "Why this ad?". */
  reasons: string[];
  rejected: { campaignId: string; brandName: string; reason: string }[];
}

export interface ExposureReport {
  /** Average share of the frame the ad occupies, 0-1. */
  frameShare: number;
  visibleSeconds: number;
  slotSeconds: number;
  /** 0-1: how readable the brand and copy are. */
  legibility: number;
  /** 0-100 composite score. */
  score: number;
  withinProminenceCap: boolean;
  notes: string;
  source: "gemini" | "estimate";
}

export interface ScoutCandidate {
  id: string;
  movieId: string;
  startSeconds: number;
  endSeconds: number;
  surfaceType: "billboard" | "screen" | "storefront" | "vehicle" | "product" | "poster" | "other";
  description: string;
  /** 0-100: how good this surface is for a placement. */
  placementScore: number;
  editableFields: string[];
  immutableFacts: string[];
  suggestedMaxProminence: number;
  source: "gemini" | "heuristic";
}

export type AdEventType = "IMPRESSION" | "PAUSE_VIEW" | "CLICK" | "AUDIO_PLAY";

export interface AdEvent {
  id: string;
  type: AdEventType;
  campaignId: string;
  movieId: string;
  slotId: string;
  profileId: string;
  city: string;
  locale: string;
  exposureScore?: number;
  at: string;
}

export interface CacheEntry {
  id: string;
  cacheKey: string;
  movieId: string;
  slotId: string;
  assetUrl: string;
  assetType: "IMAGE" | "VIDEO";
  profileFingerprint: string;
  modelName: string;
  modelVersion?: string;
  manifestVersion: number;
  promptVersion: number;
  validationPassed: boolean;
  approved: boolean;
  createdAt: string;
  lastAccessedAt: string;
}

export interface PlaybackSegment {
  id: string;
  type: "CANONICAL" | "ADAPTIVE";
  slotId?: string;
  label?: string;
  timelineStartSeconds: number;
  timelineEndSeconds: number;
  assetUrl: string;
  mseAssetUrl: string;
  mimeType: string;
  assetStartSeconds: number;
  expectedDurationSeconds: number;
  source: "CANONICAL_GAP" | "FALLBACK_CLIP" | "GENERATED_CLIP";
  canonicalUrl?: string;
  personalizedUrl?: string;
  status: "READY" | "GENERATING" | "FALLBACK" | "FAILED";
}

export interface PlaybackManifest {
  movieId: string;
  durationSeconds: number;
  preparedAt: string;
  segments: PlaybackSegment[];
}
