"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SiteHeader } from "@/components/layout/site-header";

/*
 * Step 3 (interim) — Generating. Matches the design's spinner + progress + tip.
 * In Stage D this polls design.status; here it simulates completion and redirects.
 */
export default function GeneratingPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/result/a3f9"), 2600);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <>
      <SiteHeader showNav={false} />
      <main className="flex flex-1 flex-col items-center gap-7 bg-gradient-to-b from-background to-secondary/40 px-6 py-20 text-center">
        <div className="relative size-32">
          <div className="absolute inset-0 rounded-full border-[6px] border-primary/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-[6px] border-transparent border-t-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-13 animate-pulse items-center justify-center rounded-2xl bg-primary p-3 font-serif font-extrabold text-2xl text-primary-foreground">
              H
            </div>
          </div>
        </div>
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-foreground">আপনার ঘর সাজানো হচ্ছে</h1>
          <p className="mt-2.5 text-brand-body">একটু অপেক্ষা করুন — সাধারণত ১৫–৩০ সেকেন্ড সময় লাগে।</p>
        </div>
        <div className="w-full max-w-md">
          <div className="h-2.5 overflow-hidden rounded-full bg-primary/10">
            <div className="h-full w-[62%] rounded-full bg-primary" />
          </div>
          <p className="mt-3 font-semibold text-secondary-foreground text-sm">আসবাব বসানো হচ্ছে...</p>
        </div>
        <div className="flex max-w-md items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary font-serif font-bold text-primary">
            i
          </div>
          <p className="text-left text-brand-body text-sm leading-relaxed">
            জানেন কি? প্রতিটি আসবাবের সাথে দেশি ব্র্যান্ড ও পুরনো বাজারের দাম দেখাবে।
          </p>
        </div>
      </main>
    </>
  );
}
