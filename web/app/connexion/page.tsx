import Link from "next/link";
import { redirect } from "next/navigation";
import { utilisateurConnecte } from "@/lib/auth";
import FormulaireCompte from "@/components/FormulaireCompte";

export const dynamic = "force-dynamic";

export default async function Connexion() {
  if (await utilisateurConnecte()) redirect("/");
  return (
    <main className="auth">
      <div className="auth-logo"><span>MUSCU</span><small>ton coach de séance</small></div>
      <FormulaireCompte mode="connexion" />
      <p className="auth-lien">Pas encore de compte ? <Link href="/inscription">Créer un compte</Link></p>
    </main>
  );
}
