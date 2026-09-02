"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  updateHeroSettingsAction,
  uploadHeroMediaAction,
  removeHeroMediaAction,
  type FormState,
} from "@/lib/actions/site";
import { getSiteMediaUrl } from "@/lib/site-media";
import type { SiteSettings } from "@/db/types";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Save Hero Text
    </Button>
  );
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      Upload
    </Button>
  );
}

export function HeroSettingsForm({ settings }: { settings: SiteSettings | undefined }) {
  const [textState, textFormAction] = useActionState<FormState, FormData>(
    updateHeroSettingsAction,
    {}
  );
  const [mediaState, mediaFormAction] = useActionState<FormState, FormData>(
    uploadHeroMediaAction,
    {}
  );
  const mediaFormRef = useRef<HTMLFormElement>(null);
  const [initialTextState] = useState(textState);
  const [initialMediaState] = useState(mediaState);

  useEffect(() => {
    if (textState !== initialTextState && textState.success) {
      toast.success("Hero text saved");
    }
  }, [textState, initialTextState]);

  useEffect(() => {
    if (mediaState !== initialMediaState && mediaState.success) {
      toast.success("Hero media updated");
      mediaFormRef.current?.reset();
    }
  }, [mediaState, initialMediaState]);

  const mediaUrl = getSiteMediaUrl(settings?.heroMediaPath);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Background Image / Video</Label>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
            {mediaUrl ? (
              settings?.heroMediaType === "video" ? (
                <video src={mediaUrl} className="h-full w-full object-cover" muted loop autoPlay playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="Hero background" className="h-full w-full object-cover" />
              )
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <form
                ref={mediaFormRef}
                action={mediaFormAction}
                className="flex flex-wrap items-center gap-2"
              >
                <Input
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                  className="max-w-xs"
                  required
                />
                <UploadButton />
              </form>
              {settings?.heroMediaPath && (
                <form action={removeHeroMediaAction}>
                  <Button type="submit" size="sm" variant="outline">
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </form>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG/PNG/WEBP up to 8MB, or MP4/WEBM up to 60MB. Shown behind the hero text on your
              public site.
            </p>
            {mediaState.error && <p className="text-xs text-destructive">{mediaState.error}</p>}
          </div>
        </div>
      </div>

      <form action={textFormAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="heroHeadline">Headline</Label>
          <Input
            id="heroHeadline"
            name="heroHeadline"
            defaultValue={settings?.heroHeadline ?? ""}
            placeholder="Expert Mobile Repairs You Can Trust"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroSubheading">Subheading</Label>
          <Textarea
            id="heroSubheading"
            name="heroSubheading"
            rows={2}
            defaultValue={settings?.heroSubheading ?? ""}
            placeholder="Fast, affordable, and reliable repairs for all major brands."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="heroCtaText">Button Text</Label>
            <Input
              id="heroCtaText"
              name="heroCtaText"
              defaultValue={settings?.heroCtaText ?? ""}
              placeholder="Book a Repair"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroCtaLink">Button Link</Label>
            <Input
              id="heroCtaLink"
              name="heroCtaLink"
              defaultValue={settings?.heroCtaLink ?? ""}
              placeholder="tel:+919876543210 or https://wa.me/..."
            />
          </div>
        </div>
        {textState.error && <p className="text-sm text-destructive">{textState.error}</p>}
        <SaveButton />
      </form>
    </div>
  );
}
