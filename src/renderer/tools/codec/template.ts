import { i18n } from '../../core/i18n';

export const getCodecTemplate = () => `
<div class="codec-wrap">
    <div class="codec-tabs">
        <div class="codec-tab active" data-tab="url">${i18n.t('codec.urlTab')}</div>
        <div class="codec-tab" data-tab="base64">${i18n.t('codec.base64Tab')}</div>
        <div class="codec-tab" data-tab="unicode">${i18n.t('codec.unicodeTab')}</div>
        <div class="codec-tab" data-tab="hex">${i18n.t('codec.hexTab')}</div>
        <div class="codec-tab" data-tab="html">${i18n.t('codec.htmlTab')}</div>
    </div>
    
    <!-- URL 编解码 -->
    <div class="codec-panel active" data-panel="url">
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.decoded')}</div>
            <textarea class="codec-textarea" id="urlDecoded" placeholder="${i18n.t('codec.inputPlaceholder')}"></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="urlEncode">${i18n.t('codec.encode')}</button>
                <button class="codec-btn" id="urlClear">${i18n.t('codec.clear')}</button>
            </div>
            <div class="codec-error" id="urlError"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.encoded')}</div>
            <textarea class="codec-textarea" id="urlEncoded" placeholder="${i18n.t('codec.decodedAfter')}..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="urlDecode">${i18n.t('codec.decode')}</button>
                <button class="codec-btn" id="urlCopy">${i18n.t('codec.copy')}</button>
            </div>
        </div>
    </div>
    
    <!-- Base64 编解码 -->
    <div class="codec-panel" data-panel="base64">
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.decoded')}</div>
            <textarea class="codec-textarea" id="base64Decoded" placeholder="${i18n.t('codec.inputPlaceholder')}"></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="base64Encode">${i18n.t('codec.encode')}</button>
                <button class="codec-btn" id="base64Clear">${i18n.t('codec.clear')}</button>
            </div>
            <div class="codec-error" id="base64Error"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.encoded')}</div>
            <textarea class="codec-textarea" id="base64Encoded" placeholder="${i18n.t('codec.decodedAfter')}..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="base64Decode">${i18n.t('codec.decode')}</button>
                <button class="codec-btn" id="base64Copy">${i18n.t('codec.copy')}</button>
            </div>
        </div>
    </div>
    
    <!-- Unicode 编解码 -->
    <div class="codec-panel" data-panel="unicode">
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.decoded')}</div>
            <textarea class="codec-textarea" id="unicodeDecoded" placeholder="${i18n.t('codec.inputPlaceholder')}"></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="unicodeEncode">${i18n.t('codec.encode')}</button>
                <button class="codec-btn" id="unicodeClear">${i18n.t('codec.clear')}</button>
            </div>
            <div class="codec-error" id="unicodeError"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.encoded')}</div>
            <textarea class="codec-textarea" id="unicodeEncoded" placeholder="${i18n.t('codec.decodedAfter')} (\\u0041)..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="unicodeDecode">${i18n.t('codec.decode')}</button>
                <button class="codec-btn" id="unicodeCopy">${i18n.t('codec.copy')}</button>
            </div>
        </div>
    </div>
    
    <!-- Hex 编解码 -->
    <div class="codec-panel" data-panel="hex">
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.decoded')}</div>
            <textarea class="codec-textarea" id="hexDecoded" placeholder="${i18n.t('codec.inputPlaceholder')}"></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="hexEncode">${i18n.t('codec.encode')}</button>
                <button class="codec-btn" id="hexClear">${i18n.t('codec.clear')}</button>
            </div>
            <div class="codec-error" id="hexError"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.encoded')}</div>
            <textarea class="codec-textarea" id="hexEncoded" placeholder="${i18n.t('codec.decodedAfter')} (48656c6c6f)..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="hexDecode">${i18n.t('codec.decode')}</button>
                <button class="codec-btn" id="hexCopy">${i18n.t('codec.copy')}</button>
            </div>
        </div>
    </div>
    
    <!-- HTML 实体编解码 -->
    <div class="codec-panel" data-panel="html">
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.decoded')}</div>
            <textarea class="codec-textarea" id="htmlDecoded" placeholder="${i18n.t('codec.inputPlaceholder')}"></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="htmlEncode">${i18n.t('codec.encode')}</button>
                <button class="codec-btn" id="htmlClear">${i18n.t('codec.clear')}</button>
            </div>
            <div class="codec-error" id="htmlError"></div>
        </div>
        <div class="codec-side">
            <div class="codec-label">${i18n.t('codec.encoded')}</div>
            <textarea class="codec-textarea" id="htmlEncoded" placeholder="${i18n.t('codec.decodedAfter')} (&lt;div&gt;)..."></textarea>
            <div class="codec-buttons">
                <button class="codec-btn primary" id="htmlDecode">${i18n.t('codec.decode')}</button>
                <button class="codec-btn" id="htmlCopy">${i18n.t('codec.copy')}</button>
            </div>
        </div>
    </div>
</div>
`;
