export const colors = {
  bgCanvas: "#20262d",
  bgBase: "#272d35",
  bgRaised: "#303842",
  bgOverlay: "#38424d",
  bgSunken: "#1d232a",
  bgHover: "#404a56",
  bgActive: "#495463",

  fgPrimary: "#f4f7fb",
  fgSecondary: "#d0d7e1",
  fgTertiary: "#9aa6b5",
  fgQuaternary: "#748090",
  fgOnAccent: "#f7f8ff",

  accent: "#3b5ff5",
  accentHover: "#5478f7",
  accentActive: "#2a4ad4",
  accentSoft: "rgba(59, 95, 245, 0.12)",
  accentSoftHi: "rgba(59, 95, 245, 0.34)",

  premium: "#f6bb1b",
  aiLive: "#93e72a",

  success: "#78dca2",
  successSoft: "rgba(120, 220, 162, 0.16)",
  warning: "#f0c35f",
  warningSoft: "rgba(240, 195, 95, 0.16)",
  danger: "#f17b8b",
  dangerSoft: "rgba(241, 123, 139, 0.16)",
  info: "#84b7f7",
  infoSoft: "rgba(132, 183, 247, 0.16)",

  lineSubtle: "rgba(255, 255, 255, 0.07)",
  lineDefault: "rgba(255, 255, 255, 0.12)",
  lineStrong: "rgba(255, 255, 255, 0.2)",
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 999,
} as const;

export const spacing = {
  0: 0,
  px: 1,
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  8: 16,
  12: 24,
  16: 32,
  20: 40,
  24: 48,
  32: 64,
  40: 80,
  48: 96,
  64: 128,
} as const;

export const VIDEO = {
  WIDTH: 1920,
  HEIGHT: 1080,
  FPS: 30,
} as const;
