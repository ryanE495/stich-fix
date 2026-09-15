import { PHOTO_COMPRESSION } from '../../config/mail-in-intake';
import type { PhotoSlotId } from './types';

/**
 * Browser-side photo compression, run at submit before photos go anywhere.
 *
 * Resizes so the longest edge is at most PHOTO_COMPRESSION.maxEdgePx and
 * re-encodes as JPEG at PHOTO_COMPRESSION.jpegQuality. Honors EXIF rotation so
 * phone photos don't come out sideways.
 *
 * Never throws and never blocks: if the browser can't decode the file (e.g.
 * HEIC outside Safari) or anything else goes wrong, the original file is
 * returned unchanged. It also keeps the original when re-encoding wouldn't
 * make it smaller (a JPEG that was already small).
 */
export async function compressPhoto(file: File): Promise<File> {
  try {
    const bitmap = await decode(file);
    try {
      const { width, height } = bitmap;
      if (!width || !height) return file;
      const scale = Math.min(1, PHOTO_COMPRESSION.maxEdgePx / Math.max(width, height));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.fillStyle = '#ffffff'; // JPEG has no transparency; avoid black backgrounds from PNGs
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_COMPRESSION.jpegQuality));
      if (!blob) return file;

      const alreadyFits = scale === 1 && /jpe?g/i.test(file.type);
      if (alreadyFits && blob.size >= file.size) return file;

      const name = `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;
      return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
    } finally {
      if ('close' in bitmap) bitmap.close();
    }
  } catch {
    return file;
  }
}

/** Compress every photo slot in parallel. Files are cached, so a retried submit doesn't redo the work. */
export async function compressPhotos(photos: Record<PhotoSlotId, File>): Promise<Record<PhotoSlotId, File>> {
  const entries = await Promise.all(
    (Object.entries(photos) as [PhotoSlotId, File][]).map(async ([slot, file]) => [slot, await compressCached(file)] as const),
  );
  return Object.fromEntries(entries) as Record<PhotoSlotId, File>;
}

const compressed = new WeakMap<File, Promise<File>>();
function compressCached(file: File): Promise<File> {
  let result = compressed.get(file);
  if (!result) {
    result = compressPhoto(file);
    compressed.set(file, result);
  }
  return result;
}

type Decoded = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to <img>, which some browsers decode more formats with.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode(); // <img> applies EXIF orientation by default in current browsers
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
