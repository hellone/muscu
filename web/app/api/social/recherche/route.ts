import { rechercher } from "@/lib/social";
import { route } from "@/lib/api";
export async function GET(req: Request) {
  return route((u) => Response.json(rechercher(u.id, new URL(req.url).searchParams.get("q") ?? "")));
}
