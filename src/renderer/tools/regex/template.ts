/**
 * 正则表达式工具模板
 */

export const template = `
<div class="regex-tool">
  <!-- 顶部：正则输入 -->
  <div class="regex-header">
    <div class="regex-input-row">
      <div class="regex-pattern-wrapper">
        <span class="regex-delimiter">/</span>
        <input type="text" id="regexInput" class="regex-input" placeholder="输入正则表达式..." spellcheck="false" autocomplete="off" />
        <span class="regex-delimiter">/</span>
        <div class="regex-flags">
          <label class="flag-item">
            <input type="checkbox" id="flagG" checked />
            <span>g</span>
            <div class="flag-tooltip">
              <div class="tooltip-title">g - 全局匹配</div>
              <div class="tooltip-desc">查找所有匹配项，而不是找到第一个就停止</div>
              <div class="tooltip-example">例: /a/g 在 "abab" 中匹配 2 次</div>
            </div>
          </label>
          <label class="flag-item">
            <input type="checkbox" id="flagI" />
            <span>i</span>
            <div class="flag-tooltip">
              <div class="tooltip-title">i - 忽略大小写</div>
              <div class="tooltip-desc">匹配时不区分大小写</div>
              <div class="tooltip-example">例: /abc/i 可匹配 "ABC"、"Abc"</div>
            </div>
          </label>
          <label class="flag-item">
            <input type="checkbox" id="flagM" />
            <span>m</span>
            <div class="flag-tooltip">
              <div class="tooltip-title">m - 多行模式</div>
              <div class="tooltip-desc">^ 和 $ 匹配每行的开头/结尾，而不只是整个字符串</div>
              <div class="tooltip-example">例: /^a/m 匹配每行开头的 a</div>
            </div>
          </label>
          <label class="flag-item">
            <input type="checkbox" id="flagS" />
            <span>s</span>
            <div class="flag-tooltip">
              <div class="tooltip-title">s - 点匹配换行</div>
              <div class="tooltip-desc">让 . 可以匹配换行符 \\n（默认不匹配）</div>
              <div class="tooltip-example">例: /a.b/s 可匹配 "a\\nb"</div>
            </div>
          </label>
        </div>
      </div>
      <div class="regex-actions">
        <button class="regex-action-btn" id="clearBtn" title="清空">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
        <button class="regex-action-btn" id="sampleBtn" title="加载示例">
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
        <span class="stat-num" id="matchCount">0</span> 匹配
      </span>
      <span class="stat-badge" id="groupBadge">
        <span class="stat-num" id="groupCount">0</span> 捕获组
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
          <span class="panel-title">测试文本</span>
          <button class="panel-btn" id="pasteTestBtn" title="粘贴">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </button>
        </div>
        <div class="test-text-wrapper">
          <div class="test-text-highlight" id="testTextHighlight"></div>
          <textarea id="testTextInput" class="test-text-input" placeholder="输入要测试的文本..." spellcheck="false"></textarea>
        </div>
      </div>

      <!-- 匹配结果 -->
      <div class="regex-panel matches-panel">
        <div class="panel-header">
          <span class="panel-title">匹配结果</span>
          <button class="panel-btn" id="copyMatchesBtn" title="复制所有匹配">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
        <div class="matches-list" id="matchesList">
          <div class="matches-empty">输入正则和文本查看匹配</div>
        </div>
      </div>

      <!-- 替换功能 -->
      <div class="regex-panel replace-panel">
        <div class="panel-header">
          <label class="panel-toggle">
            <input type="checkbox" id="replaceToggle" />
            <span class="panel-title">替换</span>
          </label>
        </div>
        <div class="replace-content" id="replaceContent">
          <div class="replace-row">
            <input type="text" id="replaceInput" class="replace-input" placeholder="替换为... ($1, $2 引用捕获组)" spellcheck="false" />
            <button class="replace-btn primary" id="replaceAllBtn">替换</button>
            <button class="replace-btn" id="copyResultBtn">复制</button>
          </div>
          <div class="replace-result" id="replaceResult"></div>
        </div>
      </div>
    </div>

    <!-- 右侧：模板库 -->
    <div class="regex-right">
      <div class="templates-container">
        <div class="templates-header">常用正则模板</div>
        
        <div class="template-group">
          <div class="template-group-title">📝 基础匹配</div>
          <div class="template-item" data-pattern="^[a-zA-Z]+$" data-desc="纯字母">
            <span class="tpl-name">纯字母</span>
            <code class="tpl-pattern">^[a-zA-Z]+$</code>
          </div>
          <div class="template-item" data-pattern="^[0-9]+$" data-desc="纯数字">
            <span class="tpl-name">纯数字</span>
            <code class="tpl-pattern">^[0-9]+$</code>
          </div>
          <div class="template-item" data-pattern="^[a-zA-Z0-9]+$" data-desc="字母数字">
            <span class="tpl-name">字母+数字</span>
            <code class="tpl-pattern">^[a-zA-Z0-9]+$</code>
          </div>
          <div class="template-item" data-pattern="^[\\u4e00-\\u9fa5]+$" data-desc="纯中文">
            <span class="tpl-name">纯中文</span>
            <code class="tpl-pattern">^[\\u4e00-\\u9fa5]+$</code>
          </div>
          <div class="template-item" data-pattern="^\\S+$" data-desc="无空白字符">
            <span class="tpl-name">无空格</span>
            <code class="tpl-pattern">^\\S+$</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">📧 联系方式</div>
          <div class="template-item" data-pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" data-desc="邮箱">
            <span class="tpl-name">邮箱</span>
            <code class="tpl-pattern">[\\w.+-]+@[\\w.-]+\\.[a-z]{2,}</code>
          </div>
          <div class="template-item" data-pattern="1[3-9]\\d{9}" data-desc="手机号">
            <span class="tpl-name">手机号</span>
            <code class="tpl-pattern">1[3-9]\\d{9}</code>
          </div>
          <div class="template-item" data-pattern="\\d{3,4}-\\d{7,8}" data-desc="座机号">
            <span class="tpl-name">座机</span>
            <code class="tpl-pattern">\\d{3,4}-\\d{7,8}</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">🌐 网络相关</div>
          <div class="template-item" data-pattern="https?://[^\\s]+" data-desc="URL">
            <span class="tpl-name">URL</span>
            <code class="tpl-pattern">https?://[^\\s]+</code>
          </div>
          <div class="template-item" data-pattern="\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}" data-desc="IPv4">
            <span class="tpl-name">IPv4</span>
            <code class="tpl-pattern">\\d{1,3}(\\.\\d{1,3}){3}</code>
          </div>
          <div class="template-item" data-pattern="[a-fA-F0-9]{2}(:[a-fA-F0-9]{2}){5}" data-desc="MAC地址">
            <span class="tpl-name">MAC地址</span>
            <code class="tpl-pattern">[a-fA-F0-9]{2}(:[a-fA-F0-9]{2}){5}</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">📅 日期时间</div>
          <div class="template-item" data-pattern="\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}" data-desc="日期">
            <span class="tpl-name">日期</span>
            <code class="tpl-pattern">\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}</code>
          </div>
          <div class="template-item" data-pattern="\\d{1,2}:\\d{2}(:\\d{2})?" data-desc="时间">
            <span class="tpl-name">时间</span>
            <code class="tpl-pattern">\\d{1,2}:\\d{2}(:\\d{2})?</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">🔢 数字格式</div>
          <div class="template-item" data-pattern="-?\\d+\\.\\d+" data-desc="小数">
            <span class="tpl-name">小数</span>
            <code class="tpl-pattern">-?\\d+\\.\\d+</code>
          </div>
          <div class="template-item" data-pattern="-?\\d+" data-desc="整数">
            <span class="tpl-name">整数</span>
            <code class="tpl-pattern">-?\\d+</code>
          </div>
          <div class="template-item" data-pattern="¥?\\d+(\\.\\d{2})?" data-desc="金额">
            <span class="tpl-name">金额</span>
            <code class="tpl-pattern">¥?\\d+(\\.\\d{2})?</code>
          </div>
          <div class="template-item" data-pattern="\\d{1,3}(,\\d{3})*" data-desc="千分位">
            <span class="tpl-name">千分位</span>
            <code class="tpl-pattern">\\d{1,3}(,\\d{3})*</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">🆔 证件号码</div>
          <div class="template-item" data-pattern="[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]" data-desc="身份证">
            <span class="tpl-name">身份证</span>
            <code class="tpl-pattern">18位身份证</code>
          </div>
          <div class="template-item" data-pattern="[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5,6}" data-desc="车牌号">
            <span class="tpl-name">车牌号</span>
            <code class="tpl-pattern">省份+字母+5-6位</code>
          </div>
          <div class="template-item" data-pattern="\\d{6}" data-desc="邮编">
            <span class="tpl-name">邮编</span>
            <code class="tpl-pattern">\\d{6}</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">💻 开发常用</div>
          <div class="template-item" data-pattern="#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b" data-desc="颜色">
            <span class="tpl-name">HEX颜色</span>
            <code class="tpl-pattern">#([0-9a-fA-F]{3,6})</code>
          </div>
          <div class="template-item" data-pattern="<[^>]+>" data-desc="HTML标签">
            <span class="tpl-name">HTML标签</span>
            <code class="tpl-pattern"><[^>]+></code>
          </div>
          <div class="template-item" data-pattern='"[^"]*"|' + "'[^']*'" data-desc="字符串">
            <span class="tpl-name">字符串</span>
            <code class="tpl-pattern">"..." 或 '...'</code>
          </div>
          <div class="template-item" data-pattern="//.*|/\\*[\\s\\S]*?\\*/" data-desc="注释">
            <span class="tpl-name">代码注释</span>
            <code class="tpl-pattern">// 或 /* */</code>
          </div>
          <div class="template-item" data-pattern="[a-z]+([A-Z][a-z]*)*" data-desc="驼峰命名">
            <span class="tpl-name">驼峰命名</span>
            <code class="tpl-pattern">camelCase</code>
          </div>
          <div class="template-item" data-pattern="[a-z]+(_[a-z]+)*" data-desc="下划线命名">
            <span class="tpl-name">下划线命名</span>
            <code class="tpl-pattern">snake_case</code>
          </div>
        </div>

        <div class="template-group">
          <div class="template-group-title">🔐 密码验证</div>
          <div class="template-item" data-pattern="^.{6,}$" data-desc="至少6位">
            <span class="tpl-name">至少6位</span>
            <code class="tpl-pattern">^.{6,}$</code>
          </div>
          <div class="template-item" data-pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$" data-desc="强密码">
            <span class="tpl-name">强密码</span>
            <code class="tpl-pattern">大小写+数字 8位+</code>
          </div>
        </div>
      </div>

      <!-- 快速参考 -->
      <div class="reference-container">
        <div class="reference-header">快速参考</div>
        <div class="reference-grid">
          <div class="ref-item"><code>.</code><span>任意字符</span></div>
          <div class="ref-item"><code>\\d</code><span>数字</span></div>
          <div class="ref-item"><code>\\w</code><span>单词字符</span></div>
          <div class="ref-item"><code>\\s</code><span>空白</span></div>
          <div class="ref-item"><code>*</code><span>0+次</span></div>
          <div class="ref-item"><code>+</code><span>1+次</span></div>
          <div class="ref-item"><code>?</code><span>0或1次</span></div>
          <div class="ref-item"><code>{n,m}</code><span>n到m次</span></div>
          <div class="ref-item"><code>^</code><span>开头</span></div>
          <div class="ref-item"><code>$</code><span>结尾</span></div>
          <div class="ref-item"><code>[abc]</code><span>字符集</span></div>
          <div class="ref-item"><code>()</code><span>捕获组</span></div>
        </div>
      </div>
    </div>
  </div>
</div>
`;
