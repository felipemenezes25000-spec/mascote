/**
 * Expo config plugin — prepara Gradle para unityLibrary (Sprint 4).
 *
 * Quando o export Unity as Library existir em android/unityLibrary/,
 * inclui o módulo no settings.gradle. Sem AAR real, apenas documenta hooks.
 */

const {
  withSettingsGradle,
  withAppBuildGradle,
  withMainApplication,
} = require('@expo/config-plugins');

const UNITY_LIBRARY = 'unityLibrary';

function withUnityAndroid(config) {
  config = withSettingsGradle(config, cfg => {
    if (cfg.modResults.contents.includes(`:${UNITY_LIBRARY}`)) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /include ':app'/,
      `include ':app'\n// Unity export — ver android/unityLibrary/README.md\n// include ':${UNITY_LIBRARY}'\n// project(':${UNITY_LIBRARY}').projectDir = new File(rootProject.projectDir, '${UNITY_LIBRARY}')`,
    );
    return cfg;
  });

  config = withAppBuildGradle(config, cfg => {
    if (cfg.modResults.contents.includes('unityLibrary')) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /dependencies\s*\{/,
      `dependencies {\n    // implementation project(':${UNITY_LIBRARY}') // descomente após export Unity`,
    );
    return cfg;
  });

  config = withMainApplication(config, cfg => {
    const marker = 'UnityMascotPackage()';
    if (cfg.modResults.contents.includes(marker)) {
      return cfg;
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /return PackageList\(this\)\.packages/,
      `// Unity bridge stub — Sprint 4\n            // packages.add(UnityMascotPackage())\n            return PackageList(this).packages`,
    );
    return cfg;
  });

  return config;
}

module.exports = withUnityAndroid;
