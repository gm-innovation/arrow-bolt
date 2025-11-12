
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
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

import TechDashboard from "./pages/tech/Dashboard";
import TechTasks from "./pages/tech/Tasks";
import TaskDetails from "./pages/tech/TaskDetails";
import TechReports from "./pages/tech/Reports";
import ReportForm from "./pages/tech/ReportForm";
import TechNotifications from "./pages/tech/Notifications";
import SatisfactionSurvey from "./pages/tech/SatisfactionSurvey";

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
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              
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
                path="/super-admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardLayout userType="super-admin">
                      <SuperAdminReports />
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
                path="/tech/survey/:taskId"
                element={
                  <ProtectedRoute allowedRoles={['technician']}>
                    <DashboardLayout userType="tech">
                      <SatisfactionSurvey />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
