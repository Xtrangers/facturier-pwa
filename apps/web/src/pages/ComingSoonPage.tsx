import { Link } from "react-router-dom";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-xs font-semibold tracking-widest text-teal-800 uppercase">Prochaine étape</p>
      <h1 className="mt-2 font-serif text-3xl text-stone-900">{title}</h1>
      <p className="mt-3 text-sm text-stone-500">
        Module pas encore bâti. Prochaine brique métier : export PDF des devis, factures et avoirs.
      </p>
      <Link
        to="/tableau-de-bord"
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white"
      >
        Tableau de bord
      </Link>
    </div>
  );
}
