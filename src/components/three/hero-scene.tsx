"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, useTexture } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { HERO_SLIDES } from "./hero-slides";

const SCREEN_W = 6.2;
const SCREEN_H = SCREEN_W / 1.75;
// Region of the frame that holds the billboard (UV space), shown enlarged in the lens.
const LENS_REPEAT: [number, number] = [0.13, 0.2];
const LENS_OFFSET: [number, number] = [0.43, 0.78];

/** Two stacked planes; the front one fades in whenever index changes. */
function Crossfade({ textures, index, width, height }: { textures: THREE.Texture[]; index: number; width: number; height: number }) {
  const back = useRef<THREE.MeshBasicMaterial>(null);
  const front = useRef<THREE.MeshBasicMaterial>(null);
  const state = useRef({ from: index, to: index, t: 1 });

  useFrame((_, delta) => {
    const s = state.current;
    if (s.to !== index) {
      s.from = s.to;
      s.to = index;
      s.t = 0;
    }
    s.t = Math.min(1, s.t + delta * 2.4);
    if (back.current && front.current) {
      back.current.map = textures[s.from];
      front.current.map = textures[s.to];
      front.current.opacity = s.t;
      back.current.needsUpdate = true;
      front.current.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={back} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={front} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

function Rig({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const textures = useTexture(HERO_SLIDES.map((slide) => slide.src));
  const lensTextures = useMemo(() => {
    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
    });
    return textures.map((texture) => {
      const crop = texture.clone();
      crop.repeat.set(...LENS_REPEAT);
      crop.offset.set(...LENS_OFFSET);
      crop.needsUpdate = true;
      return crop;
    });
  }, [textures]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const targetY = state.pointer.x * 0.22 - 0.12;
    const targetX = -state.pointer.y * 0.12 + 0.04;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetY, 3, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 3, delta);
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0, -0.35]}>
        <planeGeometry args={[SCREEN_W * 1.25, SCREEN_H * 1.35]} />
        <meshBasicMaterial color="#f2a541" transparent opacity={0.07} />
      </mesh>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[SCREEN_W + 0.16, SCREEN_H + 0.16]} />
        <meshBasicMaterial color="#141832" />
      </mesh>
      <Crossfade textures={textures} index={index} width={SCREEN_W} height={SCREEN_H} />
      <group position={[3.55, 1.05, 0.9]} rotation={[0, -0.32, 0]}>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[1.86, 1.66]} />
          <meshBasicMaterial color="#f2a541" />
        </mesh>
        <Crossfade textures={lensTextures} index={index} width={1.76} height={1.56} />
      </group>
      <mesh position={[1.25, 1.35, 0.45]} rotation={[0, 0, 0.18]}>
        <planeGeometry args={[4.4, 0.012]} />
        <meshBasicMaterial color="#f2a541" transparent opacity={0.6} />
      </mesh>
      <Sparkles count={70} scale={[11, 6, 4]} size={2.2} speed={0.35} color="#ffd59a" opacity={0.6} />
    </group>
  );
}

export default function HeroScene({ index }: { index: number }) {
  return (
    <Canvas camera={{ position: [0, 0, 8.2], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <Rig index={index} />
    </Canvas>
  );
}
