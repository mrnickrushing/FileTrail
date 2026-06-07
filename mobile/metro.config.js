const { getDefaultConfig } = require('expo/metro-config');

// @/ aliasing is handled by babel-plugin-module-resolver (see babel.config.js)
// — no need to duplicate it here with a custom resolveRequest.
module.exports = getDefaultConfig(__dirname);
