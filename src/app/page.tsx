import { Button } from "@/components/ui/button";

// Placeholder root — replaced by the real landing screen in Phase 1C.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-serif text-2xl font-extrabold text-primary-foreground shadow-lg">
          H
        </div>
        <span className="font-serif text-3xl font-extrabold text-foreground">হোম এআই</span>
      </div>
      <p className="max-w-md font-serif text-2xl font-bold leading-snug text-foreground">
        একটি টাকা খরচের আগেই দেখুন আপনার ঘরের নতুন রূপ
      </p>
      <p className="max-w-md text-brand-body">
        ঘরের ছবি তুলুন, পছন্দের স্টাইল বাছুন — এআই মুহূর্তেই সাজিয়ে দেবে, প্রতিটি আসবাবের দামসহ।
      </p>
      <Button size="lg">ছবি দিয়ে শুরু করুন</Button>
      <p className="text-sm text-brand-gold">✓ ৫টি ডিজাইন ফ্রি · scaffold OK</p>
    </main>
  );
}
