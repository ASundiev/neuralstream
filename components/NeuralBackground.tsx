import React, { useEffect, useRef } from 'react';

const COLORS = [
  'rgba(0, 245, 255, 0.12)', // Cyan
];

const PACKET_COLORS = [
  'rgba(0, 245, 255, 0.8)',
];

export const NeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let packets: Packet[] = [];
    
    // Flash effect state
    let flashIntensity = 0;
    let flashPos = { x: 0, y: 0 };
    let flashRadius = 0;
    let flashPulseCount = 0;

    const PARTICLE_COUNT = 30; 
    const CONNECTION_DIST = 220; 
    const MOUSE_DIST = 250; 
    const PACKET_CHANCE = 0.003;
    const FLASH_CHANCE = 0.003; // Significantly reduced frequency for "slow" feel

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseVx: number;
      baseVy: number;
      colorIndex: number;

      constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.baseVx = (Math.random() - 0.5) * 0.08;
        this.baseVy = (Math.random() - 0.5) * 0.08;
        this.vx = this.baseVx;
        this.vy = this.baseVy;
        this.size = Math.random() * 2 + 1;
        this.colorIndex = Math.floor(Math.random() * COLORS.length);
      }

      update(w: number, h: number) {
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - this.x;
          const dy = mouseRef.current.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < MOUSE_DIST) {
            const force = (MOUSE_DIST - distance) / MOUSE_DIST;
            this.vx += (dx / distance) * force * 0.005;
            this.vy += (dy / distance) * force * 0.005;
          }
        }

        this.vx += (this.baseVx - this.vx) * 0.002;
        this.vy += (this.baseVy - this.vy) * 0.002;

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = w;
        if (this.x > w) this.x = 0;
        if (this.y < 0) this.y = h;
        if (this.y > h) this.y = 0;
      }
    }

    class Packet {
      start: Particle;
      end: Particle;
      progress: number;
      speed: number;
      color: string;

      constructor(start: Particle, end: Particle) {
        this.start = start;
        this.end = end;
        this.progress = 0;
        this.speed = 0.004 + Math.random() * 0.008;
        this.color = PACKET_COLORS[Math.floor(Math.random() * PACKET_COLORS.length)];
      }

      update() {
        this.progress += this.speed;
        return this.progress < 1;
      }

      draw(context: CanvasRenderingContext2D) {
        const x = this.start.x + (this.end.x - this.start.x) * this.progress;
        const y = this.start.y + (this.end.y - this.start.y) * this.progress;

        context.beginPath();
        context.arc(x, y, 1.2, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.shadowBlur = 8;
        context.shadowColor = this.color;
        context.fill();
        context.shadowBlur = 0;
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Thunder/Lightning Rolling Pulse Logic
      if (Math.random() < FLASH_CHANCE && flashIntensity <= 0) {
        flashIntensity = 1.0; 
        flashPulseCount = Math.floor(Math.random() * 2) + 1; // Fewer pulses (1-2)
        flashPos = { 
          x: Math.random() * canvas.width, 
          y: Math.random() * canvas.height 
        };
        flashRadius = Math.random() * Math.max(canvas.width, canvas.height) * 0.4 + 500;
      }

      if (flashIntensity > 0) {
        // Softer flicker for "slow" rolling light
        const noise = Math.random() * 0.1;
        const currentAlpha = (flashIntensity * 0.15) + noise; 
        
        // Rolling position jitter (reduced for smoothness)
        const jitterX = (Math.random() - 0.5) * 20;
        const jitterY = (Math.random() - 0.5) * 20;

        const grad = ctx.createRadialGradient(
          flashPos.x + jitterX, flashPos.y + jitterY, 0,
          flashPos.x + jitterX, flashPos.y + jitterY, flashRadius
        );
        
        grad.addColorStop(0, `rgba(255, 19, 136, ${currentAlpha})`);
        grad.addColorStop(0.3, `rgba(255, 19, 136, ${currentAlpha * 0.4})`);
        grad.addColorStop(0.7, `rgba(255, 19, 136, ${currentAlpha * 0.1})`);
        grad.addColorStop(1, 'rgba(255, 19, 136, 0)');
        
        ctx.save();
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Slow decay
        flashIntensity *= 0.96; 
        
        // Multi-pulse re-triggering with more delay
        if (flashIntensity < 0.1 && flashPulseCount > 0) {
            flashPulseCount--;
            flashIntensity = 0.6 + Math.random() * 0.4;
            // Shift position slightly for the next pulse
            flashPos.x += (Math.random() - 0.5) * 100;
            flashPos.y += (Math.random() - 0.5) * 100;
        }

        if (flashIntensity < 0.005) {
            flashIntensity = 0;
            flashPulseCount = 0;
        }
      }

      if (mouseRef.current.active) {
        for (const p of particles) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < MOUSE_DIST) {
            const alpha = (1 - dist / MOUSE_DIST) * 0.3; 
            ctx.strokeStyle = `rgba(0, 245, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(mouseRef.current.x, mouseRef.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }

      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update(canvas.width, canvas.height);

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

          if (dist < CONNECTION_DIST) {
            ctx.strokeStyle = COLORS[p1.colorIndex];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            if (Math.random() < PACKET_CHANCE && packets.length < 15) {
              packets.push(new Packet(p1, p2));
            }
          }
        }

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
        const pColor = COLORS[p1.colorIndex].replace('0.12', '0.4');
        ctx.fillStyle = pColor; 
        ctx.fill();
      }

      packets = packets.filter(p => {
        const alive = p.update();
        if (alive) p.draw(ctx);
        return alive;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-80 bg-slate-950"
      style={{ filter: 'none' }}
    />
  );
};