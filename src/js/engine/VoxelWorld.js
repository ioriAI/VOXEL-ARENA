import * as THREE from 'three';

export class VoxelWorld {
  constructor(options) {
    this.chunkSize = options.chunkSize;
    this.worldSize = options.worldSize;
    this.tileSize = options.tileSize;
    this.tileTextureWidth = options.tileTextureWidth;
    this.tileTextureHeight = options.tileTextureHeight;
    
    this.group = new THREE.Group();
    this.chunks = new Map(); // Map de chunks por coordenadas
    
    // Material único para todos os voxels using vertex colors
    this.material = new THREE.MeshLambertMaterial({
      vertexColors: true,
    });
    
    // Estatísticas para debug
    this.stats = {
      renderedVoxels: 0,
      activeChunks: 0
    };
  }
  
  generate() {
    // Gera um mundo plano com alguns montes e vales
    for (let cx = 0; cx < this.worldSize; cx++) {
      for (let cz = 0; cz < this.worldSize; cz++) {
        this._generateChunk(cx, cz);
      }
    }
  }
  
  _generateChunk(chunkX, chunkZ) {
    // Cada chunk tem seu próprio array 3D de voxels
    const chunkKey = `${chunkX},${chunkZ}`;
    const chunk = {
      x: chunkX,
      z: chunkZ,
      voxels: new Uint8Array(this.chunkSize * this.chunkSize * this.chunkSize),
      mesh: null,
    };
    
    // Gera o terreno do chunk (altura básica + alguns montes)
    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        const wx = chunkX * this.chunkSize + x;
        const wz = chunkZ * this.chunkSize + z;
        
        // Altura básica do terreno (função de ruído simples)
        const baseHeight = 5;
        const noiseScale = 0.1;
        const noiseHeight = Math.sin(wx * noiseScale) * Math.cos(wz * noiseScale) * 2;
        const height = Math.floor(baseHeight + noiseHeight);
        
        // Preenche os voxels abaixo da altura
        for (let y = 0; y < height; y++) {
          this._setVoxel(chunk, x, y, z, 1); // Pedra sólida
        }
        
        // Camada de topo (grama)
        if (height > 0) {
          this._setVoxel(chunk, x, height - 1, z, 2); // Grama
        }
      }
    }
    
    // Armazena o chunk
    this.chunks.set(chunkKey, chunk);
    
    // Atualiza estatísticas
    this.stats.activeChunks++;
    
    // Cria o mesh do chunk
    this._updateChunkGeometry(chunk);
  }
  
  _setVoxel(chunk, x, y, z, value) {
    const index = this._getVoxelIndex(x, y, z);
    chunk.voxels[index] = value;
  }
  
  _getVoxel(chunk, x, y, z) {
    const index = this._getVoxelIndex(x, y, z);
    return chunk.voxels[index];
  }
  
  _getVoxelIndex(x, y, z) {
    // Converte coordenadas 3D em índice 1D
    return y * this.chunkSize * this.chunkSize + z * this.chunkSize + x;
  }
  
  _getChunkAtPosition(x, y, z) {
    // Converte coordenadas do mundo para coordenadas de chunk
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    
    // Verifica se está dentro dos limites do mundo
    if (chunkX < 0 || chunkX >= this.worldSize || chunkZ < 0 || chunkZ >= this.worldSize || y < 0 || y >= this.chunkSize) {
      return null;
    }
    
    const chunkKey = `${chunkX},${chunkZ}`;
    return this.chunks.get(chunkKey);
  }
  
  setVoxel(x, y, z, value) {
    const chunk = this._getChunkAtPosition(x, y, z);
    if (!chunk) return;
    
    // Converte coordenadas do mundo para coordenadas locais do chunk
    const localX = x % this.chunkSize;
    const localY = y;
    const localZ = z % this.chunkSize;
    
    this._setVoxel(chunk, localX, localY, localZ, value);
  }
  
  getVoxel(x, y, z) {
    const chunk = this._getChunkAtPosition(x, y, z);
    if (!chunk) return 0;
    
    // Converte coordenadas do mundo para coordenadas locais do chunk
    const localX = x % this.chunkSize;
    const localY = y;
    const localZ = z % this.chunkSize;
    
    return this._getVoxel(chunk, localX, localY, localZ);
  }
  
  updateVoxelGeometry(worldPos) {
    const chunk = this._getChunkAtPosition(worldPos.x, worldPos.y, worldPos.z);
    if (chunk) {
      this._updateChunkGeometry(chunk);
    }
  }
  
  _updateChunkGeometry(chunk) {
    // Remove o mesh antigo se existir
    if (chunk.mesh) {
      this.group.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
    }
    
    // Gera a nova geometria
    const { positions, normals, uvs, indices, colors } = this._generateGeometryData(chunk);
    
    // Cria a geometria e mesh
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    
    // Cria o mesh e adiciona ao grupo
    chunk.mesh = new THREE.Mesh(geometry, this.material);
    chunk.mesh.castShadow = true;
    chunk.mesh.receiveShadow = true;
    
    // Posiciona o mesh no mundo
    chunk.mesh.position.set(
      chunk.x * this.chunkSize * this.tileSize,
      0,
      chunk.z * this.chunkSize * this.tileSize
    );
    
    this.group.add(chunk.mesh);
    
    // Atualiza estatísticas
    this.stats.renderedVoxels = indices.length / 6 * 2; // aproximado
  }
  
  _generateGeometryData(chunk) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colors = [];
    
    // Percorre todos os voxels do chunk
    for (let y = 0; y < this.chunkSize; y++) {
      for (let z = 0; z < this.chunkSize; z++) {
        for (let x = 0; x < this.chunkSize; x++) {
          const voxel = this._getVoxel(chunk, x, y, z);
          if (voxel) {
            // Para cada voxel, adiciona faces onde necessário
            this._addVoxelFaces(chunk, x, y, z, voxel, positions, normals, uvs, indices, colors);
          }
        }
      }
    }
    
    return {
      positions,
      normals,
      uvs,
      indices,
      colors
    };
  }
  
  _addVoxelFaces(chunk, x, y, z, voxelValue, positions, normals, uvs, indices, colors) {
    // Define cores base para diferentes tipos de voxels
    const voxelColors = [
      [0.5, 0.5, 0.5], // Tipo 0 (vazio) - Cinza médio (não renderizado, mas para segurança)
      [0.6, 0.6, 0.6], // Tipo 1 (pedra) - Cinza claro
      [0.3, 0.7, 0.3], // Tipo 2 (grama) - Verde base
      [0.8, 0.7, 0.5], // Tipo 3 (areia) - Bege
      // Adicione mais tipos aqui se necessário
    ];
    
    // Pega a cor base para o tipo de voxel atual
    const baseColor = voxelColors[voxelValue] || voxelColors[0]; // Default to type 0 color if value is invalid

    // Faces: direita, esquerda, cima, baixo, frente, trás
    const directions = [
      { x: 1, y: 0, z: 0, nx: 1, ny: 0, nz: 0 },  // direita
      { x: -1, y: 0, z: 0, nx: -1, ny: 0, nz: 0 }, // esquerda
      { x: 0, y: 1, z: 0, nx: 0, ny: 1, nz: 0 },   // cima
      { x: 0, y: -1, z: 0, nx: 0, ny: -1, nz: 0 }, // baixo
      { x: 0, y: 0, z: 1, nx: 0, ny: 0, nz: 1 },   // frente
      { x: 0, y: 0, z: -1, nx: 0, ny: 0, nz: -1 }, // trás
    ];
    
    for (const dir of directions) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;
      
      // Verifica se o voxel adjacente está vazio ou fora do chunk
      let neighborVoxel = 0;
      
      if (nx >= 0 && nx < this.chunkSize && ny >= 0 && ny < this.chunkSize && nz >= 0 && nz < this.chunkSize) {
        // Voxel dentro do mesmo chunk
        neighborVoxel = this._getVoxel(chunk, nx, ny, nz);
      } else {
        // Voxel em outro chunk ou fora dos limites
        // Convertemos para coordenadas do mundo
        const wx = chunk.x * this.chunkSize + nx;
        const wy = ny;
        const wz = chunk.z * this.chunkSize + nz;
        neighborVoxel = this.getVoxel(wx, wy, wz);
      }
      
      // Se o voxel vizinho é vazio, precisamos renderizar esta face
      if (!neighborVoxel) {
        const ndx = positions.length / 3;
        
        // Adiciona os vértices da face
        this._addFaceVertices(
          positions,
          normals,
          uvs,
          colors,
          x, y, z,
          dir.nx, dir.ny, dir.nz,
          voxelValue,
          baseColor
        );
        
        // Adiciona os índices da face (2 triângulos)
        indices.push(
          ndx, ndx + 1, ndx + 2,
          ndx + 2, ndx + 1, ndx + 3,
        );
      }
    }
  }
  
  _addFaceVertices(positions, normals, uvs, colors, x, y, z, nx, ny, nz, voxelValue, baseColor) {
    // Ajusta para o tamanho dos tiles
    const size = this.tileSize;
    
    // Calcula posições dos vértices com base na normal da face
    const vertices = [];
    
    if (nx === 1) {
      // Face direita (+X)
      vertices.push(
        { pos: [x + 1, y, z], uv: [0, 0] },
        { pos: [x + 1, y + 1, z], uv: [0, 1] },
        { pos: [x + 1, y, z + 1], uv: [1, 0] },
        { pos: [x + 1, y + 1, z + 1], uv: [1, 1] }
      );
    } else if (nx === -1) {
      // Face esquerda (-X)
      vertices.push(
        { pos: [x, y, z + 1], uv: [0, 0] },
        { pos: [x, y + 1, z + 1], uv: [0, 1] },
        { pos: [x, y, z], uv: [1, 0] },
        { pos: [x, y + 1, z], uv: [1, 1] }
      );
    } else if (ny === 1) {
      // Face de cima (+Y)
      vertices.push(
        { pos: [x, y + 1, z], uv: [0, 0] },
        { pos: [x, y + 1, z + 1], uv: [0, 1] },
        { pos: [x + 1, y + 1, z], uv: [1, 0] },
        { pos: [x + 1, y + 1, z + 1], uv: [1, 1] }
      );
    } else if (ny === -1) {
      // Face de baixo (-Y)
      vertices.push(
        { pos: [x, y, z + 1], uv: [0, 0] },
        { pos: [x, y, z], uv: [0, 1] },
        { pos: [x + 1, y, z + 1], uv: [1, 0] },
        { pos: [x + 1, y, z], uv: [1, 1] }
      );
    } else if (nz === 1) {
      // Face frontal (+Z)
      vertices.push(
        { pos: [x + 1, y, z + 1], uv: [0, 0] },
        { pos: [x + 1, y + 1, z + 1], uv: [0, 1] },
        { pos: [x, y, z + 1], uv: [1, 0] },
        { pos: [x, y + 1, z + 1], uv: [1, 1] }
      );
    } else if (nz === -1) {
      // Face traseira (-Z)
      vertices.push(
        { pos: [x, y, z], uv: [0, 0] },
        { pos: [x, y + 1, z], uv: [0, 1] },
        { pos: [x + 1, y, z], uv: [1, 0] },
        { pos: [x + 1, y + 1, z], uv: [1, 1] }
      );
    }
    
    // Adiciona os vértices aos buffers
    for (const vertex of vertices) {
      // Posição (escalada pelo tamanho do tile)
      const worldX = vertex.pos[0] * size;
      const worldY = vertex.pos[1] * size;
      const worldZ = vertex.pos[2] * size;
      
      positions.push(worldX, worldY, worldZ);
      
      // Normal
      normals.push(nx, ny, nz);
      
      // UVs (ainda adicionamos, podem ser úteis para outras coisas no futuro)
      uvs.push(vertex.uv[0], vertex.uv[1]);
      
      // Cor (com variação para grama)
      let r = baseColor[0];
      let g = baseColor[1];
      let b = baseColor[2];

      if (voxelValue === 2) { // Se for grama (Tipo 2)
        // Adiciona uma variação sutil baseada na posição mundial
        // Usando uma função simples e pseudo-aleatória para variação
        const variation = (Math.sin(worldX * 1.1 + worldZ * 0.7) * 0.5 + 0.5) * 0.1; // Variação entre 0 e 0.1
        g = Math.max(0, Math.min(1, g + variation - 0.05)); // Varia o verde
        r = Math.max(0, Math.min(1, r + variation * 0.5 - 0.025)); // Varia um pouco o vermelho/marrom
      }
      
      colors.push(r, g, b);
    }
  }
  
  // Métodos para debug e estatísticas
  getActiveChunksCount() {
    return this.stats.activeChunks;
  }
  
  getRenderedVoxelsCount() {
    return this.stats.renderedVoxels;
  }
} 