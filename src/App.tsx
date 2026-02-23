import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthLanding } from "./components/AuthLanding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./components/DashboardLayout";

import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import Companies from "./pages/super-admin/Companies";
import SuperAdminUsers from "./pages/super-admin/Users";
import Subscriptions from "./pages/super-admin/Subscriptions";
import Settings from "./pages/super-admin/Settings";
import SuperAdminReports from "./pages/super-admin/Reports";

import AdminDashboard from "./pages/admin/Dashboard";
import ServiceOrders from "./pages/admin/ServiceOrders";
import ServiceCalendar from "./pages/admin/ServiceCalendar";
import ServiceTransfers from "./pages/admin/ServiceTransfers";
import ServiceHistory from "./pages/admin/ServiceHistory";
import VesselHistory from "./pages/admin/VesselHistory";
import TaskTypes from "./pages/admin/TaskTypes";
import AdminUsers from "./pages/admin/Users";
import NewUser from "./pages/admin/NewUser";
import EditUser from "./pages/admin/EditUser";
import Clients from "./pages/admin/Clients";
import Technicians from "./pages/admin/Technicians";
import AdminReports from "./pages/admin/Reports";
import AdminProfile from "./pages/admin/Profile";
import AdminSettings from "./pages/admin/Settings";
import MeasurementSettings from "./pages/admin/MeasurementSettings";
import AuditLogs from "./pages/admin/AuditLogs";
import Checklists from "./pages/admin/Checklists";
import TechnicianLocations from "./pages/admin/TechnicianLocations";
import TechnicianReservations from "./pages/admin/TechnicianReservations";


import ManagerDashboard from "./pages/manager/Dashboard";
import ManagerCoordinators from "./pages/manager/Coordinators";
import ManagerServiceOrders from "./pages/manager/ServiceOrders";
import ManagerReports from "./pages/manager/Reports";
import ManagerProfile from "./pages/manager/Profile";
import ManagerSettings from "./pages/manager/Settings";

import TechDashboard from "./pages/tech/Dashboard";
import TechTasks from "./pages/tech/Tasks";
import TaskDetails from "./pages/tech/TaskDetails";
import TechReports from "./pages/tech/Reports";
import ReportForm from "./pages/tech/ReportForm";
import TechNotifications from "./pages/tech/Notifications";
import TechInstallApp from "./pages/tech/InstallApp";
import TechProfile from "./pages/tech/Profile";
import TechSettings from "./pages/tech/Settings";
import InstallApp from "./pages/InstallApp";
import SatisfactionSurvey from "./pages/tech/SatisfactionSurvey";
import Chat from "./pages/Chat";
import { OfflineIndicator } from "./components/OfflineIndicator";

// Commercial Pages
import CommercialDashboard from "./pages/commercial/Dashboard";
import CommercialClients from "./pages/commercial/Clients";
import CommercialOpportunities from "./pages/commercial/Opportunities";
import CommercialBuyers from "./pages/commercial/Buyers";
import CommercialProfile from "./pages/commercial/Profile";
import CommercialSettings from "./pages/commercial/Settings";
import CommercialProducts from "./pages/commercial/Products";
import CommercialRecurrences from "./pages/commercial/Recurrences";
import CommercialMeasurements from "./pages/commercial/Measurements";
import CommercialReports from "./pages/commercial/Reports";
import CommercialKnowledgeBase from "./pages/commercial/KnowledgeBase";
import CommercialTasks from "./pages/commercial/Tasks";
import CommercialImport from "./pages/commercial/admin/Import";
import CommercialLogs from "./pages/commercial/admin/Logs";

// Commercial Admin Pages
import CommercialAdminLayout from "./components/commercial/admin/CommercialAdminLayout";
import CommercialAdminDashboard from "./pages/commercial/admin/Dashboard";
import CommercialAdminUsers from "./pages/commercial/admin/Users";
import CommercialAdminServices from "./pages/commercial/admin/Services";
import CommercialAdminSchedules from "./pages/commercial/admin/Schedules";
import CommercialAdminKnowledge from "./pages/commercial/admin/Knowledge";
import CommercialAdminAuditLogs from "./pages/commercial/admin/AuditLogs";

// HR Pages
import HRDashboard from "./pages/hr/Dashboard";
import HRTechnicians from "./pages/hr/Technicians";
import HRTimeControl from "./pages/hr/TimeControl";
import HRAbsences from "./pages/hr/Absences";
import HROnCall from "./pages/hr/OnCall";
import HRHolidays from "./pages/hr/Holidays";
import HRReports from "./pages/hr/Reports";
import HRProfile from "./pages/hr/Profile";
import HRSettings from "./pages/hr/Settings";
import SuperAdminProfile from "./pages/super-admin/Profile";

// Create a new QueryClient instance with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SidebarProvider>
              <Routes>
                <Route path="/" element={<AuthLanding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Super Admin Routes */}
              <Route
                path="/super-admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <SuperAdminDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/companies"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <Companies />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/users"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <SuperAdminUsers />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/subscriptions"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <Subscriptions />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/settings"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <Settings />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/profile"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <SuperAdminProfile />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <SuperAdminReports />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Manager Routes */}
              <Route
                path="/manager/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardLayout userType="manager">
                      <ManagerDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/coordinators"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardLayout userType="manager">
                      <ManagerCoordinators />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/orders"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardLayout userType="manager">
                      <ManagerServiceOrders />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/reports"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardLayout userType="manager">
                      <ManagerReports />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/profile"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardLayout userType="manager">
                      <ManagerProfile />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/settings"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardLayout userType="manager">
                      <ManagerSettings />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/measurement-settings"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardLayout userType="manager">
                      <MeasurementSettings />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <AdminDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <ServiceOrders />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/calendar"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <ServiceCalendar />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <AdminReports />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/transfers"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <ServiceTransfers />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/history"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <ServiceHistory />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/vessels"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <VesselHistory />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/task-types"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <TaskTypes />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <AdminUsers />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/new"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <NewUser />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/:userId"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <EditUser />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/clients"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <Clients />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/technicians"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <Technicians />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/profile"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <AdminProfile />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <AdminSettings />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/measurement-settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <MeasurementSettings />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/checklists"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <Checklists />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/technician-locations"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <TechnicianLocations />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <AuditLogs />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reservations"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <TechnicianReservations />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              {/* Tech Routes */}
              <Route
                path="/tech/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <TechDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/tasks"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <TechTasks />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/tasks/:taskId"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <TaskDetails />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/reports"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <TechReports />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/reports/new"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <ReportForm />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/reports/:reportId/edit"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <ReportForm />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/notifications"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <TechNotifications />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/install"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <TechInstallApp />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/profile"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <TechProfile />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/settings"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <TechSettings />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/survey/:taskId"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <SatisfactionSurvey />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* HR Routes */}
              <Route
                path="/hr/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <HRDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/technicians"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <HRTechnicians />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/time-control"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <HRTimeControl />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/absences"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <HRAbsences />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/on-call"
                element={<Navigate to="/hr/absences" replace />}
              />
              <Route
                path="/hr/holidays"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <HRHolidays />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/reports"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <HRReports />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/profile"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <HRProfile />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/settings"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <HRSettings />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/chat"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <Chat />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Commercial Routes */}
              <Route
                path="/commercial/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/clients"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialClients />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/opportunities"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialOpportunities />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/tasks"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialTasks />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/notifications"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <TechNotifications />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/buyers"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialBuyers />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/profile"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialProfile />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/settings"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialSettings />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/products"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialProducts />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/recurrences"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialRecurrences />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/measurements"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialMeasurements />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/reports"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialReports />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/knowledge-base"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialKnowledgeBase />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/import"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialImport />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/logs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="commercial">
                      <CommercialLogs />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              {/* Commercial Admin Routes */}
              <Route
                path="/commercial/admin"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <CommercialAdminLayout>
                      <CommercialAdminDashboard />
                    </CommercialAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <CommercialAdminLayout>
                      <CommercialAdminUsers />
                    </CommercialAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/admin/services"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <CommercialAdminLayout>
                      <CommercialAdminServices />
                    </CommercialAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/admin/schedules"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <CommercialAdminLayout>
                      <CommercialAdminSchedules />
                    </CommercialAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/admin/knowledge"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <CommercialAdminLayout>
                      <CommercialAdminKnowledge />
                    </CommercialAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/admin/import"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <CommercialAdminLayout>
                      <CommercialImport />
                    </CommercialAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/admin/integration-logs"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <CommercialAdminLayout>
                      <CommercialLogs />
                    </CommercialAdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/admin/logs"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <CommercialAdminLayout>
                      <CommercialAdminAuditLogs />
                    </CommercialAdminLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/commercial/chat"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <Chat />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commercial/install"
                element={
                  <ProtectedRoute allowedRoles={['commercial', 'admin']}>
                    <DashboardLayout userType="commercial">
                      <InstallApp />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/chat"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <Chat />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/chat"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardLayout userType="manager">
                      <Chat />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech/chat"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <Chat />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/chat"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <Chat />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Install App Routes - All roles */}
              <Route
                path="/admin/install"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout userType="admin">
                      <InstallApp />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/install"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardLayout userType="manager">
                      <InstallApp />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/install"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <DashboardLayout userType="hr">
                      <InstallApp />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/install"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <InstallApp />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Public Install Route (no auth required) */}
              <Route path="/install" element={<InstallApp />} />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <OfflineIndicator />
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
