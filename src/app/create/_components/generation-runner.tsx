"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { handleORPCError } from "@/lib/utils/error";
import { rpc } from "@/server/rpc/client";
import { useCreateStore } from "../_modules/create-store";

/*
 * Client island: runs the redesign once on mount, then redirects to the real
 * /result/[designId]. Follows the reference API convention — a direct
 * `await rpc.design.generate(...)` inside startTransition, with try/catch +
 * handleORPCError — not a useMutation wrapper. Cloudflare returns synchronously,
 * so there's no polling.
 */
export function GenerationRunner() {
  const router = useRouter();
  const started = useRef(false);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const reset = useCreateStore((s) => s.reset);

  function run() {
    const s = useCreateStore.getState();
    if (!s.image) {
      router.replace("/create");
      return;
    }
    const image = s.image;
    setFailed(false);
    startTransition(async () => {
      try {
        const design = await rpc.design.generate({
          image,
          imageMime: s.imageMime,
          roomType: s.roomType,
          style: s.style,
          prompt: s.prompt || undefined,
          isPanorama: s.isPanorama,
        });
        reset();
        router.replace(`/result/${design.id}`);
      } catch (error) {
        setFailed(true);
        handleORPCError(error);
      }
    });
  }

  // Fire once on mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run-once on mount
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, []);

  if (failed && !pending) {
    return (
      <>
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-foreground">কিছু একটা ভুল হয়েছে</h1>
          <p className="mt-2.5 text-brand-body">ছবি সাজানো যায়নি। আবার চেষ্টা করুন।</p>
        </div>
        <Button size="lg" onClick={run}>
          আবার চেষ্টা করুন
        </Button>
      </>
    );
  }

  return (
    <>
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
          <div className="h-full w-[62%] animate-pulse rounded-full bg-primary" />
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
    </>
  );
}
