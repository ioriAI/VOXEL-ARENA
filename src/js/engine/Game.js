import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VoxelWorld } from './VoxelWorld.js';
import { Player } from '../components/Player.js';
import { Bot } from '../components/bot.js';
import { InputManager } from '../utils/InputManager.js';

export class Game {
  static instance = null;
  
  constructor() {
    if (Game.instance) {
      return Game.instance;
    }
    
    // Instância única (Singleton)
    Game.instance = this;
    
    // Core Three.js
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Componentes do jogo
    this.voxelWorld = null;
    this.player = null;
    this.bot = null;
    this.inputManager = null;
    this.gltfLoader = null;
    
    // Performance
    this.clock = new THREE.Clock();
    this.deltaTime = 0;
    this.fpsArray = [];
    this.fpsUpdateInterval = 0.2; // segundos
    this.fpsUpdateCounter = 0;
    this.currentFps = 0;
    
    // Raycasting para interação
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.selectedVoxel = null;
    this.highlightBox = null;
    
    // Configuração da câmera estática (top-side view)
    this.cameraHeight = 25; // Altura da câmera
    this.cameraAngle = Math.PI / 10; // 45 graus de inclinação (em radianos)
    this.cameraDistance = 25; // Distância da câmera do centro
    
    // Campo de visão da câmera
    this.cameraFOV = 35;
    
    // Configuração de zoom da câmera
    this.currentZoomLevel = 1.0; // Nível de zoom atual (1.0 = padrão)
    this.minZoom = 0.9; // Zoom máximo (mais próximo)
    this.maxZoom = 1.1; // Zoom mínimo (mais distante)
    this.zoomSpeed = 0.1; // Velocidade de zoom
    this.zoomSmoothness = 0.15; // Suavidade do zoom (menor = mais suave)
    this.targetZoomLevel = 1.0; // Alvo do zoom para suavização
  }
  
  static getInstance() {
    if (!Game.instance) {
      Game.instance = new Game();
    }
    return Game.instance;
  }
  
  init() {
    this._setupThree();
    this._setupLight();
    this._setupWorld();
    this._setupPlayer();
    this.inputManager = new InputManager();
    this.inputManager.init();
    this._setupEventListeners();
    this._setupHighlightBox();
    this._setupLoaders();
    this._loadAssets();
    
    // Posiciona a câmera inicialmente (será atualizada a cada frame)
    this._updateCameraPosition();
  }
  
  _setupStaticCamera() {
  }
  
  _updateCameraPosition() {
    if (!this.player) return;
    
    // Calcula a posição da câmera relativa ao jogador
    const playerPos = this.player.position.clone();
    
    // Posiciona a câmera em um ângulo diagonal superior, mas centrada no jogador
    this.camera.position.set(
      playerPos.x - Math.sin(this.cameraAngle) * this.cameraDistance * this.currentZoomLevel,
      playerPos.y + this.cameraHeight * this.currentZoomLevel,
      playerPos.z + Math.cos(this.cameraAngle) * this.cameraDistance * this.currentZoomLevel
    );
    
    // Faz a câmera olhar para o jogador
    this.camera.lookAt(playerPos);
  }
  
  _setupThree() {
    // Cena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Cor de céu
    
    // Câmera
    this.camera = new THREE.PerspectiveCamera(
      this.cameraFOV, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near
      1000 // Far
    );
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(this.renderer.domElement);
  }
  
  _setupLight() {
    // Luz ambiente
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    
    // Luz direcional (sol)
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    
    // Configuração de sombras
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    
    this.scene.add(sun);
  }
  
  _setupWorld() {
    this.voxelWorld = new VoxelWorld({
      chunkSize: 16,
      worldSize: 8, // 8x8 chunks
      tileSize: 1,
      tileTextureWidth: 16,
      tileTextureHeight: 16,
    });
    this.voxelWorld.generate();
    this.scene.add(this.voxelWorld.group);
  }
  
  _setupPlayer() {
    this.player = new Player(this);
    this.scene.add(this.player.mesh);
  }
  
  _setupControls() {
    this.inputManager = new InputManager();
    this.inputManager.init();
  }
  
  _setupEventListeners() {
    window.addEventListener('pointermove', (event) => {
      this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
    
    window.addEventListener('click', (event) => {
      // Remove voxel com clique esquerdo
      if (event.button === 0 && this.selectedVoxel) {
        const { position, normal } = this.selectedVoxel;
        const pos = new THREE.Vector3().copy(position).add(normal);
        this.voxelWorld.setVoxel(pos.x, pos.y, pos.z, 0);
        this.voxelWorld.updateVoxelGeometry(pos);
      }
    });
    
    window.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (this.selectedVoxel) {
        // Adiciona voxel com clique direito
        const { position, normal } = this.selectedVoxel;
        const pos = new THREE.Vector3().copy(position).add(normal);
        this.voxelWorld.setVoxel(pos.x, pos.y, pos.z, 1);
        this.voxelWorld.updateVoxelGeometry(pos);
      }
    });
    
    // Adiciona evento de roda do mouse para zoom
    window.addEventListener('wheel', (event) => {
      // Determina a direção do zoom (positivo = zoom out, negativo = zoom in)
      const zoomDelta = Math.sign(event.deltaY) * this.zoomSpeed;
      
      // Aplica o delta ao nível de zoom alvo, com limites
      this.targetZoomLevel = Math.max(
        this.minZoom, 
        Math.min(this.maxZoom, this.targetZoomLevel + zoomDelta)
      );
    });
  }
  
  _showTemporaryMessage(message, duration) {
    // Cria um elemento para exibir a mensagem
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.position = 'absolute';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.fontFamily = 'Arial, sans-serif';
    messageElement.style.fontSize = '18px';
    messageElement.style.zIndex = '1000';
    
    // Adiciona à tela
    document.body.appendChild(messageElement);
    
    // Remove após a duração especificada
    setTimeout(() => {
      document.body.removeChild(messageElement);
    }, duration);
  }
  
  _setupHighlightBox() {
    const boxGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      wireframe: true,
    });
    this.highlightBox = new THREE.Mesh(boxGeometry, boxMaterial);
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);
  }
  
  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  start() {
    this.clock.start();
    this._update();
  }
  
  _update() {
    requestAnimationFrame(() => this._update());
    
    this.deltaTime = this.clock.getDelta();
    this._updateFPS();
    
    if (this.player) {
      this.player.update(this.deltaTime);
      this._updateCameraPosition();
    }
    
    if (this.bot) {
      this.bot.update(this.deltaTime);
    }
    
    // Check for player-bot collision AFTER their individual updates
    this._checkPlayerBotCollision(); 

    this._updateZoom();
    
    this._updateRaycaster();
    
    this.renderer.render(this.scene, this.camera);
  }
  
  _updateZoom() {
    // Suaviza a transição entre níveis de zoom
    this.currentZoomLevel += (this.targetZoomLevel - this.currentZoomLevel) * this.zoomSmoothness;
    
    // A câmera será reposicionada no próximo frame pelo _updateCameraPosition()
  }
  
  _updateFPS() {
    this.fpsArray.push(1 / this.deltaTime);
    if (this.fpsArray.length > 60) {
      this.fpsArray.shift();
    }
    
    this.fpsUpdateCounter += this.deltaTime;
    if (this.fpsUpdateCounter >= this.fpsUpdateInterval) {
      this.fpsUpdateCounter = 0;
      const sum = this.fpsArray.reduce((acc, val) => acc + val, 0);
      this.currentFps = sum / this.fpsArray.length;
    }
  }
  
  _updateRaycaster() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.voxelWorld.group.children);
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      
      this.selectedVoxel = {
        position: intersect.point.floor(),
        normal: intersect.face.normal
      };
      
      this.highlightBox.position.copy(this.selectedVoxel.position);
      this.highlightBox.visible = true;
    } else {
      this.selectedVoxel = null;
      this.highlightBox.visible = false;
    }
  }
  
  getFPS() {
    return this.currentFps;
  }
  
  getDebugInfo() {
    const info = {
      playerPos: this.player ? `P: ${this.player.position.x.toFixed(1)}, ${this.player.position.y.toFixed(1)}, ${this.player.position.z.toFixed(1)}` : 'N/A',
      chunkInfo: this.voxelWorld ? `Chunks: ${this.voxelWorld.getActiveChunksCount()}` : 'N/A',
      voxelsRendered: this.voxelWorld ? `Voxels: ${this.voxelWorld.getRenderedVoxelsCount()}` : 'N/A',
      zoom: `Zoom: ${Math.round(this.currentZoomLevel * 100)}%` // Adicionado informação de zoom
    };
    
    return `${info.playerPos} | ${info.chunkInfo} | ${info.voxelsRendered} | ${info.zoom}`;
  }
  
  _setupLoaders() {
    this.gltfLoader = new GLTFLoader();
  }

  _loadAssets() {
    this._loadBotModel();
    // Load other assets here if needed
  }

  _loadBotModel() {
    if (!this.gltfLoader) return;

    const modelPath = 'assets/model/dragon.glb'; // Changed path to dragon model
    this.gltfLoader.load(modelPath, 
        (gltf) => {
            console.log("Bot model (dragon) loaded successfully."); // Updated log message
            const botModelScene = gltf.scene;
            
            // Define initial position for the bot (same as Player start)
            const initialBotPos = new THREE.Vector3(32, 20, 32); // Use player start position
            
            // Instantiate the Bot class, passing the game instance and model
            this.bot = new Bot(this, botModelScene, initialBotPos); // Pass 'this' (the Game instance)
            
            // Add the bot's mesh to the scene
            this.scene.add(this.bot.mesh);
            
            // TODO: Implement physics/collision for the Bot if needed
            // For now, it will just be static.
            
        },
        (xhr) => {
            // Optional: Progress callback
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('Error loading bot model:', error);
            console.error('Attempted to load from:', modelPath);
        }
    );
  }

  _checkPlayerBotCollision() {
    if (!this.player || !this.bot) {
      return; // Need both player and bot to check collision
    }

    const playerPos = this.player.position;
    const botPos = this.bot.position;
    const playerRadius = this.player.radius;
    const botRadius = this.bot.radius;

    // Calculate distance squared in the XZ plane (ignoring height)
    const dx = playerPos.x - botPos.x;
    const dz = playerPos.z - botPos.z;
    const distSq = dx * dx + dz * dz;

    const minDist = playerRadius + botRadius;
    const minDistSq = minDist * minDist;

    if (distSq < minDistSq && distSq > 0.001) { // Check if closer than combined radii (and not exactly at the same spot)
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;

      // Calculate the collision normal (direction from bot to player) in the XZ plane
      const collisionNormalX = dx / dist;
      const collisionNormalZ = dz / dist;

      // Calculate how much each entity should be pushed back (half the overlap each)
      const pushAmount = overlap * 0.5;
      const playerPushX = collisionNormalX * pushAmount;
      const playerPushZ = collisionNormalZ * pushAmount;

      // Apply the push to both player and bot positions
      this.player.position.x += playerPushX;
      this.player.position.z += playerPushZ;

      this.bot.position.x -= playerPushX; // Push bot in the opposite direction
      this.bot.position.z -= playerPushZ;

      // Ensure the mesh positions are updated after position correction
      this.player._updateMesh(); 
      this.bot._updateMesh();
      
      // console.log(`Collision Player-Bot! Overlap: ${overlap.toFixed(2)}`); // Debug log
    }
  }
} 