// ---------------------------------------------------------------------------
// Vercel serverless entry point for the Cyber Claw backend.
//
// Vercel runs `npm run build` (see server/vercel.json) which compiles the
// TypeScript sources in `src/` to CommonJS in `dist/`. This tiny file then
// hands the compiled Express app to Vercel as the request handler.
//
// `dist/app.js` exports the Express app (`exports.app`); an Express app is
// itself a `(req, res) => void` listener, which is exactly what the
// @vercel/node runtime expects, so we export it directly.
// ---------------------------------------------------------------------------
const { app } = require('../dist/app.js');

module.exports = app;
