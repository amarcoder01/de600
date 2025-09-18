/**
 * Utility functions for chart components to handle CSS custom properties and color parsing
 */

/**
 * Safely gets a CSS custom property value and converts it to a valid CSS color
 * Handles Tailwind CSS custom properties that store HSL values without hsl() wrapper
 */
export function getCSSColorValue(propertyName: string, fallback: string = '#000000'): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(propertyName)
      .trim();

    if (!value) {
      return fallback;
    }

    // If it's already a valid CSS color (starts with #, rgb, rgba, hsl, hsla)
    if (value.match(/^(#|rgb|rgba|hsl|hsla)/)) {
      return value;
    }

    // Handle Tailwind CSS custom properties that store HSL values without hsl() wrapper
    // Format: "215 20.2% 65.1%" -> "hsl(215 20.2% 65.1%)"
    if (value.match(/^\d+\s+\d+\.?\d*%\s+\d+\.?\d*%$/)) {
      return `hsl(${value})`;
    }

    // If it doesn't match expected patterns, return the fallback
    return fallback;
  } catch (error) {
    console.warn(`Failed to get CSS custom property ${propertyName}:`, error);
    return fallback;
  }
}

/**
 * Safe color values for chart components to avoid parsing errors
 */
export const CHART_COLORS = {
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#6b7280',
    muted: '#9ca3af',
  },
  
  // Background colors
  background: {
    primary: '#1a1a1a',
    secondary: '#2a2a2a',
    transparent: 'transparent',
  },
  
  // Chart colors
  chart: {
    up: '#10b981',
    down: '#ef4444',
    volume: '#8b5cf6',
    grid: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.2)',
  },
  
  // Crosshair colors
  crosshair: {
    line: '#8b5cf6',
    background: 'rgba(139, 92, 246, 0.1)',
  }
} as const;

/**
 * Gets a safe color value for chart components
 */
export function getChartColor(colorKey: keyof typeof CHART_COLORS.text | keyof typeof CHART_COLORS.background | keyof typeof CHART_COLORS.chart | keyof typeof CHART_COLORS.crosshair): string {
  if (colorKey in CHART_COLORS.text) {
    return CHART_COLORS.text[colorKey as keyof typeof CHART_COLORS.text];
  }
  if (colorKey in CHART_COLORS.background) {
    return CHART_COLORS.background[colorKey as keyof typeof CHART_COLORS.background];
  }
  if (colorKey in CHART_COLORS.chart) {
    return CHART_COLORS.chart[colorKey as keyof typeof CHART_COLORS.chart];
  }
  if (colorKey in CHART_COLORS.crosshair) {
    return CHART_COLORS.crosshair[colorKey as keyof typeof CHART_COLORS.crosshair];
  }
  return '#000000';
}
