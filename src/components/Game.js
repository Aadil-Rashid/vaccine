import React, { useEffect } from "react";
import Phaser from "phaser";

const Game = () => {
  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
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
    }

    function create() {
      // Add background with smooth gradient
      const background = this.add.graphics();
      background.fillStyle(0xadd8e6, 1);
      background.fillRect(0, 0, 800, 600);

      // Add hospital-themed decorative elements
      for (let i = 0; i < 6; i++) {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(50, 550);
        this.add.circle(x, y, 20, 0xe6eeff, 0.5);
      }

      // Create player (doctor) with improved visuals
      player = this.physics.add.sprite(400, 300, 'doctor');
      player.setScale(1.2);
      player.setCollideWorldBounds(true);

      // Add UI panel with rounded corners
      const uiPanel = this.add.rectangle(400, 30, 780, 50, 0xffffff, 0.95);
      uiPanel.setStrokeStyle(2, 0x2c3e50);
      uiPanel.setDepth(1);

      // Add timer
      this.gameTimer = 0;
      this.timerText = this.add.text(700, 16, 'Time: 0s', {
          fontSize: '28px',
          fontFamily: 'Arial',
          color: '#2c3e50',
          fontStyle: 'bold'
      });
      this.timerText.setDepth(2);

      // Update score text position and style
      scoreText = this.add.text(16, 16, 'Saved: 0 | Lost: 0', {
          fontSize: '28px',
          fontFamily: 'Arial',
          color: '#2c3e50',
          fontStyle: 'bold',
          backgroundColor: '#ffffff80',
          padding: { x: 10, y: 5 }
      });
      scoreText.setDepth(2);

      // Create patients with dynamic health states
      patients = [];
      for (let i = 0; i < 10; i++) {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(100, 550);
        const health = Phaser.Math.Between(10, 50);
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
        patients.push(patient);
      }

      // Set up player-patient collision detection
      patients.forEach(patient => {
        this.physics.add.overlap(player, patient, healPatient, null, this);
      });

      // Initialize controls
      cursors = this.input.keyboard.createCursorKeys();

      // Create welcome screen with improved UI layout
      const instructionsPanel = this.add.rectangle(400, 300, 600, 400, 0xffffff, 0.9);
      instructionsPanel.setStrokeStyle(4, 0x2c3e50);
      
      const title = this.add.text(400, 180, 'Vaccine Rush!', {
        fontSize: '42px',
        fontFamily: 'Arial',
        color: '#2c3e50',
        fontStyle: 'bold'
      });
      title.setOrigin(0.5);

      // Calculate available width for text
      const padding = 40;
      const maxWidth = 550;  // Panel width minus padding

      const welcomeText = this.add.text(400, 300,
        'Your mission is to save patients before their health depletes!\n\n\n\n' +
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
      welcomeText.setOrigin(0.5);

      // Adjust position if text is too tall
      const totalHeight = title.height + welcomeText.height + 20;
      if (totalHeight > 350) {
        title.setPosition(400, 150);
        welcomeText.setPosition(400, title.y + title.height + 20);
      }

      // Store UI elements for later access
      this.instructionsUI = [instructionsPanel, title, welcomeText];

      // Add sound effects
      this.healSound = { play: () => {} };
      this.patientLostSound = { play: () => {} };
      this.gameOverSound = { play: () => {} };
      this.bgMusic = { play: () => {}, stop: () => {} };

      // Start game on click
      this.input.on('pointerdown', () => {
        if (!gameStarted) {
          gameStarted = true;
          this.bgMusic.play();
          this.instructionsUI.forEach(element => element.destroy());
        } else if (gameOver) {
          restartGame(this);
        }
      });
    }

    function update() {
      if (!gameStarted || gameOver) return;

      // Update timer
      this.gameTimer += this.game.loop.delta;
      this.timerText.setText(`Time: ${Math.floor(this.gameTimer / 1000)}s`);

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
        patient.healthText.setText('100%');
        
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
        
        // Stop emitting and destroy particles after animation
        this.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        this.healSound.play();
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

      // Fancy game over panel with gradient
      const panel = scene.add.rectangle(400, 300, 500, 400, 0xffffff, 0.95);
      panel.setStrokeStyle(4, 0x2c3e50);

      // Add final stats
      const timeElapsed = Math.floor(scene.gameTimer / 1000);
      const saveRate = Math.round((savedPatients / patients.length) * 100);
      
      gameOverText = scene.add.text(400, 200, 
        `Game Over!\n\n` +
        `Time: ${timeElapsed}s\n` +
        `Saved: ${savedPatients}\n` +
        `Lost: ${lostPatients}\n` +
        `Save Rate: ${saveRate}%\n\n` +
        `Click to play again!`, {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#2c3e50',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 10
      });
      gameOverText.setOrigin(0.5);

      // Add star rating based on performance
      const stars = Math.min(5, Math.ceil(saveRate / 20));
      for (let i = 0; i < 5; i++) {
          const star = scene.add.text(300 + (i * 40), 400, '⭐', {
              fontSize: '40px',
              color: i < stars ? '#FFD700' : '#808080'
          });
          star.setOrigin(0.5);
      }
    }


    function updateHealthBar(patient) {
      const healthPercentage = patient.health / patient.initialHealth;
      patient.healthBar.clear();
      patient.healthBar.fillStyle(patient.health <= 0 ? 0x333333 : 0xff0000);
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
      gameStarted = false;
      gameOver = false;
      savedPatients = 0;
      lostPatients = 0;
      patients.forEach(patient => {
        patient.destroy();
        patient.healthText.destroy();
        if (patient.healthBar) patient.healthBar.destroy();
        if (patient.healthBarBg) patient.healthBarBg.destroy();
      });
      patients = [];
      scoreText.setText('Saved: 0 | Lost: 0');
      scene.scene.restart();
    }

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div id="gameContainer" style={{ margin: '0 auto' }}></div>;
};

export default Game;
