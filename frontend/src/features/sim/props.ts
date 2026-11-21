// 사고 재현 장면의 소품: 슬래브·기둥·안전난간·개구부 덮개·낙하물 방지망·출입 통제선·동바리·충격 표시
import * as THREE from "three";

export const COLOR = { slab: 0x94a3b8, slabTop: 0xcbd5e1, column: 0x64748b, safety: 0xfacc15, danger: 0xdc2626, net: 0x16a34a, wood: 0xb45309 };

export const mat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });

export function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, opts?: THREE.MeshStandardMaterialParameters) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z);
  return m;
}

export function bar(len: number, r: number, color: number) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat(color));
}

/** 슬래브(윗면 높이 top, x: x0~x1, z: -d/2~d/2) + 아래 기둥 */
export function slab(x0: number, x1: number, d: number, top: number, columns = true): THREE.Group {
  const g = new THREE.Group();
  g.add(box(x1 - x0, 0.25, d, COLOR.slabTop, (x0 + x1) / 2, top - 0.125, 0));
  if (columns) {
    for (const x of [x0 + 0.3, x1 - 0.3]) for (const z of [-d / 2 + 0.3, d / 2 - 0.3]) {
      g.add(box(0.35, top - 0.25, 0.35, COLOR.column, x, (top - 0.25) / 2, z));
    }
  }
  return g;
}

/** 슬래브 끝(x 위치)을 따라 세운 안전난간: 기둥 + 상부·중간 난간대 (노랑) */
export function guardrail(x: number, d: number, top: number): THREE.Group {
  const g = new THREE.Group();
  for (let z = -d / 2 + 0.2; z <= d / 2 - 0.19; z += (d - 0.4) / 3) {
    const p = bar(1.1, 0.04, COLOR.safety); p.position.set(x, top + 0.55, z); g.add(p);
  }
  for (const h of [1.05, 0.55]) {
    const r = bar(d - 0.4, 0.035, COLOR.safety); r.rotation.x = Math.PI / 2; r.position.set(x, top + h, 0); g.add(r);
  }
  return g;
}

/** 출입 통제선: 줄무늬 기둥 + 빨간 줄 (바닥, x 위치를 따라) */
export function barricade(x: number, d: number): THREE.Group {
  const g = new THREE.Group();
  for (const z of [-d / 2 + 0.3, 0, d / 2 - 0.3]) {
    const p = bar(0.9, 0.05, COLOR.danger); p.position.set(x, 0.45, z); g.add(p);
  }
  const t = box(0.03, 0.08, d - 0.6, COLOR.danger, x, 0.85, 0); g.add(t);
  return g;
}

/** 낙하물 방지망: 슬래브 끝에서 바깥으로 비스듬히 뻗은 초록 그물 */
export function net(x: number, d: number, y: number, out = 1.6): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(out, d - 0.4, 6, 10);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: COLOR.net, wireframe: true }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.y = 0.2;
  m.position.set(x + out / 2, y, 0);
  return m;
}

/** 부딪친 곳에 퍼지는 빨간 고리 */
export function impactRing(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 32),
    new THREE.MeshBasicMaterial({ color: COLOR.danger, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.visible = false;
  return m;
}

/** 충격 고리 애니메이션: s 초 지났을 때 커지며 사라진다 */
export function animateRing(ring: THREE.Mesh, s: number) {
  ring.visible = s >= 0 && s < 1.2;
  if (!ring.visible) return;
  const k = 1 + s * 3;
  ring.scale.set(k, k, k);
  (ring.material as THREE.MeshBasicMaterial).opacity = 1 - s / 1.2;
}
