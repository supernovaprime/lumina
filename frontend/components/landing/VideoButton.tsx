"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";

const videoId = process.env.NEXT_PUBLIC_HOWTO_VIDEO_ID;

export function VideoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2.5 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:border-tertiary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-2">
          <Play size={12} className="ml-0.5" />
        </span>
        Watch How It Works
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="How it works video"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-navy-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close video"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-navy-950/70 text-white hover:bg-navy-950"
            >
              <X size={18} />
            </button>
            {videoId ? (
              <iframe
                className="aspect-video w-full"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="How Lumina works"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-8 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/logo.svg" alt="" className="h-20 w-20" />
                <p className="font-display text-lg font-bold text-white">
                  Video coming soon
                </p>
                <p className="max-w-sm text-sm text-white/60">
                  Our walkthrough is being polished. Meanwhile, try finding a
                  car wash near you.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
