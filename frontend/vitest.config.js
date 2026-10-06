import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.{test,spec}.{js,jsx}'],
    setupFiles: ['./tests/setup.js'],
    clearMocks: true,
    maxWorkers: 2,
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'src/hooks/*.js', 'src/redux/slices/*.js',
        'src/utils/*.js', 'src/components/PrivateRoute.jsx',
        'src/components/Model.jsx', 'src/components/TaskBox.jsx',
        'src/pages/Register_Login.jsx',
      ],
      reportsDirectory: 'coverage/unit',
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
    },
  },
}));
