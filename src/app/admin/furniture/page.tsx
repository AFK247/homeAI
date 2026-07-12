import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBdt, toBnDigits } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import { mockFurniture } from "@/lib/mock-data";

/*
 * Admin — furniture catalog (design/plan §8). Light-role admin manages the local catalog.
 * Stage C renders mock; Stage D adds create/edit sheets + real rpc + withRole('admin').
 */
export default async function AdminFurniturePage() {
  const { dict, locale } = await getDictionary();
  const items = mockFurniture;
  const num = (n: number) => (locale === "bn" ? toBnDigits(n) : String(n));

  return (
    <>
      <header className="flex items-center justify-between border-border border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="font-semibold text-brand-body text-sm">{dict.admin.title}</span>
        </div>
        <Button>{dict.admin.newItem}</Button>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-border border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{dict.admin.colName}</th>
                <th className="px-4 py-3 font-semibold">{dict.admin.colBrand}</th>
                <th className="px-4 py-3 font-semibold">{dict.admin.colCategory}</th>
                <th className="px-4 py-3 font-semibold">{dict.admin.colPrice}</th>
                <th className="px-4 py-3 font-semibold">{dict.admin.colCondition}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-border border-b last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-brand-body">{item.brand}</td>
                  <td className="px-4 py-3 text-brand-body">{item.category}</td>
                  <td className="px-4 py-3 text-brand-body">
                    {item.priceBdt !== null ? formatBdt(item.priceBdt, locale) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.condition === "new" ? "default" : "secondary"}>
                      {item.condition === "new"
                        ? dict.admin.conditionNew
                        : dict.admin.conditionUsed}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-brand-faint text-xs">
          {dict.admin.totalPrefix}
          {num(items.length)}
          {dict.admin.totalSuffix}
        </p>
      </main>
    </>
  );
}
