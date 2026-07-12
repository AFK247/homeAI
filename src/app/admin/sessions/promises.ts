import "server-only";

import type { AwaitedPromisesType } from "@/providers/query.provider";
import { AdminService } from "../_modules/admin.service";

/* Sessions list data-loading factory (co-located per feature). */
export function sessionsPromises() {
  return { sessions: AdminService.sessions() };
}
export type SessionsPageData = AwaitedPromisesType<typeof sessionsPromises>;
