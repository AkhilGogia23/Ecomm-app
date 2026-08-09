"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imagePath: string;
  link: string | null;
}

export default function SecondaryBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    fetch("/api/banners?position=SECONDARY")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.length > 0) setBanner(json.data[0]);
      });
  }, []);

  if (!banner) return null;

  return (
    <Link href={banner.link ?? "#"} className="relative block h-48 w-full overflow-hidden rounded-xl sm:h-64">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.imagePath} alt={banner.title} className="h-full w-full object-cover" />
      <div className="absolute inset-0 flex flex-col items-start justify-center bg-black/20 px-8">
        <h3 className="text-xl font-semibold text-white sm:text-2xl">{banner.title}</h3>
        {banner.subtitle && <p className="mt-1 text-sm text-white/90">{banner.subtitle}</p>}
      </div>
    </Link>
  );
}
