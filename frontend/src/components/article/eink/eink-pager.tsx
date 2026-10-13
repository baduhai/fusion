import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferencesStore } from "@/store";
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
  const iconOnly = usePreferencesStore((s) => s.iconOnlyButtons);
  // Keep a comfortable touch target when the label is hidden, so paging on a
  // touch e-ink device is not a tiny icon-sized tap. The Button's size variant
  // ships `has-[>svg]:px-2.5`, so the override must use the same variant to
  // win (tailwind-merge replaces the conflicting variant).
  const buttonPadding = iconOnly ? "has-[>svg]:px-5" : "gap-1.5 px-3";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t bg-background px-4 py-2 sm:px-6">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={!canPrev}
        className={`h-auto justify-self-start py-2 text-[13px] font-medium text-muted-foreground ${buttonPadding}`}
        aria-label={iconOnly ? t("common.previous") : undefined}
        title={iconOnly ? t("common.previous") : undefined}
      >
        <ChevronLeft className="h-4 w-4" />
        {!iconOnly && t("common.previous")}
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
        className={`h-auto justify-self-end py-2 text-[13px] font-medium text-muted-foreground ${buttonPadding}`}
        aria-label={iconOnly ? t("common.next") : undefined}
        title={iconOnly ? t("common.next") : undefined}
      >
        {!iconOnly && t("common.next")}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
