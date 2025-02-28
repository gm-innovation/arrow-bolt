
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";

import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import Companies from "./pages/super-admin/Companies";
import Users from "./pages/super-admin/Users";
import Subscriptions from "./pages/super-admin/Subscriptions";
import Settings from "./pages/super-admin/Settings";
import Reports from "./pages/super-admin/Reports";

import AdminDashboard from "./pages/admin/Dashboard";
import ServiceOrders from "./pages/admin/ServiceOrders";
import ServiceCalendar from "./pages/admin/ServiceCalendar";
import ServiceTransfers from "./pages/admin/ServiceTransfers";
import ServiceHistory from "./pages/admin/ServiceHistory";
import VesselHistory from "./pages/admin/VesselHistory";
import TaskTypes from "./pages/admin/TaskTypes";
import NewUser from "./pages/admin/NewUser";
import Clients from "./pages/admin/Clients";

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
          <SidebarProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              
              {/* Super Admin Routes */}
              <Route
                path="/super-admin/dashboard"
                element={
                  <DashboardLayout userType="super-admin">
                    <SuperAdminDashboard />
                  </DashboardLayout>
                }
              />
              <Route
                path="/super-admin/companies"
                element={
                  <DashboardLayout userType="super-admin">
                    <Companies />
                  </DashboardLayout>
                }
              />
              <Route
                path="/super-admin/users"
                element={
                  <DashboardLayout userType="super-admin">
                    <Users />
                  </DashboardLayout>
                }
              />
              <Route
                path="/super-admin/subscriptions"
                element={
                  <DashboardLayout userType="super-admin">
                    <Subscriptions />
                  </DashboardLayout>
                }
              />
              <Route
                path="/super-admin/settings"
                element={
                  <DashboardLayout userType="super-admin">
                    <Settings />
                  </DashboardLayout>
                }
              />
              <Route
                path="/super-admin/reports"
                element={
                  <DashboardLayout userType="super-admin">
                    <Reports />
                  </DashboardLayout>
                }
              />
              
              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <DashboardLayout userType="admin">
                    <AdminDashboard />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <DashboardLayout userType="admin">
                    <ServiceOrders />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/calendar"
                element={
                  <DashboardLayout userType="admin">
                    <ServiceCalendar />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <DashboardLayout userType="admin">
                    <Reports />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/transfers"
                element={
                  <DashboardLayout userType="admin">
                    <ServiceTransfers />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/history"
                element={
                  <DashboardLayout userType="admin">
                    <ServiceHistory />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/vessels"
                element={
                  <DashboardLayout userType="admin">
                    <VesselHistory />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/task-types"
                element={
                  <DashboardLayout userType="admin">
                    <TaskTypes />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <DashboardLayout userType="admin">
                    <Users />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/users/new"
                element={
                  <DashboardLayout userType="admin">
                    <NewUser />
                  </DashboardLayout>
                }
              />
              <Route
                path="/admin/clients"
                element={
                  <DashboardLayout userType="admin">
                    <Clients />
                  </DashboardLayout>
                }
              />
              
              {/* Tech Routes */}
              <Route
                path="/tech/dashboard"
                element={
                  <DashboardLayout userType="tech">
                    <TechDashboard />
                  </DashboardLayout>
                }
              />
              <Route
                path="/tech/tasks"
                element={
                  <DashboardLayout userType="tech">
                    <TechTasks />
                  </DashboardLayout>
                }
              />
              <Route
                path="/tech/tasks/:taskId"
                element={
                  <DashboardLayout userType="tech">
                    <TaskDetails />
                  </DashboardLayout>
                }
              />
              <Route
                path="/tech/reports"
                element={
                  <DashboardLayout userType="tech">
                    <TechReports />
                  </DashboardLayout>
                }
              />
              <Route
                path="/tech/reports/new"
                element={
                  <DashboardLayout userType="tech">
                    <ReportForm />
                  </DashboardLayout>
                }
              />
              <Route
                path="/tech/reports/:reportId/edit"
                element={
                  <DashboardLayout userType="tech">
                    <ReportForm />
                  </DashboardLayout>
                }
              />
              <Route
                path="/tech/notifications"
                element={
                  <DashboardLayout userType="tech">
                    <TechNotifications />
                  </DashboardLayout>
                }
              />
              <Route
                path="/tech/survey/:taskId"
                element={
                  <DashboardLayout userType="tech">
                    <SatisfactionSurvey />
                  </DashboardLayout>
                }
              />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
