const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { resolve } = require('metro-resolver');

const projectRoot = __dirname;
const srcRoot = path.join(projectRoot, 'src');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    return resolve(context, path.join(srcRoot, moduleName.slice(2)), platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
