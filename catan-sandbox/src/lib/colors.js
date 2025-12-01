// ============================================
// Modular Color System for Catan Sandbox
// ============================================

/**
 * Player color configuration
 * Each player has a unique color palette with primary, secondary, light, and glow variants
 */
export const PLAYER_COLORS = {
  0: {
    id: 0,
    name: "Red",
    label: "P1",
    primary: "#ef4444",
    secondary: "#dc2626",
    light: "#f87171",
    dark: "#b91c1c",
    glow: "rgba(239, 68, 68, 0.5)",
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.3)",
  },
  1: {
    id: 1,
    name: "Blue",
    label: "P2",
    primary: "#3b82f6",
    secondary: "#2563eb",
    light: "#60a5fa",
    dark: "#1d4ed8",
    glow: "rgba(59, 130, 246, 0.5)",
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
  },
  2: {
    id: 2,
    name: "Yellow",
    label: "P3",
    primary: "#eab308",
    secondary: "#ca8a04",
    light: "#facc15",
    dark: "#a16207",
    glow: "rgba(234, 179, 8, 0.5)",
    bg: "rgba(234, 179, 8, 0.1)",
    border: "rgba(234, 179, 8, 0.3)",
  },
  3: {
    id: 3,
    name: "Green",
    label: "P4",
    primary: "#22c55e",
    secondary: "#16a34a",
    light: "#4ade80",
    dark: "#15803d",
    glow: "rgba(34, 197, 94, 0.5)",
    bg: "rgba(34, 197, 94, 0.1)",
    border: "rgba(34, 197, 94, 0.3)",
  },
};

/**
 * Get player color configuration by ID
 */
export function getPlayerColor(playerId) {
  const id = typeof playerId === "string" ? parseInt(playerId, 10) : playerId;
  return PLAYER_COLORS[id] || PLAYER_COLORS[0];
}

/**
 * Resource color configuration
 */
export const RESOURCE_COLORS = {
  wood: {
    primary: "#22c55e",
    light: "#4ade80",
    dark: "#16a34a",
    emoji: "🌲",
    label: "Lumber",
  },
  brick: {
    primary: "#ef4444",
    light: "#f87171",
    dark: "#dc2626",
    emoji: "🧱",
    label: "Brick",
  },
  wheat: {
    primary: "#eab308",
    light: "#facc15",
    dark: "#ca8a04",
    emoji: "🌾",
    label: "Grain",
  },
  sheep: {
    primary: "#4ade80",
    light: "#86efac",
    dark: "#22c55e",
    emoji: "🐑",
    label: "Wool",
  },
  ore: {
    primary: "#6b7280",
    light: "#9ca3af",
    dark: "#4b5563",
    emoji: "⛏️",
    label: "Ore",
  },
  desert: {
    primary: "#d4a574",
    light: "#e5c9a8",
    dark: "#b8956b",
    emoji: "🏜️",
    label: "Desert",
  },
  water: {
    primary: "#3b82f6",
    light: "#60a5fa",
    dark: "#2563eb",
    emoji: "🌊",
    label: "Water",
  },
};

/**
 * Get resource color by key
 */
export function getResourceColor(key) {
  return RESOURCE_COLORS[key]?.primary || "#666";
}

/**
 * Get resource emoji by key
 */
export function getResourceEmoji(key) {
  return RESOURCE_COLORS[key]?.emoji || "🎲";
}

/**
 * Get resource label by key
 */
export function getResourceLabel(key) {
  return RESOURCE_COLORS[key]?.label || key;
}

/**
 * Rank colors for leaderboard
 */
export const RANK_COLORS = {
  1: {
    name: "Gold",
    gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    bg: "rgba(251, 191, 36, 0.12)",
    border: "rgba(251, 191, 36, 0.25)",
    text: "#fbbf24",
    icon: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.25)",
  },
  2: {
    name: "Silver",
    gradient: "linear-gradient(135deg, #94a3b8, #64748b)",
    bg: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.25)",
    text: "#94a3b8",
    icon: "#94a3b8",
    glow: "rgba(148, 163, 184, 0.2)",
  },
  3: {
    name: "Bronze",
    gradient: "linear-gradient(135deg, #d97706, #b45309)",
    bg: "rgba(217, 119, 6, 0.12)",
    border: "rgba(217, 119, 6, 0.25)",
    text: "#d97706",
    icon: "#d97706",
    glow: "rgba(217, 119, 6, 0.2)",
  },
};

/**
 * Get rank color configuration
 */
export function getRankColor(rank) {
  return RANK_COLORS[rank] || null;
}

/**
 * UI accent colors
 */
export const ACCENT_COLORS = {
  indigo: "#6366f1",
  purple: "#a855f7",
  pink: "#ec4899",
  emerald: "#10b981",
  teal: "#14b8a6",
  amber: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  cyan: "#06b6d4",
  blue: "#3b82f6",
};

/**
 * Status colors
 */
export const STATUS_COLORS = {
  success: {
    primary: "#22c55e",
    bg: "rgba(34, 197, 94, 0.1)",
    border: "rgba(34, 197, 94, 0.3)",
  },
  warning: {
    primary: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  error: {
    primary: "#ef4444",
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.3)",
  },
  info: {
    primary: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
  },
};

