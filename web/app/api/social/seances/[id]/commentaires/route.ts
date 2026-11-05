import { commenter } from "@/lib/social";
import { lireJson, route } from "@/lib/api";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return route(async (u) => { commenter(u.id, id, String((await lireJson(req)).texte ?? "")); return Response.json({ ok: true }); }, { ecriture: true });
}
