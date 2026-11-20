// 3D(WebGL)를 그릴 수 있는 폰인지 — 못 그리면 평면도만 보여 준다
export function canWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
