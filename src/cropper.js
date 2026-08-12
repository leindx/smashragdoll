import { PRESET_FACES } from './presets.js';

export class FaceCropper {
  constructor(onFaceApplied) {
    this.onFaceApplied = onFaceApplied;
    this.sourceImg = null;

    // Crop parameters
    this.scale = 1.0;
    this.rotation = 0; // degrees
    this.brightness = 100; // %
    this.offsetX = 0;
    this.offsetY = 0;
    this.keepTransparency = true;

    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    this.initDOM();
    this.initPresets();
  }

  initDOM() {
    this.modal = document.getElementById('cropper-modal');
    this.btnClose = document.getElementById('btn-close-modal');
    this.btnOpen = document.getElementById('btn-open-cropper');
    this.btnApply = document.getElementById('btn-apply-face');

    this.presetsGrid = document.getElementById('presets-grid');
    this.fileInput = document.getElementById('image-input');
    this.urlInput = document.getElementById('image-url-input');
    this.btnLoadUrl = document.getElementById('btn-load-url');
    this.pngCheckbox = document.getElementById('png-transparency-checkbox');
    this.cropRing = document.getElementById('crop-ring-overlay');

    this.uploadBox = document.getElementById('upload-box');
    this.cropEditor = document.getElementById('crop-editor-container');

    this.cropCanvas = document.getElementById('crop-canvas');
    this.cropCtx = this.cropCanvas.getContext('2d');
    this.cropCanvas.width = 200;
    this.cropCanvas.height = 200;

    // Sliders
    this.zoomSlider = document.getElementById('zoom-slider');
    this.rotateSlider = document.getElementById('rotate-slider');
    this.brightSlider = document.getElementById('bright-slider');

    // Events
    this.btnOpen.addEventListener('click', () => this.showModal());
    this.btnClose.addEventListener('click', () => this.hideModal());
    
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    
    this.btnLoadUrl.addEventListener('click', () => this.loadFromUrl());
    this.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.loadFromUrl();
    });

    this.pngCheckbox.addEventListener('change', (e) => {
      this.keepTransparency = e.target.checked;
      if (this.keepTransparency) {
        this.cropRing.classList.add('hidden');
      } else {
        this.cropRing.classList.remove('hidden');
      }
      this.draw();
    });

    this.zoomSlider.addEventListener('input', (e) => {
      this.scale = parseFloat(e.target.value);
      this.draw();
    });

    this.rotateSlider.addEventListener('input', (e) => {
      this.rotation = parseInt(e.target.value, 10);
      this.draw();
    });

    this.brightSlider.addEventListener('input', (e) => {
      this.brightness = parseInt(e.target.value, 10);
      this.draw();
    });

    // Drag canvas image
    this.cropCanvas.addEventListener('mousedown', (e) => this.startDrag(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => this.doDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => this.endDrag());

    this.cropCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    });
    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        this.doDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    });
    window.addEventListener('touchend', () => this.endDrag());

    this.btnApply.addEventListener('click', () => this.applyFace());
  }

  initPresets() {
    this.presetsGrid.innerHTML = '';
    PRESET_FACES.forEach(preset => {
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.innerHTML = `
        <img src="${preset.avatar}" class="preset-avatar" alt="${preset.name}">
        <span class="preset-name">${preset.name}</span>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.loadPreset(preset.avatar);
      });

      this.presetsGrid.appendChild(card);
    });

    if (PRESET_FACES.length > 0) {
      this.loadPreset(PRESET_FACES[0].avatar);
    }
  }

  loadPreset(dataUrl) {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      this.sourceImg = img;
      this.resetTransform();
      this.cropEditor.classList.remove('hidden');
      this.draw();
    };
  }

  loadFromUrl() {
    const url = this.urlInput.value.trim();
    if (!url) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;

    img.onload = () => {
      this.sourceImg = img;
      this.resetTransform();
      this.cropEditor.classList.remove('hidden');
      this.draw();
    };

    img.onerror = () => {
      alert('No se pudo cargar la imagen desde esa URL. Intenta con un enlace directo a una imagen (PNG o JPG).');
    };
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.src = evt.target.result;
      img.onload = () => {
        this.sourceImg = img;
        this.resetTransform();
        this.cropEditor.classList.remove('hidden');
        this.draw();
      };
    };
    reader.readAsDataURL(file);
  }

  resetTransform() {
    this.scale = 1.0;
    this.rotation = 0;
    this.brightness = 100;
    this.offsetX = 0;
    this.offsetY = 0;

    this.zoomSlider.value = 1;
    this.rotateSlider.value = 0;
    this.brightSlider.value = 100;
  }

  startDrag(x, y) {
    if (!this.sourceImg) return;
    this.isDragging = true;
    this.dragStart = { x: x - this.offsetX, y: y - this.offsetY };
  }

  doDrag(x, y) {
    if (!this.isDragging) return;
    this.offsetX = x - this.dragStart.x;
    this.offsetY = y - this.dragStart.y;
    this.draw();
  }

  endDrag() {
    this.isDragging = false;
  }

  draw() {
    if (!this.sourceImg) return;

    const ctx = this.cropCtx;
    const w = this.cropCanvas.width;
    const h = this.cropCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    ctx.translate(w / 2 + this.offsetX, h / 2 + this.offsetY);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(this.scale, this.scale);

    ctx.filter = `brightness(${this.brightness}%)`;

    const iw = this.sourceImg.width;
    const ih = this.sourceImg.height;
    ctx.drawImage(this.sourceImg, -iw / 2, -ih / 2);

    ctx.restore();
  }

  applyFace() {
    if (!this.sourceImg) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = 300;
    outCanvas.height = 300;
    const outCtx = outCanvas.getContext('2d');

    if (!this.keepTransparency) {
      outCtx.beginPath();
      outCtx.arc(150, 150, 140, 0, Math.PI * 2);
      outCtx.clip();
    }

    outCtx.save();
    outCtx.translate(150 + this.offsetX * (300 / 200), 150 + this.offsetY * (300 / 200));
    outCtx.rotate((this.rotation * Math.PI) / 180);
    outCtx.scale(this.scale * (300 / 200), this.scale * (300 / 200));
    outCtx.filter = `brightness(${this.brightness}%)`;

    const iw = this.sourceImg.width;
    const ih = this.sourceImg.height;
    outCtx.drawImage(this.sourceImg, -iw / 2, -ih / 2);
    outCtx.restore();

    if (!this.keepTransparency) {
      outCtx.strokeStyle = '#8b5cf6';
      outCtx.lineWidth = 6;
      outCtx.stroke();
    }

    const dataUrl = outCanvas.toDataURL('image/png');
    this.onFaceApplied(dataUrl, this.keepTransparency);
    this.hideModal();
  }

  showModal() {
    this.modal.classList.remove('hidden');
    this.draw();
  }

  hideModal() {
    this.modal.classList.add('hidden');
  }
}
