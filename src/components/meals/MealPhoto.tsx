"use client";

import { useEffect, useState } from "react";
import { getMealPhotoUrl } from "@/lib/meal-photos";

/** Renders a stored meal photo from the private bucket.
 *
 * Shared by the customer's own meal list and the coach's review view — who may
 * see it is decided by Storage RLS, not by which page mounted this. If the URL
 * cannot be signed (no permission, file gone), nothing renders: a broken image
 * frame tells the viewer less than an absence does. */
export function MealPhoto({ photoPath, alt, className }: { photoPath: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  // The signed URL belongs to one specific path. Tracking which path produced
  // it — rather than clearing state in an effect — means a card that swaps to a
  // different meal never flashes the previous meal's photo.
  const [signedFor, setSignedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!photoPath) return;
    let cancelled = false;
    getMealPhotoUrl(photoPath).then((signed) => {
      if (cancelled) return;
      setUrl(signed);
      setSignedFor(photoPath);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  if (!photoPath || !url || signedFor !== photoPath) return null;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} loading="lazy" className={className ?? "h-full w-full object-cover"} />;
}
