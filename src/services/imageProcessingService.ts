import { sha256Hex } from './urlCanonicalService';

export async function imageFileToSquareWebp(params: {
  file: File;
  size: number;
  quality: number; // 0..1
}): Promise<{ blob: Blob; dataUrl: string; hash: string; contentType: string } | null> {
  const { file, size, quality } = params;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Cover crop
    const s = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - s) / 2;
    const sy = (bitmap.height - s) / 2;
    ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, size, size);

    const webpBlob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', quality)
    );

    const blob = webpBlob || (await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png')));
    const contentType = blob.type || 'image/webp';

    const buf = await blob.arrayBuffer();
    const hash = await sha256Hex(buf);

    const dataUrl: string = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return { blob, dataUrl, hash, contentType };
  } catch {
    return null;
  }
}



