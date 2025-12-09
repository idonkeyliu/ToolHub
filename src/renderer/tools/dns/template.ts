export const dnsTemplate = `
<div class="dns-wrap">
    <div class="dns-split">
        <div class="dns-left">
            <div class="dns-form">
                <input class="dns-input" id="dnsHost" placeholder="输入域名，如: example.com" />
                <select class="dns-select" id="dnsType">
                    <option>A</option>
                    <option>AAAA</option>
                    <option>CNAME</option>
                    <option>TXT</option>
                    <option>MX</option>
                    <option>NS</option>
                    <option>SRV</option>
                    <option>CAA</option>
                    <option>PTR</option>
                </select>
                <button class="dns-btn" id="dnsQuery">解析</button>
            </div>
            <div class="dns-chips">
                <label class="chip"><input id="dnsUseGoogle" type="checkbox" checked/> Google DoH</label>
                <label class="chip"><input id="dnsUseCf" type="checkbox" checked/> Cloudflare DoH</label>
                <label class="chip"><input id="dnsTrace" type="checkbox"/> 启用调试</label>
                <label class="chip"><input id="dnsTbl" type="checkbox"/> 表格模式</label>
                <label class="chip"><input id="dnsUseCustom" type="checkbox"/> 自定义 DoH</label>
            </div>
            <input class="dns-input" id="dnsCustomEp" placeholder="自定义 DoH 端点（JSON 接口），如 https://dns.example.com/dns-query" style="display:none; width:100%;" />
        </div>
        <div class="dns-right">
            <div class="dns-grid">
                <div class="dns-card">
                    <h4>Google 结果 <button class="dns-copy" data-target="g">复制</button></h4>
                    <div class="dns-list" id="dnsG"></div>
                    <div class="dns-meta" id="dnsGm"></div>
                    <div class="dns-err" id="dnsGe"></div>
                </div>
                <div class="dns-card">
                    <h4>Cloudflare 结果 <button class="dns-copy" data-target="c">复制</button></h4>
                    <div class="dns-list" id="dnsC"></div>
                    <div class="dns-meta" id="dnsCm"></div>
                    <div class="dns-err" id="dnsCe"></div>
                </div>
                <div class="dns-card full" id="dnsCustomCard" style="display:none;">
                    <h4>自定义 DoH 结果 <button class="dns-copy" data-target="u">复制</button></h4>
                    <div class="dns-list" id="dnsU"></div>
                    <div class="dns-meta" id="dnsUm"></div>
                    <div class="dns-err" id="dnsUe"></div>
                </div>
            </div>
        </div>
    </div>
</div>
`;
