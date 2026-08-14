import {
  BarChart3,
  Bell,
  FileText,
  Files,
  FolderOpen,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

const nav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/tarifs", label: "Tarifs et matériels", icon: Package },
  { to: "/devis", label: "Devis", icon: FileText },
  { to: "/factures", label: "Factures", icon: Receipt },
  { to: "/avoirs", label: "Avoirs", icon: FolderOpen },
  { to: "/paiements", label: "Paiements", icon: Wallet },
  { to: "/relances", label: "Relances", icon: Bell },
  { to: "/rapports", label: "Rapports", icon: BarChart3 },
  { to: "/documents", label: "Documents", icon: Files },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];

const mobileNav = [
  nav[0],
  nav[1],
  nav[3],
  nav[4],
  { to: "/parametres", label: "Plus", icon: MoreHorizontal },
];

function linkClass(active: boolean) {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
    active ? "bg-teal-800 text-white" : "text-stone-300 hover:bg-white/5 hover:text-white",
  ].join(" ");
}

export function AppShell() {
  const location = useLocation();
  return (
    <div className="min-h-dvh bg-stone-50 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#143c39] text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="font-serif text-2xl tracking-tight">Facturier</p>
          <p className="mt-1 text-xs text-teal-100/70">Atelier Nord Lumière</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClass(isActive)}>
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-stone-50/90 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="font-serif text-lg">Facturier</p>
            <p className="text-[11px] text-stone-500">Atelier Nord Lumière</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {mobileNav.map((item) => {
          const active = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                active ? "text-teal-800" : "text-stone-500"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
