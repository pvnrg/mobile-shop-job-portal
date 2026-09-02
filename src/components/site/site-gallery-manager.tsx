"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  uploadGalleryItemAction,
  toggleGalleryItemActiveAction,
  deleteGalleryItemAction,
  type FormState,
} from "@/lib/actions/site";
import { getSiteMediaUrl } from "@/lib/site-media";
import type { SiteGalleryItem } from "@/db/types";

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      Upload
    </Button>
  );
}

function GalleryItemCard({ item }: { item: SiteGalleryItem }) {
  const [active, setActive] = useState(item.active === 1);
  const mediaUrl = getSiteMediaUrl(item.mediaPath);

  function handleActiveChange(checked: boolean) {
    setActive(checked);
    toggleGalleryItemActiveAction(item.id, checked);
  }

  return (
    <div className="space-y-2 rounded-lg border p-2">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded bg-muted/40">
        {item.mediaType === "video" ? (
          <video src={mediaUrl ?? undefined} className="h-full w-full object-cover" muted loop autoPlay playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl ?? undefined} alt={item.caption ?? ""} className="h-full w-full object-cover" />
        )}
      </div>
      {item.caption && <p className="truncate text-xs text-muted-foreground">{item.caption}</p>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Switch checked={active} onCheckedChange={handleActiveChange} aria-label="Active" />
          <span className="text-xs text-muted-foreground">{active ? "Visible" : "Hidden"}</span>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => deleteGalleryItemAction(item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SiteGalleryManager({ items }: { items: SiteGalleryItem[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(uploadGalleryItemAction, {});
  const [initialState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && state.success) {
      toast.success("Added to gallery");
      formRef.current?.reset();
    }
  }, [state, initialState]);

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Photo or Video</label>
          <Input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="max-w-56"
            required
          />
        </div>
        <div className="min-w-40 flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Caption (optional)</label>
          <Input name="caption" placeholder="e.g. iPhone 13 screen replacement" />
        </div>
        <UploadButton />
      </form>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No gallery items yet — upload your first photo or video above.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <GalleryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
