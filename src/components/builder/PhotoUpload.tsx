import { useRef, useState, useEffect } from "react";
import { Camera, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onChange: (dataUrl?: string) => void;
  name?: string;
  position?: "top-left" | "top-right" | "centre";
  onPositionChange?: (pos: "top-left" | "top-right" | "centre") => void;
}

const TIPS_KEY = "photo-tips-collapsed";

/** Max dimension (px) for stored profile photo. Keeps data URL under ~30 KB. */
const MAX_PX = 400;

function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

const POSITIONS = [
  { value: "top-left",  label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "centre",    label: "Centred above name" },
] as const;

export function PhotoUpload({ value, onChange, name, position = "top-right", onPositionChange }: Props) {
  const input = useRef<HTMLInputElement>(null);

  // Persist collapse state in localStorage
  const [tipsOpen, setTipsOpen] = useState(() => {
    try { return localStorage.getItem(TIPS_KEY) !== "1"; } catch { return true; }
  });

  function toggleTips() {
    setTipsOpen((open) => {
      const next = !open;
      try { localStorage.setItem(TIPS_KEY, next ? "0" : "1"); } catch { /* ignore */ }
      return next;
    });
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await resizeToDataUrl(file);
      onChange(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const initials = (name ?? "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3">
      {/* Upload row */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted text-lg font-semibold text-muted-foreground">
            {value ? (
              <img src={value} alt="Profile" className="h-full w-full object-cover" />
            ) : initials ? (
              initials
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute -right-1 -top-1 rounded-full border border-border bg-background p-1 shadow-soft hover:bg-destructive hover:text-destructive-foreground"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="space-y-1">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
            {value ? "Replace photo" : "Upload photo"}
          </Button>
          <p className="text-xs text-muted-foreground">PNG or JPG, square works best.</p>
        </div>
      </div>

      {/* Position selector — only shown when a photo is uploaded */}
      {value && onPositionChange && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Photo position:</span>
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPositionChange(p.value)}
              className={cn(
                "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                position === p.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Photo guidelines panel */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: 8,
          fontSize: 13,
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={toggleTips}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-medium text-green-800"
        >
          <span>Photo tips for cruise line applications</span>
          <ChevronDown
            className={cn("h-4 w-4 text-green-700 transition-transform", tipsOpen && "rotate-180")}
          />
        </button>
        {tipsOpen && (
          <div className="space-y-1 px-4 pb-3 text-[13px] text-green-900">
            <p className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Professional attire — uniform or smart formal dress</p>
            <p className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Plain light background — white or pale grey</p>
            <p className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Head and shoulders only — centred in frame</p>
            <p className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Clear, well-lit — no shadows across the face</p>
            <p className="flex items-start gap-2"><span className="text-red-500 font-bold">✗</span> No selfies or casual photos</p>
            <p className="flex items-start gap-2"><span className="text-red-500 font-bold">✗</span> No sunglasses</p>
          </div>
        )}
      </div>
    </div>
  );
}
