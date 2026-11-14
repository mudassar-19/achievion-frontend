/* eslint-disable react-refresh/only-export-components -- route table: lazy pages and small route helpers live here */
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Link, useRouteError, isRouteErrorResponse, useParams, useLocation } from "react-router-dom";
import TallyLoader from "@/components/ui/TallyLoader";
import Tally from "@/components/ui/Tally";
import useAuthStore from "@/stores/authStore";
import { homePathFor } from "@/utils/roleTheme";

import PublicLayout          from "@/components/layout/PublicLayout";
import AuthLayout            from "@/components/layout/AuthLayout";
import WorkspaceLayout       from "@/components/layout/WorkspaceLayout"; // E-1: only the Manager's old /workspace board and gantt
import EmployeeShell         from "@/components/layout/EmployeeShell";
import DirectorLayout        from "@/components/layout/DirectorLayout";
import ManagerLayout         from "@/components/layout/ManagerLayout";
import TeamLeadShell         from "@/components/layout/TeamLeadShell";
import ProtectedRoute        from "@/components/layout/ProtectedRoute";
import RoleRoute             from "@/components/layout/RoleRoute";
import OrgProtectedRoute     from "@/components/layout/OrgProtectedRoute";
import OrgLayout             from "@/components/layout/OrgLayout";

import LandingPage           from "@/pages/LandingPage";
import LoginPage             from "@/pages/LoginPage";
import ForgotPasswordPage    from "@/pages/ForgotPasswordPage";
import OrgStep1              from "@/pages/signup/org/OrgStep1";
import OrgStep3              from "@/pages/signup/org/OrgStep3";




// ── Team Lead portal pages ────────────────────────────────────────────────────


// FE-061: every portal page is its own chunk, loaded on first visit.
const OrgLoginPage = lazy(() => import("@/pages/org/OrgLoginPage"));
const TodayPage = lazy(() => import("@/pages/employee/TodayPage")); // E-2: replaces WorkspaceDashboard + SeniorDashboard for employees (files kept)
const MyTasksPage = lazy(() => import("@/pages/employee/MyTasksPage")); // E-2: replaces TaskBoardPage + TaskDetailPage for employees (Manager still uses them)
const TaskBoardPage = lazy(() => import("@/pages/workspace/TaskBoardPage"));
const TaskDetailPage = lazy(() => import("@/pages/workspace/TaskDetailPage"));
const ProfilePage = lazy(() => import("@/pages/workspace/ProfilePage"));
const QuestBoardPage = lazy(() => import("@/pages/employee/QuestBoardPage"));
const EmployeeAiPage = lazy(() => import("@/pages/employee/EmployeeAiPage"));
const LeaderboardPage = lazy(() => import("@/pages/workspace/LeaderboardPage"));
const ChatHomePage = lazy(() => import("@/pages/workspace/ChatHomePage"));
const NotificationsPage = lazy(() => import("@/pages/workspace/NotificationsPage"));
const SettingsPage = lazy(() => import("@/pages/workspace/SettingsPage"));
const BadgesPage = lazy(() => import("@/pages/workspace/BadgesPage"));
const AvatarPage = lazy(() => import("@/pages/workspace/AvatarPage"));
const ShopPage = lazy(() => import("@/pages/workspace/ShopPage"));
const InventoryPage = lazy(() => import("@/pages/workspace/InventoryPage"));
const TitlesPage = lazy(() => import("@/pages/workspace/TitlesPage"));
const ProjectBoardPage = lazy(() => import("@/pages/workspace/ProjectBoardPage"));
const GanttPage = lazy(() => import("@/pages/workspace/GanttPage"));
const ManagerReportsPage = lazy(() => import("@/pages/manager/ManagerReportsPage"));
const MySubmissionsPage = lazy(() => import("@/pages/employee/MySubmissionsPage")); // E-3: replaces pages/workspace/MySubmissionsPage (file kept, unrouted)
const TLRequestsPage = lazy(() => import("@/pages/teamlead/TLRequestsPage")); // E-3 (D-180): not in the rail
const ManagerResourcesPage = lazy(() => import("@/pages/manager/ManagerResourcesPage"));
const ManagerChallengesPage = lazy(() => import("@/pages/manager/ManagerChallengesPage"));
const ManagerChallengePage  = lazy(() => import("@/pages/manager/ManagerChallengePage"));
const ManagerAnomaliesPage  = lazy(() => import("@/pages/manager/ManagerAnomaliesPage"));
const OperationsHubPage = lazy(() => import("@/pages/workspace/OperationsHubPage"));
const ManagerHomePage   = lazy(() => import("@/pages/manager/ManagerHomePage"));
const ManagerProjectsPage      = lazy(() => import("@/pages/manager/ManagerProjectsPage"));
const ManagerProjectDetailPage = lazy(() => import("@/pages/manager/ManagerProjectDetailPage"));
const ProjectWizardPage        = lazy(() => import("@/pages/manager/ProjectWizardPage"));
const ManagerSprintsPage = lazy(() => import("@/pages/manager/ManagerSprintsPage"));
const ManagerSprintPage  = lazy(() => import("@/pages/manager/ManagerSprintPage"));
const DirectorDashboard = lazy(() => import("@/pages/director/DirectorDashboard"));
const ProgressGardenPage = lazy(() => import("@/pages/director/ProgressGardenPage"));
const ApprovalQueuePage = lazy(() => import("@/pages/director/ApprovalQueuePage"));
const TeamAnalyticsPage = lazy(() => import("@/pages/director/TeamAnalyticsPage"));
const UserRolesPage = lazy(() => import("@/pages/director/UserRolesPage"));
const ProjectManagementPage = lazy(() => import("@/pages/director/ProjectManagementPage"));
const AuditLogPage = lazy(() => import("@/pages/director/AuditLogPage"));
const DirectorAnomaliesPage = lazy(() => import("@/pages/director/DirectorAnomaliesPage"));
const DirectorReportsPage = lazy(() => import("@/pages/director/DirectorReportsPage"));
const DirectorProfilePage = lazy(() => import("@/pages/director/DirectorProfilePage"));
const DirectorNotificationsPage = lazy(() => import("@/pages/director/DirectorNotificationsPage"));
const DirectorSettingsPage = lazy(() => import("@/pages/director/DirectorSettingsPage"));
const DirectorWorkspaceSettingsPage = lazy(() => import("@/pages/director/DirectorWorkspaceSettingsPage"));
const ExtensionQueuePage = lazy(() => import("@/pages/director/ExtensionQueuePage"));
const VoiceInboxPage     = lazy(() => import("@/pages/director/VoiceInboxPage"));
const RiskRegisterPage   = lazy(() => import("@/pages/director/RiskRegisterPage"));
const GoalsPage             = lazy(() => import("@/pages/director/GoalsPage"));
import { DIRECTOR_FEATURES as DF } from "@/lib/directorFeatures";
const SuccessCriteriaPage   = lazy(() => import("@/pages/director/SuccessCriteriaPage"));
const AskAchievionPage      = lazy(() => import("@/pages/director/AskAchievionPage"));
const OrgHealthPage         = lazy(() => import("@/pages/director/OrgHealthPage"));
const CapacityHeatmapPage   = lazy(() => import("@/pages/director/CapacityHeatmapPage"));
const TeamWorkloadPage      = lazy(() => import("@/pages/director/TeamWorkloadPage"));
const DeptDetailPage            = lazy(() => import("@/pages/director/DeptDetailPage"));
const DirectorProjectDetailPage = lazy(() => import("@/pages/director/ProjectDetailPage"));
const SurveyPage               = lazy(() => import("@/pages/SurveyPage"));
const CollaborationBridgePage  = lazy(() => import("@/pages/CollaborationBridgePage"));
const OrgDashboard = lazy(() => import("@/pages/org/OrgDashboard"));
const EmployeeList = lazy(() => import("@/pages/org/EmployeeList"));
const CreateEmployee = lazy(() => import("@/pages/org/CreateEmployee"));
const OrgApprovalsPage   = lazy(() => import("@/pages/org/OrgApprovalsPage"));
const PastEmployeesPage  = lazy(() => import("@/pages/org/PastEmployeesPage"));
// T-1 (D-113): new Team Lead pages; the old Dashboard / Projects / Tasks Hub / Board / Team / Availability files are kept, not routed.
const TLHomePage    = lazy(() => import("@/pages/teamlead/TLHomePage"));
const TLModulesPage = lazy(() => import("@/pages/teamlead/TLModulesPage"));
const TLModulePage  = lazy(() => import("@/pages/teamlead/TLModulePage"));
const TLBreakdownPage = lazy(() => import("@/pages/teamlead/TLBreakdownPage"));
const TLTasksPage   = lazy(() => import("@/pages/teamlead/TLTasksPage"));
const TLTeamPage    = lazy(() => import("@/pages/teamlead/TLTeamPage"));
const TLSprintsPage = lazy(() => import("@/pages/teamlead/TLSprintsPage"));
const TLSprintPage  = lazy(() => import("@/pages/teamlead/TLSprintPage"));
const TLReviewQueuePage = lazy(() => import("@/pages/teamlead/TLReviewQueuePage")); // T-4: replaces TeamLeadReviewPage (file kept, unrouted)
const TLReviewPage = lazy(() => import("@/pages/teamlead/TLReviewPage")); // T-4: replaces TeamLeadTaskReviewPage (file kept, unrouted)
const TLPerformancePage = lazy(() => import("@/pages/teamlead/TLPerformancePage"));
const TLMyStatsPage = lazy(() => import("@/pages/teamlead/TLMyStatsPage"));
const TLAnnouncementsPage = lazy(() => import("@/pages/teamlead/TLAnnouncementsPage"));
const TeamLeadGamificationHubPage = lazy(() => import("@/pages/teamlead/TeamLeadGamificationHubPage"));
const TeamLeadBadgesPage = lazy(() => import("@/pages/teamlead/TeamLeadBadgesPage"));
const TeamLeadAvatarPage = lazy(() => import("@/pages/teamlead/TeamLeadAvatarPage"));
const TeamLeadTitlesPage = lazy(() => import("@/pages/teamlead/TeamLeadTitlesPage"));
const TLProfilePage = lazy(() => import("@/pages/teamlead/TLProfilePage")); // S-3 (D-168): replaces TeamLeadProfilePage (file kept)
const NotificationsInbox = lazy(() => import("@/pages/shared/NotificationsInbox")); // S-3 (D-168): replaces TeamLeadNotificationsPage (file kept)
// E-4: the Tester's Quality pages (QualityPlaceholder file kept, unrouted). BugsPage also serves the Team Lead at /teamlead/bugs.
const QaQueuePage = lazy(() => import("@/pages/employee/quality/QaQueuePage"));
const QaPage = lazy(() => import("@/pages/employee/quality/QaPage"));
const BugsPage = lazy(() => import("@/pages/employee/quality/BugsPage"));
const TestCasesPage = lazy(() => import("@/pages/employee/quality/TestCasesPage"));
const TeamLeadSettingsPage = lazy(() => import("@/pages/teamlead/TeamLeadSettingsPage"));

// Suspense boundary per page so the shell (sidebar, top bar) stays on screen while a chunk loads.
function S({ children }) {
  return <Suspense fallback={<div className="flex justify-center py-24"><TallyLoader /></div>}>{children}</Suspense>;
}

// ── Post-login redirect — role-aware convenience route (/dashboard) ───────────
// Manager portal moved to /manager (V2 Phase 3 · M-1). Old /workspace links keep working.
function ToManager({ to }) {
  const params = useParams(); const { search } = useLocation();
  return <Navigate to={to.replace(/:(\w+)/g, (_, k) => params[k] ?? "") + search} replace />;
}
// Employee landing; a Manager who lands here goes to their own Dashboard.
function WorkspaceHome() {
  const role = useAuthStore((s) => s.user?.role);
  return role === "Manager" ? <Navigate to="/manager" replace /> : <S><TodayPage /></S>;
}
// E-2: My tasks + drawer for employees; a Manager on these old URLs goes to their own Tasks.
function WorkspaceTasks() {
  const role = useAuthStore((s) => s.user?.role);
  return role === "Manager" ? <Navigate to="/manager/tasks" replace /> : <S><MyTasksPage /></S>;
}
function WorkspaceTask() {
  const role = useAuthStore((s) => s.user?.role);
  const { taskId } = useParams();
  return <Navigate to={role === "Manager" ? `/manager/tasks/${taskId}` : `/workspace/tasks?task=${taskId}`} replace />;
}

// E-1: employees get the universal shell; a Manager on an old /workspace URL keeps the old layout (board, gantt).
function WorkspaceRoot() {
  const role = useAuthStore((s) => s.user?.role);
  return role === "Manager" ? <WorkspaceLayout /> : <EmployeeShell />;
}
function WorkspaceNotifications() {
  const role = useAuthStore((s) => s.user?.role);
  return <S><NotificationsInbox role={role} settingsPath="/workspace/settings" ownPath="/workspace/notifications" /></S>;
}

function PostLoginRedirect() {
  const user            = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authReady       = useAuthStore((s) => s.authReady);

  if (!authReady)       return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Navigate to={homePathFor(user)} replace />;
}

// ── 404 / error screen (FE-002, FE-048) ──────────────────────────────────────
// Used as the root errorElement (render errors in any page) and as the catch-all route.
function RouteError() {
  const err = useRouteError();
  const notFound = !err || (isRouteErrorResponse(err) && err.status === 404);
  return (
    <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg-base px-4 text-center text-text-primary">
      <Tally pose={notFound ? "thinking" : "alert"} size={120} />
      <h1 className="text-3xl font-bold">{notFound ? "Page not found" : "Something went wrong"}</h1>
      <p className="max-w-md text-text-secondary">
        {notFound
          ? "The page you're looking for doesn't exist."
          : "This page hit an unexpected error. Your work on other pages is safe. Try again, or go back home."}
      </p>
      <div className="flex gap-3">
        {!notFound && (
          <button type="button" onClick={() => window.location.reload()} className="h-11 rounded-xl border border-border-subtle px-5 font-semibold">
            Reload
          </button>
        )}
        <Link to="/dashboard" className="inline-flex h-11 items-center rounded-xl bg-accent px-5 font-semibold text-accent-on no-underline">Go home</Link>
      </div>
    </div>
  );
}

// ── Router definition ─────────────────────────────────────────────────────────
const router = createBrowserRouter([{
  errorElement: <RouteError />,
  children: [

  // ── Public ────────────────────────────────────────────────────────────────
  {
    path:         "/",
    element:      <PublicLayout><LandingPage /></PublicLayout>,
    errorElement: <RouteError />,
  },

  // ── Employee auth ─────────────────────────────────────────────────────────
  { path: "/login",            element: <AuthLayout><LoginPage /></AuthLayout> },
  { path: "/forgot-password",  element: <AuthLayout><ForgotPasswordPage /></AuthLayout> },
  { path: "/dashboard",        element: <PostLoginRedirect /> },

  // ── Org (Software House) auth ─────────────────────────────────────────────
  { path: "/org/login", element: <S><OrgLoginPage /></S> },

  // ── Organisation registration ─────────────────────────────────────────────
  { path: "/register/step-1", element: <OrgStep1 /> },
  { path: "/register/step-2", element: <Navigate to="/register/step-1" replace /> },
  { path: "/register/step-3", element: <OrgStep3 /> },

  // ── Software House admin panel (org JWT required) ─────────────────────────
  {
    element: <OrgProtectedRoute />,
    children: [
      {
        element: <OrgLayout />,
        children: [
          { path: "/org/dashboard",          element: <S><OrgDashboard /></S>        },
          { path: "/org/employees",          element: <S><EmployeeList /></S>        },
          { path: "/org/employees/create",   element: <S><CreateEmployee /></S>      },
          { path: "/org/employees/deleted",  element: <S><PastEmployeesPage /></S>   },
          { path: "/org/past-employees",     element: <S><PastEmployeesPage /></S>   },
          { path: "/org/approvals",          element: <S><OrgApprovalsPage /></S>    },
        ],
      },
    ],
  },

  // ── Employee workspace (Developer | Designer | Tester | Manager) ──────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute allowedRoles={["developer", "designer", "tester", "manager"]} />,
        children: [
          {
            path:    "/workspace",
            element: <WorkspaceRoot />,
            // E-1 (Employee UX §3.1): nav Work | Play | Talk (+ Quality for Testers). Old URLs redirect (OLD_EMPLOYEE_URLS);
            // the old pages are reused at the new URLs until their own step. Titles stays routed, out of the nav (E-6).
            children: [
              { index: true,           element: <WorkspaceHome /> },
              { path: "tasks",         element: <WorkspaceTasks />           },
              { path: "tasks/:taskId", element: <WorkspaceTask />            }, // E-2: deep link opens the drawer
              { path: "profile",       element: <S><ProfilePage /></S>        },
              { path: "shop",          element: <S><ShopPage /></S>            }, // E-7 (D-243)
              { path: "inventory",     element: <S><InventoryPage /></S>       }, // E-7 (D-244)
              { path: "achievements",  element: <S><BadgesPage /></S>         }, // titles join in E-6
              { path: "announcements", element: <S><CollaborationBridgePage key="announcements" startWith="announcements" /></S> },
              { path: "badges",        element: <Navigate to="/workspace/achievements" replace /> },
              { path: "avatar",        element: <S><AvatarPage /></S>              },
              { path: "sprint",        element: <Navigate to="/workspace/tasks" replace /> }, // sprint view comes in E-2
              { path: "leaderboard",   element: <S><LeaderboardPage /></S>    },
              { path: "quests",        element: <S><QuestBoardPage /></S>     }, // Batch 3 (E13)
              { path: "ai",            element: <S><EmployeeAiPage /></S>     }, // Batch 4 (E14, E15)
              { path: "chat",          element: <S><CollaborationBridgePage /></S> },
              { path: "notifications", element: <WorkspaceNotifications />   },
              { path: "settings",            element: <S><SettingsPage /></S>            },
              { path: "titles",              element: <S><TitlesPage /></S>              },
              { path: "submissions",          element: <S><MySubmissionsPage /></S>        },
              // Manager-only pages (FE-001, FE-R012): other roles are sent to their own home.
              {
                element: <RoleRoute allowedRoles={["manager"]} />,
                children: [
                { path: "projects",           element: <ToManager to="/manager/projects" /> },
                { path: "projects/create",   element: <ToManager to="/manager/projects/create" /> },
                { path: "projects/:id",      element: <ToManager to="/manager/projects/:id" /> },
                { path: "board",               element: <S><ProjectBoardPage /></S>        },
                { path: "team-overview",       element: <ToManager to="/manager/resources" /> },
                { path: "gantt",               element: <S><GanttPage /></S>               },
                { path: "reports",             element: <ToManager to="/manager/reports" /> },
                { path: "availability",        element: <ToManager to="/manager/resources" /> },
                { path: "workforce",           element: <ToManager to="/manager/resources" /> },
                { path: "operations",          element: <ToManager to="/manager/inbox" /> },
                { path: "team",                element: <ToManager to="/manager" /> },
                ],
              },
              {
                element: <RoleRoute allowedRoles={["tester"]} />,
                children: [
                  { path: "qa",          element: <S><QaQueuePage /></S> },
                  { path: "qa/:taskId",  element: <S><QaPage /></S> },
                  { path: "bugs",        element: <S><BugsPage /></S> },
                  { path: "test-cases",  element: <S><TestCasesPage /></S> },
                ],
              },
              // Senior tier dashboard.
              {
                element: <RoleRoute allowedRoles={["developer", "designer", "tester"]} seniorOnly />,
                children: [
                { path: "senior",        element: <S><TodayPage /></S>          }, // E-2: Senior home = Today
                ],
              },
            ],
          },
        ],
      },

      // ── Manager portal (V2 Phase 3 · M-1). Universal PortalShell, same as the Director (D-083).
      // Board / Gantt stay reachable under /workspace but are not in nav (D-080); Team Overview / Availability → Resources (M-4).
      {
        element: <RoleRoute allowedRoles={["manager"]} />,
        children: [
          {
            path:    "/manager",
            element: <ManagerLayout />,
            children: [
              { index: true,              element: <S><ManagerHomePage /></S>   },
              { path: "inbox",            element: <S><OperationsHubPage /></S> },
              { path: "projects",         element: <S><ManagerProjectsPage /></S>      },
              { path: "projects/create",  element: <S><ProjectWizardPage /></S>        },
              { path: "projects/:id",     element: <S><ManagerProjectDetailPage /></S> },
              { path: "projects/:id/edit", element: <S><ProjectWizardPage /></S>       },
              { path: "resources",        element: <S><ManagerResourcesPage /></S> },
              { path: "challenges",       element: <S><ManagerChallengesPage /></S> },
              { path: "challenges/:id",   element: <S><ManagerChallengePage /></S> },
              { path: "anomalies",        element: <S><ManagerAnomaliesPage /></S> },
              { path: "leaderboard",      element: <S><LeaderboardPage /></S>   },
              { path: "chat",             element: <S><CollaborationBridgePage /></S> },
              { path: "announcements",    element: <S><CollaborationBridgePage key="announcements" startWith="announcements" /></S> },
              { path: "sprints",          element: <S><ManagerSprintsPage /></S> },
              { path: "sprints/:id",      element: <S><ManagerSprintPage /></S>  },
              // M-6: Insights → Reports. The old workspace ReportsPage file stays (not routed for Managers).
              { path: "reports",          element: <S><ManagerReportsPage /></S> },
              { path: "tasks",            element: <S><TaskBoardPage /></S>     },
              { path: "tasks/:taskId",    element: <S><TaskDetailPage /></S>    },
              { path: "profile",          element: <S><ProfilePage /></S>       },
              { path: "notifications",    element: <S><NotificationsPage /></S> },
              { path: "settings",         element: <S><SettingsPage /></S>      },
            ],
          },
        ],
      },

      // ── Team Lead portal (isolated — no shared workspace pages) ─────────
      {
        element: <RoleRoute allowedRoles={["team_lead"]} />,
        children: [
          {
            path:    "/teamlead",
            element: <TeamLeadShell />,
            // T-1 (D-113): PortalShell + UX nav. Old URLs redirect; Badges / Avatar / Titles / Analytics / Activity /
            // Gamification stay routed but are not in the nav (UX TL §2). TeamLeadLayout file kept, not routed.
            children: [
              { index: true,              element: <S><TLHomePage /></S>               },
              { path: "modules",          element: <S><TLModulesPage /></S>            },
              { path: "modules/:projectId", element: <S><TLModulePage /></S>           },
              { path: "modules/:projectId/breakdown", element: <S><TLBreakdownPage /></S> },
              { path: "projects",         element: <Navigate to="/teamlead/modules" replace /> },
              { path: "projects/:id",     element: <ToManager to="/teamlead/modules/:id" /> },
              { path: "projects/:id/milestones/:milestoneId",           element: <ToManager to="/teamlead/modules/:id?module=:milestoneId" /> }, // S-3 (D-168): the module page does this; old file kept
              { path: "tasks",                element: <S><TLTasksPage /></S>          },
              { path: "board",                element: <Navigate to="/teamlead/tasks?view=board" replace /> },
              { path: "review-submissions",   element: <S><TLReviewQueuePage /></S>   },
              { path: "review/:taskId",        element: <S><TLReviewPage /></S> },
              { path: "team",             element: <S><TLTeamPage /></S>               },
              { path: "availability",     element: <Navigate to="/teamlead/team" replace /> },
              { path: "sprints",          element: <S><TLSprintsPage /></S>            },
              { path: "sprints/:id",      element: <S><TLSprintPage /></S>             },
              { path: "performance",      element: <S><TLPerformancePage /></S>        }, // T-5 (D-144)
              { path: "my-stats",         element: <S><TLMyStatsPage /></S>            }, // T-5 (D-145)
              { path: "announcements",    element: <S><TLAnnouncementsPage /></S>      }, // T-5 (D-146)
              { path: "analytics",        element: <Navigate to="/teamlead/performance" replace /> }, // old page kept, unrouted
              { path: "activity",         element: <Navigate to="/teamlead/performance?tab=activity" replace /> }, // old page kept, unrouted
              { path: "leaderboard",      element: <S><LeaderboardPage /></S>  }, // U-1 (D-133): one shared leaderboard
              { path: "gamification",    element: <S><TeamLeadGamificationHubPage /></S> },
              { path: "badges",           element: <S><TeamLeadBadgesPage /></S>       },
              { path: "avatar",           element: <S><TeamLeadAvatarPage /></S>       },
              { path: "titles",           element: <S><TeamLeadTitlesPage /></S>       },
              { path: "profile",          element: <S><TLProfilePage /></S>            },
              { path: "notifications",    element: <S><NotificationsInbox role="Team Lead" settingsPath="/teamlead/settings" ownPath="/teamlead/notifications" /></S> },
              { path: "settings",         element: <S><TeamLeadSettingsPage /></S>     },
              { path: "requests",         element: <S><TLRequestsPage /></S>           }, // E-3: more time / one more try
              { path: "bugs",             element: <S><BugsPage key="lead" lead /></S> }, // E-4 (D-190): check and close bugs; not in the rail
              { path: "chat",             element: <S><CollaborationBridgePage /></S>  },
            ],
          },
        ],
      },

      // Director portal
      {
        element: <RoleRoute allowedRoles={["director"]} />,
        children: [
          {
            path:    "/director",
            element: <DirectorLayout />,
            children: [
              { index: true,              element: <S><DirectorDashboard /></S>           },
              { path: "garden",           element: <S><ProgressGardenPage /></S>          },
              { path: "approvals",        element: <S><ApprovalQueuePage /></S>           },
              { path: "analytics",        element: <S><TeamAnalyticsPage /></S>           },
              { path: "roles",            element: <S><UserRolesPage /></S>               },
              { path: "projects",         element: <S><ProjectManagementPage /></S>       },
              { path: "audit-log",        element: <S><AuditLogPage /></S>                },
              { path: "reports",          element: <S><DirectorReportsPage /></S>         },
              { path: "anomalies",        element: <S><DirectorAnomaliesPage /></S>       }, // Batch 5 (D9)
              { path: "account-settings",   element: <S><SettingsPage /></S>                           }, // U-1: personal settings
              { path: "leaderboard",        element: <S><LeaderboardPage /></S>                        }, // U-1 (D-133): org view, Director is not ranked
              { path: "profile",            element: <S><DirectorProfilePage /></S>                   },
              { path: "notifications",      element: <S><DirectorNotificationsPage /></S>             },
              { path: "settings",           element: <S><DirectorSettingsPage /></S>                  },
              { path: "workspace-settings", element: <S><DirectorWorkspaceSettingsPage /></S>         },
              { path: "extensions",        element: <S><ExtensionQueuePage /></S>                   },
              { path: "voice",             element: DF.voice ? <S><VoiceInboxPage /></S> : <Navigate to="/director" replace /> },
              { path: "risks",             element: DF.risks ? <S><RiskRegisterPage /></S> : <Navigate to="/director" replace /> },
              { path: "goals",             element: DF.goals ? <S><GoalsPage /></S> : <Navigate to="/director" replace /> },
              { path: "success-criteria",  element: <S><SuccessCriteriaPage /></S>                  },
              { path: "org-health",        element: <S><OrgHealthPage /></S>                        },
              { path: "capacity",          element: <S><CapacityHeatmapPage /></S>                  },
              { path: "capacity/teams",    element: <S><TeamWorkloadPage /></S>                     },
              { path: "dept/:deptName",    element: <S><DeptDetailPage /></S>                       },
              { path: "projects/:id",      element: <S><DirectorProjectDetailPage /></S>            },
              { path: "ask",               element: <S><AskAchievionPage /></S>                     },
              { path: "chat",              element: <S><CollaborationBridgePage /></S>               },
            ],
          },
        ],
      },
      // Survey — any authenticated user
      { path: "/survey", element: <S><SurveyPage /></S> },
    ],
  },

  { path: "*", element: <RouteError /> },
],
}]);

export default router;
