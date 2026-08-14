import { Link } from "react-router-dom";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-xs font-semibold tracking-widest text-teal-800 uppercase">Prochaine étape</p>
      <h1 className="mt-2 font-serif text-3xl text-stone-900">{title}</h1>
      <p className="mt-3 text-sm text-stone-500">
        Ce module arrivera après la base clients, selon le plan MVP : tarifs, devis, factures, puis PDF.
      </p>
      <Link
        to="/clients"
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white"
      >
        Retour aux clients
      </Link>
    </div>
  );
}
