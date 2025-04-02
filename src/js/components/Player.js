import * as THREE from 'three';

export class Player {
  constructor(game) {
    this.game = game;
    this.position = new THREE.Vector3(32, 20, 32); // Posição inicial
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 5; // Velocidade de movimento
    this.rotationSpeed = 3; // Velocidade de rotação
    this.jumpVelocity = 5; // Velocidade de pulo
    
    // Gravidade e física básica
    this.gravity = 9.8; // Adjusted gravity
    this.groundRestitution = 0.4; // Factor for bounce (-1 = full bounce, 0 = no bounce)
    this.onGround = false;
    
    // Para detecção de colisão
    this.radius = 0.3;
    this.height = 1.8;
    
    // Direção para onde o jogador está virado
    this.direction = new THREE.Vector3(0, 0, 1);
    
    // Variável para armazenar a última entrada válida
    this.lastMovementInputTime = 0;
    this.checkInputInterval = 1000; // 1 segundo em ms
    this.consecutiveNoInputChecks = 0;
    this.maxConsecutiveNoInputChecks = 3;
    
    // Cria uma geometria para o jogador
    this._createMesh();
  }
  
  _createMesh() {
    // Grupo principal para o personagem
    this.mesh = new THREE.Group();
    
    // Corpo principal - cilindro
    const bodyGeometry = new THREE.CylinderGeometry(this.radius, this.radius * 1.2, this.height * 0.7, 8);
    bodyGeometry.translate(0, this.height * 0.35, 0);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3366cc,
      roughness: 0.7,
      metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.add(body);
    
    // Cabeça
    const headGeometry = new THREE.SphereGeometry(this.radius * 1.2, 12, 12);
    headGeometry.translate(0, this.height * 0.7 + this.radius * 0.8, 0);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffcc99,
      roughness: 0.5, 
      metalness: 0.1
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    this.mesh.add(head);
    
    // Pernas
    const legMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222266,
      roughness: 0.8,
      metalness: 0.1
    });
    
    // Perna esquerda
    const leftLegGeometry = new THREE.CylinderGeometry(this.radius * 0.3, this.radius * 0.4, this.height * 0.4, 8);
    leftLegGeometry.translate(-this.radius * 0.5, this.height * 0.2, 0);
    const leftLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
    this.mesh.add(leftLeg);
    
    // Perna direita
    const rightLegGeometry = new THREE.CylinderGeometry(this.radius * 0.3, this.radius * 0.4, this.height * 0.4, 8);
    rightLegGeometry.translate(this.radius * 0.5, this.height * 0.2, 0);
    const rightLeg = new THREE.Mesh(rightLegGeometry, legMaterial);
    this.mesh.add(rightLeg);
    
    // Braços - vamos criar dois braços que se movem com a direção
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3366cc,
      roughness: 0.7,
      metalness: 0.2
    });
    
    // Braço esquerdo
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-this.radius * 1.3, this.height * 0.5, 0);
    
    const leftArmGeometry = new THREE.CylinderGeometry(this.radius * 0.25, this.radius * 0.25, this.height * 0.4, 8);
    leftArmGeometry.rotateZ(Math.PI / 4); // Rotaciona o braço para fora
    const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
    leftArmGroup.add(leftArm);
    
    // Mão esquerda
    const leftHandGeometry = new THREE.SphereGeometry(this.radius * 0.3, 8, 8);
    leftHandGeometry.translate(-this.height * 0.2, -this.height * 0.2, 0);
    const leftHandMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffcc99,
      roughness: 0.5,
      metalness: 0.1
    });
    const leftHand = new THREE.Mesh(leftHandGeometry, leftHandMaterial);
    leftArmGroup.add(leftHand);
    
    this.leftArm = leftArmGroup;
    this.mesh.add(leftArmGroup);
    
    // Braço direito
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(this.radius * 1.3, this.height * 0.5, 0);
    
    const rightArmGeometry = new THREE.CylinderGeometry(this.radius * 0.25, this.radius * 0.25, this.height * 0.4, 8);
    rightArmGeometry.rotateZ(-Math.PI / 4); // Rotaciona o braço para fora
    const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
    rightArmGroup.add(rightArm);
    
    // Mão direita
    const rightHandGeometry = new THREE.SphereGeometry(this.radius * 0.3, 8, 8);
    rightHandGeometry.translate(this.height * 0.2, -this.height * 0.2, 0);
    const rightHandMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffcc99,
      roughness: 0.5,
      metalness: 0.1
    });
    const rightHand = new THREE.Mesh(rightHandGeometry, rightHandMaterial);
    rightArmGroup.add(rightHand);
    
    this.rightArm = rightArmGroup;
    this.mesh.add(rightArmGroup);
    
    // Configura sombras para todas as partes
    this.mesh.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = false;
      }
    });
    
    // Configura a posição inicial
    this.mesh.position.copy(this.position);
  }
  
  update(deltaTime) {
    this._handleMovement(deltaTime);
    this._applyPhysics(deltaTime);
    this._updateMesh();
    
    // Verifica se estamos recebendo inputs
    this._checkInputStatus();
  }
  
  _checkInputStatus() {
    // Obtém os inputs atuais
    const input = this.game.inputManager.getInput();
    const currentTime = Date.now();
    
    // Verifica se alguma tecla de movimento está pressionada
    const anyMovementKeyPressed = input.forward || input.backward || input.left || input.right;
    
    if (anyMovementKeyPressed) {
      // Atualiza o timestamp da última entrada de movimento
      this.lastMovementInputTime = currentTime;
      this.consecutiveNoInputChecks = 0;
    } else if (currentTime - this.lastMovementInputTime > this.checkInputInterval) {
      // Se passou mais de um segundo sem movimento, mas o personagem ainda está se movendo
      // Verificamos se a velocidade não é zero no plano XZ (movimento horizontal)
      const horizontalVelocity = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
      
      if (horizontalVelocity > 0.01) {
        this.consecutiveNoInputChecks++;
        console.warn(`[Player] Detectado movimento contínuo sem input! Verificação ${this.consecutiveNoInputChecks}/${this.maxConsecutiveNoInputChecks}`);
        
        if (this.consecutiveNoInputChecks >= this.maxConsecutiveNoInputChecks) {
          console.error('[Player] Resetando inputs devido a movimento sem entrada detectada!');
          this.game.inputManager.resetAllInputs();
          this.consecutiveNoInputChecks = 0;
          
          // Interrompe o movimento forçadamente
          this.velocity.x = 0;
          this.velocity.z = 0;
        }
      }
    }
  }
  
  _handleMovement(deltaTime) {
    // Obtém os inputs
    const input = this.game.inputManager.getInput();
    
    // Se nenhuma tecla de movimento está pressionada, desaceleramos o personagem horizontalmente
    if (!input.forward && !input.backward && !input.left && !input.right) {
      // Desacelera o movimento horizontal (atrito)
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
      
      // Se a velocidade for muito baixa, zeramos para evitar deslizamento mínimo
      if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
      
      return; // Sai da função se não houver movimento
    }
    
    // Resetamos a velocidade para cada frame de movimento
    this.velocity.x = 0;
    this.velocity.z = 0;
    
    // Definimos os vetores de direção com base no ângulo da câmera (45 graus ou PI/4)
    // Direção para frente (perpendicular à tela)
    const forwardVector = new THREE.Vector3(0, 0, -1);
    // Direção para direita (paralela à tela)
    const rightVector = new THREE.Vector3(1, 0, 0);
    
    // Aplicamos a velocidade baseada nas teclas pressionadas
    if (input.forward) {
      // W - Movimento para frente (para baixo da tela em vista isométrica)
      this.velocity.x += forwardVector.x * this.speed;
      this.velocity.z += forwardVector.z * this.speed;
      this.direction.set(forwardVector.x, 0, forwardVector.z).normalize();
    }
    
    if (input.backward) {
      // S - Movimento para trás (para cima da tela em vista isométrica)
      this.velocity.x -= forwardVector.x * this.speed;
      this.velocity.z -= forwardVector.z * this.speed;
      this.direction.set(-forwardVector.x, 0, -forwardVector.z).normalize();
    }
    
    if (input.left) {
      // A - Movimento para esquerda
      this.velocity.x -= rightVector.x * this.speed;
      this.velocity.z -= rightVector.z * this.speed;
      this.direction.set(-rightVector.x, 0, -rightVector.z).normalize();
    }
    
    if (input.right) {
      // D - Movimento para direita
      this.velocity.x += rightVector.x * this.speed;
      this.velocity.z += rightVector.z * this.speed;
      this.direction.set(rightVector.x, 0, rightVector.z).normalize();
    }
    
    // Pulo
    if (input.jump && this.onGround) {
      this.velocity.y = this.jumpVelocity;
      this.onGround = false;
    }
  }
  
  _applyPhysics(deltaTime) {
    // 1. Apply gravity
    // Store previous onGround state before potentially changing it
    const wasOnGround = this.onGround; 
    this.velocity.y -= this.gravity * deltaTime;
    
    // 2. Limit fall speed
    if (this.velocity.y < -20) {
      this.velocity.y = -20;
    }
    
    // 3. Check for collisions (including ground) which might modify velocity and position
    this.onGround = false; // Assume not on ground until collision check confirms
    this._checkVoxelCollisions(deltaTime); // Pass deltaTime
                                // This method will set this.onGround if collision occurs
                                // and handle position snapping + velocity bounce
                                
    // 4. Update position based on final velocity for this frame
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime; 
    this.position.z += this.velocity.z * deltaTime;

    // 5. Final safety check: Ensure player never goes below y=0
    if (this.position.y < 0) {
      console.warn("[Player] Position fell below y=0, clamping."); // Optional warning
      this.position.y = 0;
      if (this.velocity.y < 0) {
        // Stop downward velocity if we hit the hard floor
        // You might want a small bounce here too, similar to voxel collision
        // this.velocity.y *= -this.groundRestitution; 
        this.velocity.y = 0;
      }
      this.onGround = true; // If we hit y=0, we are definitely on ground.
    }
    
    // Note: If a ground collision occurred in _checkVoxelCollisions, 
    // this.position.y was snapped to the ground level (e.g., y), 
    // and this.velocity.y was reversed and dampened.
    // The position update here will then move the player slightly *up* from the ground
    // starting the bounce.
  }
  
  _checkVoxelCollisions(deltaTime) { // Accept deltaTime
    // Verificação de colisão simples (a ser expandida)
    if (this.game.voxelWorld) {
      const x = Math.floor(this.position.x);
      const currentVoxelY = Math.floor(this.position.y); // Voxel index player's base is in
      const z = Math.floor(this.position.z);

      // --- Vertical Collision (Ground) ---
      // Check the voxel index directly below the player
      const belowVoxelY = currentVoxelY - 1; 

      // Ensure we are checking a valid voxel index (>= 0)
      if (belowVoxelY >= 0) {
        const blockBelow = this.game.voxelWorld.getVoxel(x, belowVoxelY, z);
        // The top surface coordinate of the voxel at index belowVoxelY is belowVoxelY + 1
        const groundSurfaceY = belowVoxelY + 1; 

        // Predict next vertical position
        const predictedY = this.position.y + this.velocity.y * deltaTime;

        // Condition: A solid block exists below, player is moving down (or stationary),
        // and the player's *predicted* base position is at or below that block's top surface.
        if (blockBelow !== 0 && this.velocity.y <= 0 && predictedY <= groundSurfaceY) {
          // Collision Detected!
          console.log(`Ground collision detected! PosY: ${this.position.y.toFixed(2)}, VelY: ${this.velocity.y.toFixed(2)}, GroundY: ${groundSurfaceY}`);
          
          // Always snap position and apply bounce
          this.position.y = groundSurfaceY; // Snap position exactly to the ground surface
          this.velocity.y *= -this.groundRestitution; // Reverse and dampen vertical velocity (bounce)

          // Prevent tiny bounce velocity from keeping player "in air" indefinitely
          if (Math.abs(this.velocity.y) < 0.1) {
              this.velocity.y = 0;
          }
          
          this.onGround = true; // Mark player as on ground
        }
      }
      // --- End Vertical Collision (Ground) ---

      // --- Horizontal Collision (X-Axis) ---
      const predictedX = this.position.x + this.velocity.x * deltaTime;
      const playerLeftEdge = predictedX - this.radius;
      const playerRightEdge = predictedX + this.radius;
      
      // Check collision when moving right (positive velocity)
      if (this.velocity.x > 0) {
          const collisionX = Math.floor(playerRightEdge);
          // Check voxels along player's full height
          const topVoxelY = Math.floor(this.position.y + this.height - 0.001);
          for (let yCheck = currentVoxelY; yCheck <= topVoxelY; yCheck++) {
              // Ensure we don't check below y=0 if player base is somehow negative (safety)
              if (yCheck < 0) continue; 
              const wallVoxel = this.game.voxelWorld.getVoxel(collisionX, yCheck, z);
              if (wallVoxel !== 0) {
                  // Collision detected at this height
                  console.log(`X+ collision detected! VoxelX: ${collisionX}, VoxelY: ${yCheck}`);
                  this.position.x = collisionX - this.radius; // Snap right edge exactly to wall boundary
                  this.velocity.x = 0; // Stop horizontal movement
                  break; // Exit loop once collision is found
              }
          }
      }
      // Check collision when moving left (negative velocity)
      else if (this.velocity.x < 0) {
          const collisionX = Math.floor(playerLeftEdge);
          // Check voxels along player's full height
          const topVoxelY = Math.floor(this.position.y + this.height - 0.001);
          for (let yCheck = currentVoxelY; yCheck <= topVoxelY; yCheck++) {
              // Ensure we don't check below y=0 if player base is somehow negative (safety)
              if (yCheck < 0) continue; 
              const wallVoxel = this.game.voxelWorld.getVoxel(collisionX, yCheck, z);
              if (wallVoxel !== 0) {
                  // Collision detected at this height
                  console.log(`X- collision detected! VoxelX: ${collisionX}, VoxelY: ${yCheck}`);
                  this.position.x = collisionX + 1 + this.radius; // Snap left edge exactly to wall boundary
                  this.velocity.x = 0; // Stop horizontal movement
                  break; // Exit loop once collision is found
              }
          }
      }
      // --- End Horizontal Collision (X-Axis) ---

      // --- Horizontal Collision (Z-Axis) ---
      const predictedZ = this.position.z + this.velocity.z * deltaTime;
      const playerFrontEdge = predictedZ + this.radius; // Assuming +Z is forward relative to player model/world
      const playerBackEdge = predictedZ - this.radius;  // Assuming -Z is backward

      // Check collision when moving forward (+Z velocity)
      if (this.velocity.z > 0) {
          const collisionZ = Math.floor(playerFrontEdge);
          // Check voxels along player's full height
          const topVoxelY = Math.floor(this.position.y + this.height - 0.001);
          for (let yCheck = currentVoxelY; yCheck <= topVoxelY; yCheck++) {
              if (yCheck < 0) continue;
              const wallVoxel = this.game.voxelWorld.getVoxel(x, yCheck, collisionZ);
              if (wallVoxel !== 0) {
                  // Collision detected at this height
                  console.log(`Z+ collision detected! VoxelZ: ${collisionZ}, VoxelY: ${yCheck}`);
                  this.position.z = collisionZ - this.radius; // Snap front edge exactly to wall boundary
                  this.velocity.z = 0; // Stop forward movement
                  break; // Exit loop once collision is found
              }
          }
      }
      // Check collision when moving backward (-Z velocity)
      else if (this.velocity.z < 0) {
          const collisionZ = Math.floor(playerBackEdge);
          // Check voxels along player's full height
          const topVoxelY = Math.floor(this.position.y + this.height - 0.001);
          for (let yCheck = currentVoxelY; yCheck <= topVoxelY; yCheck++) {
              if (yCheck < 0) continue;
              const wallVoxel = this.game.voxelWorld.getVoxel(x, yCheck, collisionZ);
              if (wallVoxel !== 0) {
                  // Collision detected at this height
                  console.log(`Z- collision detected! VoxelZ: ${collisionZ}, VoxelY: ${yCheck}`);
                  this.position.z = collisionZ + 1 + this.radius; // Snap back edge exactly to wall boundary
                  this.velocity.z = 0; // Stop backward movement
                  break; // Exit loop once collision is found
              }
          }
      }
      // --- End Horizontal Collision (Z-Axis) ---
      
      // TODO: Add checks for collisions with ceiling (Y+) here
      // Consider player's height for ceiling checks.

      // --- Vertical Collision (Ceiling Y+) ---
      const playerTopY = this.position.y + this.height;
      const ceilingVoxelY = Math.floor(playerTopY);
      
      // Ensure we are checking a valid voxel layer (and not above world height if known)
      // Add a check against world height if available: && ceilingVoxelY < worldHeight
      if (this.velocity.y > 0) { // Only check if moving upwards
        const blockAbove = this.game.voxelWorld.getVoxel(x, ceilingVoxelY, z);
        // The bottom surface coordinate of the ceiling voxel is simply ceilingVoxelY
        const ceilingBottomSurfaceY = ceilingVoxelY;
        
        // Predict next vertical top position
        const predictedTopY = playerTopY + this.velocity.y * deltaTime;

        // Condition: A solid block exists above, player is moving up,
        // and the player's *predicted* top position is at or above that block's bottom surface.
        if (blockAbove !== 0 && predictedTopY >= ceilingBottomSurfaceY) {
          // Collision Detected!
          console.log(`Ceiling collision detected! PosY: ${this.position.y.toFixed(2)}, VelY: ${this.velocity.y.toFixed(2)}, CeilingY: ${ceilingBottomSurfaceY}`);
          
          // Snap position so the head is just below the ceiling
          this.position.y = ceilingBottomSurfaceY - this.height;
          this.velocity.y = 0; // Stop upward velocity immediately
          
          // Optional: apply negative restitution if you want a bounce down, but usually 0 is fine.
          // this.velocity.y *= -this.groundRestitution; 
        }
      }
      // --- End Vertical Collision (Ceiling) ---
    }
  }
  
  _updateMesh() {
    // Atualiza a posição da mesh
    this.mesh.position.copy(this.position);
    
    // Atualiza a rotação para apontar na direção de movimento
    if (this.direction.length() > 0) {
      const targetRotation = Math.atan2(this.direction.x, this.direction.z);
      this.mesh.rotation.y = targetRotation;
      
      // Movimenta os braços de acordo com a velocidade
      const movementSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
      const isMoving = movementSpeed > 0.5;
      
      // Animação de balanço dos braços se estiver se movendo
      if (isMoving) {
        // Calcula um valor de oscilação baseado no tempo para o balanço dos braços
        const time = Date.now() * 0.003; 
        const swingAmount = Math.sin(time * 5) * 0.3;
        
        // Aplica a oscilação aos braços, em direções opostas
        this.leftArm.rotation.x = swingAmount;
        this.rightArm.rotation.x = -swingAmount;
      } else {
        // Posição neutra quando parado
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
      }
    }
  }
  
  getPosition() {
    return this.position.clone();
  }
  
  getVelocity() {
    return this.velocity.clone();
  }
  
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this._updateMesh();
  }
} 