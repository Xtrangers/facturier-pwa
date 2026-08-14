import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ClientsPage } from "./pages/ClientsPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { ClientFormPage } from "./pages/ClientFormPage";
import { QuotesPage } from "./pages/QuotesPage";
import { QuoteDetailPage } from "./pages/QuoteDetailPage";
import { QuoteFormPage } from "./pages/QuoteFormPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { InvoiceFormPage } from "./pages/InvoiceFormPage";
import { CreditNotesPage } from "./pages/CreditNotesPage";
import { CreditNoteDetailPage } from "./pages/CreditNoteDetailPage";
import { CreditNoteFormPage } from "./pages/CreditNoteFormPage";
import { RemindersPage } from "./pages/RemindersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/tableau-de-bord" replace />} />
        <Route path="tableau-de-bord" element={<DashboardPage />} />
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
        <Route path="factures" element={<InvoicesPage />} />
        <Route path="factures/nouveau" element={<InvoiceFormPage />} />
        <Route path="factures/:id" element={<InvoiceDetailPage />} />
        <Route path="factures/:id/modifier" element={<InvoiceFormPage />} />
        <Route path="avoirs" element={<CreditNotesPage />} />
        <Route path="avoirs/nouveau" element={<CreditNoteFormPage />} />
        <Route path="avoirs/:id" element={<CreditNoteDetailPage />} />
        <Route path="paiements" element={<PaymentsPage />} />
        <Route path="relances" element={<RemindersPage />} />
        <Route path="rapports" element={<ReportsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="parametres" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
