import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LandingHome from "../../modules/vistas_publicas/public/pages/LandingHome.jsx";
import PublicLoginPage from "../../modules/vistas_publicas/public/auth/PublicLoginPage.jsx";
import PublicSignupPage from "../../modules/vistas_publicas/public/auth/PublicSignupPage.jsx";
import PacienteDashboard from "../../modules/vistas_publicas/public/pages/PacienteDashboard.jsx";
import BookingPage from "../../modules/vistas_publicas/public/pages/BookingPage.jsx";
import AdminLoginRoute from "./AdminLoginRoute.jsx";
import AdminLayout from "./AdminLayout.jsx";
import RequireSession from "../auth/RequireSession.jsx";

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingHome />} />

      {/* Public (Paciente) */}
      <Route path="/paciente/login" element={<PublicLoginPage />} />
      <Route path="/paciente/signup" element={<PublicSignupPage />} />
      {/* Aliases for landing CTAs */}
      <Route path="/login" element={<Navigate to="/paciente/login" replace />} />
      <Route path="/signup" element={<Navigate to="/paciente/signup" replace />} />

      {/* Paciente protected routes */}
      <Route
        path="/paciente/dashboard"
        element={
          <RequireSession loginPath="/paciente/login">
            <PacienteDashboard />
          </RequireSession>
        }
      />
      <Route
        path="/paciente/booking"
        element={
          <RequireSession loginPath="/paciente/login">
            <BookingPage />
          </RequireSession>
        }
      />

      {/* Admin auth */}
      <Route path="/admin/login" element={<AdminLoginRoute basePath="/admin" />} />

      {/* Admin portal auth (special route from src/modules/auth) */}
      <Route path="/auth/admin" element={<Navigate to="/auth/admin/login" replace />} />
      <Route
        path="/auth/admin/login"
        element={<AdminLoginRoute basePath="/portal-admin" />}
      />

      {/* Admin portal (alias entry from src/modules/auth) */}
      <Route path="/portal-admin" element={<Navigate to="/portal-admin/login" replace />} />
      <Route
        path="/portal-admin/login"
        element={<AdminLoginRoute basePath="/portal-admin" />}
      />

      {/* Admin protected */}
      <Route
        path="/admin/*"
        element={
          <RequireSession loginPath="/admin/login">
            <AdminLayout basePath="/admin" />
          </RequireSession>
        }
      />

      {/* Admin portal protected */}
      <Route
        path="/portal-admin/*"
        element={
          <RequireSession loginPath="/portal-admin/login">
            <AdminLayout basePath="/portal-admin" />
          </RequireSession>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

