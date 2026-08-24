"use client";

import Image from "next/image";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteMediaAction } from "@/lib/actions/media";
import type { Media } from "@/db/types";

const categoryLabels: Record<string, string> = {
  device_photo: "Device Photo",
  before_repair: "Before Repair",
  after_repair: "After Repair",
  id_proof: "ID Proof",
  invoice: "Invoice / Receipt",
  other: "Other",
};

export function MediaGallery({ items, jobId }: { items: Media[]; jobId: number }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No files uploaded yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => {
        const isImage = item.fileType?.startsWith("image/");
        return (
          <div key={item.id} className="group relative overflow-hidden rounded-lg border bg-muted/30">
            <a
              href={`/api/files/${item.filePath}`}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square"
            >
              {isImage ? (
                <Image
                  src={`/api/files/${item.filePath}`}
                  alt={item.caption || item.fileName}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileText className="h-8 w-8" />
                  <span className="px-2 text-center text-xs">{item.fileName}</span>
                </div>
              )}
            </a>
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {categoryLabels[item.category] || item.category}
              </Badge>
              <form action={deleteMediaAction.bind(null, item.id, jobId)}>
                <Button
                  type="submit"
                  size="icon"
                  variant="destructive"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </form>
            </div>
            {item.caption && (
              <p className="truncate border-t bg-background px-2 py-1 text-xs text-muted-foreground">
                {item.caption}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
