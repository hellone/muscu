import { classement } from "@/lib/social";
import { route } from "@/lib/api";
export async function GET() { return route((u) => Response.json(classement(u.id))); }
