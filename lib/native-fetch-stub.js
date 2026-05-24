// Stub for whatwg-fetch — delegates to React Native native fetch at call time
// No globals accessed at module init (they don't exist yet in RN startup)
module.exports = {
  fetch: function(input, init) { return global.fetch(input, init); },
  default: function(input, init) { return global.fetch(input, init); },
  get Headers() { return global.Headers; },
  get Request() { return global.Request; },
  get Response() { return global.Response; },
};
