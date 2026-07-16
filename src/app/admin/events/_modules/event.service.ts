import "server-only";

import type { SearchParams } from "@/db/helpers/search-params";
import { EventService as CoreEventService } from "@/server/service/event.service";

/*
 * Admin events service — the admin read surface for the events entity.
 *
 * The `events` table's Drizzle (writes + reads) is owned by the central
 * @/server/service/event.service (routers/loggers across the app write to it). This
 * module is the admin-side seam over that service's read methods, so the events
 * router looks identical to every other entity's (router → this service).
 */
export const EventService = {
  listPaginated: (params: SearchParams) => CoreEventService.listPaginated(params),
  countsByType: () => CoreEventService.countsByType(),
};
