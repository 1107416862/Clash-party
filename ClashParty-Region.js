// Clash Party 本地 JavaScript 覆写。入口由客户端调用。
// 地区依节点名识别；箭头线路取最后一段（出口）。这里可补充机场的命名习惯。
const aliases = {
  HK: '香港|港岛|港島|港区|港區|Hong Kong|Hongkong|HKG', TW: '台湾|台灣|臺灣|台北|臺北|Taipei|TPE|TWN',
  SG: '新加坡|狮城|獅城|Singapore|SIN|SGP', JP: '日本|东京|東京|大阪|Tokyo|Osaka|NRT|HND|KIX|JPN',
  KR: '韩国|韓國|首尔|首爾|Seoul|ICN|KOR', US: '美国|美國|美西|美东|美東|洛杉矶|洛杉磯|纽约|紐約|西雅图|硅谷|矽谷|Los Angeles|New York|Seattle|USA|LAX|SJC|SFO|NYC|SEA',
  GB: '英国|英國|伦敦|倫敦|London|UK|GBR|LHR', DE: '德国|德國|法兰克福|法蘭克福|Frankfurt|FRA-DE|DEU',
  CA: '加拿大|多伦多|溫哥華|温哥华|Toronto|Vancouver|YYZ|YVR', AU: '澳洲|悉尼|雪梨|Sydney|SYD',
  MO: '澳门|澳門|Macao|Macau', MY: '马来|大马|大馬|吉隆坡|KUL', VN: '越南|胡志明', NL: '荷兰|荷蘭|阿姆斯特丹|Amsterdam|AMS',
  FR: '法国|法國|巴黎|Paris|CDG', AE: '阿联酋|阿聯酋|迪拜|杜拜|Dubai|UAE|DXB', CN: '中国大陆|中國大陸|中国内地|大陆|内地',
  TR: '土耳其|Turkey', RU: '俄罗斯|俄羅斯|莫斯科|Moscow', IN: '印度|孟买|孟買|Mumbai', ID: '印尼|雅加达', ZA: '南非', NZ: '紐西蘭|新西兰', TH: '泰国|泰國|曼谷|Bangkok|BKK'
};
const isoCodes = ('HK TW SG JP KR US GB DE AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO KE KG KH KI KM KN KP KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TZ UA UG UM UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW').split(' ');
const regionNames = ['zh-Hans','zh-Hant','en'].map(locale => new Intl.DisplayNames([locale], {type:'region',style:'short'}));
const longEnglish = new Intl.DisplayNames(['en'], {type:'region'});
const shortLabels = {HK:'香港',TW:'台湾',MO:'澳门',US:'美国',GB:'英国',KR:'韩国',CN:'中国大陆'};
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const flag = code => String.fromCodePoint(...[...code].map(c => 127397+c.charCodeAt(0)));
const label = code => (shortLabels[code] || regionNames[0].of(code))+'节点';
const tokens = [];
for (const code of isoCodes) {
  const terms = new Set([...(aliases[code] || '').split('|'),...regionNames.map(r=>r.of(code)),longEnglish.of(code)]);
  for (const term of terms) {
    if (!term || term.length < 2 || term.toUpperCase()===code) continue;
    const latin = /^[a-z]/i.test(term);
    tokens.push({code, size:term.length, regex:new RegExp((latin?'(?:^|[^a-z])':'')+escapeRegex(term)+(latin?'(?![a-z])':''),'i')});
  }
}
tokens.sort((a,b)=>b.size-a.size);
function regionOf(name) {
  const parts = name.normalize('NFKC').split(/(?:->|=>|→|➡️?|➜|⇒)/).reverse();
  for (const part of parts) {
    const flags = [...part.matchAll(/([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/gu)];
    if (flags.length) {
      const code = [...flags[flags.length-1][0]].map(c=>String.fromCharCode(c.codePointAt(0)-127397)).join('');
      if (isoCodes.includes(code)) return code;
    }
    for (const entry of tokens) if (entry.regex.test(part)) return entry.code;
    for (const word of part.match(/[a-z]+/gi)||[]) {
      if (word.length===2 && isoCodes.includes(word.toUpperCase())) {
        if (/^(ai|in|as|is|to|at|no|it|be|am|me|by|do|my)$/i.test(word) && word!==word.toUpperCase()) continue;
        return word.toUpperCase();
      }
    }
  }
}
const infoPattern = '剩余流量|剩餘流量|套餐到期|到期时间|到期時間|过期时间|流量重置|距离下次|订阅地址|訂閱地址|官网地址|官網地址|^官网|^官網|^到期|^剩余|^剩餘|^套餐|^更新订阅|^traffic left|^expire|^reset date';
const infoNode = new RegExp(infoPattern,'i');
const checks = {url:'https://www.gstatic.com/generate_204',interval:300,lazy:true};
const appRows = [
  ['AI服务','US','AI',['OpenAI','Claude','Gemini']], ['苹果服务','DIRECT','Apple',['Apple']],
  ['谷歌服务','','Google',['Google']], ['微软服务','','Microsoft',['Microsoft']], ['Github','','GitHub',['GitHub']],
  ['哔哩哔哩','DIRECT','bilibili',['BiliBili']], ['Youtube','HK','YouTube',['YouTube']],
  ['TikTok','','TikTok',['TikTok']], ['Telegram','HK','Telegram',['Telegram']], ['Twitter','','Twitter',['Twitter']]
];
function main(config) {
  const source = config['proxy-providers'] || {};
  const providers = Object.keys(source);
  const nodes = (config.proxies||[]).map(p=>p.name).filter(n=>typeof n==='string' && n && !infoNode.test(n));
  if (!nodes.length && !providers.length) throw Error('订阅中没有可选节点。请检查订阅内容。');
  const groups = [], buckets = new Map(), groupNames = new Map();
  const occupied = new Set((config.proxies||[]).map(p=>p.name));
  const oldIcons = new Map((config['proxy-groups']||[]).filter(g=>g.icon).map(g=>[g.name,g.icon]));
  const unique = items=>[...new Set(items)];
  function groupName(key) {
    if (!groupNames.has(key)) {
      let n=key;
      while (occupied.has(n)) n+='·组';
      occupied.add(n); groupNames.set(key,n);
    }
    return groupNames.get(key);
  }
  function group(key,type,items,icon,extra={}) {
    const name=groupName(key);
    const g={name,type,...extra};
    if (items.length) g.proxies=unique(items);
    g.icon=oldIcons.get(key) || (icon.startsWith('https:')?icon:`https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/${icon}.png`);
    groups.push(g);
  }
  function assign(name,provider) {
    const code=regionOf(name);
    if (!code) return;
    if (!buckets.has(code)) buckets.set(code,{nodes:[],sources:new Set(),providerNames:new Set()});
    const b=buckets.get(code);
    if (provider) { b.sources.add(provider); b.providerNames.add(name); }
    else b.nodes.push(name);
  }
  for (const n of nodes) assign(n);
  for (const key of providers) {
    const p=source[key];
    // inline payload 的名字可在覆写时读取。远程和文件集合由内核在稍后加载。
    if (p.type!=='inline' || !Array.isArray(p.payload) || p.override?.['proxy-name'] || p.filter || p['exclude-filter'] || p['exclude-type']) continue;
    for (const proxy of p.payload) {
      const n=(p.override?.['additional-prefix']||'')+proxy.name+(p.override?.['additional-suffix']||'');
      if (proxy.name && !infoNode.test(n)) assign(n,key);
    }
  }
  const codes=isoCodes.filter(code=>buckets.has(code));
  const regions=codes.map(c=>groupName(label(c)));
  const [root,manual,auto,backup]=['选择代理','手动选择','自动选择','故障转移'].map(groupName);
  const preferred=code=>buckets.has(code)?groupName(label(code)):null;
  const hk=preferred('HK');
  const withProviders=providers.length?{use:providers,'exclude-filter':'(?i)'+infoPattern}:{};
  group('选择代理','select',[hk||auto,auto,backup,manual,...regions,'DIRECT'],'Proxy');
  group('手动选择','select',nodes,'Static',withProviders);
  for (const [key,pref,icon] of appRows) {
    const first=pref==='DIRECT'?'DIRECT':preferred(pref)||root;
    group(key,'select',[first,root,manual,...regions,'DIRECT'],icon);
  }
  group('广告拦截','select',['REJECT','DIRECT',root],'Reject');
  group('Final','select',[root,'DIRECT'],'Final');
  const pool=regions.length?regions:nodes;
  const poolSettings=regions.length?{}:withProviders;
  group('自动选择','url-test',pool,'Auto',{...checks,tolerance:50,...poolSettings});
  group('故障转移','fallback',pool,'Available',{...checks,...poolSettings});
  for (const c of codes) {
    const b=buckets.get(c), settings={...checks,tolerance:50};
    if (b.sources.size) {
      settings.use=[...b.sources];
      settings.filter='^('+unique([...b.nodes,...b.providerNames]).map(escapeRegex).join('|')+')$';
    }
    group(label(c),'url-test',b.nodes,`https://flagcdn.com/w80/${c.toLowerCase()}.png`,settings);
  }
  const targets=new Map(appRows.flatMap(([app,,,sets])=>sets.map(set=>[set,groupName(app)])));
  targets.set('Advertising',groupName('广告拦截'));
  const ruleProviders={}, rules=[];
  const priority=['Advertising','OpenAI','Claude','Gemini','YouTube','GitHub','BiliBili','TikTok','Telegram','Twitter','Apple','Google','Microsoft'];
  const base='https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash';
  for (const id of priority) {
    const file=['Apple','Advertising'].includes(id)?id+'_Classical':id;
    ruleProviders[id]={type:'http',behavior:'classical',format:'yaml',url:`${base}/${id}/${file}.yaml`,path:`./ruleset/party-region/${file}.yaml`,interval:86400};
    rules.push(`RULE-SET,${id},${targets.get(id)},no-resolve`);
  }
  // 应用专属规则优先。其余域名与大陆地址在 Final 之前直连。
  for (const [id, folder, file, behavior] of [
    ['ChinaDomains', 'ChinaMax', 'ChinaMax_Domain', 'domain'],
    ['ChinaIPs', 'ChinaIPs', 'ChinaIPs_IP', 'ipcidr']
  ]) {
    ruleProviders[id] = {
      type: 'http', behavior, format: 'yaml', interval: 86400,
      url: `${base}/${folder}/${file}.yaml`, path: `./ruleset/party-region/${file}.yaml`
    };
  }
  rules.push('DOMAIN-SUFFIX,cn,DIRECT', 'RULE-SET,ChinaDomains,DIRECT', 'RULE-SET,ChinaIPs,DIRECT');
  rules.push('MATCH,'+groupName('Final'));
  config['proxy-groups']=groups;
  config['rule-providers']=ruleProviders;
  config.rules=rules;
  return config;
}
