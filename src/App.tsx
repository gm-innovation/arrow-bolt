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
const CorpFeedDiscussion = lazy(() => import("./pages/corp/FeedDiscussion"));
const CorpGroupDetail = lazy(() => import("./pages/corp/GroupDetail"));
const CorpGroupDiscussion = lazy(() => import("./pages/corp/GroupDiscussion"));
const CorpUserProfile = lazy(() => import("./pages/corp/UserProfile"));

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
                <Routes>
                  {/* Auth routes - keep Suspense with spinner */}
                  <Route path="/" element={<AuthLanding />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/install" element={<InstallApp />} />

                  {/* Super Admin - nested layout route */}
                  <Route element={<ProtectedRoute allowedRoles={['super_admin']}><DashboardLayout userType="super-admin" /></ProtectedRoute>}>
                    <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                    <Route path="/super-admin/companies" element={<Companies />} />
                    <Route path="/super-admin/users" element={<SuperAdminUsers />} />
                    <Route path="/super-admin/subscriptions" element={<Subscriptions />} />
                    <Route path="/super-admin/settings" element={<Settings />} />
                    <Route path="/super-admin/profile" element={<SuperAdminProfile />} />
                    <Route path="/super-admin/reports" element={<SuperAdminReports />} />
                    <Route path="/super-admin/chat" element={<Chat />} />
                    <Route path="/super-admin/install" element={<InstallApp />} />
                  </Route>

                  {/* Manager - nested layout route */}
                  <Route element={<ProtectedRoute allowedRoles={['manager']}><DashboardLayout userType="manager" /></ProtectedRoute>}>
                    <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                    <Route path="/manager/coordinators" element={<ManagerCoordinators />} />
                    <Route path="/manager/orders" element={<ManagerServiceOrders />} />
                    <Route path="/manager/reports" element={<ManagerReports />} />
                    <Route path="/manager/profile" element={<ManagerProfile />} />
                    <Route path="/manager/settings" element={<ManagerSettings />} />
                    <Route path="/manager/measurement-settings" element={<MeasurementSettings />} />
                    <Route path="/manager/chat" element={<Chat />} />
                    <Route path="/manager/install" element={<InstallApp />} />
                  </Route>

                  {/* Admin - nested layout route */}
                  <Route element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout userType="admin" /></ProtectedRoute>}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/orders" element={<ServiceOrders />} />
                    <Route path="/admin/calendar" element={<ServiceCalendar />} />
                    <Route path="/admin/reports" element={<AdminReports />} />
                    <Route path="/admin/transfers" element={<ServiceTransfers />} />
                    <Route path="/admin/history" element={<ServiceHistory />} />
                    <Route path="/admin/vessels" element={<VesselHistory />} />
                    <Route path="/admin/task-types" element={<TaskTypes />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/users/new" element={<NewUser />} />
                    <Route path="/admin/users/:userId" element={<EditUser />} />
                    <Route path="/admin/clients" element={<Clients />} />
                    <Route path="/admin/technicians" element={<Technicians />} />
                    <Route path="/admin/profile" element={<AdminProfile />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/measurement-settings" element={<MeasurementSettings />} />
                    <Route path="/admin/checklists" element={<Checklists />} />
                    <Route path="/admin/technician-locations" element={<TechnicianLocations />} />
                    <Route path="/admin/audit-logs" element={<AuditLogs />} />
                    <Route path="/admin/reservations" element={<TechnicianReservations />} />
                    <Route path="/admin/chat" element={<Chat />} />
                    <Route path="/admin/install" element={<InstallApp />} />
                  </Route>

                  {/* Tech - nested layout route */}
                  <Route element={<ProtectedRoute allowedRoles={['technician']}><DashboardLayout userType="tech" /></ProtectedRoute>}>
                    <Route path="/tech/dashboard" element={<TechDashboard />} />
                    <Route path="/tech/tasks" element={<TechTasks />} />
                    <Route path="/tech/tasks/:taskId" element={<TaskDetails />} />
                    <Route path="/tech/reports" element={<TechReports />} />
                    <Route path="/tech/reports/new" element={<ReportForm />} />
                    <Route path="/tech/reports/:reportId/edit" element={<ReportForm />} />
                    <Route path="/tech/notifications" element={<TechNotifications />} />
                    <Route path="/tech/install" element={<TechInstallApp />} />
                    <Route path="/tech/profile" element={<TechProfile />} />
                    <Route path="/tech/settings" element={<TechSettings />} />
                    <Route path="/tech/survey/:taskId" element={<SatisfactionSurvey />} />
                    <Route path="/tech/chat" element={<Chat />} />
                  </Route>

                  {/* HR - nested layout route */}
                  <Route element={<ProtectedRoute allowedRoles={['hr']}><DashboardLayout userType="hr" /></ProtectedRoute>}>
                    <Route path="/hr/dashboard" element={<HRDashboard />} />
                    <Route path="/hr/technicians" element={<HRTechnicians />} />
                    <Route path="/hr/time-control" element={<HRTimeControl />} />
                    <Route path="/hr/absences" element={<HRAbsences />} />
                    <Route path="/hr/on-call" element={<Navigate to="/hr/absences" replace />} />
                    <Route path="/hr/holidays" element={<HRHolidays />} />
                    <Route path="/hr/reports" element={<HRReports />} />
                    <Route path="/hr/profile" element={<HRProfile />} />
                    <Route path="/hr/settings" element={<HRSettings />} />
                    <Route path="/hr/chat" element={<Chat />} />
                    <Route path="/hr/install" element={<InstallApp />} />
                  </Route>

                  {/* Commercial - nested layout route */}
                  <Route element={<ProtectedRoute allowedRoles={['commercial', 'admin']}><DashboardLayout userType="commercial" /></ProtectedRoute>}>
                    <Route path="/commercial/dashboard" element={<CommercialDashboard />} />
                    <Route path="/commercial/clients" element={<CommercialClients />} />
                    <Route path="/commercial/opportunities" element={<CommercialOpportunities />} />
                    <Route path="/commercial/tasks" element={<CommercialTasks />} />
                    <Route path="/commercial/notifications" element={<TechNotifications />} />
                    <Route path="/commercial/buyers" element={<CommercialBuyers />} />
                    <Route path="/commercial/profile" element={<CommercialProfile />} />
                    <Route path="/commercial/settings" element={<CommercialSettings />} />
                    <Route path="/commercial/products" element={<CommercialProducts />} />
                    <Route path="/commercial/recurrences" element={<CommercialRecurrences />} />
                    <Route path="/commercial/measurements" element={<CommercialMeasurements />} />
                    <Route path="/commercial/reports" element={<CommercialReports />} />
                    <Route path="/commercial/knowledge-base" element={<CommercialKnowledgeBase />} />
                    <Route path="/commercial/import" element={<CommercialImport />} />
                    <Route path="/commercial/logs" element={<CommercialLogs />} />
                    <Route path="/commercial/chat" element={<Chat />} />
                    <Route path="/commercial/install" element={<InstallApp />} />
                  </Route>

                  {/* Commercial Admin Routes - separate layout */}
                  <Route element={<ProtectedRoute allowedRoles={['commercial', 'admin']} />}>
                    <Route path="/commercial/admin" element={<Suspense fallback={<LoadingFallback />}><CommercialAdminLayout><CommercialAdminDashboard /></CommercialAdminLayout></Suspense>} />
                    <Route path="/commercial/admin/users" element={<Suspense fallback={<LoadingFallback />}><CommercialAdminLayout><CommercialAdminUsers /></CommercialAdminLayout></Suspense>} />
                    <Route path="/commercial/admin/services" element={<Suspense fallback={<LoadingFallback />}><CommercialAdminLayout><CommercialAdminServices /></CommercialAdminLayout></Suspense>} />
                    <Route path="/commercial/admin/schedules" element={<Suspense fallback={<LoadingFallback />}><CommercialAdminLayout><CommercialAdminSchedules /></CommercialAdminLayout></Suspense>} />
                    <Route path="/commercial/admin/knowledge" element={<Suspense fallback={<LoadingFallback />}><CommercialAdminLayout><CommercialAdminKnowledge /></CommercialAdminLayout></Suspense>} />
                    <Route path="/commercial/admin/import" element={<Suspense fallback={<LoadingFallback />}><CommercialAdminLayout><CommercialImport /></CommercialAdminLayout></Suspense>} />
                    <Route path="/commercial/admin/integration-logs" element={<Suspense fallback={<LoadingFallback />}><CommercialAdminLayout><CommercialLogs /></CommercialAdminLayout></Suspense>} />
                    <Route path="/commercial/admin/logs" element={<Suspense fallback={<LoadingFallback />}><CommercialAdminLayout><CommercialAdminAuditLogs /></CommercialAdminLayout></Suspense>} />
                  </Route>

                  {/* Corp Routes - dynamic userType based on role */}
                  <Route path="/corp/dashboard" element={<CorpRoute pageTitle="Solicitações Corp"><CorpDashboard /></CorpRoute>} />
                  <Route path="/corp/requests" element={<CorpRoute pageTitle="Solicitações Corp"><CorpRequests /></CorpRoute>} />
                  <Route path="/corp/documents" element={<CorpRoute pageTitle="Documentos Corp"><CorpDocuments /></CorpRoute>} />
                  <Route path="/corp/feed" element={<CorpRoute pageTitle="Feed"><CorpFeed /></CorpRoute>} />
                  <Route path="/corp/feed/discussions/:id" element={<CorpRoute pageTitle="Discussão"><CorpFeedDiscussion /></CorpRoute>} />
                  <Route path="/corp/groups/:id" element={<CorpRoute pageTitle="Grupo"><CorpGroupDetail /></CorpRoute>} />
                  <Route path="/corp/groups/:id/discussions/:discussionId" element={<CorpRoute pageTitle="Discussão"><CorpGroupDiscussion /></CorpRoute>} />
                  <Route path="/corp/reports" element={<CorpReportsRoute pageTitle="Relatórios Corp"><CorpReports /></CorpReportsRoute>} />
                  <Route path="/corp/admin/departments" element={<CorpAdminRoute pageTitle="Admin Corp"><CorpDepartments /></CorpAdminRoute>} />
                  <Route path="/corp/admin/request-types" element={<CorpAdminRoute pageTitle="Admin Corp"><CorpRequestTypes /></CorpAdminRoute>} />
                  <Route path="/corp/admin/audit-log" element={<CorpAdminRoute pageTitle="Admin Corp"><CorpAuditLog /></CorpAdminRoute>} />
                  <Route path="/corp/profile/:userId" element={<CorpRoute pageTitle="Perfil"><CorpUserProfile /></CorpRoute>} />
                  <Route path="/corp/profile" element={<CorpRoute pageTitle="Meu Perfil"><CorpUserProfile /></CorpRoute>} />

                  {/* Supplies - nested layout route */}
                  <Route element={<ProtectedRoute allowedRoles={['compras']}><DashboardLayout userType="compras" /></ProtectedRoute>}>
                    <Route path="/supplies/dashboard" element={<SuppliesDashboard />} />
                    <Route path="/supplies/requests" element={<SuppliesRequests />} />
                    <Route path="/supplies/settings" element={<SuppliesSettings />} />
                  </Route>

                  {/* Quality - nested layout route */}
                  <Route element={<ProtectedRoute allowedRoles={['qualidade']}><DashboardLayout userType="qualidade" /></ProtectedRoute>}>
                    <Route path="/quality/dashboard" element={<QualityDashboard />} />
                    <Route path="/quality/ncrs" element={<QualityNCRs />} />
                    <Route path="/quality/action-plans" element={<QualityActionPlans />} />
                    <Route path="/quality/audits" element={<QualityAudits />} />
                    <Route path="/quality/reports" element={<QualityReports />} />
                    <Route path="/quality/settings" element={<QualitySettings />} />
                  </Route>

                  {/* Finance - nested layout route */}
                  <Route element={<ProtectedRoute allowedRoles={['financeiro']}><DashboardLayout userType="financeiro" /></ProtectedRoute>}>
                    <Route path="/finance/dashboard" element={<FinanceDashboard />} />
                    <Route path="/finance/payables" element={<FinancePayables />} />
                    <Route path="/finance/receivables" element={<FinanceReceivables />} />
                    <Route path="/finance/reimbursements" element={<FinanceReimbursements />} />
                    <Route path="/finance/reports" element={<FinanceReports />} />
                    <Route path="/finance/settings" element={<FinanceSettings />} />
                  </Route>

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
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
