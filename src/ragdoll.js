export class Ragdoll {
  constructor(x, y, scale = 1.4) {
    const Matter = window.Matter;
    const { Composite } = Matter;

    this.scale = scale;
    this.x = x || window.innerWidth / 2;
    this.y = y || window.innerHeight / 2 - 30;
    this.faceImage = null;
    this.isPngCutout = true;
    this.lastDodgeTime = 0;
    this.isKnockedDown = false;
    this.isFreefalling = false;

    this.composite = Composite.create({ label: 'Ragdoll' });
    this.createBodies(this.x, this.y, scale);
  }

  createBodies(x, y, scale) {
    const Matter = window.Matter;
    const { Bodies, Body, Composite, Constraint } = Matter;

    const headRadius = 45 * scale;
    const torsoWidth = 54 * scale;
    const torsoHeight = 80 * scale;
    const armWidth = 16 * scale;
    const armLength = 46 * scale;
    const legWidth = 18 * scale;
    const legLength = 56 * scale;

    const collisionGroup = Body.nextGroup(true);

    const bodyOptions = {
      collisionFilter: { group: collisionGroup },
      friction: 0.05,
      frictionAir: 0.015,
      restitution: 0.85,
      density: 0.003
    };

    // Head
    const headY = y - torsoHeight / 2 - headRadius;
    this.head = Bodies.circle(x, headY, headRadius, {
      ...bodyOptions,
      label: 'RagdollHead',
      density: 0.004
    });

    // Torso
    this.torso = Bodies.rectangle(x, y, torsoWidth, torsoHeight, {
      ...bodyOptions,
      label: 'RagdollTorso',
      chamfer: { radius: 12 * scale }
    });

    // Left Arm
    const upperLeftArmX = x - torsoWidth / 2 - armLength / 2;
    const upperLeftArmY = y - torsoHeight / 3;
    this.upperLeftArm = Bodies.rectangle(upperLeftArmX, upperLeftArmY, armLength, armWidth, {
      ...bodyOptions,
      label: 'RagdollLimbs'
    });

    const lowerLeftArmX = upperLeftArmX - armLength;
    const lowerLeftArmY = upperLeftArmY;
    this.lowerLeftArm = Bodies.rectangle(lowerLeftArmX, lowerLeftArmY, armLength, armWidth, {
      ...bodyOptions,
      label: 'RagdollLimbs'
    });

    // Right Arm
    const upperRightArmX = x + torsoWidth / 2 + armLength / 2;
    const upperRightArmY = y - torsoHeight / 3;
    this.upperRightArm = Bodies.rectangle(upperRightArmX, upperRightArmY, armLength, armWidth, {
      ...bodyOptions,
      label: 'RagdollLimbs'
    });

    const lowerRightArmX = upperRightArmX + armLength;
    const lowerRightArmY = upperRightArmY;
    this.lowerRightArm = Bodies.rectangle(lowerRightArmX, lowerRightArmY, armLength, armWidth, {
      ...bodyOptions,
      label: 'RagdollLimbs'
    });

    // Left Leg
    const upperLeftLegX = x - torsoWidth / 4;
    const upperLeftLegY = y + torsoHeight / 2 + legLength / 2;
    this.upperLeftLeg = Bodies.rectangle(upperLeftLegX, upperLeftLegY, legWidth, legLength, {
      ...bodyOptions,
      label: 'RagdollLimbs'
    });

    const lowerLeftLegX = upperLeftLegX;
    const lowerLeftLegY = upperLeftLegY + legLength;
    this.lowerLeftLeg = Bodies.rectangle(lowerLeftLegX, lowerLeftLegY, legWidth, legLength, {
      ...bodyOptions,
      label: 'RagdollLimbs'
    });

    // Right Leg
    const upperRightLegX = x + torsoWidth / 4;
    const upperRightLegY = y + torsoHeight / 2 + legLength / 2;
    this.upperRightLeg = Bodies.rectangle(upperRightLegX, upperRightLegY, legWidth, legLength, {
      ...bodyOptions,
      label: 'RagdollLimbs'
    });

    const lowerRightLegX = upperRightLegX;
    const lowerRightLegY = upperRightLegY + legLength;
    this.lowerRightLeg = Bodies.rectangle(lowerRightLegX, lowerRightLegY, legWidth, legLength, {
      ...bodyOptions,
      label: 'RagdollLimbs'
    });

    // CONSTRAINTS
    const constraintOptions = {
      stiffness: 0.85,
      damping: 0.4,
      render: { visible: false }
    };

    const neck = Constraint.create({
      bodyA: this.head,
      pointA: { x: 0, y: headRadius },
      bodyB: this.torso,
      pointB: { x: 0, y: -torsoHeight / 2 },
      ...constraintOptions
    });

    const leftShoulder = Constraint.create({
      bodyA: this.torso,
      pointA: { x: -torsoWidth / 2, y: -torsoHeight / 3 },
      bodyB: this.upperLeftArm,
      pointB: { x: armLength / 2, y: 0 },
      ...constraintOptions
    });

    const leftElbow = Constraint.create({
      bodyA: this.upperLeftArm,
      pointA: { x: -armLength / 2, y: 0 },
      bodyB: this.lowerLeftArm,
      pointB: { x: armLength / 2, y: 0 },
      ...constraintOptions
    });

    const rightShoulder = Constraint.create({
      bodyA: this.torso,
      pointA: { x: torsoWidth / 2, y: -torsoHeight / 3 },
      bodyB: this.upperRightArm,
      pointB: { x: -armLength / 2, y: 0 },
      ...constraintOptions
    });

    const rightElbow = Constraint.create({
      bodyA: this.upperRightArm,
      pointA: { x: armLength / 2, y: 0 },
      bodyB: this.lowerRightArm,
      pointB: { x: -armLength / 2, y: 0 },
      ...constraintOptions
    });

    const leftHip = Constraint.create({
      bodyA: this.torso,
      pointA: { x: -torsoWidth / 4, y: torsoHeight / 2 },
      bodyB: this.upperLeftLeg,
      pointB: { x: 0, y: -legLength / 2 },
      ...constraintOptions
    });

    const leftKnee = Constraint.create({
      bodyA: this.upperLeftLeg,
      pointA: { x: 0, y: legLength / 2 },
      bodyB: this.lowerLeftLeg,
      pointB: { x: 0, y: -legLength / 2 },
      ...constraintOptions
    });

    const rightHip = Constraint.create({
      bodyA: this.torso,
      pointA: { x: torsoWidth / 4, y: torsoHeight / 2 },
      bodyB: this.upperRightLeg,
      pointB: { x: 0, y: -legLength / 2 },
      ...constraintOptions
    });

    const rightKnee = Constraint.create({
      bodyA: this.upperRightLeg,
      pointA: { x: 0, y: legLength / 2 },
      bodyB: this.lowerRightLeg,
      pointB: { x: 0, y: -legLength / 2 },
      ...constraintOptions
    });

    this.centerAnchor = { x: x, y: y - 90 };
    this.suspensionConstraint = Constraint.create({
      pointA: this.centerAnchor,
      bodyB: this.torso,
      pointB: { x: 0, y: -torsoHeight / 3 },
      stiffness: 0.05,
      damping: 0.25,
      length: 60,
      render: { visible: false }
    });

    Composite.add(this.composite, [
      this.head, this.torso,
      this.upperLeftArm, this.lowerLeftArm,
      this.upperRightArm, this.lowerRightArm,
      this.upperLeftLeg, this.lowerLeftLeg,
      this.upperRightLeg, this.lowerRightLeg,
      neck, leftShoulder, leftElbow, rightShoulder, rightElbow,
      leftHip, leftKnee, rightHip, rightKnee,
      this.suspensionConstraint
    ]);
  }

  // FORCE CHAOTIC UNCONTROLLED HEAD-FIRST / SIDEWAYS TUMBLE
  startFreefallPlunge(startAltitude = 0) {
    const { Body, Composite } = window.Matter;
    this.isFreefalling = true;
    this.suspensionConstraint.stiffness = 0.000001;

    const plungeAngle = Math.PI * (0.75 + (Math.random() - 0.5) * 0.5);
    
    Body.setAngle(this.torso, plungeAngle);
    Body.setAngle(this.head, plungeAngle);

    const spinSpeed = (Math.random() > 0.5 ? 1 : -1) * (1.8 + Math.random() * 1.5);
    Body.setAngularVelocity(this.torso, spinSpeed);
    Body.setAngularVelocity(this.head, spinSpeed * 1.2);

    const bodies = Composite.allBodies(this.composite);
    bodies.forEach(b => {
      if (b) {
        Body.applyForce(b, b.position, {
          x: (Math.random() - 0.5) * 0.08 * b.mass,
          y: (Math.random() - 0.5) * 0.08 * b.mass
        });
      }
    });
  }

  recoverToFloatingPosture() {
    const { Body } = window.Matter;
    this.isFreefalling = false;
    this.suspensionConstraint.stiffness = 0.05;

    Body.setAngle(this.torso, 0);
    Body.setAngle(this.head, 0);

    Body.applyForce(this.head, this.head.position, { x: 0, y: -0.06 * this.head.mass });
    Body.applyForce(this.torso, this.torso.position, { x: 0, y: -0.1 * this.torso.mass });
  }

  duckAndCover(threatX, threatY) {
    const { Body } = window.Matter;
    const now = Date.now();
    if (now - this.lastDodgeTime < 250) return;
    this.lastDodgeTime = now;

    const torsoPos = this.torso.position;
    const dx = torsoPos.x - threatX;
    const dodgeDir = dx >= 0 ? 1 : -1;

    Body.applyForce(this.torso, torsoPos, {
      x: dodgeDir * 0.06 * this.torso.mass,
      y: 0.03 * this.torso.mass
    });

    Body.applyForce(this.head, this.head.position, {
      x: dodgeDir * 0.04 * this.head.mass,
      y: 0.05 * this.head.mass
    });
  }

  dampMotion() {
    const { Body, Composite } = window.Matter;
    const bodies = Composite.allBodies(this.composite);
    const targetX = window.innerWidth / 2;
    const targetY = window.innerHeight / 2 - 30;

    bodies.forEach(b => {
      if (!b || !b.position) return;
      b.isSleeping = false;

      // Safe NaN or out of bounds recovery
      if (isNaN(b.position.x) || isNaN(b.position.y) || b.position.x < -100 || b.position.x > window.innerWidth + 100 || b.position.y < -100 || b.position.y > window.innerHeight + 100) {
        Body.setPosition(b, { x: targetX, y: targetY });
        Body.setVelocity(b, { x: 0, y: 0 });
      }

      if (isNaN(b.velocity.x) || isNaN(b.velocity.y)) {
        Body.setVelocity(b, { x: 0, y: 0 });
      }
      if (isNaN(b.angularVelocity)) {
        Body.setAngularVelocity(b, 0);
      }

      if (!this.isFreefalling) {
        const angleError = b.angle;
        if (!isNaN(angleError)) {
          b.torque = -angleError * 0.0008 * b.inertia;
        }
      } else {
        b.torque = 0;
      }
    });
  }

  setFaceImage(dataUrl, isPngCutout = true) {
    if (!dataUrl) return;
    const img = new Image();
    if (typeof dataUrl === 'string' && dataUrl.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      this.faceImage = img;
      this.isPngCutout = isPngCutout;
    };
    img.src = dataUrl;
  }

  updateAnchorPosition(x, y) {
    this.centerAnchor.x = x;
    this.centerAnchor.y = y - 90;
    this.suspensionConstraint.pointA = this.centerAnchor;
  }

  resetPosition(x, y) {
    const { Body } = window.Matter;
    const targetX = x || window.innerWidth / 2;
    const targetY = y || window.innerHeight / 2 - 30;

    this.isFreefalling = false;
    this.suspensionConstraint.stiffness = 0.05;
    this.updateAnchorPosition(targetX, targetY);

    const scale = this.scale;
    const torsoHeight = 80 * scale;
    const headRadius = 45 * scale;
    const armLength = 46 * scale;
    const legLength = 56 * scale;
    const torsoWidth = 54 * scale;

    Body.setPosition(this.torso, { x: targetX, y: targetY });
    Body.setAngle(this.torso, 0);

    Body.setPosition(this.head, { x: targetX, y: targetY - torsoHeight / 2 - headRadius });
    Body.setAngle(this.head, 0);

    const upperLeftArmX = targetX - torsoWidth / 2 - armLength / 2;
    const upperLeftArmY = targetY - torsoHeight / 3;
    Body.setPosition(this.upperLeftArm, { x: upperLeftArmX, y: upperLeftArmY });
    Body.setPosition(this.lowerLeftArm, { x: upperLeftArmX - armLength, y: upperLeftArmY });

    const upperRightArmX = targetX + torsoWidth / 2 + armLength / 2;
    const upperRightArmY = targetY - torsoHeight / 3;
    Body.setPosition(this.upperRightArm, { x: upperRightArmX, y: upperRightArmY });
    Body.setPosition(this.lowerRightArm, { x: upperRightArmX + armLength, y: upperRightArmY });

    const upperLeftLegX = targetX - torsoWidth / 4;
    const upperLeftLegY = targetY + torsoHeight / 2 + legLength / 2;
    Body.setPosition(this.upperLeftLeg, { x: upperLeftLegX, y: upperLeftLegY });
    Body.setPosition(this.lowerLeftLeg, { x: upperLeftLegX, y: upperLeftLegY + legLength });

    const upperRightLegX = targetX + torsoWidth / 4;
    const upperRightLegY = targetY + torsoHeight / 2 + legLength / 2;
    Body.setPosition(this.upperRightLeg, { x: upperRightLegX, y: upperRightLegY });
    Body.setPosition(this.lowerRightLeg, { x: upperRightLegX, y: upperRightLegY + legLength });

    [
      this.head, this.torso,
      this.upperLeftArm, this.lowerLeftArm,
      this.upperRightArm, this.lowerRightArm,
      this.upperLeftLeg, this.lowerLeftLeg,
      this.upperRightLeg, this.lowerRightLeg
    ].forEach(b => {
      if (b) {
        Body.setVelocity(b, { x: 0, y: 0 });
        Body.setAngle(b, 0);
        Body.setAngularVelocity(b, 0);
      }
    });
  }
}
