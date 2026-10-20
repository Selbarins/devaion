/**
 * Goals module — completely redesigned
 */

export const CATEGORIES = {
  Gear:    { emoji: "🗡", color: "#fbbf24" },
  Farming: { emoji: "🌾", color: "#34d399" },
  PvP:     { emoji: "⚔",  color: "#f87171" },
  Trophy:  { emoji: "🏆", color: "#c084fc" },
  Money:   { emoji: "💰", color: "#22d3ee" },
  Other:   { emoji: "⭐", color: "#9aadc8" }
};

export function categoryEmoji(cat) {
  return CATEGORIES[cat]?.emoji || "⭐";
}

export function categoryColor(cat) {
  return CATEGORIES[cat]?.color || "#9aadc8";
}
