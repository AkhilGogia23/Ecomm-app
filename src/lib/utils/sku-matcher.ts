export interface ExtractedSku {
  sku: string;
  position: number;
  valid: boolean;
}

const FILENAME_PATTERNS = [
  /^(.+?)_(\d+)\.(jpg|jpeg|png|webp)$/i, // SKU_1.jpg
  /^(.+?)-(\d+)\.(jpg|jpeg|png|webp)$/i, // SKU-1.jpg
  /^(.+?)-(front|back|side|detail)\.(jpg|jpeg|png|webp)$/i, // SKU-front.jpg
  /^(.+?)_(front|back|side|detail)\.(jpg|jpeg|png|webp)$/i, // SKU_front.jpg
];

const POSITION_LABELS: Record<string, number> = {
  front: 1,
  back: 2,
  side: 3,
  detail: 4,
};

export function extractSkuFromFilename(filename: string): ExtractedSku {
  const trimmed = filename.trim();

  for (const pattern of FILENAME_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const sku = match[1].toUpperCase();
      const rawPosition = match[2].toLowerCase();
      const position = POSITION_LABELS[rawPosition] ?? parseInt(rawPosition, 10) ?? 1;
      return { sku, position: Number.isNaN(position) ? 1 : position, valid: true };
    }
  }

  return { sku: "", position: 0, valid: false };
}

export interface MatchableVariant {
  id: string;
  sku: string;
  productId: string;
}

export interface MatchResult {
  matched: { filename: string; sku: string; position: number; variantId: string; productId: string }[];
  unmatched: { filename: string; sku: string }[];
  invalid: { filename: string }[];
}

export function matchFilesToProducts(
  files: { name: string }[],
  variants: MatchableVariant[]
): MatchResult {
  const skuMap = new Map(variants.map((v) => [v.sku.toUpperCase(), v]));
  const result: MatchResult = { matched: [], unmatched: [], invalid: [] };

  for (const file of files) {
    const extracted = extractSkuFromFilename(file.name);
    if (!extracted.valid) {
      result.invalid.push({ filename: file.name });
      continue;
    }

    const variant = skuMap.get(extracted.sku);
    if (variant) {
      result.matched.push({
        filename: file.name,
        sku: extracted.sku,
        position: extracted.position,
        variantId: variant.id,
        productId: variant.productId,
      });
    } else {
      result.unmatched.push({ filename: file.name, sku: extracted.sku });
    }
  }

  return result;
}
