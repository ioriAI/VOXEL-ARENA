import * as THREE from 'three';

export class Bot {
  constructor(game, gltfScene, initialPosition) {
    this.game = game;
    this.mesh = gltfScene;
    this.position = initialPosition.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    
    // --- Set the scale of the loaded model --- 
    const desiredScale = 10; // Adjust this value to change the size (Increased to 10)
    this.mesh.scale.set(desiredScale, desiredScale, desiredScale);
    // -----------------------------------------
    
    // --- Calculate visual offset after scaling ---
    const box = new THREE.Box3().setFromObject(this.mesh);
    this.visualYOffset = box.min.y; // Store the lowest point relative to origin
    // -------------------------------------------
    
    this.gravity = 9.8;
    this.groundRestitution = 0.4;
    this.onGround = false;
    
    this.radius = 0.4;
    this.height = 1.8;
    
    this.mesh.position.copy(this.position);

    this.mesh.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
      }
    });

    console.log(`Bot created at position: ${this.position.x}, ${this.position.y}, ${this.position.z}`);
  }
  
  update(deltaTime) {
    this._applyPhysics(deltaTime);
    this._updateMesh();
  }
  
  _applyPhysics(deltaTime) {
    const wasOnGround = this.onGround; 
    this.velocity.y -= this.gravity * deltaTime;
    
    if (this.velocity.y < -20) {
      this.velocity.y = -20;
    }
    
    this.onGround = false;
    this._checkVoxelCollisions(deltaTime);
    
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime; 
    this.position.z += this.velocity.z * deltaTime;

    if (this.position.y < 0) {
      this.position.y = 0;
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }
      this.onGround = true; 
    }
  }
  
  _checkVoxelCollisions(deltaTime) {
    if (!this.game || !this.game.voxelWorld) return;

    const voxelWorld = this.game.voxelWorld;
    const pos = this.position;
    const vel = this.velocity;
    const radius = this.radius;
    const height = this.height;

    // Calculate potential next position based purely on velocity
    const nextPos = pos.clone().addScaledVector(vel, deltaTime);

    // --- Helper function to check collision along one axis ---
    const checkAxis = (axis, currentPos, nextPosCoord, getVoxelFn) => {
      const delta = nextPosCoord - currentPos[axis];
      if (Math.abs(delta) < 1e-6) return false; // No movement on this axis

      const step = Math.sign(delta); // +1 or -1
      const currentCoord = currentPos[axis];
      
      // Determine the range of integer coordinates the entity passes through
      const startCheckCoord = step > 0 ? Math.floor(currentCoord + radius * step + delta) : Math.floor(currentCoord + radius * step + delta);
      const endCheckCoord = Math.floor(currentCoord + radius * step);
      
      // Check voxel at the entity's height range
      const startY = Math.floor(pos.y);
      const endY = Math.floor(pos.y + height - 0.001);

      for (let checkCoord = startCheckCoord; step > 0 ? checkCoord >= endCheckCoord : checkCoord <= endCheckCoord; checkCoord -= step) {
          for (let yCheck = startY; yCheck <= endY; yCheck++) {
              if (yCheck < 0) continue; // Don't check below world
              // TODO: Add check for above world height if known
              
              const voxel = getVoxelFn(checkCoord, yCheck);
              if (voxel !== 0) {
                  // Collision detected!
                  console.log(`Bot Collision Axis ${axis.toUpperCase()}${step > 0 ? '+' : '-'} at ${checkCoord},${yCheck}`);
                  
                  // Snap position and stop velocity on this axis
                  pos[axis] = checkCoord + (step > 0 ? -radius : 1 + radius); 
                  vel[axis] = 0;
                  return true; // Collision handled
              }
          }
      }
      return false; // No collision found
    };

    // --- Check X-Axis ---
    checkAxis('x', pos, nextPos.x, (checkX, yCheck) => {
      return voxelWorld.getVoxel(checkX, yCheck, Math.floor(pos.z));
    });

    // --- Check Z-Axis ---
    checkAxis('z', pos, nextPos.z, (checkZ, yCheck) => {
      return voxelWorld.getVoxel(Math.floor(pos.x), yCheck, checkZ);
    });

    // --- Check Y-Axis (Ground and Ceiling) ---
    const deltaY = nextPos.y - pos.y;
    if (Math.abs(deltaY) > 1e-6) {
      const stepY = Math.sign(deltaY);
      const currentY = pos.y;
      const x = Math.floor(pos.x);
      const z = Math.floor(pos.z);

      if (stepY < 0) { // Moving Down (Ground Check)
        const checkY = Math.floor(currentY + deltaY); // Check voxel below feet
        if (checkY >= 0) {
            const groundSurfaceY = checkY + 1;
            const blockBelow = voxelWorld.getVoxel(x, checkY, z);
            if (blockBelow !== 0 && pos.y >= groundSurfaceY && nextPos.y <= groundSurfaceY) {
                console.log(`Bot Ground Collision at Y=${checkY}`);
                pos.y = groundSurfaceY;
                vel.y *= -this.groundRestitution;
                if (Math.abs(vel.y) < 0.1) vel.y = 0;
                this.onGround = true;
            }
        }
      } else { // Moving Up (Ceiling Check)
        const checkY = Math.floor(currentY + height + deltaY); // Check voxel above head
        // TODO: Add check for world height: checkY < worldHeight
        const ceilingBottomSurfaceY = checkY;
        const blockAbove = voxelWorld.getVoxel(x, checkY, z);
        if (blockAbove !== 0 && (pos.y + height) <= ceilingBottomSurfaceY && (nextPos.y + height) >= ceilingBottomSurfaceY) {
            console.log(`Bot Ceiling Collision at Y=${checkY}`);
            pos.y = ceilingBottomSurfaceY - height;
            vel.y = 0;
        }
      }
    }
    
    // Final position update is done in _applyPhysics after this check
  }
  
  _updateMesh() {
    // Apply visual offset so the model's lowest point aligns with the physics position
    this.mesh.position.set(
      this.position.x,
      this.position.y - this.visualYOffset, 
      this.position.z
    );
  }
  
  getPosition() {
    return this.position.clone();
  }
  
  getVelocity() {
    return this.velocity.clone();
  }
} 