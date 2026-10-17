import { ViewerProfile, Movie, AdaptiveSlot } from "@/lib/types";

export const seedProfiles: ViewerProfile[] = [
  {
    "id": "paris-fr",
    "displayName": "Camille",
    "city": "Paris",
    "country": "France",
    "locale": "fr-FR",
    "languageLabel": "French",
    "culturalContext": [
      "Parisian street life"
    ],
    "accessibility": {
      "highContrastText": false,
      "simplifiedVisualClues": false
    },
    "adPreference": "standard"
  },
  {
    "id": "paris-fr-kids",
    "displayName": "Léo (kids)",
    "city": "Paris",
    "country": "France",
    "locale": "fr-FR",
    "languageLabel": "French",
    "culturalContext": [
      "family profile"
    ],
    "accessibility": {
      "highContrastText": false,
      "simplifiedVisualClues": false
    },
    "adPreference": "kids"
  },
  {
    "id": "sf-en-adfree",
    "displayName": "Jordan (ad-free)",
    "city": "San Francisco",
    "country": "United States",
    "locale": "en-US",
    "languageLabel": "English",
    "culturalContext": [
      "premium plan"
    ],
    "accessibility": {
      "highContrastText": false,
      "simplifiedVisualClues": false
    },
    "adPreference": "ad_free"
  },
  {
    "id": "bengaluru-kn-in-srikant",
    "displayName": "Srikant",
    "city": "Bengaluru",
    "country": "India",
    "locale": "kn-IN",
    "languageLabel": "Kannada",
    "culturalContext": [
      "Silicon valley of India"
    ],
    "accessibility": {
      "highContrastText": false,
      "simplifiedVisualClues": false
    }
  },
  {
    "id": "vizag-te",
    "displayName": "Sampath",
    "city": "Visakhapatnam",
    "country": "India",
    "locale": "te-IN",
    "languageLabel": "Telugu",
    "culturalContext": [
      "coastal city",
      "India"
    ],
    "accessibility": {
      "highContrastText": false,
      "simplifiedVisualClues": false
    }
  },
  {
    "id": "tokyo-ja",
    "displayName": "Aiko",
    "city": "Tokyo",
    "country": "Japan",
    "locale": "ja-JP",
    "languageLabel": "Japanese",
    "culturalContext": [
      "dense urban environment",
      "Japan"
    ],
    "accessibility": {
      "highContrastText": false,
      "simplifiedVisualClues": false
    }
  },
  {
    "id": "sf-en",
    "displayName": "Maya",
    "city": "San Francisco",
    "country": "United States",
    "locale": "en-US",
    "languageLabel": "English",
    "culturalContext": [
      "Bay Area",
      "United States"
    ],
    "accessibility": {
      "highContrastText": true,
      "simplifiedVisualClues": false
    }
  }
];

export const seedMovie: Movie = {
  "id": "night-billboard-1792268345989",
  "title": "Night Billboard",
  "description": "A lone billboard above a city highway after dark.",
  "durationSeconds": 15,
  "canonicalVideoUrl": "/media/uploads/night-billboard-1792268345989/night-billboard-1792268345989.mp4",
  "manifestVersion": 1,
  "promptVersion": 1,
  "status": "draft",
  "createdAt": "2026-10-17T20:19:06.137Z",
  "updatedAt": "2026-10-17T20:19:06.137Z"
};

export const seedMovies: Movie[] = [
  {
    "id": "night-billboard-1792268345989",
    "title": "Night Billboard",
    "description": "A lone billboard above a city highway after dark.",
    "durationSeconds": 15,
    "canonicalVideoUrl": "/media/uploads/night-billboard-1792268345989/night-billboard-1792268345989.mp4",
    "manifestVersion": 1,
    "promptVersion": 1,
    "status": "draft",
    "createdAt": "2026-10-17T20:19:06.137Z",
    "updatedAt": "2026-10-17T20:19:06.137Z"
  },
  {
    "id": "times-square-in-the-rain-1792268342537",
    "title": "Times Square in the Rain",
    "description": "Neon, taxis and umbrellas on a wet night in Manhattan.",
    "durationSeconds": 19,
    "canonicalVideoUrl": "/media/uploads/times-square-in-the-rain-1792268342537/times-square-in-the-rain-1792268342537.mp4",
    "manifestVersion": 1,
    "promptVersion": 1,
    "status": "draft",
    "createdAt": "2026-10-17T20:19:02.705Z",
    "updatedAt": "2026-10-17T20:19:02.705Z"
  },
  {
    "id": "midtown-daylight-1792268338920",
    "title": "Midtown Daylight",
    "description": "A busy Times Square afternoon framed by giant screens.",
    "durationSeconds": 30,
    "canonicalVideoUrl": "/media/uploads/midtown-daylight-1792268338920/midtown-daylight-1792268338920.mp4",
    "manifestVersion": 1,
    "promptVersion": 1,
    "status": "draft",
    "createdAt": "2026-10-17T20:18:59.057Z",
    "updatedAt": "2026-10-17T20:18:59.057Z"
  }
];

export const seedSlots: AdaptiveSlot[] = [
  {
    "id": "slot-scout-1792268606678",
    "movieId": "midtown-daylight-1792268338920",
    "label": "Taxi rear panel",
    "type": "ADSPOT_BILLBOARD",
    "startSeconds": 3,
    "endSeconds": 7,
    "generationLeadSeconds": 30,
    "generationDeadlineSeconds": 5,
    "narrativePurpose": "Rear window and trunk area of the yellow taxi driving directly ahead in the center lane",
    "editableFields": [
      "taxi roof ad sign",
      "rear bumper sticker or logo"
    ],
    "immutableFacts": [
      "Yellow NYC taxi color",
      "License plate location",
      "Surrounding street motion"
    ],
    "prohibitedChanges": [],
    "visualConstraints": {
      "preserveDuration": true,
      "preserveCameraMotion": true,
      "preserveLighting": true,
      "preserveCharacters": true,
      "preserveForegroundObjects": true,
      "maxProminence": 0.3
    },
    "adPolicy": {
      "blockedCategories": [],
      "maxProminence": 0.3,
      "requireApproval": false
    },
    "supportedLocales": [],
    "canonicalFallbackUrl": "/media/fallbacks/slot-scout-1792268606678-generic.mp4",
    "generationStrategy": "VIDEO_EDIT",
    "isEnabled": true
  },
  {
    "id": "slot-scout-1792268600268",
    "movieId": "midtown-daylight-1792268338920",
    "label": "Midtown billboard",
    "type": "ADSPOT_BILLBOARD",
    "startSeconds": 7.5,
    "endSeconds": 10.5,
    "generationLeadSeconds": 30,
    "generationDeadlineSeconds": 5,
    "narrativePurpose": "Large illuminated billboard high on the building facade on the left side of the street",
    "editableFields": [
      "billboard ad content",
      "text and graphics"
    ],
    "immutableFacts": [
      "Building architecture structure",
      "Illumination frame boundaries"
    ],
    "prohibitedChanges": [],
    "visualConstraints": {
      "preserveDuration": true,
      "preserveCameraMotion": true,
      "preserveLighting": true,
      "preserveCharacters": true,
      "preserveForegroundObjects": true,
      "maxProminence": 0.35
    },
    "adPolicy": {
      "blockedCategories": [],
      "maxProminence": 0.35,
      "requireApproval": false
    },
    "supportedLocales": [],
    "canonicalFallbackUrl": "/media/fallbacks/slot-scout-1792268600268-generic.mp4",
    "generationStrategy": "VIDEO_EDIT",
    "isEnabled": true
  },
  {
    "id": "slot-scout-1792268593904",
    "movieId": "times-square-in-the-rain-1792268342537",
    "label": "Times Square screen",
    "type": "ADSPOT_BILLBOARD",
    "startSeconds": 4,
    "endSeconds": 9,
    "generationLeadSeconds": 30,
    "generationDeadlineSeconds": 5,
    "narrativePurpose": "Large digital billboard screen on the upper right building facade in Times Square",
    "editableFields": [
      "billboard display content",
      "video advertisement"
    ],
    "immutableFacts": [
      "building structure",
      "surrounding neon lights",
      "rainy street scene below"
    ],
    "prohibitedChanges": [],
    "visualConstraints": {
      "preserveDuration": true,
      "preserveCameraMotion": true,
      "preserveLighting": true,
      "preserveCharacters": true,
      "preserveForegroundObjects": true,
      "maxProminence": 0.35
    },
    "adPolicy": {
      "blockedCategories": [],
      "maxProminence": 0.35,
      "requireApproval": false
    },
    "supportedLocales": [],
    "canonicalFallbackUrl": "/media/fallbacks/slot-scout-1792268593904-generic.mp4",
    "generationStrategy": "VIDEO_EDIT",
    "isEnabled": true
  },
  {
    "id": "slot-scout-1792268587530",
    "movieId": "night-billboard-1792268345989",
    "label": "Highway billboard",
    "type": "ADSPOT_BILLBOARD",
    "startSeconds": 3,
    "endSeconds": 8,
    "generationLeadSeconds": 30,
    "generationDeadlineSeconds": 5,
    "narrativePurpose": "Large blank illuminated billboard beside a highway overpass at night",
    "editableFields": [
      "billboard content",
      "billboard display"
    ],
    "immutableFacts": [
      "billboard metal frame structure",
      "overhead floodlights illuminating the frame",
      "nighttime city highway environment"
    ],
    "prohibitedChanges": [],
    "visualConstraints": {
      "preserveDuration": true,
      "preserveCameraMotion": true,
      "preserveLighting": true,
      "preserveCharacters": true,
      "preserveForegroundObjects": true,
      "maxProminence": 0.45
    },
    "adPolicy": {
      "blockedCategories": [],
      "maxProminence": 0.45,
      "requireApproval": false
    },
    "supportedLocales": [],
    "canonicalFallbackUrl": "/media/fallbacks/slot-scout-1792268587530-generic.mp4",
    "generationStrategy": "VIDEO_EDIT",
    "isEnabled": true
  }
];
