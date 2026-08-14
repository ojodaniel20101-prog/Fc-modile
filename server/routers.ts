import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getEditorialReview, getNews, getNewsArticle } from "./contentData";
import { lookupPlayers } from "./playerData";

type OriginRequest = {
  protocol: string;
  headers: Record<string, string | string[] | undefined>;
  get(name: string): string | undefined;
};

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value?.split(",")[0]?.trim() ?? "";
}

export function resolvePublicOrigin(req: OriginRequest): string {
  const explicitOrigin = firstHeader(req.headers.origin);
  if (/^https?:\/\//i.test(explicitOrigin)) return explicitOrigin;
  const protocol = firstHeader(req.headers["x-forwarded-proto"]) || req.protocol || "https";
  const host = firstHeader(req.headers["x-forwarded-host"]) || firstHeader(req.headers.host) || req.get("host") || "fcmobtools-h3xzqkrm.manus.space";
  return `${protocol}://${host}`;
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  players: router({
    lookup: publicProcedure
      .input(z.object({ query: z.string().trim().min(2).max(80) }))
      .query(async ({ input, ctx }) => {
        return lookupPlayers(input.query, resolvePublicOrigin(ctx.req));
      }),
  }),
  content: router({
    news: publicProcedure.query(() => getNews()),
    newsArticle: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getNewsArticle(input.id)),
    editorialReview: publicProcedure.input(z.object({ playerName: z.string().trim().min(2).max(100) })).query(({ input }) => getEditorialReview(input.playerName)),
  }),
});

export type AppRouter = typeof appRouter;
