import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/*
 * Auth screen (design). Facebook + Google prominent (BD audience), plus email/password.
 * Presentational for Stage C; Better Auth wired in Stage D.
 */
export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" withWordmark={false} />
          <h1 className="font-serif font-extrabold text-2xl text-foreground">লগ ইন বা সাইন আপ করুন</h1>
          <p className="text-brand-body text-sm">আপনার ডিজাইন সংরক্ষণ করুন ও আরও ফ্রি ডিজাইন পান।</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full bg-[#1877F2] text-white hover:bg-[#1877F2]/90">
            ফেসবুক দিয়ে চালিয়ে যান
          </Button>
          <Button size="lg" variant="outline" className="w-full">
            গুগল দিয়ে চালিয়ে যান
          </Button>
        </div>

        <div className="my-6 flex items-center gap-3 text-brand-faint text-xs">
          <span className="h-px flex-1 bg-border" /> অথবা <span className="h-px flex-1 bg-border" />
        </div>

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">ইমেইল</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <Button size="lg" className="mt-1 w-full">
            চালিয়ে যান
          </Button>
        </form>

        <p className="mt-6 text-center text-brand-faint text-xs">
          চালিয়ে গেলে আপনি আমাদের{" "}
          <Link href="#" className="text-primary">
            শর্তাবলী
          </Link>{" "}
          মেনে নিচ্ছেন।
        </p>
      </div>
    </main>
  );
}
