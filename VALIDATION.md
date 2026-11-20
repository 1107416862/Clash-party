# 验证记录

验证日期：2026-11-20（Asia/Shanghai）。

- 按 Clash Party 源码的 `main(config)` 入口，以 Node VM 执行 JavaScript 复写。
- 通过 `node tests/override.test.cjs`：六地区中英文和紧邻数字缩写、手动服务组、provider 引用、无节点报错、缺失地区、旧规则替换、AI 优先级、DNS/TUN 保留、重复执行一致性、重名报错。
- 使用 Windows Mihomo v1.19.34：配置语法检查通过。
- 实际启动内核并检查本地控制 API：23 个策略组正常生成；全部 15 个远程规则集下载、解析成功。
- Apple 为独立 Selector 策略组，含 DIRECT 且默认为 DIRECT；专用规则集成功解析 1798 条规则，优先于国内直连规则匹配。
- Instagram 为独立 Selector 策略组，默认“节点选择”；专用规则集成功解析 74 条规则。
- GitHub 为独立 Selector 策略组，默认“节点选择”；专用规则集成功解析 66 条规则，AI 规则在 GitHub 规则之前匹配。
- 用户指定的 fmz200 AI.list 作为 `classical/text` 加载，解析出 66 条规则，包括其逻辑和 IPv6 规则；没有格式解析错误。规则数量会随上游更新改变。
- 运行只有香港节点的配置：美国等缺失地区组实际返回 REJECT。
- 运行只有 file provider 的配置：香港组只引入香港节点、美国组引入美国节点；无日本节点时日本组实际返回 REJECT，未回退到 COMPATIBLE。
- provider 健康检查已启用，地址为 Google generate_204；所有自动组设空组回退 REJECT。

本次未使用真实机场或账号，未做真实节点测速、断网切换、AI 解锁、各服务访问或 Clash Party GUI 导入测试。这些需要用户的实际订阅。Google 连通检测不等同于服务解锁检测。

规则加载计数：AI 66；广告 909；Apple 1798；哔哩哔哩 53；国内域名 110177；国内 IP 9665；谷歌 1078；私有域名 132；Telegram 域名 21、IP 12；TikTok 40；Twitter 24；YouTube 178；Instagram 74；GitHub 66。
