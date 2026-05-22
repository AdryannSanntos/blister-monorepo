import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";

const geist = loadGeist("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const geistMono = loadGeistMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

const instrumentSerif = loadInstrumentSerif("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

export const fontFamily = {
  sans: geist.fontFamily,
  mono: geistMono.fontFamily,
  serif: instrumentSerif.fontFamily,
} as const;
