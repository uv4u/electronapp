const path = require("path");

module.exports = {
  // ... other configurations (optional)

  // Resolve configuration for modules
  resolve: {
    fallback: {
      fs: false, // Optional: Disable fs polyfill if not needed
      path: require.resolve("path-browserify"),
    },
  },
};
