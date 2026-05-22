module.exports = function (api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';
  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: { '@': './src' },
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.ts', '.tsx'],
      },
    ],
    'react-native-reanimated/plugin',
  ];
  // Em release build, varre todas as chamadas a `console.*` (exceto error)
  // pra eliminar vazamentos de dados em Logcat/Flipper/oslog.
  if (isProd) {
    plugins.unshift(['transform-remove-console', { exclude: ['error'] }]);
  }
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
