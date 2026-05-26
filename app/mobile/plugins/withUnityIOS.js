/**
 * Expo config plugin — Unity iOS embed.
 *
 * Funções:
 *  1. Adiciona referência opcional ao UnityFramework no Podfile
 *  2. Copia templates Swift/ObjC de plugins/ios-unity-source/ pra
 *     ios/<projectName>/Unity/ durante prebuild
 *
 * Limitações:
 *  - Não modifica AppDelegate dinamicamente (instável cross-versão Expo)
 *  - Não embute UnityFramework.framework (export manual no Mac/Xcode)
 *  - Bridging header precisa ser apontado manualmente no Xcode
 *
 * Ver `app/mobile/plugins/ios-unity-source/README.md` pro checklist completo.
 */

const fs = require('fs');
const path = require('path');
const { withPodfile, withDangerousMod } = require('@expo/config-plugins');

const SOURCE_DIR = path.resolve(__dirname, 'ios-unity-source');
const TARGET_SUBDIR = 'Unity';
const FILES_TO_COPY = [
  'UnityMascotModule.swift',
  'UnityMascotModule.m',
  'UnityPlayerHelper.swift',
  'Mascote-Bridging-Header.h',
];

function withUnityIOSPodfile(config) {
  return withPodfile(config, cfg => {
    if (cfg.modResults.contents.includes('UnityFramework')) {
      return cfg;
    }
    cfg.modResults.contents += `\n# Unity iOS — ver docs/UNITY_IOS_INTEGRATION.md\n# pod 'UnityFramework', :path => '../UnityExport'\n`;
    return cfg;
  });
}

function withUnityIOSSourceFiles(config) {
  return withDangerousMod(config, [
    'ios',
    cfg => {
      const projectName = cfg.modRequest.projectName;
      if (!projectName) {
        console.warn('[withUnityIOS] projectName ausente — pulando copy de Swift sources');
        return cfg;
      }
      const targetDir = path.join(cfg.modRequest.platformProjectRoot, projectName, TARGET_SUBDIR);

      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        for (const filename of FILES_TO_COPY) {
          const src = path.join(SOURCE_DIR, filename);
          const dst = path.join(targetDir, filename);
          if (!fs.existsSync(src)) {
            console.warn(`[withUnityIOS] source ausente: ${src}`);
            continue;
          }
          // Não sobrescrever se já existe — usuário pode ter feito ajustes manuais.
          if (fs.existsSync(dst)) {
            continue;
          }
          fs.copyFileSync(src, dst);
        }
      } catch (e) {
        console.warn('[withUnityIOS] erro copiando sources:', e.message);
      }
      return cfg;
    },
  ]);
}

function withUnityIOS(config) {
  return withUnityIOSSourceFiles(withUnityIOSPodfile(config));
}

module.exports = withUnityIOS;
