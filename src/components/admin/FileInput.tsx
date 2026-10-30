"use client";

import { useRef, useState } from "react";
import Image from "next/image";

// A styled stand-in for the raw browser file input: a button-like label, the
// chosen file's name, and (for images) a preview of what will be uploaded.
export function FileInput({
  name,
  accept,
  label,
  preview = true,
}: {
  name: string;
  accept: string;
  label: string;
  preview?: boolean;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    const file = event.target.files?.[0];
    setFileName(file?.name ?? null);
    if (file && preview && file.type.startsWith("image/")) {
      urlRef.current = URL.createObjectURL(file);
    }
    setPreviewUrl(urlRef.current);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {previewUrl && (
        <div className="relative size-24 overflow-hidden rounded-sm border border-border-strong">
          <Image src={previewUrl} alt="" fill unoptimized className="object-cover" />
        </div>
      )}
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xs border border-border-ghost bg-surface-muted px-4 text-small font-semibold text-muted-4 hover:bg-surface-hover has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-terracotta">
        <input
          type="file"
          name={name}
          accept={accept}
          onChange={handleChange}
          className="sr-only"
        />
        {label}
      </label>
      {fileName && <span className="text-caption text-muted">{fileName}</span>}
    </div>
  );
}
