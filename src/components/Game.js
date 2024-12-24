import React, { useEffect } from "react";
import Phaser from "phaser";

const Game = () => {
  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: 1200,
      height: 800,
      backgroundColor: "#ffffff",
      parent: "gameContainer",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: {
        preload,
        create,
        update,
      },
    };

    let player;
    let patients = [];
    let cursors;
    let scoreText;
    let savedPatients = 0;
    let lostPatients = 0;
    let gameStarted = false;
    let gameOver = false;
    let gameOverText;
    let gameTime = 30; // 30 seconds game duration
    let patientSpawnTimer = 0;
    let spawnInterval = 2000; // Spawn a new patient every 2 seconds

    function preload() {
      // Load doctor character texture
      const doctor = new Path2D();
      doctor.moveTo(0, 20);
      doctor.lineTo(40, 20);
      doctor.lineTo(40, 60);
      doctor.lineTo(0, 60);
      doctor.closePath();
      
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      
      // Draw doctor
      ctx.fillStyle = '#ffffff';
      ctx.fill(doctor);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke(doctor);
      
      // Add medical cross
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(15, 30, 10, 20);
      ctx.fillRect(10, 35, 20, 10);
      
      // Convert to base64
      const doctorBase64 = canvas.toDataURL();
      this.textures.addBase64('doctor', doctorBase64);

      // Create patient textures for different health states
      const healthStates = ['critical', 'moderate', 'stable'];
      const colors = ['#ff0000', '#ffa500', '#00ff00'];
      
      healthStates.forEach((state, index) => {
          const patientCanvas = document.createElement('canvas');
          patientCanvas.width = 30;
          patientCanvas.height = 40;
          const patientCtx = patientCanvas.getContext('2d');
          
          // Draw patient body
          patientCtx.fillStyle = '#ffffff';
          patientCtx.fillRect(5, 15, 20, 25);
          patientCtx.fillStyle = colors[index];
          patientCtx.beginPath();
          patientCtx.arc(15, 10, 8, 0, Math.PI * 2);
          patientCtx.fill();
          
          const patientBase64 = patientCanvas.toDataURL();
          this.textures.addBase64(`patient-${state}`, patientBase64);
      });

      // Load audio files
      this.load.audio('bgMusic', '/assets/audio/bgMusic.mp3');
      this.load.audio('healSound', '/assets/audio/heal.mp3');
      this.load.audio('loseSound', '/assets/audio/patientLost.mp3');
      this.load.audio('gameOverSound', '/assets/audio/gameOver.mp3');
      this.load.audio('buttonSound', '/assets/audio/button.mp3');
    }

    function create() {
      // Add background with smooth gradient
      const background = this.add.graphics();
      background.fillStyle(0xadd8e6, 1);
      background.fillRect(0, 0, 1200, 800);

      // Add more decorative elements for larger space
      for (let i = 0; i < 10; i++) {
        const x = Phaser.Math.Between(50, 1150);
        const y = Phaser.Math.Between(50, 750);
        this.add.circle(x, y, 20, 0xe6eeff, 0.5);
      }

      // Center player in larger space
      player = this.physics.add.sprite(600, 400, 'doctor');
      player.setScale(1.2);
      player.setCollideWorldBounds(true);

      // Update UI panel width
      const uiPanel = this.add.rectangle(600, 30, 1180, 50, 0xffffff, 0.95);
      uiPanel.setStrokeStyle(2, 0x2c3e50);
      uiPanel.setDepth(1);

      // Initialize timer for 30 seconds countdown
      this.gameTimer = gameTime * 1000; // Convert to milliseconds
      this.timerText = this.add.text(900, 16, 'Time: 0:30', {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: '#2c3e50',
          fontStyle: 'bold',
          padding: { x: 10, y: 5 }
      });
      this.timerText.setDepth(2);

      // Update score text position and style
      scoreText = this.add.text(300, 16, 'Saved: 0 | Lost: 0', {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: '#2c3e50',
          fontStyle: 'bold',
          backgroundColor: '#ffffff80',
          padding: { x: 10, y: 5 }
      });
      scoreText.setDepth(2);

      // Center both texts in the UI panel
      this.timerText.setOrigin(0.5, 0);
      scoreText.setOrigin(0.5, 0);

      // Start with fewer initial patients
      patients = [];
      for (let i = 0; i < 5; i++) {
          spawnPatient.call(this);
      }

      // Set up player-patient collision detection
      patients.forEach(patient => {
        this.physics.add.overlap(player, patient, healPatient, null, this);
      });

      // Initialize controls
      cursors = this.input.keyboard.createCursorKeys();

      // Create welcome screen with improved UI layout
      const instructionsPanel = this.add.rectangle(600, 400, 600, 400, 0xffffff, 0.9);
      instructionsPanel.setStrokeStyle(4, 0x2c3e50);
      
      const title = this.add.text(600, 200, 'Vaccine Rush!', {
        fontSize: '42px',
        fontFamily: 'Arial',
        color: '#2c3e50',
        fontStyle: 'bold'
      });
      title.setOrigin(0.4, 0.3);

      // Calculate available width for text
      const padding = 40;
      const maxWidth = 550;  // Panel width minus padding

      const welcomeText = this.add.text(600, 400,
        'Your mission is to save patients before virus kills them!\n\n\n\n' +
        '🔴 Red - Critical Condition\n' +
        '🟡 Yellow - Moderate Condition\n' +
        '🟢 Green - Stable Condition\n\n' +
        'Use arrow keys to move\n\n' +
        'Click anywhere to start!', {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#2c3e50',
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: maxWidth, useAdvancedWrap: true }
      });
      welcomeText.setOrigin(0.5, 0.35);

      // Adjust position if text is too tall
      const totalHeight = title.height + welcomeText.height + 20;
      if (totalHeight > 350) {
        title.setPosition(600, 150);
        welcomeText.setPosition(600, title.y + title.height + 20);
      }

      // Store UI elements for later access
      this.instructionsUI = [instructionsPanel, title, welcomeText];

      // Initialize audio with proper configuration
      this.bgMusic = this.sound.add('bgMusic', { 
          loop: true, 
          volume: 0.5 
      });
      
      this.healSound = this.sound.add('healSound', { 
          volume: 0.8 
      });
      
      this.loseSound = this.sound.add('loseSound', { 
          volume: 0.6 
      });
      
      this.gameOverSound = this.sound.add('gameOverSound', { 
          volume: 0.7 
      });

      this.buttonSound = this.sound.add('buttonSound', { 
          volume: 0.5 
      });

      // Add mute button
      const muteButton = this.add.text(1150, 16, '🔊', {
          fontSize: '24px',
          padding: { x: 10, y: 5 }
      });
      muteButton.setInteractive();
      muteButton.setDepth(2);

      let isMuted = false;
      muteButton.on('pointerdown', () => {
          isMuted = !isMuted;
          this.sound.mute = isMuted;
          muteButton.setText(isMuted ? '🔇' : '🔊');
      });

      // Update start game click handler with improved cleanup
      this.input.on('pointerdown', () => {
          if (!gameStarted && this.instructionsUI) {
              // Clean up welcome screen
              this.instructionsUI.forEach(element => {
                  if (element && element.destroy) {
                      element.destroy();
                  }
              });
              // Clear the reference
              this.instructionsUI = null;
              
              // Start the game
              gameStarted = true;
              this.bgMusic.play();
          } else if (gameOver) {
              this.buttonSound.play();
              restartGame(this);
          }
      });
    }

    function update() {
      if (!gameStarted || gameOver) return;

      // Update countdown timer
      this.gameTimer -= this.game.loop.delta;
      if (this.gameTimer <= 0) {
          this.gameTimer = 0;
          endGame(this);
          return;
      }

      // Format and display timer
      const remainingSeconds = Math.ceil(this.gameTimer / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      this.timerText.setText(
          `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`
      );

      // Change timer color when time is running out
      if (remainingSeconds <= 10) {
          this.timerText.setColor('#ff0000');
      }

      // Spawn new patients periodically
      patientSpawnTimer += this.game.loop.delta;
      if (patientSpawnTimer >= spawnInterval) {
          spawnPatient.call(this);
          patientSpawnTimer = 0;
      }

      // Movement logic
      const speed = 300;
      player.setVelocity(0);

      if (cursors.left.isDown) {
        player.setVelocityX(-speed);
      }
      if (cursors.right.isDown) {
        player.setVelocityX(speed);
      }
      if (cursors.up.isDown) {
        player.setVelocityY(-speed);
      }
      if (cursors.down.isDown) {
        player.setVelocityY(speed);
      }

      // Update patients and health bars
      patients.forEach(patient => {
        if (!patient.saved && !patient.dead) {
          patient.health -= 0.1;
          updateHealthBar(patient);

          // Update patient appearance based on health
          if (patient.health <= 30) {
            patient.setTexture('patient-critical');
          } else if (patient.health <= 60) {
            patient.setTexture('patient-moderate');
          } else {
            patient.setTexture('patient-stable');
          }

          if (patient.health <= 0) {
            patient.dead = true;
            patient.setTint(0x333333);
            patient.healthBar.destroy();
            patient.healthBarBg.destroy();
            patient.healthText.destroy();
            this.loseSound.play();  // Play lose sound
            lostPatients++;
            updateScore();
          }
        }
      });

      // Check for game over conditions
      if (savedPatients + lostPatients >= patients.length) {
        endGame(this);
      }
    }

    function healPatient(player, patient) {
      if (!patient.saved && !patient.dead) {
        patient.saved = true;
        patient.health = 100;
        patient.setTexture('patient-stable');
        updateHealthBar(patient);
        
        // Add healing particle effect
        const particles = this.add.particles(patient.x, patient.y, 'patient-stable', {
            speed: 100,
            scale: { start: 0.4, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            gravityY: -50,
            quantity: 1,
            frequency: 50,
            emitting: true
        });
        
        this.healSound.play();  // Play heal sound
        
        // Stop emitting and destroy particles after animation
        this.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        savedPatients++;
        updateScore();
      }
    }

    function updateScore() {
      scoreText.setText(`Saved: ${savedPatients} | Lost: ${lostPatients}`);
    }

    function endGame(scene) {
      gameOver = true;
      scene.bgMusic.stop();
      scene.gameOverSound.play();

      const timeUp = scene.gameTimer <= 0;
      
      // Create a semi-transparent overlay
      const overlay = scene.add.rectangle(600, 400, 1200, 800, 0x000000, 0.5);

      // Even larger panel with more height
      const panel = scene.add.rectangle(600, 400, 650, 600, 0xffffff, 0.95);
      panel.setStrokeStyle(4, 0x2c3e50);

      // Move header to top
      const headerBg = scene.add.rectangle(600, 200, 650, 70, 0x2c3e50);
      
      // Game Over text at top
      const gameOverTitle = scene.add.text(600, 200, 'Game Over!', {
          fontSize: '44px',
          fontFamily: 'Arial',
          color: '#ffffff',
          fontStyle: 'bold',
          align: 'center'
      });
      gameOverTitle.setOrigin(0.5);
      gameOverTitle.setShadow(3, 3, '#000000', 5, true, true);

      // Calculate stats with better formatting
      const timeElapsed = Math.floor(scene.gameTimer / 1000);
      const minutes = Math.floor(timeElapsed / 60);
      const seconds = timeElapsed % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const saveRate = Math.round((savedPatients / patients.length) * 100);

      // Performance calculation (unchanged)
      let performanceText = '';
      let performanceColor = '';
      let starCount = 0;

      if (saveRate >= 90) {
          performanceText = 'Outstanding! 🏆';
          performanceColor = '#FFD700';
          starCount = 5;
      } else if (saveRate >= 80) {
          performanceText = 'Excellent! 🌟';
          performanceColor = '#00FF00';
          starCount = 4;
      } else if (saveRate >= 70) {
          performanceText = 'Great Job! 🌟';
          performanceColor = '#4CAF50';
          starCount = 3;
      } else if (saveRate >= 50) {
          performanceText = 'Keep Practicing! 💪';
          performanceColor = '#FFA500';
          starCount = 2;
      } else if (saveRate >= 30) {
          performanceText = 'Try Again! 🎯';
          performanceColor = '#FF6B6B';
          starCount = 1;
      } else {
          performanceText = 'Keep Going! 🌱';
          performanceColor = '#FF4444';
          starCount = 0;
      }

      // Stats moved further down with more spacing
      const statsStyle = {
          fontSize: '26px',
          fontFamily: 'Arial',
          color: '#2c3e50',
          align: 'left',
          lineSpacing: 35  // Significantly increased line spacing
      };

      // Stats positioned with much more space from title
      const stats = scene.add.text(600, 300, 
          `${timeUp ? '⏰ Time Up!' : ''}` +
          `⏱️ Time: ${timeString}\n` +
          `💉 Saved: ${savedPatients}\n` +
          `💔 Lost: ${lostPatients}\n` +
          `📊 Save Rate: ${saveRate}%`, 
          statsStyle
      );
      stats.setOrigin(0.4, 0.2);

      // Performance text moved down with more space
      const performance = scene.add.text(600, 500, performanceText, {
          fontSize: '32px',
          fontFamily: 'Arial',
          color: performanceColor,
          fontStyle: 'bold'
      });
      performance.setOrigin(0.5, 0.002);

      // Stars moved down with more space
      const starContainer = scene.add.container(0, 670);

      // Play again button at bottom
      const playAgainBtn = scene.add.rectangle(600, 740, 220, 60, 0x2c3e50, 1);
      const playAgainText = scene.add.text(600, 740, 'Play Again', {
          fontSize: '26px',
          fontFamily: 'Arial',
          color: '#ffffff',
          fontStyle: 'bold'
      });
      playAgainText.setOrigin(0.5);

      // Button interactivity
      playAgainBtn.setInteractive();
      playAgainBtn.on('pointerover', () => {
          playAgainBtn.setFillStyle(0x1abc9c);
          playAgainText.setScale(1.1);
          scene.game.canvas.style.cursor = 'pointer';
      });
      playAgainBtn.on('pointerout', () => {
          playAgainBtn.setFillStyle(0x2c3e50);
          playAgainText.setScale(1);
          scene.game.canvas.style.cursor = 'default';
      });
      playAgainBtn.on('pointerdown', () => {
          scene.buttonSound.play();
          playAgainBtn.setFillStyle(0x16a085);
          restartGame(scene);
      });

      // Store all elements
      scene.gameOverElements = [
          overlay, panel, headerBg, gameOverTitle, 
          stats, performance, starContainer, playAgainBtn, playAgainText
      ];
    }

    function updateHealthBar(patient) {
      // Clamp health percentage between 0 and 1
      const healthPercentage = Math.min(1, patient.health / 100);
      patient.healthBar.clear();
      
      // Determine health bar color based on health percentage or saved status
      let barColor;
      if (patient.saved) {
        barColor = 0x00ff00;  // Bright green for saved patients
      } else if (patient.health <= 30) {
        barColor = 0xff0000;  // Red for critical
      } else if (patient.health <= 60) {
        barColor = 0xffa500;  // Orange for moderate
      } else {
        barColor = 0x00ff00;  // Green for healthy
      }
      
      patient.healthBar.fillStyle(patient.health <= 0 ? 0x333333 : barColor);
      patient.healthBar.fillRect(
        patient.x - 20, 
        patient.y - 25, 
        40 * healthPercentage, 
        6
      );
      
      // Update health text with current health percentage
      patient.healthText.setText(`${Math.round(patient.health)}%`);
    }

    function restartGame(scene) {
      // Reset game state
      gameStarted = false;
      gameOver = false;
      savedPatients = 0;
      lostPatients = 0;
      patientSpawnTimer = 0;
      
      // Reset timer
      scene.gameTimer = gameTime * 1000;
      
      // Clean up patients
      patients.forEach(patient => {
          patient.destroy();
          patient.healthText.destroy();
          if (patient.healthBar) patient.healthBar.destroy();
          if (patient.healthBarBg) patient.healthBarBg.destroy();
      });
      patients = [];
      
      // Clean up game over elements
      if (scene.gameOverElements) {
          scene.gameOverElements.forEach(element => {
              if (element && element.destroy) {
                  element.destroy();
              }
          });
          scene.gameOverElements = null;
      }

      // Clean up welcome screen elements
      if (scene.instructionsUI) {
          scene.instructionsUI.forEach(element => {
              if (element && element.destroy) {
                  element.destroy();
              }
          });
          scene.instructionsUI = null;
      }
      
      scoreText.setText('Saved: 0 | Lost: 0');
      
      // Stop any playing music
      if (scene.bgMusic) scene.bgMusic.stop();
      
      scene.scene.restart();
    }

    function spawnPatient() {
        const x = Phaser.Math.Between(50, 1150);
        const y = Phaser.Math.Between(100, 750);
        const health = Phaser.Math.Between(30, 70);
        const patient = this.physics.add.sprite(x, y, 'patient-critical');
        patient.setScale(1.1);
        patient.health = health;
        patient.initialHealth = health;
        patient.saved = false;
        patient.dead = false;

        // Create health bar for each patient
        const healthBarWidth = 40;
        const healthBarHeight = 6;
        patient.healthBar = this.add.graphics();
        patient.healthBarBg = this.add.rectangle(
            x,
            y - 25,
            healthBarWidth,
            healthBarHeight,
            0x000000,
            0.2
        );
        
        // Add health text
        patient.healthText = this.add.text(x, y - 35, '100%', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#000000',
            align: 'center'
        });
        patient.healthText.setOrigin(0.5);
        
        updateHealthBar(patient);
        this.physics.add.overlap(player, patient, healPatient, null, this);
        patients.push(patient);
    }

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div id="gameContainer" style={{ 
    margin: '0 auto',
    maxWidth: '1200px',  // Match game width
    height: '800px'      // Match game height
  }}></div>;
};

export default Game;
