// Docusaurus module mock for tests
module.exports = {
  default: ({ children }) => children,
  useHistory: () => ({ push: jest.fn() }),
  useLocation: () => ({ pathname: '/', search: '', hash: '' }),
  Link: ({ children, to }) => children,
  BrowserOnly: ({ children, fallback }) => children ? children() : fallback || null,
};
