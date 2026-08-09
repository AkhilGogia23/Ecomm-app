export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ADMIN_ROLES: UserRole[] = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.STAFF,
];

export const PRODUCT_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;

export const ORDER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  RETURNED: "RETURNED",
  REFUNDED: "REFUNDED",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

export const BANNER_POSITION = {
  HERO: "HERO",
  SECONDARY: "SECONDARY",
  SIDEBAR: "SIDEBAR",
  POPUP: "POPUP",
} as const;

export const COUPON_TYPE = {
  PERCENTAGE: "PERCENTAGE",
  FIXED: "FIXED",
  FREE_SHIPPING: "FREE_SHIPPING",
} as const;

export const ADDRESS_LABEL = {
  HOME: "HOME",
  WORK: "WORK",
  OTHER: "OTHER",
} as const;

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  EXPORT: "EXPORT",
  BULK_IMPORT: "BULK_IMPORT",
} as const;

export const AUDIT_ENTITIES = {
  PRODUCT: "PRODUCT",
  ORDER: "ORDER",
  USER: "USER",
  CATEGORY: "CATEGORY",
  COLLECTION: "COLLECTION",
  COUPON: "COUPON",
  BANNER: "BANNER",
  PAGE: "PAGE",
  SETTING: "SETTING",
  REVIEW: "REVIEW",
  INVENTORY: "INVENTORY",
} as const;

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: [
    "products",
    "orders",
    "customers",
    "inventory",
    "coupons",
    "content",
    "reviews",
    "analytics",
    "settings",
    "audit",
  ],
  MANAGER: [
    "products",
    "orders",
    "customers",
    "inventory",
    "coupons",
    "content",
    "reviews",
    "analytics",
  ],
  STAFF: ["products:read", "orders:update_status", "inventory", "reviews"],
  CUSTOMER: [],
};

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL"];
