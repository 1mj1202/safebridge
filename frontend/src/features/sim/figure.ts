// 사람 모형: 안전모(노랑)·조끼(주황)·팔다리. 발바닥이 그룹 원점(y=0), 앞쪽이 +x
import * as THREE from "three";

export interface Figure {
  root: THREE.Group;
  /** 몸 전체 기울기용 피벗(발 위치) */
  body: THREE.Group;
  armL: THREE.Group; armR: THREE.Group; legL: THREE.Group; legR: THREE.Group;
}

const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

function limb(w: number, h: number, color: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group(); // 관절(위쪽 끝)이 원점
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(color));
  m.position.y = -h / 2;
  g.add(m);
  g.position.set(0, y, z);
  return g;
}

export function makeFigure(): Figure {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const legL = limb(0.16, 0.85, 0x334155, 0.85, 0.11);
  const legR = limb(0.16, 0.85, 0x334155, 0.85, -0.11);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.62, 0.44), mat(0xf97316));
  torso.position.y = 1.16;
  const armL = limb(0.12, 0.62, 0xf97316, 1.44, 0.29);
  const armR = limb(0.12, 0.62, 0xf97316, 1.44, -0.29);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), mat(0xf1c7a3));
  head.position.y = 1.62;
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xfacc15));
  hat.position.y = 1.66;
  body.add(legL, legR, torso, armL, armR, head, hat);
  return { root, body, armL, armR, legL, legR };
}

/** 걷기 자세: swing(-1~1) 만큼 팔다리를 앞뒤로 */
export function pose(f: Figure, swing: number, armsUp = 0) {
  f.legL.rotation.z = swing * 0.7;
  f.legR.rotation.z = -swing * 0.7;
  f.armL.rotation.z = -swing * 0.6 + armsUp;
  f.armR.rotation.z = swing * 0.6 + armsUp;
}
