import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";

interface ServerImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  serverId?: string;
  maxImages?: number;
}

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const QUALITY = 0.82;

const resizeAndCompress = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");

      const srcRatio = img.width / img.height;
      const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;

      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (srcRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }

      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/webp",
        QUALITY
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
};

const ServerImageUpload = ({ images, onImagesChange, serverId, maxImages = 5 }: ServerImageUploadProps) => {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`Maximálne ${maxImages} obrázkov`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    const newUrls: string[] = [];
    for (const file of filesToUpload) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} nie je obrázok`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} je príliš veľký (max 10MB)`);
        continue;
      }

      try {
        const compressed = await resizeAndCompress(file);

        const folder = serverId || "temp-" + Date.now();
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

        const { error } = await supabase.storage
          .from("server-images")
          .upload(path, compressed, { contentType: "image/webp" });

        if (error) {
          toast.error(`Chyba pri nahrávaní ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("server-images")
          .getPublicUrl(path);

        newUrls.push(urlData.publicUrl);
      } catch {
        toast.error(`Chyba pri spracovaní ${file.name}`);
      }
    }

    if (newUrls.length > 0) {
      onImagesChange([...images, ...newUrls]);
      toast.success(`Nahraných ${newUrls.length} obrázkov`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="text-sm font-semibold text-foreground mb-2 block">{t("add_photos")}</label>
      
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {images.map((url, i) => (
            <div key={i} className="relative group rounded-md overflow-hidden border border-border aspect-video">
              <img src={url} alt={`Server image ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="flex items-center justify-center rounded-md border-2 border-dashed border-border bg-secondary/30 py-10 cursor-pointer hover:border-primary/40 transition-colors"
        >
          <div className="text-center">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            )}
            <p className="text-sm text-muted-foreground">{uploading ? "Nahrávam..." : t("add_photos_hint")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("add_photos_formats")}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">{t("add_photos_resolution")}</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ServerImageUpload;
