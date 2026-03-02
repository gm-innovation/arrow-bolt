import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthLanding } from "./components/AuthLanding";
import { ErrorBoundary } from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { OfflineIndicator } from "./components/OfflineIndicator";

// Auth pages - keep sync (small, critical path)
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import InstallApp from "./pages/InstallApp";
import Chat from "./pages/Chat";

// Lazy-loaded pages
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/Dashboard"));
const Companies = lazy(() => import("./pages/super-admin/Companies"));
const SuperAdminUsers = lazy(() => import("./pages/super-admin/Users"));
const Subscriptions = lazy(() => import("./pages/super-admin/Subscriptions"));
const Settings = lazy(() => import("./pages/super-admin/Settings"));
const SuperAdminReports = lazy(() => import("./pages/super-admin/Reports"));
const SuperAdminProfile = lazy(() => import("./pages/super-admin/Profile"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const ServiceOrders = lazy(() => import("./pages/admin/ServiceOrders"));
const ServiceCalendar = lazy(() => import("./pages/admin/ServiceCalendar"));
const ServiceTransfers = lazy(() => import("./pages/admin/ServiceTransfers"));
const ServiceHistory = lazy(() => import("./pages/admin/ServiceHistory"));
const VesselHistory = lazy(() => import("./pages/admin/VesselHistory"));
const TaskTypes = lazy(() => import("./pages/admin/TaskTypes"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const NewUser = lazy(() => import("./pages/admin/NewUser"));
const EditUser = lazy(() => import("./pages/admin/EditUser"));
const Clients = lazy(() => import("./pages/admin/Clients"));
const Technicians = lazy(() => import("./pages/admin/Technicians"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminProfile = lazy(() => import("./pages/admin/Profile"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const MeasurementSettings = lazy(() => import("./pages/admin/MeasurementSettings"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const Checklists = lazy(() => import("./pages/admin/Checklists"));
const TechnicianLocations = lazy(() => import("./pages/admin/TechnicianLocations"));
const TechnicianReservations = lazy(() => import("./pages/admin/TechnicianReservations"));

const ManagerDashboard = lazy(() => import("./pages/manager/Dashboard"));
const ManagerCoordinators = lazy(() => import("./pages/manager/Coordinators"));
const ManagerServiceOrders = lazy(() => import("./pages/manager/ServiceOrders"));
const ManagerReports = lazy(() => import("./pages/manager/Reports"));
const ManagerProfile = lazy(() => import("./pages/manager/Profile"));
const ManagerSettings = lazy(() => import("./pages/manager/Settings"));

const TechDashboard = lazy(() => import("./pages/tech/Dashboard"));
const TechTasks = lazy(() => import("./pages/tech/Tasks"));
const TaskDetails = lazy(() => import("./pages/tech/TaskDetails"));
const TechReports = lazy(() => import("./pages/tech/Reports"));
const ReportForm = lazy(() => import("./pages/tech/ReportForm"));
const TechNotifications = lazy(() => import("./pages/tech/Notifications"));
const TechInstallApp = lazy(() => import("./pages/tech/InstallApp"));
const TechProfile = lazy(() => import("./pages/tech/Profile"));
const TechSettings = lazy(() => import("./pages/tech/Settings"));
const SatisfactionSurvey = lazy(() => import("./pages/tech/SatisfactionSurvey"));

const CommercialDashboard = lazy(() => import("./pages/commercial/Dashboard"));
const CommercialClients = lazy(() => import("./pages/commercial/Clients"));
const CommercialOpportunities = lazy(() => import("./pages/commercial/Opportunities"));
const CommercialBuyers = lazy(() => import("./pages/commercial/Buyers"));
const CommercialProfile = lazy(() => import("./pages/commercial/Profile"));
const CommercialSettings = lazy(() => import("./pages/commercial/Settings"));
const CommercialProducts = lazy(() => import("./pages/commercial/Products"));
const CommercialRecurrences = lazy(() => import("./pages/commercial/Recurrences"));
const CommercialMeasurements = lazy(() => import("./pages/commercial/Measurements"));
const CommercialReports = lazy(() => import("./pages/commercial/Reports"));
const CommercialKnowledgeBase = lazy(() => import("./pages/commercial/KnowledgeBase"));
const CommercialTasks = lazy(() => import("./pages/commercial/Tasks"));
const CommercialImport = lazy(() => import("./pages/commercial/admin/Import"));
const CommercialLogs = lazy(() => import("./pages/commercial/admin/Logs"));
const CommercialAdminLayout = lazy(() => import("./components/commercial/admin/CommercialAdminLayout"));
const CommercialAdminDashboard = lazy(() => import("./pages/commercial/admin/Dashboard"));
const CommercialAdminUsers = lazy(() => import("./pages/commercial/admin/Users"));
const CommercialAdminServices = lazy(() => import("./pages/commercial/admin/Services"));
const CommercialAdminSchedules = lazy(() => import("./pages/commercial/admin/Schedules"));
const CommercialAdminKnowledge = lazy(() => import("./pages/commercial/admin/Knowledge"));
const CommercialAdminAuditLogs = lazy(() => import("./pages/commercial/admin/AuditLogs"));

const HRDashboard = lazy(() => import("./pages/hr/Dashboard"));
const HRTechnicians = lazy(() => import("./pages/hr/Technicians"));
const HRTimeControl = lazy(() => import("./pages/hr/TimeControl"));
const HRAbsences = lazy(() => import("./pages/hr/Absences"));
const HRHolidays = lazy(() => import("./pages/hr/Holidays"));
const HRReports = lazy(() => import("./pages/hr/Reports"));
const HRProfile = lazy(() => import("./pages/hr/Profile"));
const HRSettings = lazy(() => import("./pages/hr/Settings"));

const CorpDashboard = lazy(() => import("./pages/corp/Dashboard"));
const CorpRequests = lazy(() => import("./pages/corp/Requests"));
const CorpDocuments = lazy(() => import("./pages/corp/Documents"));
const CorpFeed = lazy(() => import("./pages/corp/Feed"));
const CorpReports = lazy(() => import("./pages/corp/Reports"));
const CorpDepartments = lazy(() => import("./pages/corp/admin/Departments"));
const CorpRequestTypes = lazy(() => import("./pages/corp/admin/RequestTypes"));
const CorpAuditLog = lazy(() => import("./pages/corp/admin/AuditLog"));

const SuppliesDashboard = lazy(() => import("./pages/supplies/Dashboard"));
const SuppliesRequests = lazy(() => import("./pages/supplies/Requests"));
const SuppliesSettings = lazy(() => import("./pages/supplies/Settings"));

const QualityDashboard = lazy(() => import("./pages/quality/Dashboard"));
const QualityNCRs = lazy(() => import("./pages/quality/NCRs"));
const QualityActionPlans = lazy(() => import("./pages/quality/ActionPlans"));
const QualityAudits = lazy(() => import("./pages/quality/Audits"));
const QualityReports = lazy(() => import("./pages/quality/Reports"));
const QualitySettings = lazy(() => import("./pages/quality/Settings"));

const FinanceDashboard = lazy(() => import("./pages/finance/Dashboard"));
const FinancePayables = lazy(() => import("./pages/finance/Payables"));
const FinanceReceivables = lazy(() => import("./pages/finance/Receivables"));
const FinanceReimbursements = lazy(() => import("./pages/finance/Reimbursements"));
const FinanceReports = lazy(() => import("./pages/finance/Reports"));
const FinanceSettings = lazy(() => import("./pages/finance/Settings"));

import { CorpRoute, CorpAdminRoute, CorpReportsRoute } from "./components/corp/CorpRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const ErrorFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <p className="text-lg font-medium text-foreground">Algo deu errado</p>
      <p className="text-sm text-muted-foreground">Tente recarregar a página.</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
      >
        Recarregar
      </button>
    </div>
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SidebarProvider>
              <ErrorBoundary fallback={<ErrorFallback />}>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<AuthLanding />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                  
                  {/* Super Admin Routes */}
                  <Route path="/super-admin/dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin"><SuperAdminDashboard /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/super-admin/companies" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin"><Companies /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/super-admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin"><SuperAdminUsers /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/super-admin/subscriptions" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin"><Subscriptions /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/super-admin/settings" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin"><Settings /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/super-admin/profile" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin"><SuperAdminProfile /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/super-admin/reports" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin"><SuperAdminReports /></DashboardLayout></ProtectedRoute>} />
                  
                  {/* Manager Routes */}
                  <Route path="/manager/dashboard" element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager"><ManagerDashboard /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/manager/coordinators" element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager"><ManagerCoordinators /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/manager/orders" element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager"><ManagerServiceOrders /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/manager/reports" element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager"><ManagerReports /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/manager/profile" element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager"><ManagerProfile /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/manager/settings" element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager"><ManagerSettings /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/manager/measurement-settings" element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager"><MeasurementSettings /></DashboardLayout></ProtectedRoute>} />

                  {/* Admin Routes */}
                  <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><ServiceOrders /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/calendar" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><ServiceCalendar /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><AdminReports /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/transfers" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><ServiceTransfers /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/history" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><ServiceHistory /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/vessels" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><VesselHistory /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/task-types" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><TaskTypes /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><AdminUsers /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/users/new" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><NewUser /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/users/:userId" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><EditUser /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/clients" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><Clients /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/technicians" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><Technicians /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><AdminProfile /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><AdminSettings /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/measurement-settings" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><MeasurementSettings /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/checklists" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><Checklists /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/technician-locations" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><TechnicianLocations /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><AuditLogs /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/admin/reservations" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><TechnicianReservations /></DashboardLayout></ProtectedRoute>} />
                  
                  {/* Tech Routes */}
                  <Route path="/tech/dashboard" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><TechDashboard /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/tasks" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><TechTasks /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/tasks/:taskId" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><TaskDetails /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/reports" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><TechReports /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/reports/new" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><ReportForm /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/reports/:reportId/edit" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><ReportForm /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/notifications" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><TechNotifications /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/install" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><TechInstallApp /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/profile" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><TechProfile /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/settings" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><TechSettings /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/survey/:taskId" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><SatisfactionSurvey /></DashboardLayout></ProtectedRoute>} />

                  {/* HR Routes */}
                  <Route path="/hr/dashboard" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><HRDashboard /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/hr/technicians" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><HRTechnicians /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/hr/time-control" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><HRTimeControl /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/hr/absences" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><HRAbsences /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/hr/on-call" element={<Navigate to="/hr/absences" replace />} />
                  <Route path="/hr/holidays" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><HRHolidays /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/hr/reports" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><HRReports /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/hr/profile" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><HRProfile /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/hr/settings" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><HRSettings /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/hr/chat" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><Chat /></DashboardLayout></ProtectedRoute>} />

                  {/* Commercial Routes */}
                  <Route path="/commercial/dashboard" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialDashboard /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/clients" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialClients /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/opportunities" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialOpportunities /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/tasks" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialTasks /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/notifications" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><TechNotifications /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/buyers" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialBuyers /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/profile" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialProfile /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/settings" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialSettings /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/products" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialProducts /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/recurrences" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialRecurrences /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/measurements" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialMeasurements /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/reports" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialReports /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/knowledge-base" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><CommercialKnowledgeBase /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/import" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="commercial"><CommercialImport /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/logs" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="commercial"><CommercialLogs /></DashboardLayout></ProtectedRoute>} />

                  {/* Commercial Admin Routes */}
                  <Route path="/commercial/admin" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><CommercialAdminLayout><CommercialAdminDashboard /></CommercialAdminLayout></ProtectedRoute>} />
                  <Route path="/commercial/admin/users" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><CommercialAdminLayout><CommercialAdminUsers /></CommercialAdminLayout></ProtectedRoute>} />
                  <Route path="/commercial/admin/services" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><CommercialAdminLayout><CommercialAdminServices /></CommercialAdminLayout></ProtectedRoute>} />
                  <Route path="/commercial/admin/schedules" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><CommercialAdminLayout><CommercialAdminSchedules /></CommercialAdminLayout></ProtectedRoute>} />
                  <Route path="/commercial/admin/knowledge" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><CommercialAdminLayout><CommercialAdminKnowledge /></CommercialAdminLayout></ProtectedRoute>} />
                  <Route path="/commercial/admin/import" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><CommercialAdminLayout><CommercialImport /></CommercialAdminLayout></ProtectedRoute>} />
                  <Route path="/commercial/admin/integration-logs" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><CommercialAdminLayout><CommercialLogs /></CommercialAdminLayout></ProtectedRoute>} />
                  <Route path="/commercial/admin/logs" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><CommercialAdminLayout><CommercialAdminAuditLogs /></CommercialAdminLayout></ProtectedRoute>} />
                  <Route path="/commercial/chat" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><Chat /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/commercial/install" element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial"><InstallApp /></DashboardLayout></ProtectedRoute>} />

                  {/* Chat Routes */}
                  <Route path="/admin/chat" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><Chat /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/manager/chat" element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager"><Chat /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/tech/chat" element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech"><Chat /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/super-admin/chat" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin"><Chat /></DashboardLayout></ProtectedRoute>} />

                  {/* Install App Routes */}
                  <Route path="/admin/install" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin"><InstallApp /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/manager/install" element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager"><InstallApp /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/hr/install" element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr"><InstallApp /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/super-admin/install" element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin"><InstallApp /></DashboardLayout></ProtectedRoute>} />

                  {/* Corp Routes */}
                  <Route path="/corp/dashboard" element={<CorpRoute><CorpDashboard /></CorpRoute>} />
                  <Route path="/corp/requests" element={<CorpRoute><CorpRequests /></CorpRoute>} />
                  <Route path="/corp/documents" element={<CorpRoute><CorpDocuments /></CorpRoute>} />
                  <Route path="/corp/feed" element={<CorpRoute><CorpFeed /></CorpRoute>} />
                  <Route path="/corp/reports" element={<CorpReportsRoute><CorpReports /></CorpReportsRoute>} />
                  <Route path="/corp/admin/departments" element={<CorpAdminRoute><CorpDepartments /></CorpAdminRoute>} />
                  <Route path="/corp/admin/request-types" element={<CorpAdminRoute><CorpRequestTypes /></CorpAdminRoute>} />
                  <Route path="/corp/admin/audit-log" element={<CorpAdminRoute><CorpAuditLog /></CorpAdminRoute>} />

                  {/* Supplies Routes */}
                  <Route path="/supplies/dashboard" element={<ProtectedRoute allowedRoles={['compras']}><DashboardLayout userType="compras"><SuppliesDashboard /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/supplies/requests" element={<ProtectedRoute allowedRoles={['compras']}><DashboardLayout userType="compras"><SuppliesRequests /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/supplies/settings" element={<ProtectedRoute allowedRoles={['compras']}><DashboardLayout userType="compras"><SuppliesSettings /></DashboardLayout></ProtectedRoute>} />

                  {/* Quality Routes */}
                  <Route path="/quality/dashboard" element={<ProtectedRoute allowedRoles={['qualidade']}><DashboardLayout userType="qualidade"><QualityDashboard /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/quality/ncrs" element={<ProtectedRoute allowedRoles={['qualidade']}><DashboardLayout userType="qualidade"><QualityNCRs /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/quality/action-plans" element={<ProtectedRoute allowedRoles={['qualidade']}><DashboardLayout userType="qualidade"><QualityActionPlans /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/quality/audits" element={<ProtectedRoute allowedRoles={['qualidade']}><DashboardLayout userType="qualidade"><QualityAudits /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/quality/reports" element={<ProtectedRoute allowedRoles={['qualidade']}><DashboardLayout userType="qualidade"><QualityReports /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/quality/settings" element={<ProtectedRoute allowedRoles={['qualidade']}><DashboardLayout userType="qualidade"><QualitySettings /></DashboardLayout></ProtectedRoute>} />

                  {/* Finance Routes */}
                  <Route path="/finance/dashboard" element={<ProtectedRoute allowedRoles={['financeiro']}><DashboardLayout userType="financeiro"><FinanceDashboard /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/finance/payables" element={<ProtectedRoute allowedRoles={['financeiro']}><DashboardLayout userType="financeiro"><FinancePayables /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/finance/receivables" element={<ProtectedRoute allowedRoles={['financeiro']}><DashboardLayout userType="financeiro"><FinanceReceivables /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/finance/reimbursements" element={<ProtectedRoute allowedRoles={['financeiro']}><DashboardLayout userType="financeiro"><FinanceReimbursements /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/finance/reports" element={<ProtectedRoute allowedRoles={['financeiro']}><DashboardLayout userType="financeiro"><FinanceReports /></DashboardLayout></ProtectedRoute>} />
                  <Route path="/finance/settings" element={<ProtectedRoute allowedRoles={['financeiro']}><DashboardLayout userType="financeiro"><FinanceSettings /></DashboardLayout></ProtectedRoute>} />

                  {/* Public Install Route */}
                  <Route path="/install" element={<InstallApp />} />

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
              </ErrorBoundary>
              <OfflineIndicator />
            </SidebarProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
