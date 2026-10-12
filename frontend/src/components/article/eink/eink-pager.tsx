import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface EinkPagerProps {
  page: number;
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function EinkPager({
  page,
  totalPages,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: EinkPagerProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t bg-background px-4 py-2 sm:px-6">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={!canPrev}
        className="h-auto justify-self-start gap-1.5 px-3 py-2 text-[13px] font-medium text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("common.previous")}
      </Button>
      <span
        className="justify-self-center text-sm tabular-nums text-muted-foreground"
        aria-live="polite"
      >
        {page + 1} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!canNext}
        className="h-auto justify-self-end gap-1.5 px-3 py-2 text-[13px] font-medium text-muted-foreground"
      >
        {t("common.next")}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
