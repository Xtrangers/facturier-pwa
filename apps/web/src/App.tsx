import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ClientsPage } from "./pages/ClientsPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { ClientFormPage } from "./pages/ClientFormPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { QuotesPage } from "./pages/QuotesPage";
import { QuoteDetailPage } from "./pages/QuoteDetailPage";
import { QuoteFormPage } from "./pages/QuoteFormPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ProductFormPage } from "./pages/ProductFormPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/clients" replace />} />
        <Route path="tableau-de-bord" element={<ComingSoonPage title="Tableau de bord" />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/nouveau" element={<ClientFormPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="clients/:id/modifier" element={<ClientFormPage />} />
        <Route path="tarifs" element={<ProductsPage />} />
        <Route path="tarifs/nouveau" element={<ProductFormPage />} />
        <Route path="tarifs/:id" element={<ProductDetailPage />} />
        <Route path="tarifs/:id/modifier" element={<ProductFormPage />} />
        <Route path="devis" element={<QuotesPage />} />
        <Route path="devis/nouveau" element={<QuoteFormPage />} />
        <Route path="devis/:id" element={<QuoteDetailPage />} />
        <Route path="devis/:id/modifier" element={<QuoteFormPage />} />
        <Route path="factures" element={<ComingSoonPage title="Factures" />} />
        <Route path="avoirs" element={<ComingSoonPage title="Avoirs" />} />
        <Route path="paiements" element={<ComingSoonPage title="Paiements" />} />
        <Route path="relances" element={<ComingSoonPage title="Relances" />} />
        <Route path="rapports" element={<ComingSoonPage title="Rapports" />} />
        <Route path="documents" element={<ComingSoonPage title="Documents" />} />
        <Route path="parametres" element={<ComingSoonPage title="Paramètres" />} />
      </Route>
    </Routes>
  );
}
