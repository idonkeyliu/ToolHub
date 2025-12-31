/**
 * 正则表达式工具模板
 */

import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="regex-tool">
  <!-- 顶部：正则输入 -->
  <div class="regex-header">
    <div class="regex-input-row">
      <div class="regex-pattern-wrapper">
        <span class="regex-delimiter">/</span>
        <input type="text" id="regexInput" class="regex-input" placeholder="${i18n.t('regex.inputPlaceholder')}" spellcheck="false" autocomplete="off" />
        <span class="regex-delimiter">/</span>
        <div class="regex-flags">
          <label class="flag-item">
            <input type="checkbox" id="flagG" checked />
            <span>g</span>
            <div class="flag-tooltip">
              <div class="tooltip-title">${i18n.t('regex.flagGTitle')}</div>
              <div class="tooltip-desc">${i18n.t('regex.flagGDesc')}</div>
              <div class="tooltip-example">${i18n.t('regex.flagGExample')}</div>
            </div>
          </label>
          <label class="flag-item">
            <input type="checkbox" id="flagI" />
            <span>i</span>
            <div class="flag-tooltip">
              <div class="tooltip-title">${i18n.t('regex.flagITitle')}</div>
              <div class="tooltip-desc">${i18n.t('regex.flagIDesc')}</div>
              <div class="tooltip-example">${i18n.t('regex.flagIExample')}</div>
            </div>
          </label>
          <label class="flag-item">
            <input type="checkbox" id="flagM" />
            <span>m</span>
            <div class="flag-tooltip">
              <div class="tooltip-title">${i18n.t('regex.flagMTitle')}</div>
              <div class="tooltip-desc">${i18n.t('regex.flagMDesc')}</div>
              <div class="tooltip-example">${i18n.t('regex.flagMExample')}</div>
            </div>
          </label>
          <label class="flag-item">
            <input type="checkbox" id="flagS" />
            <span>s</span>
            <div class="flag-tooltip">
              <div class="tooltip-title">${i18n.t('regex.flagSTitle')}</div>
              <div class="tooltip-desc">${i18n.t('regex.flagSDesc')}</div>
              <div class="tooltip-example">${i18n.t('regex.flagSExample')}</div>
            </div>
          </label>
        </div>
      </div>
      <div class="regex-actions">
        <button class="regex-action-btn" id="clearBtn" title="${i18n.t('regex.clear')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
        <button class="regex-action-btn" id="sampleBtn" title="${i18n.t('regex.loadSample')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="regex-error" id="regexError"></div>
    <div class="regex-stats">
      <span class="stat-badge" id="matchBadge">
        <span class="stat-num" id="matchCount">0</span> ${i18n.t('regex.matches')}
      </span>
      <span class="stat-badge" id="groupBadge">
        <span class="stat-num" id="groupCount">0</span> ${i18n.t('regex.groups')}
      </span>
    </div>
  </div>

  <!-- 主体区域 -->
  <div class="regex-body">
    <!-- 左侧：测试和结果 -->
    <div class="regex-left">
      <!-- 测试文本 -->
      <div class="regex-panel test-panel">
        <div class="panel-header">
          <span class="panel-title">${i18n.t('regex.testText')}</span>
          <button class="panel-btn" id="pasteTestBtn" title="${i18n.t('regex.paste')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </button>
        </div>
        <div class="test-text-wrapper">
          <div class="test-text-highlight" id="testTextHighlight"></div>
          <textarea id="testTextInput" class="test-text-input" placeholder="${i18n.t('regex.testPlaceholder')}" spellcheck="false"></textarea>
        </div>
      </div>

      <!-- 匹配结果 -->
      <div class="regex-panel matches-panel">
        <div class="panel-header">
          <span class="panel-title">${i18n.t('regex.matchResults')}</span>
          <button class="panel-btn" id="copyMatchesBtn" title="${i18n.t('regex.copyAllMatches')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
        <div class="matches-list" id="matchesList">
          <div class="matches-empty">${i18n.t('regex.enterToMatch')}</div>
        </div>
      </div>

      <!-- 替换功能 -->
      <div class="regex-panel replace-panel">
        <div class="panel-header">
          <label class="panel-toggle">
            <input type="checkbox" id="replaceToggle" />
            <span class="panel-title">${i18n.t('regex.replace')}</span>
          </label>
        </div>
        <div class="replace-content" id="replaceContent">
          <div class="replace-row">
            <input type="text" id="replaceInput" class="replace-input" placeholder="${i18n.t('regex.replacePlaceholder')}" spellcheck="false" />
            <button class="replace-btn primary" id="replaceAllBtn">${i18n.t('regex.replaceBtn')}</button>
            <button class="replace-btn" id="copyResultBtn">${i18n.t('regex.copy')}</button>
          </div>
          <div class="replace-result" id="replaceResult"></div>
        </div>
      </div>
    </div>

    <!-- 右侧：模板库 -->
    <div class="regex-right">
      <div class="templates-container">
        <div class="templates-header">${i18n.t('regex.templates')}</div>
        
        <div class="template-group">
          <div class="template-group-title">📝 ${i18n.t('regex.basicMatch')}</div>
          <div class="template-item" data-pattern="^[a-zA-Z]+$" data-desc="${i18n.t('regex.lettersOnly')}">
            <span class="tpl-name">${i18n.t('regex.lettersOnly')}</span>
            <code class="tpl-pattern">^[a-zA-Z]+$</code>
          </div>
          <div class="template-item" data-pattern="^[0-9]+$" data-desc="${i18n.t('regex.numbersOnly')}">
            <span class="tpl-name">${i18n.t('regex.numbersOnly')}</span>
            <code class="tpl-pattern">^[0-9]+$</code>
          </div>
          <div class="template-item" data-pattern="^[a-zA-Z0-9]+$" data-desc="${i18n.t('regex.alphanumeric')}">
            <span class="tpl-name">${i18n.t('regex.alphanumeric')}</span>
            <code class="tpl-pattern">^[a-zA-Z0-9]+$</code>
          </div>
          <div class="template-item" data-pattern="^[\\u4e00-\\u9fa5]+$" data-desc="${i18n.t('regex.chineseOnly')}">
            <span class="tpl-name">${i18n.t('regex.chineseOnly')}</span>
            <code class="tpl-pattern">^[\\u4e00-\\u9fa5]+$</code>
          </div>
          <div class="template-item" data-pattern="^\\S+$" data-desc="${i18n.t('regex.noWhitespace')}">
            <span class="tpl-name">${i18n.t('regex.noWhitespace')}</span>
            <code class="tpl-pattern">^\\S+$</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">📧 ${i18n.t('regex.contact')}</div>
          <div class="template-item" data-pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" data-desc="${i18n.t('regex.email')}">
            <span class="tpl-name">${i18n.t('regex.email')}</span>
            <code class="tpl-pattern">[\\w.+-]+@[\\w.-]+\\.[a-z]{2,}</code>
          </div>
          <div class="template-item" data-pattern="1[3-9]\\d{9}" data-desc="${i18n.t('regex.phone')}">
            <span class="tpl-name">${i18n.t('regex.phone')}</span>
            <code class="tpl-pattern">1[3-9]\\d{9}</code>
          </div>
          <div class="template-item" data-pattern="\\d{3,4}-\\d{7,8}" data-desc="${i18n.t('regex.landline')}">
            <span class="tpl-name">${i18n.t('regex.landline')}</span>
            <code class="tpl-pattern">\\d{3,4}-\\d{7,8}</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">🌐 ${i18n.t('regex.network')}</div>
          <div class="template-item" data-pattern="https?://[^\\s]+" data-desc="URL">
            <span class="tpl-name">URL</span>
            <code class="tpl-pattern">https?://[^\\s]+</code>
          </div>
          <div class="template-item" data-pattern="\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}" data-desc="IPv4">
            <span class="tpl-name">IPv4</span>
            <code class="tpl-pattern">\\d{1,3}(\\.\\d{1,3}){3}</code>
          </div>
          <div class="template-item" data-pattern="[a-fA-F0-9]{2}(:[a-fA-F0-9]{2}){5}" data-desc="${i18n.t('regex.macAddress')}">
            <span class="tpl-name">${i18n.t('regex.macAddress')}</span>
            <code class="tpl-pattern">[a-fA-F0-9]{2}(:[a-fA-F0-9]{2}){5}</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">📅 ${i18n.t('regex.datetime')}</div>
          <div class="template-item" data-pattern="\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}" data-desc="${i18n.t('regex.date')}">
            <span class="tpl-name">${i18n.t('regex.date')}</span>
            <code class="tpl-pattern">\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}</code>
          </div>
          <div class="template-item" data-pattern="\\d{1,2}:\\d{2}(:\\d{2})?" data-desc="${i18n.t('regex.time')}">
            <span class="tpl-name">${i18n.t('regex.time')}</span>
            <code class="tpl-pattern">\\d{1,2}:\\d{2}(:\\d{2})?</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">🔢 ${i18n.t('regex.numberFormat')}</div>
          <div class="template-item" data-pattern="-?\\d+\\.\\d+" data-desc="${i18n.t('regex.decimal')}">
            <span class="tpl-name">${i18n.t('regex.decimal')}</span>
            <code class="tpl-pattern">-?\\d+\\.\\d+</code>
          </div>
          <div class="template-item" data-pattern="-?\\d+" data-desc="${i18n.t('regex.integer')}">
            <span class="tpl-name">${i18n.t('regex.integer')}</span>
            <code class="tpl-pattern">-?\\d+</code>
          </div>
          <div class="template-item" data-pattern="¥?\\d+(\\.\\d{2})?" data-desc="${i18n.t('regex.currency')}">
            <span class="tpl-name">${i18n.t('regex.currency')}</span>
            <code class="tpl-pattern">¥?\\d+(\\.\\d{2})?</code>
          </div>
          <div class="template-item" data-pattern="\\d{1,3}(,\\d{3})*" data-desc="${i18n.t('regex.thousands')}">
            <span class="tpl-name">${i18n.t('regex.thousands')}</span>
            <code class="tpl-pattern">\\d{1,3}(,\\d{3})*</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">🆔 ${i18n.t('regex.idNumbers')}</div>
          <div class="template-item" data-pattern="[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]" data-desc="${i18n.t('regex.idCard')}">
            <span class="tpl-name">${i18n.t('regex.idCard')}</span>
            <code class="tpl-pattern">${i18n.t('regex.idCard18')}</code>
          </div>
          <div class="template-item" data-pattern="[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5,6}" data-desc="${i18n.t('regex.licensePlate')}">
            <span class="tpl-name">${i18n.t('regex.licensePlate')}</span>
            <code class="tpl-pattern">${i18n.t('regex.licensePlateFormat')}</code>
          </div>
          <div class="template-item" data-pattern="\\d{6}" data-desc="${i18n.t('regex.postalCode')}">
            <span class="tpl-name">${i18n.t('regex.postalCode')}</span>
            <code class="tpl-pattern">\\d{6}</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">💻 ${i18n.t('regex.devCommon')}</div>
          <div class="template-item" data-pattern="#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b" data-desc="${i18n.t('regex.hexColor')}">
            <span class="tpl-name">${i18n.t('regex.hexColor')}</span>
            <code class="tpl-pattern">#([0-9a-fA-F]{3,6})</code>
          </div>
          <div class="template-item" data-pattern="<[^>]+>" data-desc="${i18n.t('regex.htmlTag')}">
            <span class="tpl-name">${i18n.t('regex.htmlTag')}</span>
            <code class="tpl-pattern"><[^>]+></code>
          </div>
          <div class="template-item" data-pattern='"[^"]*"|' + "'[^']*'" data-desc="${i18n.t('regex.string')}">
            <span class="tpl-name">${i18n.t('regex.string')}</span>
            <code class="tpl-pattern">"..." ${i18n.t('regex.or')} '...'</code>
          </div>
          <div class="template-item" data-pattern="//.*|/\\*[\\s\\S]*?\\*/" data-desc="${i18n.t('regex.comment')}">
            <span class="tpl-name">${i18n.t('regex.comment')}</span>
            <code class="tpl-pattern">// ${i18n.t('regex.or')} /* */</code>
          </div>
          <div class="template-item" data-pattern="[a-z]+([A-Z][a-z]*)*" data-desc="${i18n.t('regex.camelCase')}">
            <span class="tpl-name">${i18n.t('regex.camelCase')}</span>
            <code class="tpl-pattern">camelCase</code>
          </div>
          <div class="template-item" data-pattern="[a-z]+(_[a-z]+)*" data-desc="${i18n.t('regex.snakeCase')}">
            <span class="tpl-name">${i18n.t('regex.snakeCase')}</span>
            <code class="tpl-pattern">snake_case</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">🔐 ${i18n.t('regex.passwordValidation')}</div>
          <div class="template-item" data-pattern="^.{6,}$" data-desc="${i18n.t('regex.min6')}">
            <span class="tpl-name">${i18n.t('regex.min6')}</span>
            <code class="tpl-pattern">^.{6,}$</code>
          </div>
          <div class="template-item" data-pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$" data-desc="${i18n.t('regex.strongPassword')}">
            <span class="tpl-name">${i18n.t('regex.strongPassword')}</span>
            <code class="tpl-pattern">${i18n.t('regex.strongPasswordFormat')}</code>
          </div>
        </div>
      </div>

      <!-- 快速参考 -->
      <div class="reference-container">
        <div class="reference-header">${i18n.t('regex.quickRef')}</div>
        <div class="reference-grid">
          <div class="ref-item"><code>.</code><span>${i18n.t('regex.refAnyChar')}</span></div>
          <div class="ref-item"><code>\\d</code><span>${i18n.t('regex.refDigit')}</span></div>
          <div class="ref-item"><code>\\w</code><span>${i18n.t('regex.refWord')}</span></div>
          <div class="ref-item"><code>\\s</code><span>${i18n.t('regex.refWhitespace')}</span></div>
          <div class="ref-item"><code>*</code><span>${i18n.t('regex.refZeroPlus')}</span></div>
          <div class="ref-item"><code>+</code><span>${i18n.t('regex.refOnePlus')}</span></div>
          <div class="ref-item"><code>?</code><span>${i18n.t('regex.refZeroOne')}</span></div>
          <div class="ref-item"><code>{n,m}</code><span>${i18n.t('regex.refNtoM')}</span></div>
          <div class="ref-item"><code>^</code><span>${i18n.t('regex.refStart')}</span></div>
          <div class="ref-item"><code>$</code><span>${i18n.t('regex.refEnd')}</span></div>
          <div class="ref-item"><code>[abc]</code><span>${i18n.t('regex.refCharset')}</span></div>
          <div class="ref-item"><code>()</code><span>${i18n.t('regex.refGroup')}</span></div>
        </div>
      </div>
    </div>
  </div>
</div>
`;

// 保留旧的导出以兼容
export const template = getTemplate();
