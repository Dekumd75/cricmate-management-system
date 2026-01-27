import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AppProvider } from "./components/AppContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingScreen } from "./components/LandingScreen";
import { LoginScreen } from "./components/LoginScreen";
import { ForgotPasswordScreen } from "./components/ForgotPasswordScreen";
import { ResetPasswordScreen } from "./components/ResetPasswordScreen";
import { ParentRegistrationScreen } from "./components/ParentRegistrationScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { AdminUserManagement } from "./components/AdminUserManagement";
import { AdminReportsScreen } from "./components/AdminReportsScreen";
import { CoachDashboard } from "./components/CoachDashboard";
import { CoachReportsScreen } from "./components/CoachReportsScreen";
import { ParentDashboard } from "./components/ParentDashboard";
import { ParentPaymentsScreen } from "./components/ParentPaymentsScreen";
import { PlayerDashboard } from "./components/PlayerDashboard";
import { PlayerManagement } from "./components/PlayerManagement";
import { AttendanceScreen } from "./components/AttendanceScreen";
import { BestXIScreen } from "./components/BestXIScreen";
import { PlayerProfile } from "./components/PlayerProfile";
import { LinkChildScreen } from "./components/LinkChildScreen";
import { MessagesScreen } from "./components/MessagesScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { PaymentGatewayScreen } from "./components/PaymentGatewayScreen";
import { PlayerStatisticsScreen } from "./components/PlayerStatisticsScreen";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />

          <Route
            path="/register/parent"
            element={<ParentRegistrationScreen />}
          />

          {/* Convenience redirects for base role paths */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/coach" element={<Navigate to="/coach/dashboard" replace />} />
          <Route path="/player" element={<Navigate to="/player/dashboard" replace />} />
          <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />

          {/* Admin Routes - Protected */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/user-management"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/players"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PlayerManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminReportsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SettingsScreen />
              </ProtectedRoute>
            }
          />

          {/* Coach Routes - Protected */}
          <Route
            path="/coach/dashboard"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/players"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <PlayerManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/player-profile"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <PlayerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/attendance"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <AttendanceScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/statistics"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <PlayerStatisticsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/best-xi"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <BestXIScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/messages"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <MessagesScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/reports"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachReportsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/settings"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <SettingsScreen />
              </ProtectedRoute>
            }
          />

          {/* Player Routes - Protected */}
          <Route
            path="/player/dashboard"
            element={
              <ProtectedRoute allowedRoles={['player']}>
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/payments"
            element={
              <ProtectedRoute allowedRoles={['player']}>
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/payment"
            element={
              <ProtectedRoute allowedRoles={['player']}>
                <PaymentGatewayScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/settings"
            element={
              <ProtectedRoute allowedRoles={['player']}>
                <SettingsScreen />
              </ProtectedRoute>
            }
          />

          {/* Parent Routes - Protected */}
          <Route
            path="/parent/dashboard"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/link-child"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <LinkChildScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/player-profile"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <PlayerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/payments"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentPaymentsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/payment"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <PaymentGatewayScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/messages"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <MessagesScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/settings"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <SettingsScreen />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AppProvider>
  );
}