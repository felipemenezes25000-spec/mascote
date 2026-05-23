/**
 * Expo config plugin — stub iOS UnityFramework (Sprint 6).
 *
 * Adiciona comentários no Podfile para integração futura.
 * Requer Mac + Unity export iOS para ativar de fato.
 */

const { withPodfile } = require('@expo/config-plugins');

function withUnityIOS(config) {
  return withPodfile(config, cfg => {
    if (cfg.modResults.contents.includes('UnityFramework')) {
      return cfg;
    }
    cfg.modResults.contents += `\n# Unity iOS — ver docs/UNITY_IOS_INTEGRATION.md\n# pod 'UnityFramework', :path => '../UnityExport'\n`;
    return cfg;
  });
}

module.exports = withUnityIOS;
