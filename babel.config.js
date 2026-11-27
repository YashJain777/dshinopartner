module.exports = {
  presets: ['module:@react-native/babel-preset'],
  env: {
    // Release builds must not ship console output: the partner app handles
    // customer names, phone numbers and addresses, and anything logged is
    // readable from logcat by any app with log access.
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};
