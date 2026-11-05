import { detail } from "@/lib/social";
import { route } from "@/lib/api";
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return route((u) => Response.json(detail(u.id, id)));
}
