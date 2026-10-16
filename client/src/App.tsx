import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/index.js';

/**
 * App is a thin wrapper around the router.
 * The providers (Auth + Settings) are mounted in main.tsx.
 */
export default function App() {
  return <RouterProvider router={router} />;
}
