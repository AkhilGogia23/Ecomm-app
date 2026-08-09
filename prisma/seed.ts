import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@store.com" },
    update: {},
    create: {
      email: "admin@store.com",
      passwordHash,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: true,
    },
  });
  console.log("✅ Super admin seeded:", admin.email);
  return admin;
}

async function seedCategories() {
  const tree: Record<string, string[]> = {
    Men: ["Shirts", "T-Shirts", "Pants", "Jeans", "Jackets"],
    Women: ["Dresses", "Tops", "Skirts", "Kurtas", "Sarees"],
    Kids: ["Boys", "Girls"],
    Accessories: ["Bags", "Belts", "Scarves", "Jewellery"],
  };

  const categoryMap: Record<string, string> = {};
  let sortOrder = 0;

  for (const [parentName, children] of Object.entries(tree)) {
    const parentSlug = slugify(parentName);
    const parent = await prisma.category.upsert({
      where: { slug: parentSlug },
      update: {},
      create: {
        name: parentName,
        slug: parentSlug,
        level: 0,
        sortOrder: sortOrder++,
        isActive: true,
      },
    });
    categoryMap[parentName] = parent.id;

    let childSort = 0;
    for (const childName of children) {
      const childSlug = slugify(`${parentName}-${childName}`);
      const child = await prisma.category.upsert({
        where: { slug: childSlug },
        update: {},
        create: {
          name: childName,
          slug: childSlug,
          parentId: parent.id,
          level: 1,
          sortOrder: childSort++,
          isActive: true,
        },
      });
      categoryMap[`${parentName}>${childName}`] = child.id;
    }
  }

  console.log("✅ Categories seeded:", Object.keys(categoryMap).length);
  return categoryMap;
}

async function seedCollections() {
  const collections = [
    { name: "New Arrivals", description: "Fresh styles just landed" },
    { name: "Summer Sale", description: "Beat the heat with hot discounts" },
    { name: "Bestsellers", description: "Our most loved pieces" },
    { name: "Festive Edit", description: "Celebrate in style" },
  ];

  const collectionMap: Record<string, string> = {};
  let sortOrder = 0;

  for (const c of collections) {
    const slug = slugify(c.name);
    const collection = await prisma.collection.upsert({
      where: { slug },
      update: {},
      create: {
        name: c.name,
        slug,
        description: c.description,
        type: "MANUAL",
        isActive: true,
        sortOrder: sortOrder++,
      },
    });
    collectionMap[c.name] = collection.id;
  }

  console.log("✅ Collections seeded:", Object.keys(collectionMap).length);
  return collectionMap;
}

async function seedTags() {
  const tags = [
    "cotton",
    "silk",
    "linen",
    "casual",
    "formal",
    "party-wear",
    "office-wear",
    "ethnic",
    "western",
    "summer",
    "winter",
    "festive",
    "handloom",
    "organic",
  ];

  const tagMap: Record<string, string> = {};
  for (const name of tags) {
    const slug = slugify(name);
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    tagMap[name] = tag.id;
  }

  console.log("✅ Tags seeded:", Object.keys(tagMap).length);
  return tagMap;
}

const SIZES = ["S", "M", "L", "XL"];
const COLORS: Record<string, string> = {
  White: "#FFFFFF",
  Black: "#000000",
  Indigo: "#3F51B5",
  Maroon: "#800000",
  Beige: "#F5F5DC",
};

async function seedProducts(
  categoryMap: Record<string, string>,
  collectionMap: Record<string, string>,
  tagMap: Record<string, string>,
  adminId: string
) {
  const products = [
    {
      title: "Classic White Oxford Shirt",
      sku: "SHIRT-001",
      basePrice: 1999,
      salePrice: 1599,
      description:
        "<p>A timeless white Oxford shirt crafted from breathable cotton, perfect for office wear or smart-casual outings.</p>",
      shortDescription: "Timeless cotton Oxford shirt for everyday elegance.",
      categories: ["Men>Shirts"],
      collections: ["Bestsellers"],
      tags: ["cotton", "formal", "office-wear"],
      colors: ["White", "Black"],
      isFeatured: true,
      isBestseller: true,
    },
    {
      title: "Indigo Slim Fit Jeans",
      sku: "JEANS-001",
      basePrice: 2999,
      salePrice: 2399,
      description:
        "<p>Slim fit denim jeans in classic indigo wash, made with stretch cotton for all-day comfort.</p>",
      shortDescription: "Stretch denim jeans in classic indigo wash.",
      categories: ["Men>Jeans"],
      collections: ["New Arrivals"],
      tags: ["cotton", "casual", "western"],
      colors: ["Indigo", "Black"],
      isNewArrival: true,
    },
    {
      title: "Floral Printed Kurta Set",
      sku: "KURTA-001",
      basePrice: 3499,
      salePrice: 2799,
      description:
        "<p>A hand-block floral printed kurta set with matching bottoms, woven from pure cotton for festive comfort.</p>",
      shortDescription: "Hand-block printed cotton kurta set.",
      categories: ["Women>Kurtas"],
      collections: ["Festive Edit"],
      tags: ["cotton", "ethnic", "festive", "handloom"],
      colors: ["Maroon", "Beige"],
      isFeatured: true,
      isNewArrival: true,
    },
    {
      title: "Oversized Graphic T-Shirt",
      sku: "TSHIRT-001",
      basePrice: 1299,
      salePrice: null,
      description:
        "<p>An oversized fit graphic tee made from 100% organic cotton, designed for streetwear-inspired comfort.</p>",
      shortDescription: "Oversized organic cotton graphic tee.",
      categories: ["Men>T-Shirts"],
      collections: ["New Arrivals", "Bestsellers"],
      tags: ["cotton", "casual", "organic", "summer"],
      colors: ["White", "Black"],
      isNewArrival: true,
      isBestseller: true,
    },
    {
      title: "Handwoven Silk Scarf",
      sku: "SCARF-001",
      basePrice: 4999,
      salePrice: 3999,
      description:
        "<p>A luxurious handwoven silk scarf featuring traditional motifs, perfect for elevating any festive ensemble.</p>",
      shortDescription: "Luxurious handwoven silk scarf with traditional motifs.",
      categories: ["Accessories>Scarves"],
      collections: ["Festive Edit"],
      tags: ["silk", "handloom", "festive", "party-wear"],
      colors: ["Maroon", "Beige"],
      isFeatured: true,
    },
  ];

  let count = 0;
  for (const p of products) {
    const slug = slugify(p.title);
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        title: p.title,
        slug,
        sku: p.sku,
        description: p.description,
        shortDescription: p.shortDescription,
        basePrice: p.basePrice,
        salePrice: p.salePrice ?? undefined,
        currency: "INR",
        status: "ACTIVE",
        isFeatured: !!p.isFeatured,
        isNewArrival: !!p.isNewArrival,
        isBestseller: !!p.isBestseller,
        taxRate: 5,
        publishedAt: new Date(),
        createdById: adminId,
        categories: {
          create: p.categories.map((c) => ({
            categoryId: categoryMap[c],
          })),
        },
        collections: {
          create: p.collections.map((c) => ({
            collectionId: collectionMap[c],
          })),
        },
        tags: {
          create: p.tags.map((t) => ({ tagId: tagMap[t] })),
        },
      },
    });

    let variantSort = 0;
    for (const color of p.colors) {
      for (const size of SIZES) {
        const variantSku = `${p.sku}-${size}-${color.toUpperCase()}`;
        await prisma.productVariant.upsert({
          where: { sku: variantSku },
          update: {},
          create: {
            productId: product.id,
            sku: variantSku,
            size,
            color,
            colorHex: COLORS[color],
            stock: 25,
            lowStockThreshold: 5,
            isActive: true,
            sortOrder: variantSort++,
          },
        });
      }
    }

    count++;
  }

  console.log("✅ Products seeded:", count, "(with variants)");
}

async function seedSiteSettings(adminId: string) {
  const settings: { key: string; value: unknown; group: string }[] = [
    // GENERAL
    { key: "store_name", value: "My Clothing Store", group: "GENERAL" },
    {
      key: "store_tagline",
      value: "Wear Your Story",
      group: "GENERAL",
    },
    { key: "store_email", value: "hello@mystore.com", group: "GENERAL" },
    { key: "store_phone", value: "+91-9876543210", group: "GENERAL" },
    {
      key: "store_address",
      value: {
        line1: "123 Fashion Street",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      },
      group: "GENERAL",
    },
    { key: "default_currency", value: "INR", group: "GENERAL" },
    { key: "currency_symbol", value: "₹", group: "GENERAL" },
    { key: "timezone", value: "Asia/Kolkata", group: "GENERAL" },
    {
      key: "announcement_text",
      value: "Free shipping on orders above ₹999",
      group: "GENERAL",
    },
    { key: "announcement_active", value: true, group: "GENERAL" },
    // SEO
    {
      key: "meta_title_template",
      value: "%s | My Clothing Store",
      group: "SEO",
    },
    {
      key: "default_meta_description",
      value: "Shop the latest fashion trends for men, women and kids.",
      group: "SEO",
    },
    { key: "google_analytics_id", value: "", group: "SEO" },
    // SHIPPING
    {
      key: "shipping_rules",
      value: [
        { name: "Free Shipping", type: "FREE_ABOVE", threshold: 999, rate: 0, active: true },
        { name: "Standard Shipping", type: "FLAT", threshold: null, rate: 99, active: true },
        { name: "Express Shipping", type: "FLAT", threshold: null, rate: 199, active: true },
      ],
      group: "SHIPPING",
    },
    // PAYMENT
    { key: "razorpay_key_id", value: "", group: "PAYMENT" },
    { key: "razorpay_key_secret", value: "", group: "PAYMENT" },
    { key: "cod_enabled", value: true, group: "PAYMENT" },
    { key: "cod_limit", value: 5000, group: "PAYMENT" },
    // EMAIL
    { key: "smtp_host", value: "smtp.gmail.com", group: "EMAIL" },
    { key: "smtp_port", value: "587", group: "EMAIL" },
    { key: "smtp_user", value: "", group: "EMAIL" },
    { key: "smtp_pass", value: "", group: "EMAIL" },
    { key: "email_from_name", value: "My Clothing Store", group: "EMAIL" },
    { key: "email_from_address", value: "", group: "EMAIL" },
    // SOCIAL
    { key: "social_instagram", value: "https://instagram.com/mystore", group: "SOCIAL" },
    { key: "social_facebook", value: "https://facebook.com/mystore", group: "SOCIAL" },
    { key: "social_twitter", value: "https://twitter.com/mystore", group: "SOCIAL" },
    { key: "social_youtube", value: "https://youtube.com/mystore", group: "SOCIAL" },
    { key: "social_whatsapp", value: "+919876543210", group: "SOCIAL" },
    // TAX
    { key: "default_tax_rate", value: 5, group: "TAX" },
    { key: "gstin", value: "27AAAAA0000A1Z5", group: "TAX" },
    { key: "tax_included_in_price", value: true, group: "TAX" },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: {
        key: s.key,
        value: JSON.stringify(s.value),
        group: s.group,
        updatedById: adminId,
      },
    });
  }

  console.log("✅ Site settings seeded:", settings.length);
}

async function seedEmailTemplates() {
  const templates = [
    {
      slug: "welcome",
      name: "Welcome Email",
      subject: "Welcome to {{store_name}}, {{customer_name}}!",
      bodyHtml:
        "<div><h1>Welcome, {{customer_name}}!</h1><p>Thanks for joining {{store_name}}. Explore our latest collections and enjoy shopping.</p></div>",
    },
    {
      slug: "order-confirmation",
      name: "Order Confirmation",
      subject: "Your order {{order_number}} is confirmed",
      bodyHtml:
        "<div><h1>Thank you for your order!</h1><p>Hi {{customer_name}}, your order {{order_number}} totaling {{order_total}} has been confirmed.</p></div>",
    },
    {
      slug: "shipping-update",
      name: "Shipping Update",
      subject: "Your order {{order_number}} has shipped",
      bodyHtml:
        "<div><h1>Your order is on its way!</h1><p>Track your shipment {{tracking_number}} using this link: {{tracking_url}}</p></div>",
    },
    {
      slug: "password-reset",
      name: "Password Reset",
      subject: "Reset your {{store_name}} password",
      bodyHtml:
        "<div><h1>Reset your password</h1><p>Click <a href=\"{{reset_link}}\">here</a> to reset your password. This link expires in 1 hour.</p></div>",
    },
    {
      slug: "review-request",
      name: "Review Request",
      subject: "How was your order, {{customer_name}}?",
      bodyHtml:
        "<div><h1>We'd love your feedback</h1><p>Please take a moment to review your recent purchase: {{product_title}}.</p></div>",
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        slug: t.slug,
        name: t.name,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        isActive: true,
      },
    });
  }

  console.log("✅ Email templates seeded:", templates.length);
}

async function seedNavigation() {
  const headerItems = [
    { label: "New Arrivals", url: "/collection/new-arrivals" },
    { label: "Men", url: "/category/men" },
    { label: "Women", url: "/category/women" },
    { label: "Kids", url: "/category/kids" },
    { label: "Accessories", url: "/category/accessories" },
    { label: "Sale", url: "/collection/summer-sale" },
  ];

  const footerItems = [
    { label: "About", url: "/about" },
    { label: "Contact", url: "/contact" },
    { label: "FAQ", url: "/faq" },
    { label: "Shipping Policy", url: "/shipping-policy" },
    { label: "Return Policy", url: "/return-policy" },
    { label: "Terms", url: "/terms" },
    { label: "Privacy", url: "/privacy" },
  ];

  let sortOrder = 0;
  for (const item of headerItems) {
    const existing = await prisma.navMenuItem.findFirst({
      where: { label: item.label, position: "HEADER" },
    });
    if (!existing) {
      await prisma.navMenuItem.create({
        data: { ...item, position: "HEADER", sortOrder: sortOrder++, isActive: true },
      });
    }
  }

  sortOrder = 0;
  for (const item of footerItems) {
    const existing = await prisma.navMenuItem.findFirst({
      where: { label: item.label, position: "FOOTER" },
    });
    if (!existing) {
      await prisma.navMenuItem.create({
        data: { ...item, position: "FOOTER", sortOrder: sortOrder++, isActive: true },
      });
    }
  }

  console.log(
    "✅ Navigation seeded:",
    headerItems.length,
    "header +",
    footerItems.length,
    "footer"
  );
}

async function seedPages() {
  const pages = [
    {
      title: "About Us",
      slug: "about",
      content:
        "<h1>About My Clothing Store</h1><p>We are a Mumbai-based clothing brand dedicated to bringing you quality fashion at honest prices. Founded with a passion for craftsmanship, we source sustainable fabrics and work with skilled artisans across India.</p>",
    },
    {
      title: "Contact Us",
      slug: "contact",
      content:
        "<h1>Contact Us</h1><p>Have a question? Reach out to us at hello@mystore.com or call +91-9876543210. Our support team is available Monday to Saturday, 10am-7pm IST.</p>",
    },
    {
      title: "FAQ",
      slug: "faq",
      content:
        "<h1>Frequently Asked Questions</h1><h3>How do I track my order?</h3><p>You can track your order from the Orders section in your account.</p><h3>What is your return policy?</h3><p>We accept returns within 7 days of delivery for unused items with tags attached.</p>",
    },
    {
      title: "Shipping Policy",
      slug: "shipping-policy",
      content:
        "<h1>Shipping Policy</h1><p>We offer free shipping on orders above ₹999. Standard shipping costs ₹99 and takes 4-7 business days. Express shipping costs ₹199 and takes 2-3 business days.</p>",
    },
    {
      title: "Return Policy",
      slug: "return-policy",
      content:
        "<h1>Return Policy</h1><p>Items can be returned within 7 days of delivery, provided they are unused, unwashed, and have all original tags attached. Refunds are processed within 5-7 business days of receiving the returned item.</p>",
    },
    {
      title: "Terms & Conditions",
      slug: "terms",
      content:
        "<h1>Terms & Conditions</h1><p>By using this website, you agree to our terms of service. All content on this site is the property of My Clothing Store and may not be reproduced without permission.</p>",
    },
    {
      title: "Privacy Policy",
      slug: "privacy",
      content:
        "<h1>Privacy Policy</h1><p>We respect your privacy and are committed to protecting your personal data. We only collect information necessary to process your orders and improve your shopping experience.</p>",
    },
  ];

  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        title: p.title,
        slug: p.slug,
        content: p.content,
        isPublished: true,
      },
    });
  }

  console.log("✅ Static pages seeded:", pages.length);
}

async function seedBanners() {
  const banners = [
    {
      title: "New Season Arrivals",
      subtitle: "Discover the latest trends",
      imagePath: "/uploads/banners/placeholder-hero-1.jpg",
      link: "/collection/new-arrivals",
      position: "HERO",
      sortOrder: 0,
    },
    {
      title: "Summer Sale — Up to 40% Off",
      subtitle: "Limited time only",
      imagePath: "/uploads/banners/placeholder-hero-2.jpg",
      link: "/collection/summer-sale",
      position: "HERO",
      sortOrder: 1,
    },
    {
      title: "Festive Edit",
      subtitle: "Celebrate in style",
      imagePath: "/uploads/banners/placeholder-secondary-1.jpg",
      link: "/collection/festive-edit",
      position: "SECONDARY",
      sortOrder: 0,
    },
  ];

  for (const b of banners) {
    const existing = await prisma.banner.findFirst({ where: { title: b.title } });
    if (!existing) {
      await prisma.banner.create({ data: { ...b, isActive: true } });
    }
  }

  console.log("✅ Banners seeded:", banners.length);
}

async function main() {
  console.log("🌱 Starting seed...");

  const admin = await seedAdmin();
  const categoryMap = await seedCategories();
  const collectionMap = await seedCollections();
  const tagMap = await seedTags();
  await seedProducts(categoryMap, collectionMap, tagMap, admin.id);
  await seedSiteSettings(admin.id);
  await seedEmailTemplates();
  await seedNavigation();
  await seedPages();
  await seedBanners();

  console.log("\n🎉 Seed complete!");
  console.log("   Admin login: admin@store.com / Admin@123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
