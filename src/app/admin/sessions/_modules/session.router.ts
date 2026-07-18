import "server-only";

import { adminProcedure } from "@/server/rpc/procedures";
import { SessionService } from "./session.service";

/*
 * Session oRPC router — admin sessions (grouped anonymous sessions).
 * Convention (docs/module-convention.md): router validates + calls the service;
 * never touches Drizzle. GET for reads. Admin-only: every procedure requires role=admin (adminProcedure).
 */
export const sessionRouter = {
  list: adminProcedure.route({ method: "GET" }).handler(() => SessionService.list()),
};

/** Row type for the sessions table — inferred, never hand-written. */
export type SessionRow = Awaited<ReturnType<typeof SessionService.list>>[number];
