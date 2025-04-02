# Voxel Arena

Um jogo voxel simples criado com Three.js.

## Objetivos

- Criar um mundo voxel interativo
- Implementar um personagem controlável
- Adicionar e remover voxels com clique do mouse
- Otimizar a renderização com chunks
- Testar a viabilidade técnica

## Características

- Motor voxel básico baseado em chunks
- Controles de personagem (WASD + espaço)
- Interação com o mundo (adicionar/remover voxels)
- Física simples (gravidade, colisão)
- Iluminação básica com sombras

## Como executar

1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Execute o servidor de desenvolvimento:
   ```
   npm run dev
   ```
4. Abra o navegador em `http://localhost:5173`

## Controles

- **W, A, S, D**: Movimento do personagem
- **Espaço**: Pular
- **Mouse**: Olhar ao redor
- **Clique esquerdo**: Remover voxel
- **Clique direito**: Adicionar voxel
- **Clique no jogo**: Ativar controle do mouse

## Implementação Técnica

### Motor Voxel
- Array 3D para armazenar os voxels
- Sistema de chunks para melhorar a performance
- Renderização eficiente (apenas faces visíveis)

### Renderização
- Three.js para rendering WebGL
- Uso de geometria indexada para melhorar a performance
- Cores por vértice para diferentes tipos de voxels

### Futuras Melhorias
- Implementação de Greedy Meshing para otimização
- Sistema de iluminação mais avançado
- Texturas para os voxels
- Geração procedural mais complexa
- Física mais realista
- Sistema de inventário

## Licença
ISC 