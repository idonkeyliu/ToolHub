export const template = `
<div class="color-wrap">
  <div class="color-container">
    <!-- 主颜色选择区域 -->
    <div class="color-main-section">
      <div class="color-picker-area">
        <div class="color-display" id="colorDisplay">
          <div class="color-preview" id="colorPreview"></div>
          <div class="color-info">
            <div class="color-name" id="colorName">#FF6B35</div>
            <div class="color-desc" id="colorDesc">橙红色</div>
          </div>
        </div>
        <div class="color-controls">
          <div class="color-wheel-container">
            <canvas id="colorWheel" width="280" height="280"></canvas>
            <div class="color-cursor" id="colorCursor"></div>
          </div>
          <div class="brightness-slider-container">
            <input type="range" id="brightnessSlider" min="0" max="100" value="100" class="brightness-slider">
            <div class="slider-label">亮度</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 颜色转换区域 -->
    <div class="color-conversion-section">
      <div class="conversion-tabs">
        <div class="conv-tab active" data-type="hex">HEX</div>
        <div class="conv-tab" data-type="rgb">RGB</div>
        <div class="conv-tab" data-type="hsl">HSL</div>
        <div class="conv-tab" data-type="hsv">HSV</div>
      </div>
      <div class="conversion-inputs">
        <div class="conv-input-group active" data-type="hex">
          <input type="text" id="hexInput" placeholder="#FF6B35" class="color-input">
          <button class="copy-color-btn" data-type="hex">复制</button>
        </div>
        <div class="conv-input-group" data-type="rgb">
          <div class="rgb-inputs">
            <input type="number" id="rgbR" min="0" max="255" placeholder="255" class="rgb-input">
            <input type="number" id="rgbG" min="0" max="255" placeholder="107" class="rgb-input">
            <input type="number" id="rgbB" min="0" max="255" placeholder="53" class="rgb-input">
          </div>
          <button class="copy-color-btn" data-type="rgb">复制</button>
        </div>
        <div class="conv-input-group" data-type="hsl">
          <div class="hsl-inputs">
            <input type="number" id="hslH" min="0" max="360" placeholder="16" class="hsl-input">
            <input type="number" id="hslS" min="0" max="100" placeholder="100" class="hsl-input">
            <input type="number" id="hslL" min="0" max="100" placeholder="60" class="hsl-input">
          </div>
          <button class="copy-color-btn" data-type="hsl">复制</button>
        </div>
        <div class="conv-input-group" data-type="hsv">
          <div class="hsv-inputs">
            <input type="number" id="hsvH" min="0" max="360" placeholder="16" class="hsv-input">
            <input type="number" id="hsvS" min="0" max="100" placeholder="79" class="hsv-input">
            <input type="number" id="hsvV" min="0" max="100" placeholder="100" class="hsv-input">
          </div>
          <button class="copy-color-btn" data-type="hsv">复制</button>
        </div>
      </div>
    </div>
    
    <!-- 调色板区域 -->
    <div class="color-palette-section">
      <div class="palette-header">
        <h3>调色板</h3>
        <div class="palette-actions">
          <button id="addToPalette" class="palette-btn">+ 添加</button>
          <button id="clearPalette" class="palette-btn secondary">清空</button>
        </div>
      </div>
      <div class="color-palette" id="colorPalette"></div>
    </div>
    
    <!-- 预设颜色区域 -->
    <div class="preset-colors-section">
      <h3>常用颜色</h3>
      <div class="preset-grid">
        <div class="preset-color" data-color="#FF6B35" style="background: #FF6B35;" title="橙红色"></div>
        <div class="preset-color" data-color="#8B5CF6" style="background: #8B5CF6;" title="紫色"></div>
        <div class="preset-color" data-color="#00D2D3" style="background: #00D2D3;" title="青色"></div>
        <div class="preset-color" data-color="#22C55E" style="background: #22C55E;" title="绿色"></div>
        <div class="preset-color" data-color="#EF4444" style="background: #EF4444;" title="红色"></div>
        <div class="preset-color" data-color="#3B82F6" style="background: #3B82F6;" title="蓝色"></div>
        <div class="preset-color" data-color="#F59E0B" style="background: #F59E0B;" title="黄色"></div>
        <div class="preset-color" data-color="#EC4899" style="background: #EC4899;" title="粉色"></div>
        <div class="preset-color" data-color="#10B981" style="background: #10B981;" title="翠绿色"></div>
        <div class="preset-color" data-color="#F97316" style="background: #F97316;" title="橙色"></div>
        <div class="preset-color" data-color="#6366F1" style="background: #6366F1;" title="靛蓝色"></div>
        <div class="preset-color" data-color="#84CC16" style="background: #84CC16;" title="柠檬绿"></div>
      </div>
    </div>
  </div>
</div>
`;
