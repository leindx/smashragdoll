// Generador de rostros predeterminados en Canvas / SVG

function createAvatarDataUrl(drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = 250;
  canvas.height = 250;
  const ctx = canvas.getContext('2d');
  
  // Background circle
  ctx.beginPath();
  ctx.arc(125, 125, 120, 0, Math.PI * 2);
  ctx.clip();
  
  drawFn(ctx, 250, 250);
  return canvas.toDataURL('image/png');
}

export const PRESET_FACES = [
  {
    id: 'funado',
    name: 'El Funado',
    avatar: createAvatarDataUrl((ctx, w, h) => {
      // Skin tone
      ctx.fillStyle = '#ffdbac';
      ctx.fillRect(0, 0, w, h);

      // Sweating / Nervous eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(80, 95, 25, 30, 0, 0, Math.PI * 2);
      ctx.ellipse(170, 95, 25, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Pupils looking sideways
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(90, 95, 10, 0, Math.PI * 2);
      ctx.arc(180, 95, 10, 0, Math.PI * 2);
      ctx.fill();

      // Nervous eyebrows
      ctx.beginPath();
      ctx.moveTo(55, 65); ctx.lineTo(100, 75);
      ctx.moveTo(195, 65); ctx.lineTo(150, 75);
      ctx.stroke();

      // Open shocked mouth
      ctx.fillStyle = '#990000';
      ctx.beginPath();
      ctx.ellipse(125, 170, 30, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sweat drops
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(210, 80, 8, 0, Math.PI * 2);
      ctx.arc(45, 90, 6, 0, Math.PI * 2);
      ctx.fill();
    })
  },
  {
    id: 'jefe',
    name: 'Jefe Gruñón',
    avatar: createAvatarDataUrl((ctx, w, h) => {
      // Red angry skin
      ctx.fillStyle = '#f87171';
      ctx.fillRect(0, 0, w, h);

      // Angry Eyebrows V shape
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(40, 70); ctx.lineTo(110, 100);
      ctx.moveTo(210, 70); ctx.lineTo(140, 100);
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(85, 110, 18, 0, Math.PI * 2);
      ctx.arc(165, 110, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(90, 110, 7, 0, Math.PI * 2);
      ctx.arc(160, 110, 7, 0, Math.PI * 2);
      ctx.fill();

      // Mustache
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(125, 155, 60, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Screaming mouth
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.rect(80, 175, 90, 35);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.stroke();
    })
  },
  {
    id: 'troll',
    name: 'Troll Face',
    avatar: createAvatarDataUrl((ctx, w, h) => {
      // Pale white
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, w, h);

      // Smirking wide smile
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(125, 120, 80, 0.1, Math.PI - 0.1);
      ctx.stroke();

      // Wrinkly eyes
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(80, 85, 12, 0, Math.PI * 2);
      ctx.arc(170, 85, 12, 0, Math.PI * 2);
      ctx.fill();

      // Mischievous eyebrows
      ctx.beginPath();
      ctx.moveTo(60, 60); ctx.lineTo(100, 70);
      ctx.moveTo(190, 60); ctx.lineTo(150, 70);
      ctx.stroke();
    })
  },
  {
    id: 'toxic',
    name: 'Ex Toxic@',
    avatar: createAvatarDataUrl((ctx, w, h) => {
      // Purple toxic shade
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(0, 0, w, h);

      // Dramatic eye makeup / eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(80, 95, 22, 0, Math.PI * 2);
      ctx.arc(170, 95, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(80, 95, 12, 0, Math.PI * 2);
      ctx.arc(170, 95, 12, 0, Math.PI * 2);
      ctx.fill();

      // Disdain mouth
      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(70, 160); ctx.quadraticCurveTo(125, 140, 180, 160);
      ctx.stroke();
    })
  }
];
