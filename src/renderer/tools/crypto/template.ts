export const cryptoTemplate = `
<div class="crypto-wrap">
    <div class="crypto-tabs">
        <div class="crypto-tab active" data-tab="md5">MD5 哈希</div>
        <div class="crypto-tab" data-tab="sha">SHA 哈希</div>
        <div class="crypto-tab" data-tab="aes">AES 加解密</div>
        <div class="crypto-tab" data-tab="des">DES 加解密</div>
    </div>
    
    <!-- MD5 哈希 -->
    <div class="crypto-panel active" data-panel="md5">
        <div class="crypto-side">
            <div class="crypto-label">输入文本</div>
            <textarea class="crypto-textarea" id="md5Input" placeholder="输入要计算MD5的文本..."></textarea>
            <div class="crypto-controls">
                <button class="crypto-btn" id="md5Generate">生成MD5</button>
                <button class="crypto-btn" id="md5Clear">清空</button>
            </div>
            <div class="crypto-error" id="md5Error"></div>
        </div>
        <div class="crypto-side">
            <div class="crypto-label">MD5 结果</div>
            <div class="crypto-results">
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">32位小写</span>
                        <button class="crypto-btn crypto-copy-btn" id="md5Copy32Lower">复制</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="md5Output32Lower" placeholder="32位小写MD5..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">32位大写</span>
                        <button class="crypto-btn crypto-copy-btn" id="md5Copy32Upper">复制</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="md5Output32Upper" placeholder="32位大写MD5..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">16位小写</span>
                        <button class="crypto-btn crypto-copy-btn" id="md5Copy16Lower">复制</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="md5Output16Lower" placeholder="16位小写MD5..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">16位大写</span>
                        <button class="crypto-btn crypto-copy-btn" id="md5Copy16Upper">复制</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="md5Output16Upper" placeholder="16位大写MD5..." readonly></textarea>
                </div>
            </div>
        </div>
    </div>
    
    <!-- SHA 哈希 -->
    <div class="crypto-panel" data-panel="sha">
        <div class="crypto-side">
            <div class="crypto-label">输入文本</div>
            <textarea class="crypto-textarea" id="shaInput" placeholder="输入要计算SHA的文本..."></textarea>
            <div class="crypto-controls">
                <button class="crypto-btn" id="shaGenerate">生成SHA</button>
                <button class="crypto-btn" id="shaClear">清空</button>
            </div>
            <div class="crypto-error" id="shaError"></div>
        </div>
        <div class="crypto-side">
            <div class="crypto-label">SHA 结果</div>
            <div class="crypto-results">
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">SHA-1</span>
                        <button class="crypto-btn crypto-copy-btn" id="shaCopy1">复制</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="shaOutput1" placeholder="SHA-1..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">SHA-256</span>
                        <button class="crypto-btn crypto-copy-btn" id="shaCopy256">复制</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="shaOutput256" placeholder="SHA-256..." readonly></textarea>
                </div>
                <div class="crypto-result-item">
                    <div class="crypto-result-header">
                        <span class="crypto-result-label">SHA-512</span>
                        <button class="crypto-btn crypto-copy-btn" id="shaCopy512">复制</button>
                    </div>
                    <textarea class="crypto-textarea crypto-output" id="shaOutput512" placeholder="SHA-512..." readonly></textarea>
                </div>
            </div>
        </div>
    </div>
    
    <!-- AES 加解密 -->
    <div class="crypto-panel" data-panel="aes">
        <div class="crypto-side">
            <div class="crypto-label">输入文本</div>
            <textarea class="crypto-textarea" id="aesInput" placeholder="输入要加密/解密的文本..."></textarea>
            <div class="crypto-label">密钥 (Key)</div>
            <input class="crypto-input" id="aesKey" placeholder="输入AES密钥..." type="text" />
            <div class="crypto-controls">
                <button class="crypto-btn" id="aesEncrypt">AES 加密</button>
                <button class="crypto-btn" id="aesDecrypt">AES 解密</button>
                <button class="crypto-btn" id="aesClear">清空</button>
                <button class="crypto-btn" id="aesCopy">复制结果</button>
            </div>
            <div class="crypto-error" id="aesError"></div>
        </div>
        <div class="crypto-side">
            <div class="crypto-label">加密/解密结果</div>
            <textarea class="crypto-textarea" id="aesOutput" placeholder="加密/解密结果将显示在这里..." readonly></textarea>
        </div>
    </div>
    
    <!-- DES 加解密 -->
    <div class="crypto-panel" data-panel="des">
        <div class="crypto-side">
            <div class="crypto-label">输入文本</div>
            <textarea class="crypto-textarea" id="desInput" placeholder="输入要加密/解密的文本..."></textarea>
            <div class="crypto-label">密钥 (Key)</div>
            <input class="crypto-input" id="desKey" placeholder="输入DES密钥(8字节)..." type="text" />
            <div class="crypto-controls">
                <button class="crypto-btn" id="desEncrypt">DES 加密</button>
                <button class="crypto-btn" id="desDecrypt">DES 解密</button>
                <button class="crypto-btn" id="desClear">清空</button>
                <button class="crypto-btn" id="desCopy">复制结果</button>
            </div>
            <div class="crypto-error" id="desError"></div>
        </div>
        <div class="crypto-side">
            <div class="crypto-label">加密/解密结果</div>
            <textarea class="crypto-textarea" id="desOutput" placeholder="加密/解密结果将显示在这里..." readonly></textarea>
        </div>
    </div>
</div>
`;
