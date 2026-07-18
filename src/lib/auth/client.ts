"use client";

import { createAuthClient } from "better-auth/react";

/*
 * Better Auth client for 'use client' components. Talks to /api/auth (same origin, so no
 * baseURL needed). Exposes the hooks/methods the login + header UI use.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
