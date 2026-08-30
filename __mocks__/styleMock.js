// CSS module mock — returns class name as the key so className lookups work
module.exports = new Proxy(
  {},
  {
    get: (_, prop) => (typeof prop === 'string' ? prop : undefined),
  },
);
