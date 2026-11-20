# Clash Party Windows 复写

将 `clash-party-override.js` 导入 Clash Party / Mihomo Party 的 JavaScript 复写，并关联已有节点订阅。脚本不含机场地址、账号、密码或真实节点。

远程复写地址（选择 JavaScript / js 类型）：

```text
https://raw.githubusercontent.com/1107416862/Clash-party/main/clash-party-override.js
```

## 分组预览

| 分组 | 类型 | 初始选择 / 行为 |
| --- | --- | --- |
| 香港、台湾、新加坡、日本、韩国、美国 | url-test | 每 300 秒测速；50 ms 容差 |
| 全部节点 | url-test | 所有可识别的有效节点，含其他地区 |
| Google自动转移 | fallback | 用 Google 的 generate_204 检查，当前节点失效时按订阅顺序转移 |
| 节点选择 | select | Google自动转移 |
| AI 集合 | select | 美国；可手动切换地区或单节点 |
| 谷歌 | select | Google自动转移 |
| 哔哩哔哩 | select | DIRECT |
| YouTube | select | 节点选择，可独立调整 |
| TikTok | select | 节点选择，可独立调整 |
| Telegram | select | 节点选择，可独立调整 |
| Twitter | select | 节点选择，可独立调整 |
| Instagram | select | 节点选择，可独立调整 |
| GitHub | select | 节点选择，可独立调整 |
| Apple | select | DIRECT（直连），可独立切换地区或节点 |
| 广告拦截 | select | REJECT；切 DIRECT 可关闭 |
| 本地直连 | select | DIRECT；覆盖本机、内网、.local、.lan |
| 国内直连 | select | DIRECT |
| 漏网之鱼 | select | 节点选择 |

地区组通过中英文名称、国旗、常见城市匹配。未知命名的节点仍出现在“全部节点”和“节点选择”。没有相应地区节点时该地区拒绝连接；请在服务组选择存在的地区。AI 默认美国，不能保证美国节点支持全部 AI 服务；需要按实际服务可用性手动调整，避免频繁换出口。

## 使用

1. 先导入自己的节点订阅。
2. 在“复写”中新增远程 **JavaScript / js** 复写，填写上方地址并保存；也可新增本地 js 复写，粘贴 `clash-party-override.js` 全部内容。不同版本可通过文件导入完成。
3. 把复写关联到目标订阅，重新应用该订阅；如有多份复写，将此复写放在最后，避免后续脚本改写分组。
4. 在代理页面查看六个地区的测速结果，再调整 AI、谷歌等策略组。地区选择必须以你的订阅实际提供的节点为准。
5. `preview.yaml` 仅供查看：它含本机虚构 SOCKS 节点，不是能上网的订阅，请不要作为正式配置使用。

## AI 规则与优先级

AI 唯一上游是用户指定的 [fmz200 AI.list](https://raw.githubusercontent.com/fmz200/wool_scripts/main/Loon/rule/AI.list)，通过 `behavior: classical`、`format: text` 每 86400 秒更新。脚本不会额外混入其他 AI 库。其域名、IP、IPv6 和逻辑规则按上游文件匹配；覆盖范围随该文件变化，无法承诺囊括所有现有及未来 AI 服务。国内 AI 也会按此库进入“AI 集合”。

规则顺序：本地/内网 → 广告 → AI → YouTube、哔哩哔哩、TikTok、Telegram、Twitter、Instagram、GitHub、Apple → 谷歌 → Telegram IP → 国内域名/IP → 漏网之鱼。AI 优先于谷歌和 GitHub，防止 Gemini、Copilot 等命中 AI 规则的域名被通用规则提前匹配；广告规则优先于 AI。Apple 专用规则优先于国内直连规则，允许手动切换 Apple 流量出口。

其他规则来自 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat/tree/meta)，使用 MRS，每日更新。广告域名拦截无法过滤所有站内广告或与视频同域投放的广告。

Google自动转移仅检查测试地址是否连通；不会判断账号地区、AI 解锁或业务接口是否可用。它直接检查订阅节点，优先顺序是订阅中节点的顺序，恢复时优先采用排在前面的可用节点。

## 复写范围

保留原订阅的 `proxies`、provider 来源、DNS、TUN、端口等设置；将 provider 健康检查统一设为每 300 秒检查 Google 的 generate_204，预期状态 204，以供通过 `use` 引入的节点参与自动转移。组内测试地址不会替 provider 节点测速。替换 `proxy-groups`、`rule-providers`、`rules`，移除旧 `sub-rules`，设为 rule 模式并启用选择记忆。若原 DNS 等设置显式引用旧策略组/旧规则集，需要先调整相应引用；建议仅与常规节点订阅搭配。其他复写对同名字段的修改会受执行顺序影响。

使用支持 `empty-fallback` 的新版 Mihomo 内核，已验证版本为 v1.19.34；所有自动组均设 `empty-fallback: REJECT`，地区无节点时不会回退到隐式直连。

支持直接节点以及 `proxy-providers` 订阅。脚本会排除含“流量、到期、公告”等标记的说明节点；如果你的真实节点名含这些词，需修改脚本的 `noise` 正则。节点名字与本脚本分组重名会输出错误，请重命名节点。provider 内节点名也应避免与分组同名。

首次使用需要下载规则集；保留订阅已有网络设置以便规则下载。没有为适配本脚本强制更改 DNS 或开启 TUN。

## 检查

运行 `node tests/override.test.cjs` 检查直接节点、provider、地区命名、空订阅、规则优先级、重复执行和保留的设置。详见 `VALIDATION.md` 的实际内核验证结果。

## GitHub

仓库：https://github.com/1107416862/Clash-party 。文件不包含真实订阅或私密资料。上游规则按其原作者许可使用，本项目只引用远程地址。
