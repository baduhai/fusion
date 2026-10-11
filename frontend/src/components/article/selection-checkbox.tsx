import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onToggle: () => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Circular multi-select checkbox used by the article list selection mode.
 * Renders as a real checkbox for assistive technology while matching the
 * app's circular read-state iconography.
 */
export function SelectionCheckbox({
  checked,
  indeterminate = false,
  onToggle,
  ariaLabel,
  disabled,
  className,
}: SelectionCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : indeterminate
          ? "border-primary bg-background"
          : "border-muted-foreground/40 hover:border-muted-foreground",
        className,
      )}
    >
      {checked ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : indeterminate ? (
        <span className="h-0.5 w-2.5 rounded-full bg-primary" />
      ) : null}
    </button>
  );
}
