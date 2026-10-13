import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";

/**
 * A single action shown in the article header.
 *
 * `href` renders an anchor (used by "Original" so open-in-new-tab and
 * middle-click keep working); otherwise a button that calls `onSelect` is
 * rendered. Callers only include actions that currently apply, so conditional
 * actions like "Remove" never appear in the overflow menu when irrelevant.
 */
export interface ArticleAction {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
}

const ACTION_BUTTON_CLASS =
  "h-auto gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground";

const DEFAULT_GAP = 8;

interface ArticleActionsBarProps {
  actions: ArticleAction[];
}

interface Fit {
  visible: number;
  overflow: boolean;
}

function ActionButton({ action }: { action: ArticleAction }) {
  if (action.href) {
    return (
      <Button asChild variant="outline" size="sm" className={ACTION_BUTTON_CLASS}>
        <a href={action.href} target="_blank" rel="noopener noreferrer">
          {action.icon}
          {action.label}
        </a>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={action.disabled}
      onClick={action.onSelect}
      className={ACTION_BUTTON_CLASS}
    >
      {action.icon}
      {action.label}
    </Button>
  );
}

/**
 * Renders article actions inline in the given priority order until they no
 * longer fit the available width, then collapses the remainder into a "more"
 * dropdown. The trigger is only rendered when at least one action had to be
 * collapsed, so wide viewports show no menu at all.
 */
export function ArticleActionsBar({ actions }: ArticleActionsBarProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<() => void>(() => {});
  const [fit, setFit] = useState<Fit>({
    visible: actions.length,
    overflow: false,
  });

  const applyFit = () => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return;

    const available = root.clientWidth;
    // The drawer can report zero width for a frame while it opens; keep the
    // current layout instead of collapsing everything to the menu.
    if (available <= 0) return;

    const gap = parseFloat(getComputedStyle(root).columnGap) || DEFAULT_GAP;
    const children = Array.from(measure.children);
    const widths = children
      .slice(0, actions.length)
      .map((child) => child.getBoundingClientRect().width);
    const triggerWidth =
      children[actions.length]?.getBoundingClientRect().width ?? 0;

    const total =
      widths.reduce((sum, width) => sum + width, 0) +
      gap * Math.max(0, widths.length - 1);

    let next: Fit;
    if (total <= available) {
      next = { visible: actions.length, overflow: false };
    } else {
      // Greedy fill, reserving a gap plus the trigger after the last visible
      // action so the trigger itself always has room to render.
      let used = 0;
      let visible = 0;
      for (let index = 0; index < widths.length; index += 1) {
        const nextUsed = used + (visible > 0 ? gap : 0) + widths[index];
        if (nextUsed + gap + triggerWidth <= available) {
          used = nextUsed;
          visible += 1;
        } else {
          break;
        }
      }
      next = { visible, overflow: true };
    }

    setFit((previous) =>
      previous.visible === next.visible && previous.overflow === next.overflow
        ? previous
        : next,
    );
  };

  // Measure before paint so the first frame already reflects the layout, and
  // re-run every commit to pick up label, locale and action-set changes. This
  // is the "read layout, store in state" case the compiler rule can't express:
  // measuring later (e.g. in the ResizeObserver) would flash overflowing
  // buttons for a frame. `applyFit` bails out when the fit is unchanged, so it
  // does not cascade.
  useLayoutEffect(() => {
    fitRef.current = applyFit;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyFit();
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fitRef.current());
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const overflowActions = fit.overflow ? actions.slice(fit.visible) : [];

  return (
    <div ref={rootRef} className="flex min-w-0 flex-1 items-center gap-2">
      {actions.slice(0, fit.visible).map((action) => (
        <ActionButton key={action.id} action={action} />
      ))}

      {fit.overflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`${ACTION_BUTTON_CLASS} ml-auto`}
              aria-label={t("article.action.more")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflowActions.map((action, index) => (
              <Fragment key={action.id}>
                {action.destructive && index > 0 && <DropdownMenuSeparator />}
                {action.href ? (
                  <DropdownMenuItem asChild>
                    <a
                      href={action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {action.icon}
                      {action.label}
                    </a>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    variant={action.destructive ? "destructive" : "default"}
                    disabled={action.disabled}
                    onSelect={action.onSelect}
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                )}
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Off-screen copy used only to measure natural button widths. Fixed
          positioning keeps it out of the drawer's scrollable overflow, so it
          can't make the sheet swipe sideways. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible fixed left-0 top-0 flex items-center gap-2 whitespace-nowrap"
      >
        {actions.map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
        <Button variant="outline" size="sm" className={ACTION_BUTTON_CLASS}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
