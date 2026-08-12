/**
 * The brand's next/font setup, defined once.
 *
 * This exact block had been copy-pasted into three apps' `layout.tsx` — same
 * variable names, same axes. The variable names matter: `tokens/fonts.css`
 * points `--font-sans` / `--font-serif` at them, so they are part of the
 * package's contract, not an implementation detail.
 *
 * Usage:
 *
 *   import { fraunces, instrumentSans } from "@ahumanflourish/brand/fonts";
 *
 *   <body className={`${fraunces.variable} ${instrumentSans.variable}`}>
 *
 * The variables must land on an element that wraps the whole tree — <body> is
 * the convention here. Putting them lower means `font-sans` resolves to nothing
 * above that point.
 */
import { Fraunces, Instrument_Sans } from "next/font/google";

/**
 * Fraunces, loaded with the three axes the brand actually uses. `SOFT` and
 * `WONK` are what give it the warmth and the slight quirk; `opsz` at 72 is the
 * display setting. See the `font-display` utility, which applies them.
 */
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

/** Instrument Sans — body, UI, labels. */
export const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});
