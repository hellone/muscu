import { supprimerCommentaire } from "@/lib/social";
import { route } from "@/lib/api";
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return route((u) => { supprimerCommentaire(u.id, Number(id)); return Response.json({ ok: true }); }, { ecriture: true });
}
