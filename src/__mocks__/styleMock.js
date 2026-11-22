// Stub for CSS / CSS Module imports in Jest
// Returns a Proxy so any className lookup returns the class name itself.
module.exports = new Proxy(
  {},
  { get: (_, prop) => (typeof prop === 'string' ? prop : undefined) }
);
