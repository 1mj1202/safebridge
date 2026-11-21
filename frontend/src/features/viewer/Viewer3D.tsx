// BIM 3D 뷰어 — 공정 상태별 부재 색 + 추락(빨강)·낙하(주황) 위험 영역 + 구역별 근로자 인원 배지. 영역 클릭 → onZoneClick
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { BimModel, Vec3, Zone } from "../../shared/types";
import { FOCUS_COLOR, PEOPLE_COLOR, ZONE_COLOR, focusCamera, ifcToThree, markerPosition, statusStyle, zoneBox, type Status } from "./scene";

export interface PeopleMarker { key: string; box: { min: Vec3; max: Vec3 }; text: string; warn: boolean }

interface Props {
  model: BimModel;
  status: Record<string, Status>;
  zones: Zone[];
  selected: string[];
  onZoneClick?: (zone: Zone) => void;
  /** 근로자 화면: 내 구역 상자(IFC 좌표)를 파랗게 강조하고 카메라를 그쪽으로 */
  focus?: { min: Vec3; max: Vec3 } | null;
  /** 예방 영상(BIM 재현): 천천히 돌면서 위험 영역이 깜빡인다 */
  replay?: boolean;
  /** 관리자 화면: 구역마다 지금 있는 근로자 수 (교육 미확인이 있으면 주황) */
  markers?: PeopleMarker[];
  /** 관리자 층 버튼: 이 층까지만 보이고 윗층 부재는 숨긴다 (null 이면 전체) */
  upTo?: string | null;
  /** 카메라만 이 상자(IFC 좌표) 쪽으로 (예방 영상에서 위험 구역 짚기) */
  aim?: { min: Vec3; max: Vec3 } | null;
}

interface Ctx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  meshes: Map<string, THREE.Mesh>;
  zoneGroup: THREE.Group;
  focusGroup: THREE.Group;
  markerGroup: THREE.Group;
}

function disposeAll(g: THREE.Group) {
  for (const o of [...g.children]) {
    g.remove(o);
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Sprite) {
      o.geometry.dispose();
      const m = o.material as THREE.Material & { map?: THREE.Texture | null };
      m.map?.dispose();
      m.dispose();
    }
  }
}

/** 글자 배지 스프라이트 (캔버스 → 텍스처, 화면 크기 고정) */
function badge(text: string, warn: boolean): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 96;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = warn ? "#d97706" : `#${PEOPLE_COLOR.toString(16).padStart(6, "0")}`;
    g.beginPath(); g.roundRect(4, 4, 248, 88, 44); g.fill();
    g.fillStyle = "#fff"; g.font = "bold 52px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, 128, 50);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, sizeAttenuation: false }));
  s.scale.set(0.09, 0.034, 1);
  s.renderOrder = 5;
  return s;
}

export default function Viewer3D({ model, status, zones, selected, onZoneClick, focus, replay = false, markers, upTo = null, aim = null }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const clickRef = useRef(onZoneClick);
  clickRef.current = onZoneClick;
  const replayRef = useRef(replay);
  replayRef.current = replay;

  // 장면·모델 (모델이 바뀔 때만)
  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // 캔버스는 부모를 꽉 채우되 부모 폭을 밀어내지 않게(창을 줄여도 가로 넘침 없이 ResizeObserver 가 따라감)
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(-22, 30, 38);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(15, 6, -9);
    controls.update();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-30, 50, 20);
    scene.add(sun);
    const grid = new THREE.GridHelper(80, 40, 0xcbd5e1, 0xe2e8f0);
    grid.position.set(15, -0.01, -9);
    scene.add(grid);

    const meshes = new Map<string, THREE.Mesh>();
    for (const e of model.elements) {
      const g = new THREE.BufferGeometry();
      const v = new Float32Array(e.vertices.length);
      for (let i = 0; i < e.vertices.length; i += 3) {
        const [x, y, z] = ifcToThree([e.vertices[i], e.vertices[i + 1], e.vertices[i + 2]]);
        v[i] = x; v[i + 1] = y; v[i + 2] = z;
      }
      g.setAttribute("position", new THREE.BufferAttribute(v, 3));
      g.setIndex(e.faces);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.8 }));
      m.userData.tag = e.tag;
      m.userData.storey = e.storey;
      scene.add(m);
      meshes.set(e.tag, m);
    }
    const zoneGroup = new THREE.Group();
    scene.add(zoneGroup);
    const focusGroup = new THREE.Group();
    scene.add(focusGroup);
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    ctx.current = { renderer, scene, camera, controls, meshes, zoneGroup, focusGroup, markerGroup };

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

    const ray = new THREE.Raycaster();
    const onClick = (ev: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      const p = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(p, camera);
      const hit = ray.intersectObjects(zoneGroup.children, false)[0];
      if (hit?.object.userData.zone) clickRef.current?.(hit.object.userData.zone as Zone);
    };
    renderer.domElement.addEventListener("click", onClick);

    let raf = 0;
    const loop = (t = 0) => {
      raf = requestAnimationFrame(loop);
      controls.autoRotate = replayRef.current;
      controls.autoRotateSpeed = 1.5;
      if (replayRef.current) {
        const k = 0.35 + 0.35 * (1 + Math.sin(t / 350)) / 2; // 위험 영역 깜빡임
        for (const o of zoneGroup.children) if (o instanceof THREE.Mesh) (o.material as THREE.MeshBasicMaterial).opacity = k;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      disposeAll(markerGroup);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
      ctx.current = null;
    };
  }, [model]);

  // 공정 상태 색 + 층 버튼(윗층 숨김)
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    const elev = new Map(model.storeys.map((s) => [s.name, s.elevation]));
    const top = upTo ? elev.get(upTo) ?? Infinity : Infinity;
    for (const [tag, m] of c.meshes) {
      m.visible = (elev.get(m.userData.storey as string) ?? 0) <= top;
      const s = statusStyle(status[tag]);
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.color.setHex(s.color);
      mat.opacity = s.opacity;
      mat.depthWrite = s.opacity > 0.5;
    }
  }, [status, model, upTo]);

  // 위험 영역
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    for (const o of [...c.zoneGroup.children]) {
      c.zoneGroup.remove(o);
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    }
    const sel = new Set(selected);
    for (const z of zones) {
      const { center, size } = zoneBox(z);
      const geo = new THREE.BoxGeometry(size[0], size[2], size[1]); // three: x, y(높이), z
      const on = sel.size === 0 || sel.has(z.id);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: ZONE_COLOR[z.kind], transparent: true, opacity: on ? (sel.has(z.id) ? 0.7 : 0.45) : 0.08,
        depthWrite: false,
      }));
      const p = ifcToThree(center);
      mesh.position.set(p[0], p[1], p[2]);
      mesh.userData.zone = z;
      mesh.renderOrder = 2;
      c.zoneGroup.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: ZONE_COLOR[z.kind], transparent: true, opacity: on ? 1 : 0.2 }));
      edges.position.copy(mesh.position);
      c.zoneGroup.add(edges);
    }
  }, [zones, selected, model]);

  // 내 구역 강조
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    for (const o of [...c.focusGroup.children]) {
      c.focusGroup.remove(o);
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    }
    if (!focus) return;
    const { center, size } = zoneBox(focus);
    const geo = new THREE.BoxGeometry(size[0], size[2], size[1]);
    const box = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: FOCUS_COLOR, transparent: true, opacity: 0.3, depthWrite: false }));
    const p = ifcToThree(center);
    box.position.set(p[0], p[1], p[2]);
    box.renderOrder = 1;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: FOCUS_COLOR }));
    edges.position.copy(box.position);
    c.focusGroup.add(box, edges);
    const cam = focusCamera(focus);
    c.controls.target.set(...cam.target);
    c.camera.position.set(...cam.position);
    c.controls.update();
  }, [focus, model]);

  // 위험 구역 짚기: 상자를 돌아보도록 카메라만 옮긴다
  useEffect(() => {
    const c = ctx.current;
    if (!c || !aim) return;
    const cam = focusCamera(aim);
    c.controls.target.set(...cam.target);
    c.camera.position.set(...cam.position);
    c.controls.update();
  }, [aim, model]);

  // 근로자 인원 배지 + 구역 테두리(초록)
  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    disposeAll(c.markerGroup);
    for (const m of markers ?? []) {
      const s = badge(m.text, m.warn);
      s.position.set(...markerPosition(m.box));
      const { center, size } = zoneBox(m.box);
      const geo = new THREE.BoxGeometry(size[0], size[2], size[1]);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: PEOPLE_COLOR, transparent: true, opacity: 0.8 }));
      geo.dispose();
      edges.position.set(...ifcToThree(center));
      c.markerGroup.add(s, edges);
    }
  }, [markers, model]);

  return <div ref={host} className="relative h-full w-full min-w-0 overflow-hidden rounded-xl" data-testid="viewer3d" />;
}
