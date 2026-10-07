// The build step bundles workspace TypeScript into a portable Node handler.
module.exports = require('../apps/api/dist/vercel.cjs').default;
