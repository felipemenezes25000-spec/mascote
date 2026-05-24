/**
 * Expo config plugin — Gradle + Manifest para unityLibrary (Sprint 3).
 *
 * Se `android/unityLibrary/build.gradle` existir (export Unity as Library),
 * inclui o módulo e declara UnityPlayerActivity. Sem AAR, deixa comentários
 * seguros para não quebrar o Gradle.
 */

const fs = require('fs');
const path = require('path');
const { withSettingsGradle, withAppBuildGradle, withAndroidManifest } = require('@expo/config-plugins');

const UNITY_LIBRARY = 'unityLibrary';
const UNITY_ACTIVITY = 'com.unity3d.player.UnityPlayerActivity';

function unityLibraryReady(projectRoot) {
  return fs.existsSync(path.join(projectRoot, 'android', UNITY_LIBRARY, 'build.gradle'));
}

function withUnityAndroid(config) {
  const projectRoot = config.modRequest?.projectRoot ?? process.cwd();
  const ready = unityLibraryReady(projectRoot);

  config = withSettingsGradle(config, cfg => {
    if (cfg.modResults.contents.includes(`':${UNITY_LIBRARY}'`)) {
      return cfg;
    }
    const snippet = ready
      ? `include ':${UNITY_LIBRARY}'\nproject(':${UNITY_LIBRARY}').projectDir = new File(rootProject.projectDir, '${UNITY_LIBRARY}')`
      : `// Unity export — ver android/unityLibrary/README.md\n// include ':${UNITY_LIBRARY}'\n// project(':${UNITY_LIBRARY}').projectDir = new File(rootProject.projectDir, '${UNITY_LIBRARY}')`;
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /include ':app'/,
      `include ':app'\n${snippet}`,
    );
    return cfg;
  });

  config = withAppBuildGradle(config, cfg => {
    if (cfg.modResults.contents.includes(`project(':${UNITY_LIBRARY}')`)) {
      return cfg;
    }
    const dep = ready
      ? `implementation project(':${UNITY_LIBRARY}')`
      : `// implementation project(':${UNITY_LIBRARY}') // descomente após export Unity`;
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /dependencies\s*\{/,
      `dependencies {\n    ${dep}`,
    );
    return cfg;
  });

  if (ready) {
    config = withAndroidManifest(config, cfg => {
      const app = cfg.modResults.manifest.application?.[0];
      if (!app) return cfg;

      const activities = app.activity ?? [];
      const hasUnity = activities.some(a => a.$?.['android:name'] === UNITY_ACTIVITY);
      if (hasUnity) return cfg;

      app.activity = [
        ...activities,
        {
          $: {
            'android:name': UNITY_ACTIVITY,
            'android:theme': '@style/UnityThemeSelector',
            'android:configChanges':
              'mcc|mnc|locale|touchscreen|keyboard|keyboardHidden|navigation|orientation|screenLayout|uiMode|screenSize|smallestScreenSize|fontScale|layoutDirection|density',
            'android:hardwareAccelerated': 'true',
          },
        },
      ];
      return cfg;
    });
  }

  return config;
}

module.exports = withUnityAndroid;
