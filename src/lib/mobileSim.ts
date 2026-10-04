import type { MobileLegibilityBlock, MobileSimResult, TextBlock } from "./types";

// Real-world approximate width (CSS px) of a thumbnail inside the YouTube
// mobile app's home/subscriptions feed card.
export const MOBILE_FEED_WIDTH = 168;

// Minimum rendered text height (px) most people can still read at a glance
// on a phone screen from normal arm's-length distance.
const MIN_LEGIBLE_PX = 7;
// A headline needs to clear a higher bar to survive the "0.5 second scroll
// glance" test — small or thin headline text gets scrolled past unread.
const HEADLINE_GLANCE_PX = 11;

export function simulateMobileLegibility(
  imageWidth: number,
  imageHeight: number,
  textBlocks: TextBlock[]
): MobileSimResult {
  const scale = imageWidth > 0 ? MOBILE_FEED_WIDTH / imageWidth : 0;
  const displayWidth = MOBILE_FEED_WIDTH;
  const displayHeight = Math.round(imageHeight * scale);

  const blocks: MobileLegibilityBlock[] = textBlocks.map((t) => {
    const scaledPx = Math.round(t.heightRatio * imageHeight * scale * 10) / 10;
    const threshold = t.hierarchy === "headline" ? HEADLINE_GLANCE_PX : MIN_LEGIBLE_PX;
    return {
      id: t.id,
      text: t.text,
      hierarchy: t.hierarchy,
      scaledPx,
      legible: scaledPx >= threshold,
    };
  });

  const headlineBlocks = blocks.filter((b) => b.hierarchy === "headline");
  const headlinePass = headlineBlocks.length === 0 ? null : headlineBlocks.some((b) => b.legible);

  return {
    scale,
    displayWidth,
    displayHeight,
    blocks,
    headlinePass,
    survivingCount: blocks.filter((b) => b.legible).length,
    totalCount: blocks.length,
  };
}
