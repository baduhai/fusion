import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const supportedLocales = [
  "en",
  "zh",
  "de",
  "fr",
  "es",
  "ru",
  "pt",
  "sv",
] as const;
export type AppLocale = (typeof supportedLocales)[number];

export const articlePageSizeOptions = [10, 20, 30, 50, 100] as const;
export type ArticlePageSize = (typeof articlePageSizeOptions)[number];

export const einkTextScaleOptions = [1, 1.15, 1.3, 1.5] as const;
export type EinkTextScale = (typeof einkTextScaleOptions)[number];

const localeSet = new Set<AppLocale>(supportedLocales);
const articlePageSizeSet = new Set<number>(articlePageSizeOptions);
const einkTextScaleSet = new Set<number>(einkTextScaleOptions);

function resolveSupportedLocale(locale: string): AppLocale | null {
  const normalized = locale.toLowerCase().replace("_", "-");

  if (localeSet.has(normalized as AppLocale)) {
    return normalized as AppLocale;
  }

  const languageCode = normalized.split("-")[0];
  if (localeSet.has(languageCode as AppLocale)) {
    return languageCode as AppLocale;
  }

  return null;
}

const defaultLocale: AppLocale =
  (typeof navigator !== "undefined" &&
    resolveSupportedLocale(navigator.language)) ||
  "en";
const defaultArticlePageSize: ArticlePageSize = 10;
const defaultAutoMarkRead = true;

function normalizeLocale(locale: string): AppLocale {
  const supportedLocale = resolveSupportedLocale(locale);
  if (supportedLocale) {
    return supportedLocale;
  }

  return defaultLocale;
}

function normalizeArticlePageSize(size: number): ArticlePageSize {
  if (articlePageSizeSet.has(size)) {
    return size as ArticlePageSize;
  }

  return defaultArticlePageSize;
}

function normalizeEinkTextScale(scale: number): EinkTextScale {
  if (einkTextScaleSet.has(scale)) {
    return scale as EinkTextScale;
  }

  return 1;
}

export interface PreferencesState {
  locale: AppLocale;
  articlePageSize: ArticlePageSize;
  autoMarkRead: boolean;
  einkMode: boolean;
  einkTextScale: EinkTextScale;
  setLocale: (locale: string) => void;
  setArticlePageSize: (size: number) => void;
  setAutoMarkRead: (enabled: boolean) => void;
  setEinkMode: (enabled: boolean) => void;
  setEinkTextScale: (scale: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: defaultLocale,
      articlePageSize: defaultArticlePageSize,
      autoMarkRead: defaultAutoMarkRead,
      einkMode: false,
      einkTextScale: 1,
      setLocale: (locale) => set({ locale: normalizeLocale(locale) }),
      setArticlePageSize: (size) =>
        set({ articlePageSize: normalizeArticlePageSize(size) }),
      setAutoMarkRead: (enabled) => set({ autoMarkRead: enabled }),
      setEinkMode: (enabled) => set({ einkMode: enabled }),
      setEinkTextScale: (scale) =>
        set({ einkTextScale: normalizeEinkTextScale(scale) }),
    }),
    {
      name: "fusion-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        locale: state.locale,
        articlePageSize: state.articlePageSize,
        autoMarkRead: state.autoMarkRead,
        einkMode: state.einkMode,
        einkTextScale: state.einkTextScale,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PreferencesState> | undefined;

        return {
          ...currentState,
          locale: normalizeLocale(persisted?.locale ?? currentState.locale),
          articlePageSize: normalizeArticlePageSize(
            persisted?.articlePageSize ?? currentState.articlePageSize,
          ),
          autoMarkRead: persisted?.autoMarkRead ?? currentState.autoMarkRead,
          einkMode: persisted?.einkMode ?? currentState.einkMode,
          einkTextScale: normalizeEinkTextScale(
            persisted?.einkTextScale ?? currentState.einkTextScale,
          ),
        };
      },
    },
  ),
);

export function getPreferredLocale(): AppLocale {
  return usePreferencesStore.getState().locale;
}
