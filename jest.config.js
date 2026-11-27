module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // These packages ship untranspiled ESM, so Jest must run them through Babel
  // instead of ignoring them with the rest of node_modules.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      ['@react-native', 'react-native', '@react-navigation', 'react-native-.*'].join('|') +
      ')/)',
  ],
};
