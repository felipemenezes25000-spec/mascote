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

// Suporta GLB/GLTF como assets bundlados (Mascot3DAsset usa useGLTF do drei).
// Sem isso, Metro retorna "Unable to resolve module" pros .glb files.
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'glb',
  'gltf',
  'bin', // dependência opcional de GLTFs com external binaries
  'hdr', // pra HDRI environment maps no futuro
];

module.exports = config;
