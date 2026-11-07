/* eslint-disable @typescript-eslint/no-require-imports -- Expoがprebuild時に直接読み込むCommonJSプラグイン。 */
const { withPodfile } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

// AsyncStorage 3.1.1 の Privacy Manifest bundle には podspec の iOS 13.0 が残る。
// RN の post_install は native_target のみ更新するため、該当 bundle だけを補正する。
// https://github.com/react-native-async-storage/async-storage/issues/1355
module.exports = function withAsyncStorageResourceTarget(config) {
  const minimum = config.ios?.deploymentTarget;
  if (typeof minimum !== 'string' || !/^\d+(?:\.\d+){0,2}$/.test(minimum)) {
    throw new Error('AsyncStorageのビルド設定には、ios.deploymentTargetの明示が必要です。');
  }

  return withPodfile(config, (mod) => {
    const anchor = /^\s*post_install do \|installer\|\s*$/m;
    const matches = mod.modResults.contents.match(new RegExp(anchor.source, 'gm')) ?? [];
    if (matches.length !== 1) {
      throw new Error('Podfileのpost_installを特定できません。Expo更新後のビルド設定を確認してください。');
    }
    mod.modResults.contents = mergeContents({
      tag: 'carpool-async-storage-resource-target',
      src: mod.modResults.contents,
      anchor,
      offset: 1,
      comment: '#',
      newSrc: `    installer.pods_project.targets.each do |target|
      next unless target.name == 'AsyncStorage-AsyncStorage_resources'
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${minimum}')
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${minimum}'
        end
      end
    end`,
    }).contents;
    return mod;
  });
};
