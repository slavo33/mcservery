import { useState } from "react";
import { Bug, Upload, X, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

const BugReportDialog = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("bug_screenshot_too_large"));
      return;
    }
    setScreenshot(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      toast.error(t("bug_fill_required"));
      return;
    }

    setSubmitting(true);
    let screenshotUrl: string | null = null;

    if (screenshot) {
      const ext = screenshot.type.split("/")[1] === "jpeg" ? "jpg" : screenshot.type.split("/")[1];
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("bug-screenshots")
        .upload(path, screenshot);

      if (uploadError) {
        toast.error(t("bug_upload_error"));
        setSubmitting(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("bug-screenshots").getPublicUrl(path);
      screenshotUrl = publicUrl;
    }

    const { error } = await supabase.from("bug_reports" as any).insert({
      reporter_id: user.id,
      title: title.trim(),
      description: description.trim(),
      screenshot_url: screenshotUrl,
    } as any);

    if (error) {
      toast.error(t("bug_submit_error"));
    } else {
      toast.success(t("bug_submit_success"));
      setTitle("");
      setDescription("");
      removeScreenshot();
      setOpen(false);
    }
    setSubmitting(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title={t("bug_report_title")}
        >
          <Bug className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            {t("bug_report_title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("bug_title_label")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder={t("bug_title_placeholder")}
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("bug_desc_label")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={t("bug_desc_placeholder")}
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("bug_screenshot_label")}</label>
            {previewUrl ? (
              <div className="relative inline-block">
                <img src={previewUrl} alt="Screenshot" className="max-h-32 rounded-md border border-border" />
                <button
                  onClick={removeScreenshot}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                <Image className="h-4 w-4" />
                {t("bug_screenshot_upload")}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshot}
                  className="hidden"
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground mt-1">{t("bug_screenshot_hint")}</p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full gradient-primary border-0 font-display text-sm font-semibold tracking-wide text-primary-foreground"
          >
            {submitting ? t("bug_submitting") : t("bug_submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BugReportDialog;
