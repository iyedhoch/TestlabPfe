//? layout types / interfaces

export type SidebarFeature =
  | "dashboard"
  | "project-mangement"
  | "specs-mangement"
  | "test-generation"
  | "estimation"
  | "test-link-mcp"
  | "automation"
  | "training"
  | "statistics"
  | "environment";

export interface ISidebarItem {
  path: string;
  label: string;
  icon: SidebarFeature;
  children?: ISidebarItem[];
}
