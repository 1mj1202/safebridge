// 사고 4종의 재현 장면. measure=false 는 사고 장면, true 는 같은 상황에 대책이 있을 때 장면
// 각 장면은 소품·사람 모형을 담은 그룹, 카메라 위치, update(t: 장면 시작 후 초)를 돌려준다
import * as THREE from "three";
import { makeFigure, pose, type Figure } from "./figure";
import { ease, fallTime, fallY, lerp, walk } from "./motion";
import { COLOR, animateRing, bar, barricade, box, guardrail, impactRing, net, slab } from "./props";

export type SimKind = "fall_edge" | "fall_opening" | "falling_object" | "collapse";

export interface Built {
  group: THREE.Group;
  camera: { pos: [number, number, number]; target: [number, number, number] };
  update: (t: number) => void;
}

/** 서 있기 */
function stand(f: Figure, x: number, y: number, swing = 0) {
  f.root.position.set(x, y, 0);
  f.body.rotation.z = 0;
  f.body.position.y = 0;
  pose(f, swing);
}

/** 쓰러져 누운 자세(머리가 +x 쪽) */
function lie(f: Figure, x: number, y: number) {
  f.root.position.set(x, y, 0);
  f.body.rotation.z = -Math.PI / 2;
  f.body.position.y = 0.17;
  pose(f, 0.3, 0.8);
}

/** 떨어지는 자세: 앞으로 기울며 팔을 든다 (k 0→1) */
function tumble(f: Figure, x: number, y: number, k: number) {
  f.root.position.set(x, y, 0);
  f.body.rotation.z = -lerp(0.4, Math.PI / 2, k);
  f.body.position.y = 0.17 * k;
  pose(f, 0.4, 1.6 * (1 - k) + 0.8 * k);
}

function fallEdge(measure: boolean): Built {
  const g = new THREE.Group();
  const top = 3, edge = 2, d = 4;
  g.add(slab(-3.5, edge, d, top));
  const f = makeFigure(); g.add(f.root);
  const ring = impactRing(); g.add(ring);
  if (measure) g.add(guardrail(edge - 0.12, d, top));
  const landAt = 2.9 + fallTime(top);
  ring.position.set(edge + 0.9, 0.02, 0);
  return {
    group: g, camera: { pos: [7.5, 4.2, 8.5], target: [0.8, 0.9, 0] },
    update: (t) => {
      if (measure) {
        const w = walk(-2, edge - 0.45, t, 0.3, 2.4);
        stand(f, w.x, top, w.swing);
        if (t > 2.4) { f.body.rotation.z = Math.sin(Math.min(t - 2.4, 0.5) * 6) * 0.08; pose(f, 0, 0.9); }
        return;
      }
      if (t < 2.4) { const w = walk(-2, edge - 0.15, t, 0.3, 2.4); stand(f, w.x, top, w.swing); }
      else if (t < 2.9) { const k = (t - 2.4) / 0.5; f.root.position.set(lerp(edge - 0.15, edge + 0.15, k), top, 0); f.body.rotation.z = -0.5 * k; pose(f, 0.3, 1.4 * k); }
      else if (t < landAt) { const s = t - 2.9; tumble(f, edge + 0.15 + s * 0.9, fallY(top, s), s / fallTime(top)); }
      else lie(f, edge + 0.9, 0);
      animateRing(ring, t - landAt);
    },
  };
}

function fallOpening(measure: boolean): Built {
  const g = new THREE.Group();
  const top = 3, d = 4, h0 = 0.2, h1 = 1.4, hw = 0.6; // 개구부 x h0~h1, z -hw~hw
  // 개구부를 뺀 슬래브 4조각 + 기둥
  g.add(slab(-3.5, 3, d, top, true));
  g.children[0].children[0].visible = false; // 통 슬래브 윗판 숨김
  const t0 = top - 0.125;
  g.add(box(h0 + 3.5, 0.25, d, COLOR.slabTop, (h0 - 3.5) / 2, t0, 0));
  g.add(box(3 - h1, 0.25, d, COLOR.slabTop, (h1 + 3) / 2, t0, 0));
  g.add(box(h1 - h0, 0.25, d / 2 - hw, COLOR.slabTop, (h0 + h1) / 2, t0, (d / 2 + hw) / 2));
  g.add(box(h1 - h0, 0.25, d / 2 - hw, COLOR.slabTop, (h0 + h1) / 2, t0, -(d / 2 + hw) / 2));
  g.add(box(h1 - h0, 0.02, hw * 2, 0x1e293b, (h0 + h1) / 2, top - 0.24, 0)); // 구멍 아래 그림자
  if (measure) {
    g.add(box(h1 - h0 + 0.3, 0.06, hw * 2 + 0.3, COLOR.safety, (h0 + h1) / 2, top + 0.03, 0));
    g.add(box(0.12, 0.065, hw * 2 + 0.3, 0x111827, (h0 + h1) / 2 - 0.3, top + 0.035, 0));
    g.add(box(0.12, 0.065, hw * 2 + 0.3, 0x111827, (h0 + h1) / 2 + 0.3, top + 0.035, 0));
  }
  const f = makeFigure(); g.add(f.root);
  const ring = impactRing(); ring.position.set(0.85, 0.02, 0); g.add(ring);
  const holeAt = 0.3 + ((0.45 + 2.5) / 3.3) * 2.2; // 걷다가 구멍 위에 닿는 시각
  const landAt = holeAt + fallTime(top);
  return {
    group: g, camera: { pos: [6.5, 6.2, 8], target: [0.4, 0.8, 0] },
    update: (t) => {
      if (measure) { const w = walk(-2.5, 2.4, t, 0.3, 3.6); stand(f, w.x, top + 0.06, w.swing); return; }
      if (t < holeAt) { const w = walk(-2.5, 0.8, t, 0.3, 2.5); stand(f, w.x, top, w.swing); }
      else if (t < landAt) {
        const s = t - holeAt;
        f.root.position.set(lerp(0.45, 0.8, s / 0.4), fallY(top, s), 0);
        f.body.rotation.z = 0; pose(f, 0, 2.6);
      } else lie(f, 0.85, 0);
      animateRing(ring, t - landAt);
    },
  };
}

function fallingObject(measure: boolean): Built {
  const g = new THREE.Group();
  const top = 6, edge = 1, d = 4;
  g.add(slab(-3.5, edge, d, 3));
  g.add(slab(-3.5, edge, d, top, false));
  for (const x of [-3.2, edge - 0.3]) for (const z of [-d / 2 + 0.3, d / 2 - 0.3]) g.add(box(0.35, 2.75, 0.35, COLOR.column, x, 3 + 1.375, z));
  const load = box(0.9, 0.28, 0.5, COLOR.wood); g.add(load);
  const f = makeFigure(); g.add(f.root);
  const ring = impactRing(); g.add(ring);
  const px = measure ? 3.4 : 1.75;
  if (measure) { g.add(net(edge, d, top - 0.5)); g.add(barricade(2.7, d)); }
  const slideEnd = 1.8, catchY = measure ? top - 0.35 : 1.9;
  const hitAt = slideEnd + fallTime(top + 0.14, catchY);
  ring.position.set(1.95, 0.02, 0);
  return {
    group: g, camera: { pos: [9, 4.5, 10], target: [1.4, 2.2, 0] },
    update: (t) => {
      // 자재가 위층 끝으로 밀려 나와 떨어진다
      if (t < slideEnd) { load.position.set(lerp(-0.6, edge + 0.35, ease(t / slideEnd)), top + 0.14, 0); load.rotation.z = 0; }
      else if (t < hitAt) { const s = t - slideEnd; load.position.set(edge + 0.35 + s * 0.5, fallY(top + 0.14, s, catchY), 0); load.rotation.z = -s * 2.5; }
      else if (measure) { load.position.set(edge + 0.35 + (hitAt - slideEnd) * 0.5, catchY + 0.06, 0); load.rotation.z = -0.25; }
      else { const s = t - hitAt; load.position.set(1.75 + s * 0.8, fallY(1.9, s, 0.14), 0.3); load.rotation.z = -2 - s * 3; }
      if (measure || t < hitAt) { stand(f, px, 0, measure ? 0 : Math.sin(t * 3) * 0.15); f.root.rotation.y = Math.PI; }
      else { const k = Math.min(1, (t - hitAt) / 0.45); f.root.rotation.y = Math.PI; f.root.position.set(px, 0, 0); f.body.rotation.z = -lerp(0, Math.PI / 2, ease(k)); f.body.position.y = 0.17 * k; pose(f, 0.2, 1.2); }
      if (!measure) animateRing(ring, t - hitAt);
    },
  };
}

function collapse(measure: boolean): Built {
  const g = new THREE.Group();
  const L = 3, d = 3.2;
  const posts: THREE.Group[] = [];
  const shores = new THREE.Group(); g.add(shores);
  for (const x of [-1.6, 0, 1.6]) for (const z of [-1.1, 1.1]) {
    const p = new THREE.Group(); // 아래 끝이 회전축
    const m = bar(L, 0.05, 0x9ca3af); m.position.y = L / 2; p.add(m);
    p.position.set(x, 0, z); shores.add(p); posts.push(p);
  }
  if (measure) {
    // 가새(대각)·수평 연결재로 보강
    for (const z of [-1.1, 1.1]) for (const [x0, x1] of [[-1.6, 0], [0, 1.6]]) {
      const len = Math.hypot(x1 - x0, L * 0.8);
      const b = bar(len, 0.035, COLOR.safety); b.position.set((x0 + x1) / 2, L * 0.5, z);
      b.rotation.z = Math.atan2(x1 - x0, L * 0.8); shores.add(b);
      const hz = bar(3.2, 0.03, COLOR.safety); hz.rotation.z = Math.PI / 2; hz.position.set(0, L * 0.5, z); shores.add(hz);
    }
  }
  const form = new THREE.Group();
  form.add(box(4, 0.18, d, COLOR.wood, 0, 0.09, 0));
  form.add(box(4, 0.06, d, 0x9ca3af, 0, 0.21, 0)); // 콘크리트
  g.add(form);
  const f = makeFigure(); form.add(f.root); f.root.position.set(-0.3, 0.24, 0);
  const ring = impactRing(); ring.position.set(1.8, 0.02, 0); g.add(ring);
  const t0 = 1.6, t1 = 2.7;
  return {
    group: g, camera: { pos: [8.5, 5.4, 10.5], target: [0.8, 1.7, 0] },
    update: (t) => {
      let a = 0;
      if (measure) a = t > t0 && t < t1 ? Math.sin((t - t0) * 30) * 0.008 : 0;
      else if (t > t0) a = 1.2 * Math.min(1, ((t - t0) / (t1 - t0)) ** 2);
      posts.forEach((p, i) => { p.rotation.z = -a * (1 + (i % 3) * 0.05); });
      form.position.set(L * Math.sin(a), L * Math.cos(a), 0);
      form.rotation.z = -a * 0.25;
      if (measure || t < t0) { f.root.position.set(-0.3, 0.24, 0); f.body.rotation.z = 0; f.body.position.y = 0; pose(f, Math.sin(t * 2) * 0.1, 0.5); }
      else { const k = Math.min(1, (t - t0) / (t1 - t0 + 0.4)); f.root.position.set(lerp(-0.3, 0.6, k), 0.24, 0); f.body.rotation.z = -lerp(0, Math.PI / 2, ease(k)); f.body.position.y = 0.17 * k; pose(f, 0.3, 1.8 * (1 - k) + 0.8); }
      if (!measure) animateRing(ring, t - t1);
    },
  };
}

export const SCENARIOS: Record<SimKind, (measure: boolean) => Built> = {
  fall_edge: fallEdge,
  fall_opening: fallOpening,
  falling_object: fallingObject,
  collapse,
};
