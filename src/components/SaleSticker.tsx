type SaleStickerProps = {
  /** Discount percent, e.g. 35 for "-35%" */
  discountPercent: number;
  /** "xs" = size selector chip, "sm" = product card, "md" = detail hero */
  size?: "xs" | "sm" | "md";
};

/**
 * Sale sticker: box per design (horizontal, 4px radius, bg #DB4444).
 * xs: tiny on size chip; sm: product card; md: detail hero.
 * Text: Space Grotesk, #FAFAFA.
 */
export function SaleSticker({ discountPercent, size = "md" }: SaleStickerProps) {
  const isXs = size === "xs";
  const isSm = size === "sm";
  return (
    <span
      aria-label={`${discountPercent}% off`}
      data-testid="sale-sticker"
      className={`z-10 flex items-center rounded bg-[#DB4444] text-[#FAFAFA] ${
        isXs
          ? "absolute right-1 top-1 py-0.5 px-1.5"
          : "absolute left-3 top-3 py-1 px-3"
      }`}
    >
      <span
        className={`font-space-grotesk font-normal tracking-normal ${
          isXs
            ? "text-[9px] leading-[12px]"
            : isSm
              ? "text-[12px] leading-[18px]"
              : "text-[12px] leading-[18px]"
        }`}
      >
        -{discountPercent}%
      </span>
    </span>
  );
}
