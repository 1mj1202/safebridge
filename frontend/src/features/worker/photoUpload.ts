// 사진 고르기 → 휴대폰에서 줄여 다시 저장(촬영정보 EXIF·위치 제거) → data URL. 얼굴 흐림은 서버에서 한 번 더.
const MAX = 1600;

export function pickPhoto(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

async function draw(file: File, max: number): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

/** → { upload: 서버로 보낼 사본, thumb: 대화에 보일 작은 사본 } */
export async function preparePhoto(file: File): Promise<{ upload: string; thumb: string }> {
  const big = await draw(file, MAX);
  const small = await draw(file, 320);
  return { upload: big.toDataURL("image/jpeg", 0.85), thumb: small.toDataURL("image/jpeg", 0.7) };
}
