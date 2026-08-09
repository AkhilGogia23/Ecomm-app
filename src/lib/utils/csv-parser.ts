import Papa from "papaparse";

export interface CsvRow {
  [key: string]: string;
}

export function parseCSV(file: File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err: Error) => reject(err),
    });
  });
}

export function parseCsvString(csvText: string): CsvRow[] {
  const results = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  return results.data;
}

/**
 * XLSX is not supported without an additional binary parser dependency;
 * callers should export/save as CSV. This throws a clear error instead of
 * silently failing.
 */
export async function parseXLSX(buffer: Buffer): Promise<CsvRow[]> {
  if (buffer.length >= 0) {
    throw new Error("XLSX parsing is not supported. Please upload a CSV file.");
  }
  return [];
}

const PRODUCT_TEMPLATE_HEADERS = [
  "title",
  "sku",
  "description",
  "short_description",
  "base_price",
  "sale_price",
  "category_slugs",
  "collection_slugs",
  "tags",
  "status",
  "size",
  "color",
  "variant_sku",
  "stock",
];

const INVENTORY_TEMPLATE_HEADERS = ["variant_sku", "new_stock", "reason"];

export function generateCSVTemplate(type: "products" | "inventory"): string {
  if (type === "inventory") {
    const rows = [
      INVENTORY_TEMPLATE_HEADERS,
      ["SHIRT-001-M-WHITE", "50", "Stock recount"],
      ["SHIRT-001-L-WHITE", "30", "Restock"],
    ];
    return Papa.unparse(rows);
  }

  const rows = [
    PRODUCT_TEMPLATE_HEADERS,
    [
      "Classic White Oxford Shirt",
      "SHIRT-001",
      "A timeless white Oxford shirt",
      "Timeless cotton shirt",
      "1999",
      "1599",
      "men-shirts",
      "bestsellers",
      "cotton,formal",
      "ACTIVE",
      "M",
      "White",
      "SHIRT-001-M-WHITE",
      "25",
    ],
    [
      "Indigo Slim Fit Jeans",
      "JEANS-001",
      "Slim fit denim jeans",
      "Stretch denim jeans",
      "2999",
      "2399",
      "men-jeans",
      "new-arrivals",
      "cotton,casual",
      "ACTIVE",
      "L",
      "Indigo",
      "JEANS-001-L-INDIGO",
      "20",
    ],
  ];

  return Papa.unparse(rows);
}

export interface RowValidationError {
  row: number;
  field: string;
  message: string;
}

export interface BulkValidationResult {
  valid: CsvRow[];
  invalid: { row: number; data: CsvRow; errors: RowValidationError[] }[];
  warnings: { row: number; message: string }[];
}

export function validateBulkProductRows(rows: CsvRow[]): BulkValidationResult {
  const result: BulkValidationResult = { valid: [], invalid: [], warnings: [] };
  const seenVariantSkus = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // account for header row
    const errors: RowValidationError[] = [];

    if (!row.title?.trim()) {
      errors.push({ row: rowNum, field: "title", message: "Title is required" });
    }
    if (!row.sku?.trim()) {
      errors.push({ row: rowNum, field: "sku", message: "SKU is required" });
    }
    // Rows may share the same product `sku` to define multiple variants of one
    // product; only `variant_sku` needs to be unique per row.
    const variantSku = row.variant_sku?.trim().toUpperCase();
    if (variantSku) {
      if (seenVariantSkus.has(variantSku)) {
        errors.push({ row: rowNum, field: "variant_sku", message: "Duplicate variant SKU in file" });
      } else {
        seenVariantSkus.add(variantSku);
      }
    }

    const basePrice = Number(row.base_price);
    if (!row.base_price || Number.isNaN(basePrice) || basePrice <= 0) {
      errors.push({ row: rowNum, field: "base_price", message: "Base price must be a positive number" });
    }

    if (row.sale_price) {
      const salePrice = Number(row.sale_price);
      if (Number.isNaN(salePrice) || salePrice < 0) {
        errors.push({ row: rowNum, field: "sale_price", message: "Sale price must be a valid number" });
      } else if (salePrice >= basePrice) {
        result.warnings.push({ row: rowNum, message: "Sale price is not lower than base price" });
      }
    }

    if (errors.length > 0) {
      result.invalid.push({ row: rowNum, data: row, errors });
    } else {
      result.valid.push(row);
    }
  });

  return result;
}
