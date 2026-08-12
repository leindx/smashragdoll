import { Ragdoll } from './ragdoll.js';
import { WeaponSystem } from './weapons.js';
import { FaceCropper } from './cropper.js';
import { PRESET_FACES } from './presets.js';
import { audio } from './audio.js';
import { haptics } from './haptics.js';

const Matter = window.Matter;
const confetti = window.confetti;
const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Query } = Matter;

class Game {
  constructor() {
    this.canvas = document.getElementById('ragdoll-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.hitCount = 0;
    this.comboCount = 0;
    this.comboTimer = null;
    this.lastAnnouncedTier = '';

    // Altitude System
    this.altitude = 0; // meters
    this.altitudeVelocity = 0; // m/s speed
    this.isFreefalling = false;
    this.freefallStartAltitude = 0;
    this.clouds = [];
    this.initClouds();

    // Pointer Tracking
    this.isMouseDown = false;
    this.dragStartPos = null;
    this.currentPointerPos = { x: 0, y: 0 };
    this.lastPointerPos = { x: 0, y: 0 };
    this.releaseVel = { x: 0, y: 0 };
    this.autoFireInterval = null;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.initPhysics();
    this.initRagdoll();
    this.initWeapons();
    this.initCropper();
    this.initEvents();

    this.loop();
  }

  initClouds() {
    this.clouds = [];
    for (let i = 0; i < 18; i++) {
      this.clouds.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        scale: Math.random() * 0.8 + 0.5,
        opacity: Math.random() * 0.35 + 0.15
      });
    }
  }

  initPhysics() {
    this.engine = Engine.create({
      gravity: { x: 0, y: 0.55 },
      enableSleeping: false // NEVER freeze bodies
    });

    this.boundaries = [];
    this.createBoundaries();
  }

  // GROUND FLOOR AT FEET LEVEL
  createBoundaries() {
    if (this.boundaries.length > 0) {
      Composite.remove(this.engine.world, this.boundaries);
    }

    const w = this.canvas.width || window.innerWidth;
    const h = this.canvas.height || window.innerHeight;
    const cy = h / 2 - 30;
    
    // Feet level ground floor top surface at cy + 215px
    this.defaultGroundY = Math.min(h - 70, cy + 215);

    const wallThick = 200;

    // Bouncy Low-Friction Ground Floor
    const ground = Bodies.rectangle(w / 2, this.defaultGroundY + wallThick / 2, w * 3, wallThick, {
      isStatic: true,
      restitution: 0.85,
      friction: 0.05,
      label: 'Ground'
    });

    const ceiling = Bodies.rectangle(w / 2, -wallThick / 2 + 10, w * 3, wallThick, { isStatic: true, label: 'Wall' });
    const leftWall = Bodies.rectangle(-wallThick / 2 + 10, h / 2, wallThick, h * 3, { isStatic: true, label: 'Wall' });
    const rightWall = Bodies.rectangle(w + wallThick / 2 - 10, h / 2, wallThick, h * 3, { isStatic: true, label: 'Wall' });

    this.boundaries = [ground, ceiling, leftWall, rightWall];
    Composite.add(this.engine.world, this.boundaries);
  }

  initRagdoll() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2 - 30;
    this.ragdoll = new Ragdoll(cx, cy, 1.4);

    // Automatically load default preset face avatar on startup!
    if (PRESET_FACES && PRESET_FACES.length > 0) {
      this.ragdoll.setFaceImage(PRESET_FACES[0].avatar, true);
    }

    Composite.add(this.engine.world, this.ragdoll.composite);
  }

  initWeapons() {
    this.weapons = new WeaponSystem(this.engine, this.ragdoll, (expX, expY) => {
      this.registerHit(expX, expY, 'KABOOM!');
    });

    this.mouse = Mouse.create(this.canvas);
    this.mouseConstraint = MouseConstraint.create(this.engine, {
      mouse: this.mouse,
      constraint: {
        stiffness: 0.25,
        damping: 0.15,
        render: { visible: false }
      }
    });

    Composite.add(this.engine.world, this.mouseConstraint);
    this.hitTexts = [];
  }

  initCropper() {
    this.cropper = new FaceCropper((faceDataUrl, isPngCutout) => {
      this.ragdoll.setFaceImage(faceDataUrl, isPngCutout);
      if (confetti) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.3 } });
      }
    });
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    const toolBtns = document.querySelectorAll('.tool-btn[data-weapon]');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        audio.init();
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const weapon = btn.getAttribute('data-weapon');
        this.weapons.setWeapon(weapon);
        this.stopContinuousFire();
      });
    });

    document.getElementById('btn-clear-canvas').addEventListener('click', () => {
      this.weapons.clearSplatsAndBalloons();
    });

    document.getElementById('btn-sound-toggle').addEventListener('click', () => {
      const enabled = audio.toggleSound();
      document.getElementById('sound-icon').textContent = enabled ? '🔊' : '🔇';
    });

    document.getElementById('btn-reset-ragdoll').addEventListener('click', () => {
      this.altitude = 0;
      this.altitudeVelocity = 0;
      this.isFreefalling = false;
      this.ragdoll.resetPosition(window.innerWidth / 2, window.innerHeight / 2 - 30);
    });

    // MOUSE EVENTS
    this.canvas.addEventListener('mousedown', (e) => {
      audio.init();
      this.isMouseDown = true;
      this.dragStartPos = { x: e.clientX, y: e.clientY };
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
      this.currentPointerPos = { x: e.clientX, y: e.clientY };
      this.releaseVel = { x: 0, y: 0 };

      if (this.weapons.currentWeapon !== 'grab') {
        this.triggerWeaponAction(e.clientX, e.clientY);
        this.startContinuousFire();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        this.releaseVel = {
          x: e.clientX - this.lastPointerPos.x,
          y: e.clientY - this.lastPointerPos.y
        };
        this.lastPointerPos = { x: e.clientX, y: e.clientY };
        this.currentPointerPos = { x: e.clientX, y: e.clientY };

        if (this.weapons.currentWeapon !== 'grab') {
          this.ragdoll.duckAndCover(e.clientX, e.clientY);
        }
      }
    });

    const releasePointer = (x, y) => {
      if (this.isMouseDown && this.weapons.currentWeapon === 'grab') {
        this.triggerWeaponAction(x, y);
      }
      this.isMouseDown = false;
      this.dragStartPos = null;
      this.mouseConstraint.constraint.bodyB = null;
      this.stopContinuousFire();
    };

    window.addEventListener('mouseup', (e) => releasePointer(e.clientX, e.clientY));
    window.addEventListener('mouseleave', (e) => releasePointer(e.clientX, e.clientY));

    // TOUCH EVENTS
    this.canvas.addEventListener('touchstart', (e) => {
      audio.init();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.isMouseDown = true;
        this.dragStartPos = { x: touch.clientX, y: touch.clientY };
        this.lastPointerPos = { x: touch.clientX, y: touch.clientY };
        this.currentPointerPos = { x: touch.clientX, y: touch.clientY };
        this.releaseVel = { x: 0, y: 0 };

        if (this.weapons.currentWeapon !== 'grab') {
          this.triggerWeaponAction(touch.clientX, touch.clientY);
          this.startContinuousFire();
        }
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (this.isMouseDown && e.touches.length === 1) {
        const touch = e.touches[0];
        this.releaseVel = {
          x: touch.clientX - this.lastPointerPos.x,
          y: touch.clientY - this.lastPointerPos.y
        };
        this.lastPointerPos = { x: touch.clientX, y: touch.clientY };
        this.currentPointerPos = { x: touch.clientX, y: touch.clientY };

        if (this.weapons.currentWeapon !== 'grab') {
          this.ragdoll.duckAndCover(touch.clientX, touch.clientY);
        }
      }
    });

    window.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0] || this.currentPointerPos;
      releasePointer(touch.clientX, touch.clientY);
    });
  }

  startContinuousFire() {
    this.stopContinuousFire();
    
    if (this.weapons.currentWeapon === 'machinegun' || this.weapons.currentWeapon === 'zap') {
      const fireRateMs = this.weapons.currentWeapon === 'machinegun' ? 65 : 100;
      this.autoFireInterval = setInterval(() => {
        if (this.isMouseDown) {
          this.triggerWeaponAction(this.currentPointerPos.x, this.currentPointerPos.y);
        }
      }, fireRateMs);
    }
  }

  stopContinuousFire() {
    if (this.autoFireInterval) {
      clearInterval(this.autoFireInterval);
      this.autoFireInterval = null;
    }
  }

  triggerWeaponAction(x, y) {
    if (this.weapons.currentWeapon === 'machinegun' || this.weapons.currentWeapon === 'grab') {
      this.mouseConstraint.constraint.bodyB = null;
    }

    const bodies = Composite.allBodies(this.ragdoll.composite);
    const clickedBodies = Query.point(bodies, { x, y });
    const targetBody = clickedBodies.length > 0 ? clickedBodies[0] : null;

    const didHit = this.weapons.useWeapon(x, y, targetBody, this.dragStartPos, this.releaseVel);

    if (didHit) {
      const labels = ['SLAP!', 'POW!', 'ZAP!', 'RAT-TAT!', 'THROW!', 'HIT!'];
      const text = labels[Math.floor(Math.random() * labels.length)];
      this.registerHit(x, y, text);
    }
  }

  registerHit(x, y, text) {
    this.hitCount++;
    this.comboCount++;
    
    audio.playComboHitNote(this.comboCount);

    this.updateCounters(true);

    this.hitTexts.push({
      x, y, text,
      life: 1, maxLife: 30,
      color: this.comboCount > 10 ? '#ef4444' : '#38bdf8'
    });

    clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => {
      this.comboCount = 0;
      this.lastAnnouncedTier = '';
      this.updateCounters();
    }, 1800);
  }

  getComboTitle(combo) {
    if (combo < 2) return null;

    const baseTiers = {
      2: 'DOUBLE SLAP! ✋',
      3: 'TRIPLE STRIKE! 🥊',
      4: 'QUAD PUNISHER! 💥',
      5: 'PENTA IMPACT! ⚡',
      6: 'HYPER BLITZ! 🚀',
      7: 'SUPER SLAM! 🥊',
      8: 'BRUTAL BEATING! 🥊',
      9: 'SAVAGE CRUSH! 💥',
      10: 'MONSTER COMBO! 👺',
      12: 'HEAVY DAMAGE! 💥',
      14: 'KING OF PAIN! ⚡',
      16: 'DESTRUCTION RAMPAGE! ⚡',
      18: 'UNSTOPPABLE CARNAGE! 👑',
      20: 'AWESOME DOMINATION! 👑',
      25: 'EXTREME DESTRUCTION! 💣',
      30: 'ULTRA COMBO!! 🔥⚡',
      40: 'GODLIKE ANNIHILATION!! ⚡',
      50: 'LUDICROUS OVERKILL!! 💥',
      60: 'MEGA RAGE SMASH!! 🌋',
      75: 'HOLY SHIT COMBO!! 🚀⚡',
      90: 'TITANIC DEMOLITION!! ☄️'
    };

    if (combo < 100) {
      const keys = Object.keys(baseTiers).map(Number).sort((a,b) => b-a);
      for (let k of keys) {
        if (combo >= k) return baseTiers[k];
      }
    }

    const hundredIndex = Math.floor(combo / 100);

    const prefixes = [
      'OBLITERATING', 'TITANIC', 'APOCALYPTIC', 'COSMIC', 'DIMENSIONAL',
      'OMNIPOTENT', 'SUPREME', 'MULTIVERSAL', 'SINGULARITY', 'TRANSCENDENT',
      'ETERNAL', 'INFINITE', 'BOUNDLESS', 'GODLIKE', 'ABSOLUTE',
      'DIVINE', 'CHRONO', 'HYPERION', 'NEBULA', 'SUPERNOVA'
    ];

    const nouns = [
      'DESTROYER', 'GOD OF WAR', 'ANNIHILATOR', 'DEMOLITION EMPEROR', 'CARNAGE OVERLORD',
      'REALM CRUSHER', 'VOID SOVEREIGN', 'GALAXY ERASER', 'UNIVERSE SHATTERER', 'EXISTENCE ERASER',
      'TIME WEAVER', 'REALITY SHAPER', 'COSMIC DEITY', 'CHAOS KING', 'INFINITY EMPEROR'
    ];

    const emojis = ['⚡', '💥', '🔥', '👑', '🌌', '🚀', '🌋', '☄️', '🪐', '⌛', '💫'];

    const prefix = prefixes[(hundredIndex - 1) % prefixes.length];
    const noun = nouns[(hundredIndex - 1) % nouns.length];
    const emoji = emojis[(hundredIndex - 1) % emojis.length];

    return `${prefix} ${noun}!! ${emoji} (${hundredIndex * 100}+ HITS)`;
  }

  updateCounters(isNewHit = false) {
    document.getElementById('hit-count').textContent = this.hitCount;
    document.getElementById('combo-stat-value').textContent = `${this.comboCount}x`;
    
    document.getElementById('altitude-value').textContent = `${Math.max(0, Math.floor(this.altitude))} m`;

    const announcer = document.getElementById('combo-announcer');
    const comboTitleEl = document.getElementById('combo-title');
    const comboSubEl = document.getElementById('combo-subtitle');
    const rageOverlay = document.getElementById('rage-overlay');

    const titleText = this.getComboTitle(this.comboCount);

    if (this.comboCount >= 2 && titleText) {
      announcer.classList.remove('hidden');
      comboTitleEl.textContent = titleText;
      comboSubEl.textContent = `${this.comboCount} HITS!`;

      if (isNewHit) {
        announcer.style.animation = 'none';
        announcer.offsetHeight;
        announcer.style.animation = 'pop-bounce 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      }

      if (titleText !== this.lastAnnouncedTier) {
        this.lastAnnouncedTier = titleText;
        if (this.comboCount >= 20 && confetti) {
          confetti({ particleCount: 30, spread: 70, origin: { y: 0.25 } });
        }
      }
    } else {
      announcer.classList.add('hidden');
    }

    if (this.comboCount >= 15) {
      rageOverlay.classList.remove('hidden');
      rageOverlay.textContent = `🔥 RAGE MODE - ${this.comboCount} HITS 🔥`;
    } else {
      rageOverlay.classList.add('hidden');
    }
  }

  updateAltitudePhysics() {
    const balloonCount = this.weapons.balloons.length;

    if (balloonCount > 0) {
      this.isFreefalling = false;
      this.freefallStartAltitude = 0;
      
      const targetSpeed = Math.pow(balloonCount, 1.2) * 1.8;
      this.altitudeVelocity += (targetSpeed - this.altitudeVelocity) * 0.05;
      this.altitude += this.altitudeVelocity * 0.06;

      const liftForce = -0.003 * balloonCount * this.ragdoll.torso.mass;
      Body.applyForce(this.ragdoll.torso, this.ragdoll.torso.position, { x: 0, y: liftForce });

    } else if (this.altitude > 0) {
      if (!this.isFreefalling) {
        this.isFreefalling = true;
        this.freefallStartAltitude = this.altitude;
        this.ragdoll.startFreefallPlunge(this.altitude);
      }

      Body.setAngularVelocity(this.ragdoll.head, (Math.random() - 0.5) * 2.2);
      Body.setAngularVelocity(this.ragdoll.torso, (Math.random() - 0.5) * 1.8);

      const dropMult = this.freefallStartAltitude >= 100 ? 1.6 : 0.8;
      this.altitudeVelocity -= dropMult;
      this.altitude = Math.max(0, this.altitude + this.altitudeVelocity * 0.06);

      if (this.altitude <= 0) {
        this.altitude = 0;
        this.altitudeVelocity = 0;
        this.isFreefalling = false;

        audio.playCrash();
        haptics.heavy();

        const crashTypes = ['FACE PLANT CRASH!', 'BACK SLAM IMPACT!', 'HEAD CRASH!', 'BODY EXPLOSION!'];
        const crashText = crashTypes[Math.floor(Math.random() * crashTypes.length)];

        for (let i = 0; i < 10; i++) {
          this.registerHit(
            this.ragdoll.torso.position.x + (Math.random() - 0.5) * 40,
            this.defaultGroundY - 20,
            crashText
          );
        }

        const bounceUp = -48 - Math.random() * 15;
        const launchSide = (Math.random() > 0.5 ? 1 : -1) * (35 + Math.random() * 25);

        Body.setVelocity(this.ragdoll.torso, {
          x: launchSide,
          y: bounceUp
        });

        Body.setVelocity(this.ragdoll.head, {
          x: launchSide * 1.1,
          y: bounceUp * 1.05
        });

        Body.setAngularVelocity(this.ragdoll.torso, (Math.random() - 0.5) * 4.0);
        Body.setAngularVelocity(this.ragdoll.head, (Math.random() - 0.5) * 4.5);

        this.weapons.spawnStars(
          this.ragdoll.torso.position.x,
          this.defaultGroundY - 20,
          60
        );

        setTimeout(() => {
          this.ragdoll.recoverToFloatingPosture();
        }, 1600);
      }
    } else {
      this.isFreefalling = false;
      this.altitude = 0;
      this.altitudeVelocity = 0;
    }

    this.updateCounters();

    const freefallBanner = document.getElementById('freefall-banner');
    if (this.isFreefalling && this.altitude > 20) {
      freefallBanner.classList.remove('hidden');
    } else {
      freefallBanner.classList.add('hidden');
    }
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.createBoundaries();
    if (this.ragdoll) {
      this.ragdoll.updateAnchorPosition(window.innerWidth / 2, window.innerHeight / 2 - 30);
    }
  }

  loop() {
    try {
      Engine.update(this.engine, 1000 / 60);

      const w = this.canvas.width;
      const h = this.canvas.height;

      this.updateAltitudePhysics();

      if (this.ragdoll) {
        this.ragdoll.dampMotion();

        const allRagdollBodies = Composite.allBodies(this.ragdoll.composite);
        allRagdollBodies.forEach(b => {
          if (b) {
            b.isSleeping = false;

            const speed = Math.sqrt((b.velocity.x || 0) * (b.velocity.x || 0) + (b.velocity.y || 0) * (b.velocity.y || 0));

            if (speed > 16 && (b.position.x <= 45 || b.position.x >= w - 45 || b.position.y <= 45 || b.position.y >= this.defaultGroundY - 10)) {
              audio.playCrash();
              haptics.heavy();
              this.weapons.spawnStars(b.position.x, b.position.y, 10);
            }

            if (b.position.x < 40) Body.setPosition(b, { x: 40, y: b.position.y });
            if (b.position.x > w - 40) Body.setPosition(b, { x: w - 40, y: b.position.y });
            if (b.position.y < 40) Body.setPosition(b, { x: b.position.x, y: 40 });
          }
        });
      }

      this.weapons.updateBalloons();
      this.weapons.updateParticles();

      this.render();
    } catch (err) {
      console.error('Loop exception guarded:', err);
    }

    requestAnimationFrame(() => this.loop());
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    let bgTop = '#0b0f19';
    let bgBottom = '#1e1b4b';

    if (this.altitude > 800) {
      bgTop = '#030712'; bgBottom = '#111827';
    } else if (this.altitude > 300) {
      bgTop = '#1e1b4b'; bgBottom = '#312e81';
    } else if (this.altitude > 50) {
      bgTop = '#0f172a'; bgBottom = '#1e293b';
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, bgTop);
    grad.addColorStop(1, bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // PARALLAX CLOUDS
    this.clouds.forEach(c => {
      if (Math.abs(this.altitudeVelocity) > 0.05) {
        c.y += this.altitudeVelocity * 0.4;
        if (c.y > h + 50) {
          c.y = -50;
          c.x = Math.random() * w;
        }
        if (c.y < -60) {
          c.y = h + 50;
          c.x = Math.random() * w;
        }
      }

      ctx.save();
      ctx.globalAlpha = c.opacity;
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.floor(40 * c.scale)}px sans-serif`;
      ctx.fillText('☁️', c.x, c.y);
      ctx.restore();
    });

    // SOLID PHYSICAL GROUND FLOOR AT FEET LEVEL (defaultGroundY)
    if (this.altitude < 120) {
      const groundOffset = (this.altitude / 120) * (h - this.defaultGroundY + 100);
      const groundY = this.defaultGroundY + groundOffset;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, groundY, w, h - groundY + 100);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(w, groundY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, groundY, w, 5);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    // RENDER FREEFALL SPEED LINES DURING VIOLENT DROP
    if (this.isFreefalling) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 16; i++) {
        const lineX = (i * (w / 16)) + Math.random() * 20;
        const lineY = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(lineX, lineY);
        ctx.lineTo(lineX, lineY - 80);
        ctx.stroke();
      }
    }

    // RENDER GRAB & THROW AIMING SLINGSHOT VECTOR LINE
    if (this.isMouseDown && this.weapons.currentWeapon === 'grab' && this.dragStartPos) {
      const dx = this.currentPointerPos.x - this.dragStartPos.x;
      const dy = this.currentPointerPos.y - this.dragStartPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 15) {
        ctx.strokeStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.dragStartPos.x, this.dragStartPos.y);
        ctx.lineTo(this.currentPointerPos.x, this.currentPointerPos.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(this.currentPointerPos.x, this.currentPointerPos.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bullet Tracers (Machine Gun)
    this.weapons.bulletTracers.forEach(t => {
      ctx.strokeStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t.startX, t.startY);
      ctx.lineTo(t.endX, t.endY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Taser Lightning Arcs
    this.weapons.activeZapArcs.forEach(arc => {
      ctx.strokeStyle = Math.random() > 0.5 ? '#38bdf8' : '#e0e7ff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(arc.fromX, arc.fromY);
      
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        const targetX = arc.fromX + (arc.toX - arc.fromX) * (i / steps);
        const targetY = arc.fromY + (arc.toY - arc.fromY) * (i / steps);
        const offsetX = (Math.random() - 0.5) * 25;
        const offsetY = (Math.random() - 0.5) * 25;
        ctx.lineTo(targetX + offsetX, targetY + offsetY);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // RENDER RAGDOLL LIMBS IN WORLD SPACE (100% BUG-FREE & ALWAYS VISIBLE)
    if (this.ragdoll && this.ragdoll.composite) {
      const compositeBodies = Composite.allBodies(this.ragdoll.composite);

      compositeBodies.forEach(b => {
        if (!b || b.label === 'RagdollHead') return;

        const vertices = b.vertices;
        if (vertices && vertices.length > 0) {
          ctx.save();

          const isZapActive = this.weapons.activeZapArcs.length > 0;
          ctx.fillStyle = isZapActive ? '#818cf8' : '#6366f1';
          ctx.strokeStyle = isZapActive ? '#38bdf8' : '#a855f7';
          ctx.lineWidth = isZapActive ? 5 : 3.5;

          ctx.beginPath();
          ctx.moveTo(vertices[0].x, vertices[0].y);
          for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.restore();
        }

        this.renderBodyBumps(b);
      });

      // Head Rendering
      const head = this.ragdoll.head;
      if (head && head.position) {
        ctx.save();
        ctx.translate(head.position.x, head.position.y);
        ctx.rotate(head.angle);

        const r = head.circleRadius || 45;

        if (this.ragdoll.faceImage) {
          if (this.ragdoll.isPngCutout) {
            const imgW = r * 2.5;
            const imgH = r * 2.5;
            ctx.drawImage(this.ragdoll.faceImage, -imgW / 2, -imgH / 2, imgW, imgH);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(this.ragdoll.faceImage, -r, -r, r * 2, r * 2);

            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 5;
            ctx.stroke();
          }
        } else {
          // Fallback face drawing if no custom face image is set
          ctx.fillStyle = '#ffdbac';
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 5;
          ctx.stroke();

          // Cute eyes and mouth
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(-r * 0.35, -r * 0.15, r * 0.14, 0, Math.PI * 2);
          ctx.arc(r * 0.35, -r * 0.15, r * 0.14, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, r * 0.2, r * 0.35, 0, Math.PI);
          ctx.stroke();
        }

        ctx.restore();

        this.renderBodyBumps(head);
      }
    }

    // SAFE RENDERING OF HELIUM BALLOONS
    this.weapons.balloons.forEach(bObj => {
      if (bObj && bObj.balloon && bObj.balloon.position && bObj.rope && bObj.rope.bodyA && bObj.rope.bodyA.position) {
        const { balloon, rope, color } = bObj;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rope.bodyA.position.x, rope.bodyA.position.y);
        ctx.lineTo(balloon.position.x, balloon.position.y);
        ctx.stroke();

        ctx.fillStyle = color || '#ec4899';
        ctx.beginPath();
        ctx.arc(balloon.position.x, balloon.position.y, balloon.circleRadius || 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(balloon.position.x - 8, balloon.position.y - 8, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Particles
    this.weapons.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.type === 'star') {
        ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
      } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
    });

    // Hit Text
    this.hitTexts.forEach(ht => {
      ctx.font = '900 1.6rem Outfit, sans-serif';
      ctx.fillStyle = ht.color;
      ctx.textAlign = 'center';
      ctx.fillText(ht.text, ht.x, ht.y - ht.life * 1.5);
      ht.life++;
    });
    this.hitTexts = this.hitTexts.filter(ht => ht.life < ht.maxLife);
  }

  renderBodyBumps(body) {
    if (!body || !body.position) return;
    const ctx = this.ctx;
    const now = Date.now();
    const bumps = this.weapons.bodyBumps.filter(b => b && b.body === body);

    bumps.forEach(b => {
      const age = now - b.createdAt;
      const alpha = Math.max(0, 1 - age / b.duration);

      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.fillStyle = '#f87171';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      const cos = Math.cos(body.angle);
      const sin = Math.sin(body.angle);
      const worldX = body.position.x + (b.localX * cos - b.localY * sin);
      const worldY = body.position.y + (b.localX * sin + b.localY * cos);

      ctx.beginPath();
      ctx.arc(worldX, worldY, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(worldX - 6, worldY); ctx.lineTo(worldX + 6, worldY);
      ctx.moveTo(worldX, worldY - 6); ctx.lineTo(worldX, worldY + 6);
      ctx.stroke();

      ctx.restore();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
