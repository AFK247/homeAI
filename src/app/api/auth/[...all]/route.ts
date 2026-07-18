import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/auth";

/*
 * Better Auth catch-all handler — serves every /api/auth/* endpoint (sign-in, sign-up,
 * OAuth callbacks, session, sign-out). The client (src/lib/auth/client.ts) talks to this.
 */
export const { GET, POST } = toNextJsHandler(auth);
