import { notFound } from "next/navigation";
import FicheExo from "@/components/FicheExo";
import { EXERCICES_PAR_ID } from "@/lib/exercices";

export default async function PageExo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!EXERCICES_PAR_ID[id]) notFound();
  return <FicheExo id={id} />;
}
