export interface HeroSlide {
  src: string;
  viewer: string;
  detail: string;
}

/** Real Gemini edits of one original scene: only the billboard changes per viewer. */
export const HERO_SLIDES: readonly HeroSlide[] = [
  { src: "/hero/hero-base.png", viewer: "Original film", detail: "Empty billboard" },
  { src: "/hero/hero-skyhop.png", viewer: "Camille · Paris", detail: "SkyHop Airlines · French" },
  { src: "/hero/hero-sakura.png", viewer: "Aiko · Tokyo", detail: "Sakura Cold Brew · Japanese" },
  { src: "/hero/hero-monsoon.png", viewer: "Srikant · India", detail: "Monsoon Brew · Diwali" },
  { src: "/hero/hero-psa.png", viewer: "Léo · Kids profile", detail: "Library PSA only" },
];

export const SLIDE_MS = 2600;
