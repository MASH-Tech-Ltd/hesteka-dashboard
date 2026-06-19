import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { LanguageProvider } from "./context/LanguageContext";
import { ApiCacheProvider } from "./context/ApiCacheContext";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

import { Suspense, lazy } from "react";

// Lazy Loaded Pages
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const PartnersPage = lazy(() => import("./pages/PartnersPage"));
const MissionsPage = lazy(() => import("./pages/MissionsPage"));
const CollectionPointsPage = lazy(() => import("./pages/CollectionPointsPage"));
const PointsPage = lazy(() => import("./pages/PointsPage"));
const PhysicalItemsPage = lazy(() => import("./pages/PhysicalItemsPage"));
const DonationsPage = lazy(() => import("./pages/DonationsPage"));
const CrowdfundingPage = lazy(() => import("./pages/CrowdfundingPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ValidationDonationsPage = lazy(() => import("./pages/ValidationDonationsPage"));
const ShopifyProductsPage = lazy(() => import("./pages/ShopifyProductsPage"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const SupportMessagesPage = lazy(() => import("./pages/SupportMessagesPage"));

// Helper: is admin logged in?
const isAdmin = () => {
  try {
    const token = localStorage.getItem("adminAccessToken");
    const user = JSON.parse(localStorage.getItem("adminUser"));
    return !!(token && user && user.role === "admin");
  } catch {
    return false;
  }
};

const App = () => {
  return (
    <LanguageProvider>
      <ApiCacheProvider>
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <Suspense fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#fcfaf7]">
          <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-[#8B6914] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[#8B6914] font-bold tracking-widest uppercase text-xs animate-pulse">Loading Application...</p>
          </div>
        </div>
      }>
        <Routes>
          {/* Root → dashboard if logged in, else login */}
          <Route
            path="/"
            element={<Navigate to={isAdmin() ? "/dashboard" : "/login"} replace />}
          />

          {/* Public Login */}
          <Route
            path="/login"
            element={
              isAdmin() ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <AdminLoginPage />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              isAdmin() ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <ForgotPasswordPage />
              )
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              isAdmin() ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <ResetPasswordPage />
              )
            }
          />

          {/* Protected Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="partners" element={<PartnersPage />} />
            <Route path="missions" element={<MissionsPage />} />
            <Route path="collection-points" element={<CollectionPointsPage />} />
            <Route path="points" element={<PointsPage />} />
            <Route path="items" element={<PhysicalItemsPage />} />
            <Route path="donations" element={<DonationsPage />} />
            <Route path="validation-donations" element={<ValidationDonationsPage />} />
            <Route path="shopify-products" element={<ShopifyProductsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="support-messages" element={<SupportMessagesPage />} />
            <Route path="crowdfunding" element={<CrowdfundingPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route
            path="*"
            element={<Navigate to={isAdmin() ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </Suspense>
      </ApiCacheProvider>
    </LanguageProvider>
  );
};

export default App;
