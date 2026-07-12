import { ORPCError } from "@orpc/client";
import { toast } from "sonner";

/*
 * Client-side oRPC error handler (mirrors the reference convention). Shows the
 * server's message for known oRPC errors, else a generic Bangla fallback.
 * Use inside the catch of a direct `rpc.*` call.
 */
export function handleORPCError(error: unknown) {
  if (error instanceof ORPCError) {
    return toast.error(error.message, { className: "text-sm" });
  }
  return toast.error("কিছু একটা ভুল হয়েছে, আবার চেষ্টা করুন।", {
    className: "text-sm",
  });
}
