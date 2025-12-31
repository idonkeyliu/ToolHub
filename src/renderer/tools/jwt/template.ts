/**
 * JWT 解析器模板
 */

import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="jwt-wrap">
  <div class="jwt-main">
    <!-- 输入区域 -->
    <div class="jwt-input-section">
      <div class="section-header">
        <div class="section-title">
          <span class="section-icon">🔐</span>
          <span>${i18n.t('jwt.token')}</span>
        </div>
        <div class="section-actions">
          <button class="action-btn" id="pasteBtn" title="${i18n.t('jwt.paste')}">
            <span>📋</span>
            <span>${i18n.t('jwt.paste')}</span>
          </button>
          <button class="action-btn" id="sampleBtn" title="${i18n.t('jwt.sample')}">
            <span>📝</span>
            <span>${i18n.t('jwt.sample')}</span>
          </button>
          <button class="action-btn" id="clearBtn" title="${i18n.t('jwt.clear')}">
            <span>🗑️</span>
            <span>${i18n.t('jwt.clear')}</span>
          </button>
        </div>
      </div>
      <div class="jwt-input-wrapper">
        <textarea class="jwt-input" id="jwtInput" placeholder="${i18n.t('jwt.placeholder')}" spellcheck="false"></textarea>
        <div class="jwt-parts-indicator" id="partsIndicator">
          <span class="part-dot header" title="Header"></span>
          <span class="part-dot payload" title="Payload"></span>
          <span class="part-dot signature" title="Signature"></span>
        </div>
      </div>
    </div>

    <!-- 解析结果 -->
    <div class="jwt-result-section">
      <!-- Header -->
      <div class="jwt-part" id="headerPart">
        <div class="part-header">
          <div class="part-title">
            <span class="part-badge header">HEADER</span>
            <span class="part-alg" id="headerAlg"></span>
          </div>
          <button class="copy-btn" id="copyHeaderBtn" title="${i18n.t('jwt.copy')}">
            <span>📑</span>
          </button>
        </div>
        <div class="part-content">
          <pre class="json-display" id="headerJson"></pre>
        </div>
      </div>

      <!-- Payload -->
      <div class="jwt-part" id="payloadPart">
        <div class="part-header">
          <div class="part-title">
            <span class="part-badge payload">PAYLOAD</span>
            <span class="part-claims" id="claimsCount"></span>
          </div>
          <button class="copy-btn" id="copyPayloadBtn" title="${i18n.t('jwt.copy')}">
            <span>📑</span>
          </button>
        </div>
        <div class="part-content">
          <pre class="json-display" id="payloadJson"></pre>
        </div>
        <!-- 时间信息 -->
        <div class="time-info" id="timeInfo">
          <div class="time-item" id="iatInfo">
            <span class="time-label">${i18n.t('jwt.issuedAt')}</span>
            <span class="time-value" id="iatValue">-</span>
          </div>
          <div class="time-item" id="expInfo">
            <span class="time-label">${i18n.t('jwt.expiresAt')}</span>
            <span class="time-value" id="expValue">-</span>
          </div>
          <div class="time-item" id="nbfInfo">
            <span class="time-label">${i18n.t('jwt.notBefore')}</span>
            <span class="time-value" id="nbfValue">-</span>
          </div>
        </div>
        <!-- 过期状态 -->
        <div class="expiry-status" id="expiryStatus"></div>
      </div>

      <!-- Signature -->
      <div class="jwt-part" id="signaturePart">
        <div class="part-header">
          <div class="part-title">
            <span class="part-badge signature">SIGNATURE</span>
          </div>
          <button class="copy-btn" id="copySignatureBtn" title="${i18n.t('jwt.copy')}">
            <span>📑</span>
          </button>
        </div>
        <div class="part-content">
          <div class="signature-display" id="signatureDisplay"></div>
        </div>
        <!-- 验证区域 -->
        <div class="verify-section" id="verifySection">
          <div class="verify-header">
            <span class="verify-title">${i18n.t('jwt.signatureVerify')}</span>
            <label class="verify-toggle">
              <input type="checkbox" id="verifyToggle">
              <span>${i18n.t('jwt.enableVerify')}</span>
            </label>
          </div>
          <div class="verify-content" id="verifyContent" style="display: none;">
            <div class="secret-input-group">
              <label class="secret-label">
                <input type="radio" name="secretType" value="secret" checked>
                <span>${i18n.t('jwt.secret')}</span>
              </label>
              <label class="secret-label">
                <input type="radio" name="secretType" value="publicKey">
                <span>${i18n.t('jwt.publicKey')}</span>
              </label>
            </div>
            <textarea class="secret-input" id="secretInput" placeholder="${i18n.t('jwt.secretPlaceholder')}" spellcheck="false"></textarea>
            <div class="verify-actions">
              <button class="verify-btn" id="verifyBtn">${i18n.t('jwt.verify')}</button>
              <span class="verify-result" id="verifyResult"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 侧边栏 - Claims 说明 -->
  <div class="jwt-sidebar">
    <div class="sidebar-section">
      <div class="sidebar-title">${i18n.t('jwt.standardClaims')}</div>
      <div class="claims-list" id="standardClaims">
        <div class="claim-item">
          <span class="claim-key">iss</span>
          <span class="claim-desc">${i18n.t('jwt.issuer')}</span>
        </div>
        <div class="claim-item">
          <span class="claim-key">sub</span>
          <span class="claim-desc">${i18n.t('jwt.subject')}</span>
        </div>
        <div class="claim-item">
          <span class="claim-key">aud</span>
          <span class="claim-desc">${i18n.t('jwt.audience')}</span>
        </div>
        <div class="claim-item">
          <span class="claim-key">exp</span>
          <span class="claim-desc">${i18n.t('jwt.expiration')}</span>
        </div>
        <div class="claim-item">
          <span class="claim-key">nbf</span>
          <span class="claim-desc">${i18n.t('jwt.notBeforeTime')}</span>
        </div>
        <div class="claim-item">
          <span class="claim-key">iat</span>
          <span class="claim-desc">${i18n.t('jwt.issuedAtTime')}</span>
        </div>
        <div class="claim-item">
          <span class="claim-key">jti</span>
          <span class="claim-desc">${i18n.t('jwt.jwtId')}</span>
        </div>
      </div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-title">${i18n.t('jwt.algorithms')}</div>
      <div class="alg-list">
        <div class="alg-item">
          <span class="alg-name">HS256</span>
          <span class="alg-desc">HMAC SHA-256</span>
        </div>
        <div class="alg-item">
          <span class="alg-name">HS384</span>
          <span class="alg-desc">HMAC SHA-384</span>
        </div>
        <div class="alg-item">
          <span class="alg-name">HS512</span>
          <span class="alg-desc">HMAC SHA-512</span>
        </div>
        <div class="alg-item">
          <span class="alg-name">RS256</span>
          <span class="alg-desc">RSA SHA-256</span>
        </div>
        <div class="alg-item">
          <span class="alg-name">RS384</span>
          <span class="alg-desc">RSA SHA-384</span>
        </div>
        <div class="alg-item">
          <span class="alg-name">RS512</span>
          <span class="alg-desc">RSA SHA-512</span>
        </div>
        <div class="alg-item">
          <span class="alg-name">ES256</span>
          <span class="alg-desc">ECDSA P-256</span>
        </div>
        <div class="alg-item">
          <span class="alg-name">ES384</span>
          <span class="alg-desc">ECDSA P-384</span>
        </div>
        <div class="alg-item">
          <span class="alg-name">ES512</span>
          <span class="alg-desc">ECDSA P-521</span>
        </div>
      </div>
    </div>
  </div>
</div>
`;
