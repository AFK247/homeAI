import "server-only";

import { db } from "@/db/client";
import { events } from "@/db/schemas/event.schema";
import type { EventType } from "@/db/schemas/shared.schema";

/*
 * Event logging — the vendor sales pitch (PROJECT_CONTEXT §14). Records product
 * events (generation, tag_click, buy_click, share, save) into the events table.
 * Fire-and-forget from routers; never blocks the user flow.
 */
export const EventService = {
  log: async (input: {
    eventType: EventType;
    anonymousId: string | null;
    userId?: string | null;
    metadata?: Record<string, unknown>;
  }) => {
    try {
      await db.insert(events).values({
        eventType: input.eventType,
        anonymousId: input.anonymousId,
        userId: input.userId ?? null,
        metadata: input.metadata ?? null,
      });
    } catch {
      // Analytics must never break the user flow.
    }
  },
};
