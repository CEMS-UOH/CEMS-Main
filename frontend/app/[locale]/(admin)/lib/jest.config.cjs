/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/role5-contracts.test.js'],
  transform: {
    '^.+\\.ts$': [
      require.resolve('ts-jest'),
      {
        isolatedModules: true,
        diagnostics: false,
      },
    ],
  },
};
