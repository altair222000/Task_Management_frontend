import config from './vitest.config.js';
export default {
  ...config,
  test: {
    ...config.test,
    include: ['tests/baseline/*.test.js'],
    coverage: { ...config.test.coverage, reportsDirectory: 'coverage/baseline' },
  },
};
