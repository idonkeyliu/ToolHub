export const codecTemplate = `
<div class="codec-wrap">
    <div class="codec-tabs">
        <div class="codec-tab active" data-tab="url">URL 编解码</div>
        <div class="codec-tab" data-tab="base64">Base64 编解码</div>
        <div class="codec-tab" data-tab="unicode">Unicode 编解码</div>
        <div class="codec-tab" data-tab="hex">Hex 编解码</div>
        <div class="codec-tab" data-tab="html">HTML 实体</div>
    </div>
    
    <!-- URL 编解码 -->
    <div class="codec-panel active" data-panel="url">
        <div class="codec-side">
            <div class="codec-label">原文 (URL 解码后)</div>
            <textarea class="codec-textarea" id="urlDecoded" placeholder="输入原始文本..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="urlEncode">URL 编码</button>
                <button class="codec-btn" id="urlClear">清空</button>
            </div>
            <div class="codec-error" id="urlError"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">编码后 (URL 编码)</div>
            <textarea class="codec-textarea" id="urlEncoded" placeholder="编码结果或输入编码文本..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="urlDecode">URL 解码</button>
                <button class="codec-btn" id="urlCopy">复制</button>
            </div>
        </div>
    </div>
    
    <!-- Base64 编解码 -->
    <div class="codec-panel" data-panel="base64">
        <div class="codec-side">
            <div class="codec-label">原文 (Base64 解码后)</div>
            <textarea class="codec-textarea" id="base64Decoded" placeholder="输入原始文本..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="base64Encode">Base64 编码</button>
                <button class="codec-btn" id="base64Clear">清空</button>
            </div>
            <div class="codec-error" id="base64Error"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">编码后 (Base64 编码)</div>
            <textarea class="codec-textarea" id="base64Encoded" placeholder="编码结果或输入Base64文本..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="base64Decode">Base64 解码</button>
                <button class="codec-btn" id="base64Copy">复制</button>
            </div>
        </div>
    </div>
    
    <!-- Unicode 编解码 -->
    <div class="codec-panel" data-panel="unicode">
        <div class="codec-side">
            <div class="codec-label">原文 (Unicode 解码后)</div>
            <textarea class="codec-textarea" id="unicodeDecoded" placeholder="输入原始文本..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="unicodeEncode">Unicode 编码</button>
                <button class="codec-btn" id="unicodeClear">清空</button>
            </div>
            <div class="codec-error" id="unicodeError"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">编码后 (Unicode 编码)</div>
            <textarea class="codec-textarea" id="unicodeEncoded" placeholder="编码结果或输入Unicode文本 (\\u0041)..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="unicodeDecode">Unicode 解码</button>
                <button class="codec-btn" id="unicodeCopy">复制</button>
            </div>
        </div>
    </div>
    
    <!-- Hex 编解码 -->
    <div class="codec-panel" data-panel="hex">
        <div class="codec-side">
            <div class="codec-label">原文 (Hex 解码后)</div>
            <textarea class="codec-textarea" id="hexDecoded" placeholder="输入原始文本..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="hexEncode">Hex 编码</button>
                <button class="codec-btn" id="hexClear">清空</button>
            </div>
            <div class="codec-error" id="hexError"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">编码后 (Hex 编码)</div>
            <textarea class="codec-textarea" id="hexEncoded" placeholder="编码结果或输入Hex文本 (48656c6c6f)..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="hexDecode">Hex 解码</button>
                <button class="codec-btn" id="hexCopy">复制</button>
            </div>
        </div>
    </div>
    
    <!-- HTML 实体编解码 -->
    <div class="codec-panel" data-panel="html">
        <div class="codec-side">
            <div class="codec-label">原文 (HTML 解码后)</div>
            <textarea class="codec-textarea" id="htmlDecoded" placeholder="输入原始文本..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="htmlEncode">HTML 编码</button>
                <button class="codec-btn" id="htmlClear">清空</button>
            </div>
            <div class="codec-error" id="htmlError"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">编码后 (HTML 实体)</div>
            <textarea class="codec-textarea" id="htmlEncoded" placeholder="编码结果或输入HTML实体 (&lt;div&gt;)..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="htmlDecode">HTML 解码</button>
                <button class="codec-btn" id="htmlCopy">复制</button>
            </div>
        </div>
    </div>
</div>
`;
