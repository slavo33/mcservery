import { useState } from "react";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReportDialogProps {
  targetId: string;
  reportType: "server" | "comment";
  triggerClassName?: string;
}

const ReportDialog = ({ targetId, reportType, triggerClassName }: ReportDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("reports" as any).insert({
      reporter_id: user.id,
      report_type: reportType,
      target_id: targetId,
      reason: reason.trim(),
    } as any);
    if (error) {
      toast.error(t("report_error"));
    } else {
      toast.success(t("report_success"));
      setReason("");
      setOpen(false);
    }
    setSubmitting(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={triggerClassName || "text-muted-foreground hover:text-destructive transition-colors"}
          title={reportType === "server" ? t("report_server") : t("report_comment")}
        >
          <Flag className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("report_title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("report_reason_placeholder")}
            maxLength={500}
            rows={4}
            className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            className="w-full gradient-primary border-0 text-primary-foreground"
          >
            {t("report_submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
