import type {
  Product,
  ProductVariant,
  ProductImage,
  Category,
  Tag,
  Order,
  OrderItem,
  OrderTimeline,
  User,
} from "@prisma/client";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ProductWithRelations = Product & {
  variants: ProductVariant[];
  images: ProductImage[];
  categories: { category: Category }[];
  tags: { tag: Tag }[];
};

export type OrderWithRelations = Order & {
  items: OrderItem[];
  timeline: OrderTimeline[];
  customer: User;
};

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export interface BulkUploadResult {
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: { row: number; field: string; message: string }[];
}

export interface ImageUploadResult {
  matched: number;
  unmatched: string[];
  invalid: string[];
  uploaded: number;
  failed: number;
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  newCustomers: number;
  lowStockCount: number;
  topProducts: {
    productId: string;
    title: string;
    unitsSold: number;
    revenue: number;
  }[];
}
