module.exports = function (api) {
  api.cache(true);
  let plugins = [[
    "module-resolver",
    {
      alias: {
        "better-auth/react": "./node_modules/better-auth/dist/client/react/index.mjs",
        "better-auth/client/plugins": "./node_modules/better-auth/dist/client/plugins/index.mjs",
        "@better-auth/expo/client": "./node_modules/@better-auth/expo/dist/client.mjs",
      },
    },
  ]];

  plugins.push('react-native-worklets/plugin');

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins,
  };
};
