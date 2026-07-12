import Link from "next/link";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { ROOM_OPTIONS, STYLE_OPTIONS } from "@/config/catalog";
import { mockSavedDesigns } from "@/lib/mock-data";

/*
 * Saved designs gallery (design). Stage C renders mock; Stage D fetches by userId (isSaved).
 */
export default function DesignsPage() {
  const designs = mockSavedDesigns;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-serif font-extrabold text-3xl text-foreground">আমার ডিজাইন</h1>
          <Button asChild>
            <Link href="/create">নতুন ডিজাইন</Link>
          </Button>
        </div>

        {designs.length === 0 ? (
          <p className="mt-16 text-center text-brand-body">এখনো কোনো ডিজাইন সংরক্ষণ করেননি।</p>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => {
              const style = STYLE_OPTIONS.find((s) => s.value === d.style)?.bn ?? d.style;
              const room = ROOM_OPTIONS.find((r) => r.value === d.roomType)?.bn ?? d.roomType;
              return (
                <Link
                  key={d.id}
                  href={`/result/${d.id}`}
                  className="overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <ImagePlaceholder className="h-44" />
                  <div className="p-4">
                    <div className="font-bold text-foreground">{style}</div>
                    <div className="text-muted-foreground text-sm">{room}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
