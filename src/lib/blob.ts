import "server-only";
import { put, putImage } from "@vercel/blob";

export type UploadedFile = { url: string; pathname: string };

/**
 * Uploads a file to private Vercel Blob storage and returns the app-relative
 * URL to store in people.avatar / media.url — resolved by
 * src/app/api/media/[...pathname]/route.ts, which is the only thing that
 * can actually read a private blob back.
 *
 * Images are resized/re-encoded through Vercel's own image optimization on
 * the way in, capped at `maxWidth`, so a multi-megabyte phone photo isn't
 * stored (and re-served, every time) at full resolution when the layout
 * only ever shows it small. This can't be done with Next's own `<Image>`
 * optimizer instead: that fetches the source server-side without
 * forwarding the browser's cookies, and this route requires a session
 * cookie, so the optimizer's own request would get a 401 — resizing at
 * upload time sidesteps that entirely. Non-image files (e.g. a PDF
 * uploaded as a "document") are stored as-is. `putImage` requires OIDC
 * auth, which isn't guaranteed locally (only on Vercel, or after
 * `vercel env pull`) — fall back to a plain upload rather than failing
 * outright if it's unavailable.
 */
export async function uploadPrivateFile(
  prefix: string,
  file: File,
  { maxWidth = 1600 }: { maxWidth?: number } = {},
): Promise<UploadedFile> {
  if (file.type.startsWith("image/")) {
    try {
      const blob = await putImage(`${prefix}/${file.name}`, file, {
        access: "private",
        addRandomSuffix: true,
        optimizeImage: { width: maxWidth, quality: 80, format: "webp" },
      });
      return { url: `/api/media/${blob.pathname}`, pathname: blob.pathname };
    } catch {
      // Fall through to a plain upload below.
    }
  }

  const blob = await put(`${prefix}/${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });
  return { url: `/api/media/${blob.pathname}`, pathname: blob.pathname };
}

/**
 * Uploads an avatar photo as two separate resized blobs -- a small one for
 * the tree view / relative cards (displayed at ~40px, so this covers up to
 * ~2x pixel density with room to spare) and a larger one for the person
 * detail page's hero avatar (displayed at 120px, same headroom). Serving
 * the small variant everywhere the photo only ever renders tiny would waste
 * bandwidth on a family tree with dozens of cards on screen at once; serving
 * the large variant everywhere would make the tree noticeably heavier to
 * load for no visible benefit.
 */
export async function uploadAvatarImage(
  prefix: string,
  file: File,
): Promise<{ small: UploadedFile; large: UploadedFile }> {
  const [small, large] = await Promise.all([
    uploadPrivateFile(`${prefix}/small`, file, { maxWidth: 160 }),
    uploadPrivateFile(`${prefix}/large`, file, { maxWidth: 480 }),
  ]);
  return { small, large };
}
