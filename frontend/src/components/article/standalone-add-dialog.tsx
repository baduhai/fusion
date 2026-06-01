import { useState, useRef } from "react";
import { Link } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/store";
import { useCreateStandaloneArticle } from "@/queries/standalone-articles";
import { useNavigate } from "@tanstack/react-router";

export function StandaloneAddDialog() {
  const { t } = useI18n();
  const isOpen = useUIStore((s) => s.isAddStandaloneOpen);
  const setOpen = useUIStore((s) => s.setAddStandaloneOpen);
  const createArticle = useCreateStandaloneArticle();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error(t("standalone.urlPlaceholder"));
      return;
    }

    setSubmitting(true);
    try {
      await createArticle.mutateAsync(trimmed);
      toast.success(t("standalone.toast.added"));
      setOpen(false);
      navigate({ to: "/standalone" });
    } catch {
      toast.error(t("standalone.toast.addFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setUrl("");
    setSubmitting(false);
    setOpen(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("standalone.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("standalone.urlPlaceholder")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label
              htmlFor="standalone-url"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              <Link className="mr-1.5 inline-block h-4 w-4 align-text-bottom" />
              URL
            </label>
            <Input
              id="standalone-url"
              ref={inputRef}
              placeholder={t("standalone.urlPlaceholder")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleSubmit();
                }
              }}
              autoComplete="off"
              name="standalone-url"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || url.trim() === ""}>
            {submitting ? t("common.creating") : t("standalone.addSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
