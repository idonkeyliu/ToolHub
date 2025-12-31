import { i18n } from '../../core/i18n';

export const getDnsTemplate = () => `
<div class="dns-wrap">
    <!-- 查询区域 -->
    <div class="dns-header">
        <div class="dns-form">
            <input class="dns-input" id="dnsHost" placeholder="${i18n.t('dns.placeholder')}" autocomplete="off" spellcheck="false" />
            <select class="dns-select" id="dnsType">
                <option value="A">A (IPv4)</option>
                <option value="AAAA">AAAA (IPv6)</option>
                <option value="CNAME">CNAME</option>
                <option value="TXT">TXT</option>
                <option value="MX">MX (${i18n.t('dns.mail')})</option>
                <option value="NS">NS (${i18n.t('dns.nameserver')})</option>
                <option value="SRV">SRV</option>
                <option value="CAA">CAA</option>
                <option value="PTR">PTR (${i18n.t('dns.reverse')})</option>
                <option value="SOA">SOA</option>
            </select>
            <button class="dns-btn" id="dnsQuery">🔍 ${i18n.t('dns.query')}</button>
        </div>
        <div class="dns-options">
            <div class="dns-chips">
                <label class="chip"><input id="dnsUseGoogle" type="checkbox" checked/><span>Google DoH</span></label>
                <label class="chip"><input id="dnsUseCf" type="checkbox" checked/><span>Cloudflare DoH</span></label>
                <label class="chip"><input id="dnsUseCustom" type="checkbox"/><span>${i18n.t('dns.customDoh')}</span></label>
                <label class="chip"><input id="dnsTbl" type="checkbox"/><span>${i18n.t('dns.tableMode')}</span></label>
                <label class="chip"><input id="dnsTrace" type="checkbox"/><span>${i18n.t('dns.debugInfo')}</span></label>
            </div>
        </div>
        <div class="dns-custom-input" id="dnsCustomWrap" style="display:none;">
            <input class="dns-input" id="dnsCustomEp" placeholder="${i18n.t('dns.customEndpoint')}" autocomplete="off" />
        </div>
    </div>

    <!-- 快捷查询 -->
    <div class="dns-quick">
        <h4>${i18n.t('dns.quickQuery')}</h4>
        <div class="dns-quick-btns">
            <button class="dns-quick-btn" data-domain="google.com">google.com</button>
            <button class="dns-quick-btn" data-domain="github.com">github.com</button>
            <button class="dns-quick-btn" data-domain="cloudflare.com">cloudflare.com</button>
            <button class="dns-quick-btn" data-domain="baidu.com">baidu.com</button>
            <button class="dns-quick-btn" data-domain="qq.com">qq.com</button>
            <button class="dns-quick-btn" data-domain="taobao.com">taobao.com</button>
        </div>
    </div>

    <!-- 结果区域 -->
    <div class="dns-results">
        <div class="dns-card" id="dnsGoogleCard">
            <div class="dns-card-header">
                <h4><span class="icon">🔵</span> Google DNS</h4>
                <button class="dns-copy" data-target="g">${i18n.t('dns.copy')}</button>
            </div>
            <div class="dns-list" id="dnsG"></div>
            <div class="dns-meta" id="dnsGm"></div>
            <div class="dns-err" id="dnsGe"></div>
        </div>
        <div class="dns-card" id="dnsCfCard">
            <div class="dns-card-header">
                <h4><span class="icon">🟠</span> Cloudflare DNS</h4>
                <button class="dns-copy" data-target="c">${i18n.t('dns.copy')}</button>
            </div>
            <div class="dns-list" id="dnsC"></div>
            <div class="dns-meta" id="dnsCm"></div>
            <div class="dns-err" id="dnsCe"></div>
        </div>
        <div class="dns-card full" id="dnsCustomCard" style="display:none;">
            <div class="dns-card-header">
                <h4><span class="icon">🟢</span> ${i18n.t('dns.customDoh')}</h4>
                <button class="dns-copy" data-target="u">${i18n.t('dns.copy')}</button>
            </div>
            <div class="dns-list" id="dnsU"></div>
            <div class="dns-meta" id="dnsUm"></div>
            <div class="dns-err" id="dnsUe"></div>
        </div>
    </div>

    <!-- 历史记录 -->
    <div class="dns-history" id="dnsHistorySection" style="display:none;">
        <h4>
            <span>${i18n.t('dns.history')}</span>
            <span class="dns-history-clear" id="dnsHistoryClear">${i18n.t('dns.clearHistory')}</span>
        </h4>
        <div class="dns-history-list" id="dnsHistoryList"></div>
    </div>
</div>
`;

// 保留旧的导出以兼容
export const dnsTemplate = getDnsTemplate();
