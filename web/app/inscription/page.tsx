import Link from "next/link";
import { redirect } from "next/navigation";
import { codeInvitationRequis, utilisateurConnecte } from "@/lib/auth";
import FormulaireCompte from "@/components/FormulaireCompte";

export const dynamic = "force-dynamic";

export default async function Inscription() {
  if (await utilisateurConnecte()) redirect("/");
  return (
    <main className="auth">
      <div className="auth-logo"><span>MUSCU</span><small>ton coach de séance</small></div>
      <FormulaireCompte mode="inscription" codeRequis={codeInvitationRequis()} />
      <p className="auth-lien">Déjà un compte ? <Link href="/connexion">Se connecter</Link></p>
    </main>
  );
}
