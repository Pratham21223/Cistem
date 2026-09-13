export type ProjectMode = "guest" | "authenticated";

export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
};

export type SyncStatus = "local_only" | "saving" | "saved" | "pending" | "error";

export type RightPanelTab = "context" | "review" | "prompt";

export type ThemePreference = "light" | "dark";

export type UiPreferences = {
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  activeRightTab: RightPanelTab;
  theme: ThemePreference;
};
