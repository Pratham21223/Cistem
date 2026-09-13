import { create } from "zustand";

import type {
  ProjectMode,
  ProjectSummary,
  RightPanelTab,
  SyncStatus,
  UiPreferences,
} from "@/types/project";

const UI_PREFERENCES_KEY = "cistem.uiPreferences";

function systemTheme(): UiPreferences["theme"] {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

const DEFAULT_UI_PREFERENCES: UiPreferences = {
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  activeRightTab: "context",
  theme: systemTheme(),
};

function readUiPreferences(): UiPreferences {
  try {
    const raw = localStorage.getItem(UI_PREFERENCES_KEY);
    if (!raw) return DEFAULT_UI_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_UI_PREFERENCES;
    const value = parsed as Partial<UiPreferences>;
    return {
      leftPanelCollapsed: value.leftPanelCollapsed === true,
      rightPanelCollapsed: value.rightPanelCollapsed === true,
      activeRightTab:
        value.activeRightTab === "review" || value.activeRightTab === "prompt"
          ? value.activeRightTab
          : "context",
      theme: value.theme === "dark" || value.theme === "light" ? value.theme : systemTheme(),
    };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

function persistUiPreferences(preferences: UiPreferences): void {
  try {
    localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable (private mode); UI preferences are non-critical.
  }
}

type ProjectStoreState = {
  projectId: string;
  projectName: string;
  mode: ProjectMode;
  syncStatus: SyncStatus;
  uiPreferences: UiPreferences;

  /** Local guest projects, most recently updated first. */
  projects: ProjectSummary[];
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  isOnline: boolean;

  setProjectName: (name: string) => void;
  setSyncStatus: (status: SyncStatus) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setActiveRightTab: (tab: RightPanelTab) => void;
  toggleTheme: () => void;

  setProjects: (projects: ProjectSummary[]) => void;
  setActiveProject: (project: { id: string; name: string; updatedAt: string }) => void;
  setDirty: (isDirty: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setSaved: (savedAt: string) => void;
  setSaveError: (saveError: string | null) => void;
  setOnline: (isOnline: boolean) => void;
};

function updateUiPreferences(
  get: () => ProjectStoreState,
  set: (partial: Partial<ProjectStoreState>) => void,
  patch: Partial<UiPreferences>,
): void {
  const uiPreferences = { ...get().uiPreferences, ...patch };
  persistUiPreferences(uiPreferences);
  set({ uiPreferences });
}

/** Owns project metadata, guest/auth mode, sync and save state, and UI preferences. */
export const useProjectStore = create<ProjectStoreState>()((set, get) => ({
  projectId: crypto.randomUUID(),
  projectName: "Untitled design",
  mode: "guest",
  syncStatus: "local_only",
  uiPreferences: readUiPreferences(),

  projects: [],
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  saveError: null,
  isOnline: true,

  setProjectName: (projectName) => {
    set({ projectName });
  },
  setSyncStatus: (syncStatus) => {
    set({ syncStatus });
  },

  toggleLeftPanel: () => {
    updateUiPreferences(get, set, {
      leftPanelCollapsed: !get().uiPreferences.leftPanelCollapsed,
    });
  },
  toggleRightPanel: () => {
    updateUiPreferences(get, set, {
      rightPanelCollapsed: !get().uiPreferences.rightPanelCollapsed,
    });
  },
  setActiveRightTab: (activeRightTab) => {
    updateUiPreferences(get, set, { activeRightTab });
  },
  toggleTheme: () => {
    updateUiPreferences(get, set, {
      theme: get().uiPreferences.theme === "dark" ? "light" : "dark",
    });
  },

  setProjects: (projects) => {
    set({ projects });
  },
  setActiveProject: ({ id, name, updatedAt }) => {
    set({ projectId: id, projectName: name, isDirty: false, lastSavedAt: updatedAt });
  },
  setDirty: (isDirty) => {
    set({ isDirty });
  },
  setSaving: (isSaving) => {
    set({ isSaving });
  },
  setSaved: (savedAt) => {
    set({ isDirty: false, isSaving: false, lastSavedAt: savedAt, saveError: null });
  },
  setSaveError: (saveError) => {
    set({ saveError, isSaving: false });
  },
  setOnline: (isOnline) => {
    set({ isOnline });
  },
}));
