import { Game } from './engine/Game.js';

// Inicializa o jogo quando a página é carregada
window.addEventListener('load', () => {
  const game = new Game();
  game.init();
  game.start();
  
  // Exibe informações de FPS
  const fpsCounter = document.getElementById('fps-counter');
  const debugInfo = document.getElementById('debug-info');
  
  function updateFPS() {
    fpsCounter.textContent = `FPS: ${game.getFPS().toFixed(1)}`;
    debugInfo.textContent = game.getDebugInfo();
    requestAnimationFrame(updateFPS);
  }
  
  updateFPS();
});

// Gerencia o redimensionamento da janela
window.addEventListener('resize', () => {
  Game.getInstance().handleResize();
}); 