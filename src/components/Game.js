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

    function preload() {
      // Create doctor character
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
      // Create player (doctor)
      player = this.physics.add.sprite(400, 300, 'doctor');
      player.setCollideWorldBounds(true);

      // Create patients with different health levels
      for (let i = 0; i < 10; i++) {
          const x = Phaser.Math.Between(50, 750);
          const y = Phaser.Math.Between(50, 550);
          const health = Phaser.Math.Between(10, 50);
          const patient = this.physics.add.sprite(x, y, 'patient-critical');
          patient.health = health;
          patient.initialHealth = health;
          patient.saved = false;
          patient.dead = false;
          
          // Add health text
          patient.healthText = this.add.text(x, y - 20, `${health}%`, {
              fontSize: '16px',
              fill: '#000000'
          });
          patient.healthText.setOrigin(0.5);
          
          patients.push(patient);
      }

      // Add collider
      patients.forEach(patient => {
          this.physics.add.overlap(player, patient, healPatient, null, this);
      });

      // Setup controls
      cursors = this.input.keyboard.createCursorKeys();

      // Add UI
      scoreText = this.add.text(16, 16, 'Saved: 0 | Lost: 0', {
          fontSize: '24px',
          fill: '#000000'
      });

      // Add instructions
      const instructions = this.add.text(400, 300,
          'Hospital Rush!\n\nSave patients before their health reaches 0%\nPrioritize critical patients (red)\nUse arrow keys to move\n\nClick to Start', {
          fontSize: '32px',
          fill: '#000000',
          align: 'center'
      });
      instructions.setOrigin(0.5);

      // Start game on click
      this.input.on('pointerdown', () => {
          if (!gameStarted) {
              gameStarted = true;
              instructions.destroy();
          } else if (gameOver) {
              restartGame(this);
          }
      });
  }

  function update() {
      if (!gameStarted || gameOver) return;

      // Movement
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

      // Update patients
      patients.forEach(patient => {
          if (!patient.saved && !patient.dead) {
              patient.health -= 0.1;
              patient.healthText.setText(`${Math.round(patient.health)}%`);
              
              // Update patient appearance based on health
              if (patient.health <= 30) {
                  patient.setTexture('patient-critical');
              } else if (patient.health <= 60) {
                  patient.setTexture('patient-moderate');
              } else {
                  patient.setTexture('patient-stable');
              }

              // Check for death
              if (patient.health <= 0) {
                  patient.dead = true;
                  patient.setTint(0x333333);
                  patient.healthText.setText('†');
                  lostPatients++;
                  updateScore();
              }
          }
      });

      // Check game over conditions
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
          savedPatients++;
          updateScore();
      }
  }

  function updateScore() {
      scoreText.setText(`Saved: ${savedPatients} | Lost: ${lostPatients}`);
  }

  function endGame(scene) {
      gameOver = true;
      const message = `Game Over!\nPatients Saved: ${savedPatients}\nPatients Lost: ${lostPatients}\n\nClick to restart`;
      gameOverText = scene.add.text(400, 300, message, {
          fontSize: '48px',
          fill: '#000000',
          align: 'center'
      });
      gameOverText.setOrigin(0.5);
  }

  function restartGame(scene) {
      savedPatients = 0;
      lostPatients = 0;
      gameOver = false;
      gameStarted = false;
      scene.scene.restart();
  }

    // Initialize Phaser game
    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true); // Cleanup game instance on component unmount
    };
  }, []);

  return <div id="gameContainer" style={{ width: "100%", height: "100%" }} />;
};

export default Game;
