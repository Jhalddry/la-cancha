const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force Metro to prefer CJS over ESM for @supabase/supabase-js.
// The ESM build uses `import(VARIABLE)` for optional OpenTelemetry which
// Hermes cannot compile. The CJS build uses require(s) and works fine.
const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@supabase/supabase-js') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/@supabase/supabase-js/dist/index.cjs'),
    };
  }
  if (moduleName.startsWith('@opentelemetry/')) {
    return { type: 'empty' };
  }
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
