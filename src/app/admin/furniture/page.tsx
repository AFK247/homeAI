import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBdt, toBnDigits } from "@/lib/format";
import { mockFurniture } from "@/lib/mock-data";

/*
 * Admin — furniture catalog (design/plan §8). Light-role admin manages the local catalog.
 * Stage C renders mock; Stage D adds create/edit sheets + real rpc + withRole('admin').
 */
export default function AdminFurniturePage() {
  const items = mockFurniture;

  return (
    <>
      <header className="flex items-center justify-between border-border border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="font-semibold text-brand-body text-sm">অ্যাডমিন · আসবাব</span>
        </div>
        <Button>নতুন আসবাব</Button>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-border border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">নাম</th>
                <th className="px-4 py-3 font-semibold">ব্র্যান্ড</th>
                <th className="px-4 py-3 font-semibold">ধরন</th>
                <th className="px-4 py-3 font-semibold">দাম</th>
                <th className="px-4 py-3 font-semibold">অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-border border-b last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-brand-body">{item.brand}</td>
                  <td className="px-4 py-3 text-brand-body">{item.category}</td>
                  <td className="px-4 py-3 text-brand-body">
                    {item.priceBdt !== null ? formatBdt(item.priceBdt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.condition === "new" ? "default" : "secondary"}>
                      {item.condition === "new" ? "নতুন" : "ব্যবহৃত"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-brand-faint text-xs">
          মোট {toBnDigits(items.length)}টি আসবাব · সম্পূর্ণ CRUD Stage D-তে যুক্ত হবে।
        </p>
      </main>
    </>
  );
}
