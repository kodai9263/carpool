/* eslint-disable @typescript-eslint/no-require-imports -- 変換処理を介さずNodeで実行するCommonJSテスト。 */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const withAsyncStorageResourceTarget = require('../with-async-storage-resource-target');

const originalPodfile = `target 'CarpoolAdmin' do
  post_install do |installer|
    react_native_post_install(installer, '../node_modules/react-native')
  end
end
`;

async function apply(source = originalPodfile, minimum = '16.4') {
  const config = withAsyncStorageResourceTarget({ name: 'Carpool', slug: 'carpool', ios: { deploymentTarget: minimum } });
  const result = await config.mods.ios.podfile({
    ...config,
    modRequest: { projectRoot: process.cwd(), platform: 'ios', modName: 'podfile' },
    modResults: { contents: source, language: 'ruby' },
  });
  return result.modResults.contents;
}

test('生成されたRubyを実行すると対象bundleだけを引き上げ、より新しい設定と他targetを保つ', async () => {
  const podfile = await apply();
  const ruby = `require 'json'
require 'rubygems'
BuildConfiguration = Struct.new(:build_settings)
Target = Struct.new(:name, :build_configurations)
Project = Struct.new(:targets)
Installer = Struct.new(:pods_project)
def target(_name); yield; end
def post_install(&block); $post_install = block; end
def react_native_post_install(*); $react_native_calls += 1; end
$react_native_calls = 0
eval(STDIN.read)
targets = [
  Target.new('AsyncStorage-AsyncStorage_resources', [BuildConfiguration.new({'IPHONEOS_DEPLOYMENT_TARGET' => '13.0'}), BuildConfiguration.new({'IPHONEOS_DEPLOYMENT_TARGET' => '17.0'})]),
  Target.new('AsyncStorage', [BuildConfiguration.new({'IPHONEOS_DEPLOYMENT_TARGET' => '16.4'})]),
  Target.new('OtherPod_resources', [BuildConfiguration.new({'IPHONEOS_DEPLOYMENT_TARGET' => '13.0'})])
]
$post_install.call(Installer.new(Project.new(targets)))
raise 'React Native hook was not preserved' unless $react_native_calls == 1
puts JSON.generate(targets.map { |target| target.build_configurations.map { |build_config| build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] } })
`;
  const output = execFileSync(process.env.RUBY ?? 'ruby', ['-e', ruby], { input: podfile, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), [['16.4', '17.0'], ['16.4'], ['13.0']]);
});

test('prebuildを再実行しても補正コードを重複追加しない', async () => {
  const once = await apply();
  assert.equal(await apply(once), once);
});

test('アプリの最低バージョン変更時は既存の生成箇所を更新する', async () => {
  const updated = await apply(await apply(), '17.0');
  assert.equal((updated.match(/installer\.pods_project\.targets\.each/g) ?? []).length, 1);
  assert.equal(updated.includes("Gem::Version.new('16.4')"), false);
  assert.equal(updated.includes("Gem::Version.new('17.0')"), true);
});

test('テンプレート変更で挿入箇所が失われた場合は黙って無効化せず失敗する', async () => {
  await assert.rejects(apply("target 'CarpoolAdmin' do\nend\n"), /post_install/);
  await assert.rejects(apply(originalPodfile + originalPodfile), /post_install/);
});

test('最低バージョンに不正な値やRubyコードを混ぜられない', () => {
  for (const minimum of [undefined, '', "16.4'; abort", '$(inherited)']) {
    assert.throws(() => withAsyncStorageResourceTarget({ ios: { deploymentTarget: minimum } }), /deploymentTarget/);
  }
});
