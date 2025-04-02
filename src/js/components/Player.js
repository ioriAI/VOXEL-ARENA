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
    this.gravity = 12;
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
    // Aplica gravidade
    if (!this.onGround) {
      this.velocity.y -= this.gravity * deltaTime;
    }
    
    // Limites de velocidade de queda
    if (this.velocity.y < -20) {
      this.velocity.y = -20;
    }
    
    // Verifica colisão com o chão (simplificado por enquanto)
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.onGround = true;
    }
    
    // Verifica colisão com voxels
    this._checkVoxelCollisions();
    
    // Atualiza a posição com base na velocidade
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
  }
  
  _checkVoxelCollisions() {
    // Verificação de colisão simples (a ser expandida)
    if (this.game.voxelWorld) {
      const x = Math.floor(this.position.x);
      const y = Math.floor(this.position.y);
      const z = Math.floor(this.position.z);
      
      // Verificar colisão com blocos abaixo dos pés
      if (y > 0) {
        // Se houver um bloco abaixo e o jogador estiver caindo
        if (this.game.voxelWorld.getVoxel(x, y - 1, z) !== 0 && this.velocity.y <= 0) {
          this.position.y = y;
          this.velocity.y = 0;
          this.onGround = true;
        }
      }
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