import { historique, supprimer } from "@/lib/seances";
import { erreur, route } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return route((u) => {
    const s = historique(u.id).find((x) => x.id === id);
    return s ? Response.json(s) : erreur("Séance introuvable.", 404);
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return route((u) => { supprimer(u.id, id); return Response.json({ ok: true }); }, { ecriture: true });
}
