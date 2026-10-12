export const PROJECT_CATEGORIES = [
  "Computer Science",
  "Procurement Management",
  "Engineering",
  "Biology & Life Sciences",
  "Physics & Chemistry",
  "Mathematics",
  "Medicine & Health",
  "Business & Economics",
  "Law",
  "Social Sciences",
  "Arts & Humanities",
  "Education",
  "Other",
] as const;

export const PROJECT_COLORS = [
  "violet",
  "indigo",
  "sky",
  "teal",
  "emerald",
  "amber",
  "rose",
  "fuchsia",
] as const;

export const PROJECT_ICONS = [
  "folder",
  "rocket",
  "flask",
  "code",
  "book",
  "palette",
  "calculator",
  "globe",
  "microscope",
  "briefcase",
  "scale",
  "heart",
  "cpu",
  "lightbulb",
] as const;

export const PROJECT_VISIBILITIES = ["private", "team"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const TASK_STATUSES = ["not-started", "in-progress", "completed"] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Free plan: this many ACTIVE (non-archived) projects owned per user. */
export const FREE_PROJECT_LIMIT = 5;
/** Owner + members per project. */
export const MAX_PROJECT_MEMBERS = 20;
export const MAX_PROJECT_FILES = 100;
