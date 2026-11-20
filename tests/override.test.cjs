const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '..', 'clash-party-override.js'), 'utf8');
function run(input) {
  return JSON.parse(JSON.stringify(vm.runInNewContext(code + '\nmain(input)', { input: structuredClone(input) })));
}
const names = ['HK 01', '台灣 01', 'Singapore 01', '東京 01', 'Seoul 01', '美国 01', '德国 01', '剩余流量 100GB'];
const fixture = {
  proxies: names.map((name, i) => ({ name, type: 'socks5', server: '127.0.0.1', port: 20001 + i })),
  dns: { enable: true, nameserver: ['https://dns.alidns.com/dns-query'] },
  tun: { enable: false }, 'mixed-port': 17890,
  'proxy-groups': [{ name: 'old', type: 'select', proxies: ['DIRECT'] }],
  rules: ['MATCH,old'], 'rule-providers': { old: { type: 'file' } }, 'sub-rules': { old: [] }
};
const out = run(fixture);
const group = name => out['proxy-groups'].find(g => g.name === name);
for (const [i, name] of ['香港','台湾','新加坡','日本','韩国','美国'].entries()) {
  assert.equal(group(name).type, 'url-test');
  assert.deepEqual(group(name).proxies, [names[i]]);
}
for (const name of ['AI 集合','谷歌','哔哩哔哩','YouTube','TikTok','Telegram','Twitter','Instagram','GitHub','Apple','广告拦截','本地直连']) {
  assert.equal(group(name).type, 'select');
}
assert.equal(group('Google自动转移').type, 'fallback');
assert(out.rules.includes('RULE-SET,cp-instagram,Instagram'));
assert.equal(out['rule-providers']['cp-instagram'].url, 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/instagram.mrs');
assert.equal(out['rule-providers']['cp-github'].url, 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.mrs');
assert(out.rules.includes('RULE-SET,cp-github,GitHub'));
assert(out.rules.indexOf('RULE-SET,cp-ai,AI 集合') < out.rules.indexOf('RULE-SET,cp-github,GitHub'));
assert.equal(group('Apple').proxies[0], 'DIRECT');
assert(group('Apple').proxies.includes('美国'));
assert.equal(out['rule-providers']['cp-apple'].url, 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs');
assert(out.rules.includes('RULE-SET,cp-apple,Apple'));
assert(out.rules.indexOf('RULE-SET,cp-apple,Apple') < out.rules.indexOf('RULE-SET,cp-cn,国内直连'));
assert(!group('Google自动转移').proxies.includes('DIRECT'));
assert(group('全部节点').proxies.includes('德国 01'));
assert(!group('全部节点').proxies.includes('剩余流量 100GB'));
assert.equal(out['rule-providers']['cp-ai'].url, 'https://raw.githubusercontent.com/fmz200/wool_scripts/main/Loon/rule/AI.list');
assert.equal(out['rule-providers']['cp-ai'].behavior, 'classical');
assert.equal(out['rule-providers']['cp-ai'].format, 'text');
assert(out.rules.indexOf('RULE-SET,cp-ai,AI 集合') < out.rules.indexOf('RULE-SET,cp-google,谷歌'));
assert(out.rules.indexOf('RULE-SET,cp-ai,AI 集合') < out.rules.indexOf('RULE-SET,cp-cn,国内直连'));
assert.deepEqual(out.dns, fixture.dns);
assert.deepEqual(out.tun, fixture.tun);
assert.equal(out['mixed-port'], fixture['mixed-port']);
assert(!('sub-rules' in out));
assert.deepEqual(run(out), out);
const sparse = run({ proxies: [fixture.proxies[0]] });
assert.deepEqual(sparse['proxy-groups'].find(g => g.name === '美国').proxies, ['REJECT']);
const abbreviations = ['HK01', 'TW02', 'SG03', 'JP04', 'KR05', 'US06'];
const compact = run({ proxies: abbreviations.map((name, index) => ({ ...fixture.proxies[index], name })) });
for (const [index, region] of ['香港','台湾','新加坡','日本','韩国','美国'].entries()) {
  assert.deepEqual(compact['proxy-groups'].find(g => g.name === region).proxies, [abbreviations[index]]);
}
const provider = { Airport: { type: 'file', path: './provider.yaml' } };
const dynamic = run({ 'proxy-providers': provider });
assert.equal(dynamic['proxy-providers'].Airport.path, provider.Airport.path);
assert.equal(dynamic['proxy-providers'].Airport['health-check'].enable, true);
assert.equal(dynamic['proxy-providers'].Airport['health-check'].url, 'https://www.google.com/generate_204');
assert(dynamic['proxy-groups'].filter(g => g.type !== 'select').every(g => g.use.includes('Airport')));
assert(dynamic['proxy-groups'].filter(g => g.type !== 'select').every(g => g['empty-fallback'] === 'REJECT'));
assert.throws(() => run({}), /没有可用节点/);
assert.throws(() => run({ proxies: [{ name: '香港', type: 'socks5' }] }), /重名/);
fs.writeFileSync(path.join(__dirname, '..', 'preview.json'), JSON.stringify(out, null, 2));
console.log('PASS: region matching, manual groups, provider integration, empty-region rejection, AI precedence, setting preservation, idempotence, invalid inputs.');
