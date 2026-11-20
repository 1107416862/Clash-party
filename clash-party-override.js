/* Clash Party / Mihomo Party JavaScript 复写。入口：main(config)。
 * AI 规则源由用户指定；无需填写订阅地址，直接使用当前订阅节点。
 */
function main(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('复写需要一个有效的订阅配置对象。');
  }
  const regions = [
    ['香港', '(?i)(香港|港仔|港岛|🇭🇰|(?:^|[^A-Za-z])HK(?:[^A-Za-z]|$)|Hong[ -]?Kong)'],
    ['台湾', '(?i)(台湾|台灣|台北|新北|彰化|🇹🇼|(?:^|[^A-Za-z])TW(?:[^A-Za-z]|$)|Taiwan|Taipei)'],
    ['新加坡', '(?i)(新加坡|狮城|獅城|🇸🇬|(?:^|[^A-Za-z])SG(?:[^A-Za-z]|$)|Singapore)'],
    ['日本', '(?i)(日本|东京|東京|大阪|埼玉|🇯🇵|(?:^|[^A-Za-z])JP(?:[^A-Za-z]|$)|Japan|Tokyo|Osaka)'],
    ['韩国', '(?i)(韩国|韓國|首尔|首爾|🇰🇷|(?:^|[^A-Za-z])KR(?:[^A-Za-z]|$)|Korea|Seoul)'],
    ['美国', '(?i)(美国|美國|洛杉矶|洛杉磯|硅谷|矽谷|西雅图|西雅圖|纽约|紐約|圣何塞|聖何塞|🇺🇸|(?:^|[^A-Za-z])USA?(?:[^A-Za-z]|$)|United[ -]?States|Los[ -]?Angeles|San[ -]?Jose|Seattle|New[ -]?York)']
  ];
  const regionNames = regions.map(([name]) => name);
  const reserved = new Set([
    ...regionNames, '全部节点', 'Google自动转移', '节点选择', 'AI 集合',
    '谷歌', '哔哩哔哩', 'YouTube', 'TikTok', 'Telegram', 'Twitter', 'Instagram', 'GitHub', 'Apple',
    '广告拦截', '本地直连', '国内直连', '漏网之鱼'
  ]);
  const sourceNodes = Array.isArray(config.proxies) ? config.proxies : [];
  for (const node of sourceNodes) {
    if (node && reserved.has(node.name)) {
      throw new Error('订阅节点与策略组重名：' + node.name + '，请先重命名此节点。');
    }
  }
  const providers = Object.keys(config['proxy-providers'] || {});
  const noise = '(?i)(剩余|流量|到期|过期|套餐|官网|网址|公告|重置|有效期|Traffic|Expire|Reset|DIRECT|REJECT)';
  const isNoise = new RegExp(noise.slice(4), 'i');
  const nodes = [...new Set(sourceNodes
    .filter(node => node && typeof node.name === 'string' && node.name &&
      !['direct', 'reject'].includes(String(node.type).toLowerCase()) && !isNoise.test(node.name))
    .map(node => node.name))];
  if (!nodes.length && !providers.length) {
    throw new Error('当前订阅没有可用节点或 proxy-providers；请先导入节点订阅，再应用复写。');
  }
  // REJECT 兜底：订阅缺少某地区时明确拒绝，避免空组隐式直连。
  function autoGroup(name, type, filter, url) {
    const matcher = filter ? new RegExp(filter.slice(4), 'i') : null;
    const matched = nodes.filter(node => !matcher || matcher.test(node));
    const group = {
      name, type, proxies: matched.length ? matched : ['REJECT'],
      url, interval: 300, lazy: false, timeout: 5000,
      'expected-status': 204, 'empty-fallback': 'REJECT',
      'exclude-filter': noise
    };
    if (providers.length) group.use = providers;
    if (filter) group.filter = filter;
    if (type === 'url-test') group.tolerance = 50;
    return group;
  }
  const testUrl = 'https://www.gstatic.com/generate_204';
  // use 引入的节点由 provider 自身检查，组内 url 不会替它们测速。
  if (providers.length) {
    const updated = {};
    for (const name of providers) {
      const provider = config['proxy-providers'][name];
      updated[name] = Object.assign({}, provider, {
        'health-check': Object.assign({}, provider['health-check'], {
          enable: true, url: 'https://www.google.com/generate_204',
          interval: 300, lazy: false, timeout: 5000, 'expected-status': 204
        })
      });
    }
    config['proxy-providers'] = updated;
  }
  const groups = regions.map(([name, filter]) => autoGroup(name, 'url-test', filter, testUrl));
  groups.push(autoGroup('全部节点', 'url-test', null, testUrl));
  // fallback 直接检测每个节点，使用 Google 地址；不包含 DIRECT。
  groups.push(autoGroup('Google自动转移', 'fallback', null, 'https://www.google.com/generate_204'));
  function select(name, choices) {
    return { name, type: 'select', proxies: [...new Set(choices)] };
  }
  groups.push(select('节点选择', ['Google自动转移', ...regionNames, '全部节点', ...nodes]));
  const choices = ['节点选择', ...regionNames, 'Google自动转移', '全部节点', 'DIRECT', ...nodes];
  groups.push(select('AI 集合', ['美国', '新加坡', '日本', ...choices]));
  groups.push(select('谷歌', ['Google自动转移', ...choices]));
  groups.push(select('哔哩哔哩', ['DIRECT', ...choices]));
  groups.push(select('Apple', ['DIRECT', ...choices]));
  for (const name of ['YouTube', 'TikTok', 'Telegram', 'Twitter', 'Instagram', 'GitHub']) {
    groups.push(select(name, choices));
  }
  groups.push(select('广告拦截', ['REJECT', 'DIRECT']));
  groups.push(select('本地直连', ['DIRECT', 'REJECT', '节点选择']));
  groups.push(select('国内直连', ['DIRECT', '节点选择', ...regionNames]));
  groups.push(select('漏网之鱼', ['节点选择', 'DIRECT', ...regionNames, 'Google自动转移']));

  const ruleProviders = {};
  function mrs(key, category, file, behavior) {
    ruleProviders[key] = {
      type: 'http', behavior: behavior || 'domain', format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/' + category + '/' + file + '.mrs',
      path: './ruleset/clash-party/' + key + '.mrs', interval: 86400
    };
  }
  // 原样使用用户指定的 Loon 文本规则；Mihomo classical/text 解析。
  ruleProviders['cp-ai'] = {
    type: 'http', behavior: 'classical', format: 'text',
    url: 'https://raw.githubusercontent.com/fmz200/wool_scripts/main/Loon/rule/AI.list',
    path: './ruleset/clash-party/ai.list', interval: 86400
  };
  for (const [key, file] of [
    ['cp-private', 'private'], ['cp-ads', 'category-ads-all'],
    ['cp-google', 'google'], ['cp-bilibili', 'bilibili'],
    ['cp-youtube', 'youtube'], ['cp-tiktok', 'tiktok'],
    ['cp-telegram', 'telegram'], ['cp-twitter', 'twitter'],
    ['cp-instagram', 'instagram'], ['cp-github', 'github'],
    ['cp-apple', 'apple'], ['cp-cn', 'cn']
  ]) mrs(key, 'geosite', file);
  mrs('cp-telegram-ip', 'geoip', 'telegram', 'ipcidr');
  mrs('cp-cn-ip', 'geoip', 'cn', 'ipcidr');

  config.mode = 'rule';
  config['proxy-groups'] = groups;
  config['rule-providers'] = ruleProviders;
  // 替换订阅的分流规则及子规则，避免旧组名/规则集悬空引用。
  delete config['sub-rules'];
  config.rules = [
    'DOMAIN-SUFFIX,local,本地直连',
    'DOMAIN-SUFFIX,lan,本地直连',
    'DOMAIN,localhost,本地直连',
    'RULE-SET,cp-private,本地直连',
    'IP-CIDR,127.0.0.0/8,本地直连,no-resolve',
    'IP-CIDR,10.0.0.0/8,本地直连,no-resolve',
    'IP-CIDR,172.16.0.0/12,本地直连,no-resolve',
    'IP-CIDR,192.168.0.0/16,本地直连,no-resolve',
    'IP-CIDR,169.254.0.0/16,本地直连,no-resolve',
    'IP-CIDR,100.64.0.0/10,本地直连,no-resolve',
    'IP-CIDR6,::1/128,本地直连,no-resolve',
    'IP-CIDR6,fc00::/7,本地直连,no-resolve',
    'IP-CIDR6,fe80::/10,本地直连,no-resolve',
    'RULE-SET,cp-ads,广告拦截',
    'RULE-SET,cp-ai,AI 集合',
    'RULE-SET,cp-youtube,YouTube',
    'RULE-SET,cp-bilibili,哔哩哔哩',
    'RULE-SET,cp-tiktok,TikTok',
    'RULE-SET,cp-telegram,Telegram',
    'RULE-SET,cp-twitter,Twitter',
    'RULE-SET,cp-instagram,Instagram',
    'RULE-SET,cp-github,GitHub',
    'RULE-SET,cp-apple,Apple',
    'RULE-SET,cp-google,谷歌',
    'RULE-SET,cp-telegram-ip,Telegram,no-resolve',
    'RULE-SET,cp-cn,国内直连',
    'RULE-SET,cp-cn-ip,国内直连,no-resolve',
    'MATCH,漏网之鱼'
  ];
  config.profile = Object.assign({}, config.profile, { 'store-selected': true });
  return config;
}
