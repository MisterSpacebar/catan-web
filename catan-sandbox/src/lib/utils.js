import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Re-export from colors module for backwards compatibility
export { 
  getPlayerColor, 
  getResourceColor, 
  getResourceEmoji, 
  getResourceLabel,
  getRankColor,
  PLAYER_COLORS,
  RESOURCE_COLORS,
  RANK_COLORS,
  ACCENT_COLORS,
  STATUS_COLORS,
} from "./colors";

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ============================================
// Resource Configuration (Legacy support)
// ============================================

export const RESOURCES = [
  { key: "wood", label: "Lumber", color: "#22c55e", lightColor: "#4ade80", darkColor: "#16a34a", emoji: "🌲" },
  { key: "sheep", label: "Wool", color: "#4ade80", lightColor: "#86efac", darkColor: "#22c55e", emoji: "🐑" },
  { key: "wheat", label: "Grain", color: "#eab308", lightColor: "#facc15", darkColor: "#ca8a04", emoji: "🌾" },
  { key: "brick", label: "Brick", color: "#ef4444", lightColor: "#f87171", darkColor: "#dc2626", emoji: "🧱" },
  { key: "ore", label: "Ore", color: "#6b7280", lightColor: "#9ca3af", darkColor: "#4b5563", emoji: "⛏️" },
  { key: "desert", label: "Desert", color: "#d4a574", lightColor: "#e5c9a8", darkColor: "#b8956b", emoji: "🏜️" },
  { key: "water", label: "Water", color: "#3b82f6", lightColor: "#60a5fa", darkColor: "#2563eb", emoji: "🌊" },
];

/**
 * Get resource color by key (legacy function)
 */
export function resourceColor(key) {
  return RESOURCES.find((r) => r.key === key)?.color || "#666";
}

/**
 * Get resource emoji by key (legacy function)
 */
export function resourceEmoji(key) {
  return RESOURCES.find((r) => r.key === key)?.emoji || "🎲";
}

/**
 * Get pretty resource name (legacy function)
 */
export function prettyResource(key) {
  return RESOURCES.find((r) => r.key === key)?.label || key;
}

/**
 * Get resource configuration object
 */
export function getResourceConfig(key) {
  return RESOURCES.find((r) => r.key === key) || RESOURCES[0];
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format number with +/- sign
 */
export function formatDelta(value) {
  if (value > 0) return `+${value}`;
  return value.toString();
}

/**
 * Calculate player rankings based on VP
 */
export function calculateRankings(players) {
  return [...players]
    .map((p, idx) => ({ ...p, originalIndex: idx }))
    .sort((a, b) => (b.vp || 0) - (a.vp || 0))
    .map((p, rank) => ({ ...p, rank: rank + 1 }));
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(start, end, t) {
  return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Generate a random ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Debounce function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================
// Animation Helpers
// ============================================

/**
 * Stagger delay for animations
 */
export function staggerDelay(index, baseDelay = 0.05) {
  return index * baseDelay;
}

/**
 * Spring animation config presets
 */
export const springConfigs = {
  default: { type: "spring", stiffness: 300, damping: 30 },
  gentle: { type: "spring", stiffness: 200, damping: 25 },
  bouncy: { type: "spring", stiffness: 400, damping: 20 },
  stiff: { type: "spring", stiffness: 500, damping: 35 },
};

/**
 * Fade animation variants
 */
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Slide up animation variants
 */
export const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/**
 * Scale animation variants
 */
export const scaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// ============================================
// Color Utilities
// ============================================

/**
 * Lighten a hex color
 */
export function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = clamp((num >> 16) + amt, 0, 255);
  const G = clamp((num >> 8 & 0x00FF) + amt, 0, 255);
  const B = clamp((num & 0x0000FF) + amt, 0, 255);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

/**
 * Darken a hex color
 */
export function darkenColor(hex, percent) {
  return lightenColor(hex, -percent);
}

/**
 * Convert hex to rgba
 */
export function hexToRgba(hex, alpha = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
}

// ============================================
// Game Utilities
// ============================================

/**
 * Calculate probability for a dice roll number
 */
export function getDiceProbability(number) {
  const probabilities = {
    2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
    8: 5, 9: 4, 10: 3, 11: 2, 12: 1
  };
  return (probabilities[number] || 0) / 36;
}

/**
 * Get probability dots count for a number token
 */
export function getProbabilityDots(number) {
  const dots = {
    2: 1, 12: 1,
    3: 2, 11: 2,
    4: 3, 10: 3,
    5: 4, 9: 4,
    6: 5, 8: 5,
  };
  return dots[number] || 0;
}

/**
 * Check if a number is "hot" (6 or 8)
 */
export function isHotNumber(number) {
  return number === 6 || number === 8;
}
