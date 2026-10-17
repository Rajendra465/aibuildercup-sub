"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import { HERO_SLIDES, SLIDE_MS } from "./hero-slides";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => <StaticFrame index={0} />,
});

function StaticFrame({ index }: { index: number }) {
  return (
    <div className="relative mx-auto aspect-[1.75] w-[78%] overflow-hidden rounded-2xl border border-white/10">
      <Image src={HERO_SLIDES[index].src} alt="" fill sizes="60vw" className="object-cover" priority />
    </div>
  );
}

const noopSubscribe = () => () => {};

let webglCache: boolean | undefined;

function hasWebGL(): boolean {
  if (webglCache !== undefined) return webglCache;
  webglCache = detectWebGL();
  return webglCache;
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** 3D cinema screen cycling the same scene through each viewer cut. */
export function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => true);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[index];
  return (
    <div className="relative">
      <div className="relative h-[340px] w-full sm:h-[440px] lg:h-[520px]">
        {webgl ? <HeroScene index={index} /> : <div className="flex h-full items-center"><StaticFrame index={index} /></div>}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.viewer}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="glass-strong flex items-center gap-3 rounded-full px-5 py-2.5 text-sm"
          >
            <span className="size-2 rounded-full bg-amber shadow-[0_0_12px_#f2a541]" />
            <span className="font-semibold text-white">{slide.viewer}</span>
            <span className="text-muted-foreground">{slide.detail}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
        {HERO_SLIDES.map((s, i) => (
          <span key={s.src} className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? "w-8 bg-amber" : "w-3 bg-white/20"}`} />
        ))}
      </div>
    </div>
  );
}
