import { redirect } from "next/navigation";
import { utilisateurConnecte } from "@/lib/auth";
import TabBar from "@/components/TabBar";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  if (!(await utilisateurConnecte())) redirect("/connexion");
  return (
    <>
      <main className="app">{children}</main>
      <TabBar />
    </>
  );
}
