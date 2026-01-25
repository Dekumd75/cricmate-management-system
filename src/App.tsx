import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AppProvider } from "./components/AppContext";
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
import { UserManagementScreen } from "./components/UserManagementScreen";
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

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />
          <Route
            path="/admin/user-management"
            element={<AdminUserManagement />}
          />
          <Route
            path="/admin/players"
            element={<PlayerManagement />}
          />
          <Route
            path="/admin/reports"
            element={<AdminReportsScreen />}
          />
          <Route
            path="/admin/settings"
            element={<SettingsScreen />}
          />

          {/* Coach Routes */}
          <Route
            path="/coach/dashboard"
            element={<CoachDashboard />}
          />
          <Route
            path="/coach/players"
            element={<PlayerManagement />}
          />
          <Route
            path="/coach/player-profile"
            element={<PlayerProfile />}
          />
          <Route
            path="/coach/attendance"
            element={<AttendanceScreen />}
          />
          <Route
            path="/coach/statistics"
            element={<PlayerStatisticsScreen />}
          />
          <Route
            path="/coach/best-xi"
            element={<BestXIScreen />}
          />
          <Route
            path="/coach/messages"
            element={<MessagesScreen />}
          />
          <Route
            path="/coach/reports"
            element={<CoachReportsScreen />}
          />
          <Route
            path="/coach/settings"
            element={<SettingsScreen />}
          />

          {/* Player Routes */}
          <Route
            path="/player/dashboard"
            element={<PlayerDashboard />}
          />
          <Route
            path="/player/payments"
            element={<PlayerDashboard />}
          />
          <Route
            path="/player/payment"
            element={<PaymentGatewayScreen />}
          />
          <Route
            path="/player/settings"
            element={<SettingsScreen />}
          />

          {/* Parent Routes */}
          <Route
            path="/parent/dashboard"
            element={<ParentDashboard />}
          />
          <Route
            path="/parent/link-child"
            element={<LinkChildScreen />}
          />
          <Route
            path="/parent/player-profile"
            element={<PlayerProfile />}
          />
          <Route
            path="/parent/payments"
            element={<ParentPaymentsScreen />}
          />
          <Route
            path="/parent/payment"
            element={<PaymentGatewayScreen />}
          />
          <Route
            path="/parent/messages"
            element={<MessagesScreen />}
          />
          <Route
            path="/parent/settings"
            element={<SettingsScreen />}
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