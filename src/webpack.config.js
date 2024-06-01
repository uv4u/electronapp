const path = require("path");

module.exports = {
  // ... other configurations (optional)

  // Resolve configuration for modules
  resolve: {
    fallback: {
      fs: false, // or require.resolve("fs-extra") for a partial fs polyfill
      // crypto: require.resolve("crypto-browserify"),
      // stream: require.resolve("stream-browserify"),
      // http: require.resolve("stream-http"),
      // os: require.resolve("os-browserify/browser"),
      // vm: require.resolve("vm-browserify"),
      // constants: require.resolve("constants-browserify"),
      // module: "./module", // Assuming you have a ./module file
    },
  },
};
