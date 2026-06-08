import { BookOpen, Rss } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/store";

export function AddChoiceDialog() {
  const { t } = useI18n();
  const isOpen = useUIStore((s) => s.isAddChoiceOpen);
  const setOpen = useUIStore((s) => s.setAddChoiceOpen);
  const setAddStandaloneOpen = useUIStore((s) => s.setAddStandaloneOpen);
  const setAddFeedOpen = useUIStore((s) => s.setAddFeedOpen);

  const handleSelectArticle = () => {
    setOpen(false);
    setAddStandaloneOpen(true);
  };

  const handleSelectFeed = () => {
    setOpen(false);
    setAddFeedOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("addChoice.title")}</DialogTitle>
          <DialogDescription>
            {t("addChoice.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <button
            onClick={handleSelectArticle}
            className="flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">
                {t("addChoice.article")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("addChoice.articleDescription")}
              </div>
            </div>
          </button>

          <button
            onClick={handleSelectFeed}
            className="flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Rss className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">
                {t("addChoice.feed")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("addChoice.feedDescription")}
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
