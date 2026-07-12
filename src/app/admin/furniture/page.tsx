import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBdt } from "@/lib/format";
import { FurnitureService } from "@/server/service/furniture.service";

/*
 * Admin — furniture catalog, wired to the real catalog (FurnitureService.list).
 * Create/edit sheets land in a follow-up. Prices shown in ASCII (admin is an
 * internal English tool).
 */
export default async function AdminFurniturePage() {
  const items = await FurnitureService.list();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif font-extrabold text-3xl text-foreground">Furniture</h1>
          <span className="text-brand-body text-sm">{items.length} items</span>
        </div>
        <Button>New item</Button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-border border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Brand</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Condition</th>
              <th className="px-4 py-3 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-border border-b last:border-0">
                <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                <td className="px-4 py-3 text-brand-body">{item.brand ?? "—"}</td>
                <td className="px-4 py-3 text-brand-body">{item.category ?? "—"}</td>
                <td className="px-4 py-3 text-brand-body">
                  {item.priceBdt !== null ? formatBdt(item.priceBdt, "en") : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={item.condition === "new" ? "default" : "secondary"}>
                    {item.condition}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-brand-body">{item.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
