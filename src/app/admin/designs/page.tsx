import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AdminService } from "../_modules/admin.service";

/*
 * Admin — all designs (uploads + generations) with thumbnails and metadata.
 */
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  done: "default",
  processing: "secondary",
  pending: "secondary",
  failed: "destructive",
};

export default async function AdminDesignsPage() {
  const designs = await AdminService.allDesigns();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif font-extrabold text-3xl text-foreground">Designs</h1>
        <span className="text-brand-body text-sm">{designs.length} total</span>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-border border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Preview</th>
              <th className="px-4 py-3 font-semibold">Room</th>
              <th className="px-4 py-3 font-semibold">Style</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Session</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {designs.map((d) => (
              <tr key={d.id} className="border-border border-b last:border-0">
                <td className="px-4 py-2.5">
                  {d.generatedImageUrl ? (
                    // biome-ignore lint/performance/noImgElement: MinIO/R2 thumbnail
                    <img
                      src={d.generatedImageUrl}
                      alt={`${d.style}`}
                      className="size-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
                      —
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-brand-body">{d.roomType}</td>
                <td className="px-4 py-2.5 text-brand-body">{d.style}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={STATUS_VARIANT[d.status] ?? "secondary"}>{d.status}</Badge>
                </td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground text-xs">
                  {d.anonymousId ? `${d.anonymousId.slice(0, 8)}…` : d.userId ? "user" : "—"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {format(new Date(d.createdAt), "d MMM, HH:mm")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
