export const CHART_COLORS = {
  background: {
    primary: "#0b0f1a",
  },
  text: {
    primary: "#e5e7eb",
    secondary: "#9ca3af",
  },
  chart: {
    up: "#16a34a",
    down: "#dc2626",
    volume: "#60a5fa",
    grid: "#1f2937",
    border: "#374151",
  },
  crosshair: {
    line: "#6b7280",
  },
} as const

export function getCSSColorValue(cssVariableName: string, fallback: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback
  }

  try {
    const root = document.documentElement
    const value = getComputedStyle(root).getPropertyValue(cssVariableName).trim()
    return value || fallback
  } catch {
    return fallback
  }
}


