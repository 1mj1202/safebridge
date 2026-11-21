// 3D 사고 재현 재생기: 위험 순위대로 '(실제 건물에서 위험 구역 짚기) → 사고 장면 → 대책 장면'을 반복 재생한다 (소리 없음)
// 짚기 장면 동안은 사고 장면 첫 화면을 멈춰 두고(위에 실제 건물 3D 가 덮인다) 단계만 알린다
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { timeline, type Phase } from "./motion";
import { SCENARIOS, type Built, type SimKind } from "./scenarios";

interface Props {
  kinds: SimKind[];
  onStep: (index: number, phase: Phase) => void;
}

function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
}

export default function AccidentSim({ kinds, onStep }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const stepRef = useRef(onStep);
  stepRef.current = onStep;
  const key = kinds.join(",");

  useEffect(() => {
    const el = host.current!;
    const list = key.split(",").filter(Boolean) as SimKind[];
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(-6, 12, 8);
    scene.add(sun);
    const grid = new THREE.GridHelper(30, 30, 0xcbd5e1, 0xe2e8f0);
    scene.add(grid);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let cur: { slot: string; built: Built } | null = null;
    let lastPhase = "", lastIndex = -1;
    const start = performance.now();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const elapsed = (performance.now() - start) / 1000;
      const { index, phase, t } = timeline(elapsed, list.length);
      const slot = `${index}-${phase === "measure" ? "m" : "a"}`;
      if (!cur || cur.slot !== slot) {
        if (cur) { scene.remove(cur.built.group); disposeGroup(cur.built.group); }
        cur = { slot, built: SCENARIOS[list[index]](phase === "measure") };
        scene.add(cur.built.group);
      }
      if (phase !== lastPhase || index !== lastIndex) { lastPhase = phase; lastIndex = index; stepRef.current(index, phase); }
      const { pos, target } = cur.built.camera;
      const sway = Math.sin(elapsed * 0.4) * 0.12; // 천천히 좌우로 살짝 돈다
      const dx = pos[0] - target[0], dz = pos[2] - target[2];
      camera.position.set(target[0] + dx * Math.cos(sway) - dz * Math.sin(sway), pos[1], target[2] + dx * Math.sin(sway) + dz * Math.cos(sway));
      camera.lookAt(...target);
      cur.built.update(phase === "intro" ? 0 : t);
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (cur) disposeGroup(cur.built.group);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [key]);

  return <div ref={host} className="absolute inset-0" />;
}
