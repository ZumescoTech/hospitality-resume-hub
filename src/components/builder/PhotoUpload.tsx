import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  value?: string;
  onChange: (dataUrl?: string) => void;
  name?: string;
}

export function PhotoUpload({ value, onChange, name }: Props) {
  const input = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
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
