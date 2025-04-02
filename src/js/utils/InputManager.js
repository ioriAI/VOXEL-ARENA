export class InputManager {
  constructor() {
    this.keys = {};
    this.mouseButtons = {};
    this.mousePosition = { x: 0, y: 0 };
    this.mouseDelta = { x: 0, y: 0 };
    
    // Variáveis para movimento do jogador
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false
    };
    
    // Indica se o input está bloqueado (para evitar movimento contínuo)
    this.inputLocked = false;
  }
  
  init() {
    // Garante que os inputs estejam resetados ao iniciar
    this.resetAllInputs();
    this._setupKeyboardEvents();
    this._setupMouseEvents();
    this._setupContextMenu();
    
    // Adiciona eventos para detectar quando a janela perde o foco
    window.addEventListener('blur', () => {
      this.resetAllInputs();
    });
    
    // Reseta também quando o documento está oculto (mudança de aba)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.resetAllInputs();
      }
    });
  }
  
  resetAllInputs() {
    // Reseta todas as entradas de teclado
    this.keys = {};
    
    // Reseta todas as entradas de movimento
    for (const key in this.input) {
      this.input[key] = false;
    }
    
    // Reseta os botões do mouse
    this.mouseButtons = {};
  }
  
  _setupKeyboardEvents() {
    // Mapeia teclas para movimento
    const keyMap = {
      'KeyW': 'forward',
      'KeyS': 'backward',
      'KeyA': 'left',
      'KeyD': 'right',
      'Space': 'jump',
      'ArrowUp': 'forward',
      'ArrowDown': 'backward',
      'ArrowLeft': 'left',
      'ArrowRight': 'right'
    };
    
    // Eventos de teclado
    window.addEventListener('keydown', (event) => {
      if (this.inputLocked) return;
      
      this.keys[event.code] = true;
      
      // Atualiza o estado de entrada para movimentação
      if (keyMap[event.code]) {
        this.input[keyMap[event.code]] = true;
      }
    });
    
    window.addEventListener('keyup', (event) => {
      this.keys[event.code] = false;
      
      // Atualiza o estado de entrada para movimentação
      if (keyMap[event.code]) {
        this.input[keyMap[event.code]] = false;
      }
    });
  }
  
  _setupMouseEvents() {
    // Eventos de mouse
    window.addEventListener('mousedown', (event) => {
      this.mouseButtons[event.button] = true;
    });
    
    window.addEventListener('mouseup', (event) => {
      this.mouseButtons[event.button] = false;
    });
    
    window.addEventListener('mousemove', (event) => {
      // Armazena a posição do mouse
      this.mousePosition.x = event.clientX;
      this.mousePosition.y = event.clientY;
    });
  }
  
  _setupContextMenu() {
    const gameContainer = document.getElementById('game-container');
    
    // Impede o menu de contexto padrão ao clicar com o botão direito
    gameContainer.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
    
    // Define o cursor padrão
    gameContainer.style.cursor = 'default';
  }
  
  getInput() {
    return { ...this.input };
  }
  
  isKeyPressed(code) {
    return !!this.keys[code];
  }
  
  isMouseButtonPressed(button) {
    return !!this.mouseButtons[button];
  }
} 