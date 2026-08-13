import { audio } from './audio.js';
import { haptics } from './haptics.js';

export class WeaponSystem {
  constructor(engine, ragdoll, onGrenadeHit) {
    this.engine = engine;
    this.ragdoll = ragdoll;
    this.onGrenadeHit = onGrenadeHit;
    this.currentWeapon = 'slap';
    this.bodyBumps = [];
    this.balloons = [];
    this.particles = [];
    this.activeZapArcs = [];
    this.bulletTracers = [];
  }

  setWeapon(weaponType) {
    this.currentWeapon = weaponType;
  }

  useWeapon(clickX, clickY, targetBody, dragStart, releaseVel) {
    const poppedBalloon = this.checkBalloonPop(clickX, clickY, 60);

    if (this.currentWeapon !== 'grab') {
      this.ragdoll.duckAndCover(clickX, clickY);
    }

    let didHit = false;

    switch (this.currentWeapon) {
      case 'slap':
        didHit = this.doSlap(clickX, clickY, targetBody);
        break;
      case 'grab':
        didHit = this.doGrabThrow(clickX, clickY, targetBody, dragStart, releaseVel);
        break;
      case 'glove':
        didHit = this.doGlovePunch(clickX, clickY, targetBody);
        break;
      case 'machinegun':
        didHit = this.fireMachineGun(clickX, clickY, targetBody);
        break;
      case 'grenade':
        this.throwGrenade(clickX, clickY);
        didHit = false;
        break;
      case 'zap':
        didHit = this.doZap(clickX, clickY, targetBody);
        break;
      case 'balloon':
        this.attachBalloon(clickX, clickY, targetBody);
        didHit = true;
        break;
    }

    return didHit || poppedBalloon;
  }

  doGrabThrow(currentX, currentY, body, dragStart, releaseVel) {
    const { Body, Composite } = window.Matter;
    const target = body || this.findBodyNearPoint(currentX, currentY, 90) || this.ragdoll.torso;
    if (!target) return false;

    let vx = 0;
    let vy = 0;

    if (releaseVel && (Math.abs(releaseVel.x) > 2 || Math.abs(releaseVel.y) > 2)) {
      vx = releaseVel.x * 2.2;
      vy = releaseVel.y * 2.2;
    } else if (dragStart) {
      vx = (currentX - dragStart.x) * 0.35;
      vy = (currentY - dragStart.y) * 0.35;
    }

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 3) return false;

    audio.playWhoosh();
    haptics.medium();

    Body.setVelocity(target, { x: vx, y: vy });

    const ragdollBodies = Composite.allBodies(this.ragdoll.composite);
    ragdollBodies.forEach(b => {
      if (b) {
        Body.applyForce(b, b.position, {
          x: (vx * 0.012) * b.mass,
          y: (vy * 0.012) * b.mass
        });
        Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.6);
      }
    });

    this.spawnStars(currentX, currentY, 15);
    return true;
  }

  checkBalloonPop(x, y, radius = 60) {
    const { Composite } = window.Matter;
    let popped = false;
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const bObj = this.balloons[i];
      if (!bObj || !bObj.balloon || !bObj.balloon.position) continue;

      const { balloon, rope, color } = bObj;
      const dx = balloon.position.x - x;
      const dy = balloon.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius + (balloon.circleRadius || 30)) {
        audio.playPop();
        haptics.light();
        popped = true;

        for (let j = 0; j < 12; j++) {
          const pAngle = Math.random() * Math.PI * 2;
          const pSpeed = Math.random() * 10 + 3;
          this.particles.push({
            x: balloon.position.x,
            y: balloon.position.y,
            vx: Math.cos(pAngle) * pSpeed,
            vy: Math.sin(pAngle) * pSpeed,
            life: 1,
            maxLife: 20,
            color: color,
            size: Math.random() * 6 + 3,
            type: 'pop'
          });
        }

        try {
          if (balloon) Composite.remove(this.engine.world, balloon);
          if (rope) Composite.remove(this.engine.world, rope);
        } catch(e) {}

        this.balloons.splice(i, 1);
      }
    }
    return popped;
  }

  doSlap(x, y, body) {
    const { Body } = window.Matter;
    const target = body || this.findBodyNearPoint(x, y, 60);
    if (!target) return false;

    audio.playSlap();
    haptics.light();

    const forceMagnitude = 0.15 * target.mass;
    const angle = Math.random() * Math.PI * 2;
    
    Body.applyForce(target, { x, y }, {
      x: Math.cos(angle) * forceMagnitude,
      y: Math.sin(angle) * forceMagnitude - 0.04
    });

    if (Math.random() < 0.4) {
      this.addBodyBump(target, x, y);
    }

    this.spawnStars(x, y, 8);
    return true;
  }

  doGlovePunch(x, y, body) {
    const { Body } = window.Matter;
    const target = body || this.findBodyNearPoint(x, y, 70);
    if (!target) return false;

    audio.playPunch();
    haptics.medium();

    const forceMagnitude = 0.35 * target.mass;
    
    Body.applyForce(target, { x, y }, {
      x: (Math.random() - 0.5) * forceMagnitude * 1.5,
      y: -forceMagnitude
    });

    this.addBodyBump(target, x, y);
    this.spawnPunchGloveEffect(x, y);
    this.spawnStars(x, y, 14);
    return true;
  }

  fireMachineGun(targetX, targetY, targetBody) {
    const { Body } = window.Matter;
    const gunX = targetX > window.innerWidth / 2 ? 60 : window.innerWidth - 60;
    const gunY = window.innerHeight - 80;

    this.bulletTracers.push({
      startX: gunX,
      startY: gunY,
      endX: targetX,
      endY: targetY,
      life: 1,
      maxLife: 6
    });

    const hitBody = targetBody || this.findBodyNearPoint(targetX, targetY, 70);

    if (hitBody) {
      audio.playMachineGun();
      haptics.light();

      const angle = Math.atan2(targetY - gunY, targetX - gunX);
      const bulletForce = 0.22 * hitBody.mass;
      
      Body.applyForce(hitBody, { x: targetX, y: targetY }, {
        x: Math.cos(angle) * bulletForce,
        y: Math.sin(angle) * bulletForce
      });

      for (let i = 0; i < 6; i++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = Math.random() * 8 + 2;
        this.particles.push({
          x: targetX,
          y: targetY,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          life: 1,
          maxLife: 15,
          color: '#f59e0b',
          size: Math.random() * 4 + 2,
          type: 'spark'
        });
      }

      if (Math.random() < 0.3) {
        this.addBodyBump(hitBody, targetX, targetY);
      }
      return true;
    }

    audio.playMachineGun();
    return false;
  }

  findBodyNearPoint(x, y, maxDist = 70) {
    const { Composite } = window.Matter;
    const bodies = Composite.allBodies(this.ragdoll.composite);
    let minDist = Infinity;
    let closest = null;
    bodies.forEach(b => {
      if (b && b.position) {
        const dx = b.position.x - x;
        const dy = b.position.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist < maxDist) {
          minDist = dist;
          closest = b;
        }
      }
    });
    return closest;
  }

  throwGrenade(startX, startY) {
    const { Bodies, Body, Composite } = window.Matter;
    audio.playBoing();

    const targetPos = this.ragdoll.torso.position;
    const angle = Math.atan2(targetPos.y - startY, targetPos.x - startX);
    const speed = 22;

    const grenade = Bodies.circle(startX, startY, 20, {
      restitution: 0.3,
      density: 0.008,
      label: 'GrenadeItem'
    });

    Body.setVelocity(grenade, {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    });

    Composite.add(this.engine.world, grenade);

    setTimeout(() => {
      if (Composite.allBodies(this.engine.world).includes(grenade)) {
        const expX = grenade.position.x;
        const expY = grenade.position.y;

        audio.playExplosion();
        haptics.heavy();

        this.spawnExplosionParticles(expX, expY);
        this.checkBalloonPop(expX, expY, 150);

        const hitBody = this.findBodyNearPoint(expX, expY, 160);

        if (hitBody) {
          const ragdollBodies = Composite.allBodies(this.ragdoll.composite);
          ragdollBodies.forEach(b => {
            if (b && b.position) {
              const dx = b.position.x - expX;
              const dy = b.position.y - expY;
              const dist = Math.max(10, Math.sqrt(dx * dx + dy * dy));
              const blastAngle = Math.atan2(dy, dx);
              
              const blastForce = (500 / dist) * 0.45 * b.mass;
              Body.applyForce(b, b.position, {
                x: Math.cos(blastAngle) * blastForce,
                y: Math.sin(blastAngle) * blastForce - 0.15 * b.mass
              });
            }
          });

          this.addBodyBump(hitBody, expX, expY);

          if (this.onGrenadeHit) {
            this.onGrenadeHit(expX, expY);
          }
        }

        try {
          Composite.remove(this.engine.world, grenade);
        } catch(e) {}
      }
    }, 380);
  }

  addBodyBump(body, worldX, worldY) {
    if (!body || !body.position) return;
    const cos = Math.cos(-body.angle);
    const sin = Math.sin(-body.angle);
    const dx = worldX - body.position.x;
    const dy = worldY - body.position.y;

    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    this.bodyBumps.push({
      body: body,
      localX: localX,
      localY: localY,
      radius: 18 + Math.random() * 8,
      createdAt: Date.now(),
      duration: 10000
    });
  }

  doZap(x, y, body) {
    const { Body } = window.Matter;
    const hitBody = body || this.findBodyNearPoint(x, y, 70);
    if (!hitBody) return false;

    audio.playTaser();
    haptics.heavy();

    this.checkBalloonPop(x, y, 60);

    const limbs = [
      this.ragdoll.head,
      this.ragdoll.torso,
      this.ragdoll.lowerLeftArm,
      this.ragdoll.lowerRightArm,
      this.ragdoll.lowerLeftLeg,
      this.ragdoll.lowerRightLeg
    ];

    limbs.forEach(limb => {
      if (limb && limb.position) {
        Body.applyForce(limb, limb.position, {
          x: (Math.random() - 0.5) * 0.18,
          y: (Math.random() - 0.5) * 0.18
        });
      }
    });

    this.activeZapArcs = [];
    limbs.forEach(limb => {
      if (limb && limb.position) {
        this.activeZapArcs.push({
          fromX: x,
          fromY: y,
          toX: limb.position.x,
          toY: limb.position.y,
          life: 1,
          maxLife: 12
        });
      }
    });

    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1,
        maxLife: 15,
        color: Math.random() > 0.4 ? '#38bdf8' : '#e0e7ff',
        size: Math.random() * 5 + 2,
        type: 'spark'
      });
    }

    return true;
  }

  attachBalloon(x, y, targetBody) {
    const { Bodies, Constraint, Composite } = window.Matter;
    audio.playBoing();
    haptics.light();

    const body = targetBody || this.ragdoll.head;
    if (!body || !body.position) return;

    const balloonRadius = 30;
    const balloonColors = ['#ec4899', '#3b82f6', '#f59e0b', '#10b981', '#a855f7'];
    const color = balloonColors[Math.floor(Math.random() * balloonColors.length)];

    const balloon = Bodies.circle(body.position.x, body.position.y - 150, balloonRadius, {
      density: 0.0001,
      frictionAir: 0.05,
      restitution: 0.9,
      label: 'Balloon'
    });

    const rope = Constraint.create({
      bodyA: body,
      bodyB: balloon,
      length: 130,
      stiffness: 0.8,
      render: { strokeStyle: '#ffffff', lineWidth: 2 }
    });

    Composite.add(this.engine.world, [balloon, rope]);
    this.balloons.push({ balloon, rope, color });
  }

  spawnExplosionParticles(x, y) {
    const colors = ['#ef4444', '#f59e0b', '#fef08a', '#64748b'];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 16 + 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 30,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 14 + 6,
        type: 'fire'
      });
    }
  }

  spawnStars(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 2,
        life: 1,
        maxLife: 25,
        color: '#f59e0b',
        size: Math.random() * 8 + 4,
        type: 'star'
      });
    }
  }

  spawnPunchGloveEffect(x, y) {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 1,
      maxLife: 15,
      color: '#ef4444',
      size: 50,
      type: 'glove'
    });
  }

  updateBalloons() {
    const { Body } = window.Matter;
    this.balloons.forEach(bObj => {
      if (bObj && bObj.balloon && bObj.balloon.position) {
        Body.applyForce(bObj.balloon, bObj.balloon.position, { x: 0, y: -0.003 });
      }
    });
  }

  updateParticles() {
    const now = Date.now();
    this.bodyBumps = this.bodyBumps.filter(b => b && b.body && (now - b.createdAt < b.duration));

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
    });
    this.particles = this.particles.filter(p => p.life < p.maxLife);

    this.bulletTracers.forEach(t => t.life++);
    this.bulletTracers = this.bulletTracers.filter(t => t.life < t.maxLife);

    this.activeZapArcs.forEach(arc => arc.life++);
    this.activeZapArcs = this.activeZapArcs.filter(arc => arc.life < arc.maxLife);
  }

  clearSplatsAndBalloons() {
    const { Composite } = window.Matter;
    this.bodyBumps = [];
    this.balloons.forEach(bObj => {
      if (bObj) {
        try {
          if (bObj.balloon) Composite.remove(this.engine.world, bObj.balloon);
          if (bObj.rope) Composite.remove(this.engine.world, bObj.rope);
        } catch(e) {}
      }
    });
    this.balloons = [];
  }
}
