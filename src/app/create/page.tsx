import { Camera, Globe, Upload } from "lucide-react";
import Link from "next/link";
import { StepIndicator } from "@/components/brand/step-indicator";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { ROOM_OPTIONS } from "@/config/catalog";

/*
 * Step 1 — Upload. Drag/drop + camera + 360° panorama, and a room-type grid.
 * Static/mock for Stage C; upload + compression wired in Stage D. First room preselected.
 */
export default function UploadPage() {
  return (
    <>
      <SiteHeader showNav={false} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <StepIndicator current={1} />
        <h1 className="mt-5 font-serif font-extrabold text-3xl text-foreground">
          আপনার ঘরের একটি ছবি দিন
        </h1>
        <p className="mt-1.5 text-brand-body">স্পষ্ট আলোতে তোলা ছবি হলে সবচেয়ে ভালো ফল পাবেন।</p>

        <div className="mt-7 grid items-start gap-7 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4">
            <div
              className="flex flex-col items-center gap-4 rounded-3xl border-2 border-[#C4CCBF] border-dashed p-16 text-center"
              style={{
                background:
                  "repeating-linear-gradient(45deg,#EDEFE6,#EDEFE6 13px,#E0E5D8 13px,#E0E5D8 26px)",
              }}
            >
              <div className="flex size-16 items-center justify-center rounded-2xl bg-card shadow-md">
                <Upload className="size-7 text-primary" />
              </div>
              <div>
                <div className="font-bold text-foreground text-lg">ছবি টেনে আনুন বা বাছাই করুন</div>
                <div className="mt-1 text-brand-body text-sm">JPG, PNG · সর্বোচ্চ ১০ MB</div>
              </div>
            </div>
            <div className="flex gap-3.5">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border-[1.5px] border-border bg-card p-4">
                <Camera className="size-6 text-foreground" />
                <span className="font-semibold text-foreground text-sm">ক্যামেরা দিয়ে তুলুন</span>
              </div>
              <div className="flex flex-1 items-center gap-3 rounded-2xl border-[1.5px] border-border bg-card p-4">
                <Globe className="size-6 text-foreground" />
                <span className="font-semibold text-foreground text-sm">৩৬০° প্যানোরামা</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="font-bold text-foreground">ঘরের ধরন</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {ROOM_OPTIONS.map((room, i) => (
                <button
                  type="button"
                  key={room.value}
                  className={
                    i === 0
                      ? "rounded-xl border-[1.5px] border-primary bg-secondary px-3.5 py-3 font-semibold text-secondary-foreground text-sm"
                      : "rounded-xl border-[1.5px] border-border px-3.5 py-3 font-semibold text-foreground text-sm"
                  }
                >
                  {room.bn}
                </button>
              ))}
            </div>
            <Button size="lg" className="mt-auto" asChild>
              <Link href="/create/style">পরবর্তী ধাপ</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
