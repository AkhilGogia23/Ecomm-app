"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Skeleton from "@/components/ui/Skeleton";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imagePath: string;
  link: string | null;
}

export default function HeroCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/banners?position=HERO")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBanners(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[320px] w-full sm:h-[420px]" />;
  if (banners.length === 0) return null;

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      autoplay={{ delay: 5000, disableOnInteraction: false }}
      pagination={{ clickable: true }}
      loop={banners.length > 1}
      className="h-[320px] w-full sm:h-[420px]"
    >
      {banners.map((banner) => (
        <SwiperSlide key={banner.id}>
          <Link href={banner.link ?? "#"} className="relative block h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.imagePath} alt={banner.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-start justify-center bg-black/20 px-8 sm:px-16">
              <h2 className="max-w-md text-2xl font-semibold text-white sm:text-4xl">{banner.title}</h2>
              {banner.subtitle && <p className="mt-2 text-sm text-white/90 sm:text-base">{banner.subtitle}</p>}
            </div>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
