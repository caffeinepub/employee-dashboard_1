import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useActor } from "../hooks/useActor";

export interface AppSettingsLabels {
  // Company branding
  companyName: string;
  companyTagline: string;

  // Sidebar
  sidebarAppName: string;
  sidebarTagline: string;
  sidebarLogoText: string;
  sidebarOverviewLabel: string;
  sidebarEmployeesLabel: string;

  // Overview page
  overviewBadgeLabel: string;
  overviewPageTitle: string;
  overviewPageSubtitle: string;
  overviewActiveEmployeesLabel: string;
  overviewOnHoldLabel: string;
  overviewTotalEmployeesLabel: string;
  overviewFeedbackPanelTitle: string;
  overviewFeedbackPanelSubtitle: string;
  overviewDirectoryTitle: string;
  overviewDirectorySubtitle: string;

  // Employee detail page
  detailPersonalSectionTitle: string;
  detailPerformanceSectionTitle: string;
  detailSwotSectionTitle: string;
  detailTraitsSectionTitle: string;
  detailProblemsSectionTitle: string;
  detailFeedbackSectionTitle: string;
  detailSalesInfluenceLabel: string;
  detailOperationalDisciplineLabel: string;
  detailProductKnowledgeLabel: string;
  detailSoftSkillsLabel: string;
  detailReviewsLabel: string;
}

export interface AppSettings {
  labels: AppSettingsLabels;
  feedbackCategories: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  labels: {
    // Company branding
    companyName: "Frootle India Pvt. Ltd.",
    companyTagline: "A house of Global Brands.",

    // Sidebar
    sidebarAppName: "PeopleOS",
    sidebarTagline: "Intelligence Suite",
    sidebarLogoText: "HR",
    sidebarOverviewLabel: "Overview",
    sidebarEmployeesLabel: "Employees",

    // Overview page
    overviewBadgeLabel: "Command Center",
    overviewPageTitle: "Workforce Overview",
    overviewPageSubtitle: "Real-time insights across your organization",
    overviewActiveEmployeesLabel: "Active Employees",
    overviewOnHoldLabel: "On Hold Employees",
    overviewTotalEmployeesLabel: "Total Employees",
    overviewFeedbackPanelTitle: "Employee Feedback to Company",
    overviewFeedbackPanelSubtitle: "Feedback submitted by employees",
    overviewDirectoryTitle: "Employee Directory",
    overviewDirectorySubtitle: "Click any card to view full profile",

    // Employee detail page
    detailPersonalSectionTitle: "Personal & Background",
    detailPerformanceSectionTitle: "Performance Metrics",
    detailSwotSectionTitle: "SWOT Analysis",
    detailTraitsSectionTitle: "Behavioral Traits",
    detailProblemsSectionTitle: "Problems Faced",
    detailFeedbackSectionTitle: "Employee Feedback",
    detailSalesInfluenceLabel: "Sales Influence Index",
    detailOperationalDisciplineLabel: "Operational Discipline",
    detailProductKnowledgeLabel: "Product Knowledge Score",
    detailSoftSkillsLabel: "Soft Skills Score",
    detailReviewsLabel: "Total Reviews",
  },
  feedbackCategories: [
    "Performance",
    "HR",
    "Operations",
    "Attendance",
    "Communication",
    "Leadership",
    "Team Collaboration",
  ],
};

const STORAGE_KEY = "employee-dashboard-settings";

function loadFromLocalStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      labels: { ...DEFAULT_SETTINGS.labels, ...(parsed.labels ?? {}) },
      feedbackCategories:
        parsed.feedbackCategories ?? DEFAULT_SETTINGS.feedbackCategories,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveToLocalStorage(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // silently ignore
  }
}

interface AppSettingsContextValue {
  settings: AppSettings;
  updateLabel: (key: keyof AppSettingsLabels, value: string) => void;
  updateFeedbackCategories: (cats: string[]) => void;
  resetToDefaults: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Start with localStorage for instant render, then sync from backend
  const [settings, setSettings] = useState<AppSettings>(loadFromLocalStorage);
  const { actor } = useActor();
  const syncedFromBackend = useRef(false);

  // On mount / when actor becomes available, load from backend and override local
  useEffect(() => {
    if (!actor || syncedFromBackend.current) return;
    let cancelled = false;
    actor
      .getAppSettings()
      .then((json) => {
        if (cancelled) return;
        if (!json || json === "{}") return; // no backend data yet, keep local
        const parsed = JSON.parse(json) as Partial<AppSettings>;
        const merged: AppSettings = {
          labels: { ...DEFAULT_SETTINGS.labels, ...(parsed.labels ?? {}) },
          feedbackCategories:
            parsed.feedbackCategories ?? DEFAULT_SETTINGS.feedbackCategories,
        };
        setSettings(merged);
        saveToLocalStorage(merged);
        syncedFromBackend.current = true;
      })
      .catch(() => {
        // Backend unavailable — keep using localStorage values
        syncedFromBackend.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  const saveSettings = useCallback(
    (next: AppSettings) => {
      saveToLocalStorage(next);
      // Async write to canister — don't block UI
      if (actor) {
        actor.setAppSettings(JSON.stringify(next)).catch(() => {
          // Silently ignore canister write failures
        });
      }
    },
    [actor],
  );

  const updateLabel = useCallback(
    (key: keyof AppSettingsLabels, value: string) => {
      setSettings((prev) => {
        const next: AppSettings = {
          ...prev,
          labels: { ...prev.labels, [key]: value },
        };
        saveSettings(next);
        return next;
      });
    },
    [saveSettings],
  );

  const updateFeedbackCategories = useCallback(
    (cats: string[]) => {
      setSettings((prev) => {
        const next: AppSettings = { ...prev, feedbackCategories: cats };
        saveSettings(next);
        return next;
      });
    },
    [saveSettings],
  );

  const resetToDefaults = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        updateLabel,
        updateFeedbackCategories,
        resetToDefaults,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return ctx;
}

export { DEFAULT_SETTINGS };
