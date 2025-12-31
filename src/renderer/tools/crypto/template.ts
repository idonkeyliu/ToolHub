import { i18n } from '../../core/i18n';

export const getCryptoTemplate = () => `
<div class="crypto-wrap">
    <div class="crypto-tabs">
        <div class="crypto-tab active" data-tab="md5">${i18n.t('crypto.md5Tab')}</div>
        <div class="crypto-tab" data-tab="sha">${i18n.t('crypto.shaTab')}</div>
        <div class="crypto-tab" data-tab="aes">${i18n.t('crypto.aesTab')}</div>
        <div class="crypto-tab" data-tab="des">${i18n.t('crypto.desTab')}</div>
    </div>
    
    <!-- MD5 哈希 -->
    <div class="crypto-panel active" data-panel="md5">
        <div class="crypto-side">
            <div class="crypto-label">${i18n.t('crypto.inputText')}</div>
            <textarea class="crypto-textarea" id="md5Input" placeholder="${i18n.t('crypto.inputPlaceholder')}"></textarea>
            <div class="crypto-controls">
                <button class="crypto-btn" id="md5Generate">${i18n.t('crypto.generate')}</button>
                <button class="crypto-btn" id="md5Clear">${i18n.t('crypto.clear')}</button>
            </div>
            <div class="crypto-error" id="md5Error"></div>
        </div>
        <div class="crypto-side">
            <div class="crypto-label">${i18n.t('crypto.result')}</div>
            <div class="crypto-results">
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">${i18n.t('crypto.32Lower')}</span>
                        <button class="crypto-btn crypto-copy-btn" id="md5Copy32Lower">${i18n.t('crypto.copy')}</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="md5Output32Lower" placeholder="${i18n.t('crypto.32Lower')}..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">${i18n.t('crypto.32Upper')}</span>
                        <button class="crypto-btn crypto-copy-btn" id="md5Copy32Upper">${i18n.t('crypto.copy')}</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="md5Output32Upper" placeholder="${i18n.t('crypto.32Upper')}..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">${i18n.t('crypto.16Lower')}</span>
                        <button class="crypto-btn crypto-copy-btn" id="md5Copy16Lower">${i18n.t('crypto.copy')}</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="md5Output16Lower" placeholder="${i18n.t('crypto.16Lower')}..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">${i18n.t('crypto.16Upper')}</span>
                        <button class="crypto-btn crypto-copy-btn" id="md5Copy16Upper">${i18n.t('crypto.copy')}</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="md5Output16Upper" placeholder="${i18n.t('crypto.16Upper')}..." readonly></textarea>
                </div>
            </div>
        </div>
    </div>
    
    <!-- SHA 哈希 -->
    <div class="crypto-panel" data-panel="sha">
        <div class="crypto-side">
            <div class="crypto-label">${i18n.t('crypto.inputText')}</div>
            <textarea class="crypto-textarea" id="shaInput" placeholder="${i18n.t('crypto.inputPlaceholder')}"></textarea>
            <div class="crypto-controls">
                <button class="crypto-btn" id="shaGenerate">${i18n.t('crypto.generate')}</button>
                <button class="crypto-btn" id="shaClear">${i18n.t('crypto.clear')}</button>
            </div>
            <div class="crypto-error" id="shaError"></div>
        </div>
        <div class="crypto-side">
            <div class="crypto-label">${i18n.t('crypto.result')}</div>
            <div class="crypto-results">
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">SHA-1</span>
                        <button class="crypto-btn crypto-copy-btn" id="shaCopy1">${i18n.t('crypto.copy')}</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="shaOutput1" placeholder="SHA-1..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">SHA-256</span>
                        <button class="crypto-btn crypto-copy-btn" id="shaCopy256">${i18n.t('crypto.copy')}</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="shaOutput256" placeholder="SHA-256..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">SHA-512</span>
                        <button class="crypto-btn crypto-copy-btn" id="shaCopy512">${i18n.t('crypto.copy')}</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="shaOutput512" placeholder="SHA-512..." readonly></textarea>
                </div>
            </div>
        </div>
    </div>
    
    <!-- AES 加解密 -->
    <div class="crypto-panel" data-panel="aes">
        <div class="crypto-side">
            <div class="crypto-label">${i18n.t('crypto.inputText')}</div>
            <textarea class="crypto-textarea" id="aesInput" placeholder="${i18n.t('crypto.inputPlaceholder')}"></textarea>
            <div class="crypto-label">${i18n.t('crypto.key')}</div>
            <input class="crypto-input" id="aesKey" placeholder="${i18n.t('crypto.keyPlaceholder')}" type="text" />
            <div class="crypto-controls">
                <button class="crypto-btn" id="aesEncrypt">${i18n.t('crypto.encrypt')}</button>
                <button class="crypto-btn" id="aesDecrypt">${i18n.t('crypto.decrypt')}</button>
                <button class="crypto-btn" id="aesClear">${i18n.t('crypto.clear')}</button>
                <button class="crypto-btn" id="aesCopy">${i18n.t('crypto.copyResult')}</button>
            </div>
            <div class="crypto-error" id="aesError"></div>
        </div>
        <div class="crypto-side">
            <div class="crypto-label">${i18n.t('crypto.encryptResult')}</div>
            <textarea class="crypto-textarea" id="aesOutput" placeholder="${i18n.t('crypto.resultPlaceholder')}" readonly></textarea>
        </div>
    </div>
    
    <!-- DES 加解密 -->
    <div class="crypto-panel" data-panel="des">
        <div class="crypto-side">
            <div class="crypto-label">${i18n.t('crypto.inputText')}</div>
            <textarea class="crypto-textarea" id="desInput" placeholder="${i18n.t('crypto.inputPlaceholder')}"></textarea>
            <div class="crypto-label">${i18n.t('crypto.key')}</div>
            <input class="crypto-input" id="desKey" placeholder="${i18n.t('crypto.keyPlaceholder')}" type="text" />
            <div class="crypto-controls">
                <button class="crypto-btn" id="desEncrypt">${i18n.t('crypto.encrypt')}</button>
                <button class="crypto-btn" id="desDecrypt">${i18n.t('crypto.decrypt')}</button>
                <button class="crypto-btn" id="desClear">${i18n.t('crypto.clear')}</button>
                <button class="crypto-btn" id="desCopy">${i18n.t('crypto.copyResult')}</button>
            </div>
            <div class="crypto-error" id="desError"></div>
        </div>
        <div class="crypto-side">
            <div class="crypto-label">${i18n.t('crypto.encryptResult')}</div>
            <textarea class="crypto-textarea" id="desOutput" placeholder="${i18n.t('crypto.resultPlaceholder')}" readonly></textarea>
        </div>
    </div>
</div>
`;
