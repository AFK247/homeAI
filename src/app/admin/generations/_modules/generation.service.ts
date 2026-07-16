import "server-only";

import { DesignAdminService } from "@/app/admin/designs/_modules/design.service";
import type { SearchParams } from "@/db/helpers/search-params";
import { GenerationLogService } from "@/server/service/generation-log.service";

/*
 * Admin generations service — the admin read surface for the generation_logs entity.
 *
 * The table's Drizzle is owned by the central @/server/service/generation-log.service
 * (the router logs to it during generation). This module is the admin read seam over
 * that service, plus the detail composition (attempt + its parent design), so the
 * generations router looks identical to every other entity's.
 */
export const GenerationService = {
  listPaginated: (params: SearchParams) => GenerationLogService.listPaginated(params),
  stats: () => GenerationLogService.stats(),
  countsByProvider: () => GenerationLogService.countsByProvider(),

  /** One attempt plus its parent design (if any), for the detail page. */
  getById: async (id: string) => {
    const attempt = await GenerationLogService.getById(id);
    if (!attempt) return null;
    const parent = attempt.designId ? await DesignAdminService.getById(attempt.designId) : null;
    return { attempt, design: parent?.design ?? null };
  },
};
