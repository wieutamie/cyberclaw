import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';

// DashboardPage uses export default – no remapping needed
const DashboardPage = lazy(() => import('../pages/DashboardPage'));

const ScanPage = lazy(() => import('../pages/ScanPage').then((m) => ({ default: m.ScanPage })));
const FullReportPage = lazy(() => import('../pages/FullReportPage').then((m) => ({ default: m.FullReportPage })));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const PreferencesPage = lazy(() => import('../pages/PreferencesPage').then((m) => ({ default: m.PreferencesPage })));
const TermsPage = lazy(() => import('../pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const AboutPage = lazy(() => import('../pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const HelpPage = lazy(() => import('../pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh] text-muted text-sm animate-pulse">
    Loading...
  </div>
);

export const router = createBrowserRouter([
  // --- App shell (no authentication required) ----------------------------
  {
    element: <AppLayout />,
    children: [
      {
        path: '/dashboard',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: '/scan/:scanId',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <ScanPage />
          </Suspense>
        ),
      },
      {
        path: '/scan/:scanId/report',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <FullReportPage />
          </Suspense>
        ),
      },
      {
        path: '/analytics',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <AnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: '/preferences',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <PreferencesPage />
          </Suspense>
        ),
      },
      {
        path: '/terms',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <TermsPage />
          </Suspense>
        ),
      },
      {
        path: '/about',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <AboutPage />
          </Suspense>
        ),
      },
      {
        path: '/help',
        element: (
          <Suspense fallback={<SuspenseFallback />}>
            <HelpPage />
          </Suspense>
        ),
      },
    ],
  },

  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<SuspenseFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
