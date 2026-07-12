import { Badge } from "@/components/ui/badge";
import { AdminService } from "../_modules/admin.service";

/*
 * Admin — vendors (brands / used sellers / carpenters / interior firms).
 * commission_rate + is_verified feed Phase 2 revenue.
 */
export default async function AdminVendorsPage() {
  const vendors = await AdminService.allVendors();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif font-extrabold text-3xl text-foreground">Vendors</h1>
        <span className="text-brand-body text-sm">{vendors.length} total</span>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-border border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Website</th>
              <th className="px-4 py-3 font-semibold">Verified</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-border border-b last:border-0">
                <td className="px-4 py-3 font-semibold text-foreground">{v.name}</td>
                <td className="px-4 py-3 text-brand-body">{v.type}</td>
                <td className="px-4 py-3 text-brand-body">
                  {v.websiteUrl ? (
                    <a
                      href={v.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {v.websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={v.isVerified ? "default" : "secondary"}>
                    {v.isVerified ? "Verified" : "Unverified"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
