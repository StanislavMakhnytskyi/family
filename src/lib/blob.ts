import "server-only";
import { put } from "@vercel/blob";

export type UploadedFile = { url: string; pathname: string };

/**
 * Uploads a file to private Vercel Blob storage and returns the app-relative
 * URL to store in people.avatar / media.url — resolved by
 * src/app/api/media/[...pathname]/route.ts, which is the only thing that
 * can actually read a private blob back.
 */
export async function uploadPrivateFile(
  prefix: string,
  file: File,
): Promise<UploadedFile> {
  const blob = await put(`${prefix}/${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });
  return { url: `/api/media/${blob.pathname}`, pathname: blob.pathname };
}
