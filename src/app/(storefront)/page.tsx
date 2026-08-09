import HeroCarousel from "@/components/storefront/home/HeroCarousel";
import FeaturedCategories from "@/components/storefront/home/FeaturedCategories";
import ProductGridSection from "@/components/storefront/home/ProductGridSection";
import SecondaryBanner from "@/components/storefront/home/SecondaryBanner";
import NewsletterSection from "@/components/storefront/home/NewsletterSection";

export default function HomePage() {
  return (
    <div className="space-y-12 pb-16">
      <HeroCarousel />

      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6">
        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Shop by Category</h2>
          <FeaturedCategories />
        </section>

        <ProductGridSection filter="newArrival" title="New Arrivals" />

        <SecondaryBanner />

        <ProductGridSection filter="bestseller" title="Bestsellers" />

        <NewsletterSection />

        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Follow us on Instagram</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-gray-100 dark:bg-neutral-800" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
