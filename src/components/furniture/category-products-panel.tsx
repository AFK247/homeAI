"use client";

import Image from "next/image";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { Button } from "@/components/ui/button";
import type { FurnitureItem } from "@/db/types";
import { formatBdt } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/client";
import { rpc } from "@/server/rpc/client";

/*
 * Tap-a-pin modal body: a short "shop similar" list of real products in the pin's master
 * category. Each is a card — hotlinked vendor image, name, price, and a Buy link to the
 * vendor's product page (logs a buy_click). Shows a friendly note when the catalog has
 * nothing in this category yet.
 */
export function CategoryProductsPanel({
  categoryName,
  products,
}: {
  categoryName: string;
  products: FurnitureItem[];
}) {
  const { locale } = useTranslation();
  const title = categoryName.replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif font-bold text-foreground text-xl capitalize">{title}</h2>
        <p className="text-muted-foreground text-sm">
          {products.length > 0
            ? `${products.length} similar in local stores`
            : "No products in this category yet — coming soon."}
        </p>
      </div>

      {products.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {products.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <ImagePlaceholder className="size-full" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-foreground text-sm">{item.name}</div>
                <div className="text-muted-foreground text-xs">{item.brand ?? ""}</div>
                {item.priceBdt !== null ? (
                  <div className="font-semibold text-foreground text-sm">
                    {formatBdt(item.priceBdt, locale)}
                  </div>
                ) : null}
              </div>
              {item.productUrl ? (
                <Button
                  asChild
                  size="sm"
                  onClick={() =>
                    rpc.furniture
                      .logBuyClick({ furnitureItemId: item.id, condition: "new" })
                      .catch(() => {})
                  }
                >
                  <a href={item.productUrl} target="_blank" rel="noopener noreferrer">
                    Buy
                  </a>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-border border-dashed bg-muted/40 p-6 text-center text-muted-foreground text-sm">
          We're adding {title.toLowerCase()} options from local vendors soon.
        </div>
      )}
    </div>
  );
}
