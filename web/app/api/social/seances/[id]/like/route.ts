import { aimer } from "@/lib/social";
import { lireJson, route } from "@/lib/api";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return route(async (u) => { aimer(u.id, id, (await lireJson(req)).jaime !== false); return Response.json({ ok: true }); }, { ecriture: true });
}
