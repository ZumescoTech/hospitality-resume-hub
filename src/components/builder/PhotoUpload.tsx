import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  value?: string;
  onChange: (dataUrl?: string) => void;
  name?: string;
}

/** Max dimension (px) for stored profile photo. Keeps data URL under ~30 KB. */
const MAX_PX = 400;

/**
 * Resize an image file to MAX_PX × MAX_PX (preserving aspect ratio) and
 * return a JPEG data URL at 85% quality. This prevents localStorage quota
 * errors when users upload high-resolution photos.
 */
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

export function PhotoUpload({ value, onChange, name }: Props) {
  const input = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await resizeToDataUrl(file);
      onChange(dataUrl);
    } catch {
      // Fallback: read as-is (rare canvas failure)
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
  );
}
