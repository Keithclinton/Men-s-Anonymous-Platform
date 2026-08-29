import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { GuestRoute, ProtectedRoute } from './auth/routes';
import { LocaleProvider } from './lib/i18n';
import { installOfflineListener, OfflineBanner, SkipLink } from './components/layout/A11y';
import { AdminPage } from './pages/AdminPage';
import { AccountPage } from './pages/AccountPage';
import { BookPage } from './pages/BookPage';
import { BookingDetailPage } from './pages/BookingDetailPage';
import { BookingsPage } from './pages/BookingsPage';
import { ClientProfilePage } from './pages/ClientProfilePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { IntakePage } from './pages/IntakePage';
import { FaqPage, ForProvidersPage, HowItWorksPage, PrivacyPage, TermsPage } from './pages/LegalPages';
import { LibraryPage } from './pages/LibraryPage';
import { LoginPage } from './pages/LoginPage';
import { MatchPage } from './pages/MatchPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProviderDeskPage } from './pages/ProviderDeskPage';
import { ProviderDetailPage } from './pages/ProviderDetailPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SessionRoomPage } from './pages/SessionRoomPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { WelcomePage } from './pages/WelcomePage';

export default function App() {
  useEffect(() => {
    installOfflineListener();
  }, []);

  return (
    <LocaleProvider>
      <AuthProvider>
        <BrowserRouter>
          <SkipLink />
          <OfflineBanner />
          <Routes>
            <Route
              path="/"
              element={
                <GuestRoute>
                  <WelcomePage />
                </GuestRoute>
              }
            />
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
            <Route
              path="/forgot"
              element={
                <GuestRoute>
                  <ForgotPasswordPage />
                </GuestRoute>
              }
            />
            <Route
              path="/reset"
              element={
                <GuestRoute>
                  <ResetPasswordPage />
                </GuestRoute>
              }
            />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/for-providers" element={<ForProvidersPage />} />
            <Route
              path="/intake"
              element={
                <ProtectedRoute>
                  <IntakePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ClientProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/providers"
              element={
                <ProtectedRoute>
                  <ProvidersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/providers/:id"
              element={
                <ProtectedRoute>
                  <ProviderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/providers/:id/book"
              element={
                <ProtectedRoute>
                  <BookPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match"
              element={
                <ProtectedRoute>
                  <MatchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <BookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id/room"
              element={
                <ProtectedRoute>
                  <SessionRoomPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute>
                  <BookingDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider"
              element={
                <ProtectedRoute>
                  <ProviderDeskPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/library/:resourceId"
              element={
                <ProtectedRoute>
                  <LibraryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/library"
              element={
                <ProtectedRoute>
                  <LibraryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plans"
              element={
                <ProtectedRoute>
                  <SubscriptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LocaleProvider>
  );
}
