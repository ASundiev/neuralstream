
import React, { useEffect, useRef } from 'react';

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

    const PARTICLE_COUNT = 50;
    const CONNECTION_DIST = 200;
    const MOUSE_DIST = 250;
    const PACKET_CHANCE = 0.015;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseVx: number;
      baseVy: number;

      constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.baseVx = (Math.random() - 0.5) * 0.4;
        this.baseVy = (Math.random() - 0.5) * 0.4;
        this.vx = this.baseVx;
        this.vy = this.baseVy;
        this.size = Math.random() * 2 + 1;
      }

      update(w: number, h: number) {
        // Apply mouse influence
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - this.x;
          const dy = mouseRef.current.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < MOUSE_DIST) {
            const force = (MOUSE_DIST - distance) / MOUSE_DIST;
            this.vx += (dx / distance) * force * 0.02;
            this.vy += (dy / distance) * force * 0.02;
          }
        }

        // Friction/Damping to return to base velocity
        this.vx += (this.baseVx - this.vx) * 0.01;
        this.vy += (this.baseVy - this.vy) * 0.01;

        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > w) {
          this.vx *= -1;
          this.baseVx *= -1;
        }
        if (this.y < 0 || this.y > h) {
          this.vy *= -1;
          this.baseVy *= -1;
        }
      }
    }

    class Packet {
      start: Particle;
      end: Particle;
      progress: number;
      speed: number;

      constructor(start: Particle, end: Particle) {
        this.start = start;
        this.end = end;
        this.progress = 0;
        this.speed = 0.015 + Math.random() * 0.025;
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
        context.fillStyle = '#00f5ff';
        context.shadowBlur = 8;
        context.shadowColor = '#00f5ff';
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

      // Draw mouse node connections with enhanced contrast
      if (mouseRef.current.active) {
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 245, 255, 0.4)'; // Increased visibility for cursor node
        ctx.fill();
        
        for (const p of particles) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < MOUSE_DIST) {
            // Dynamic alpha based on proximity to cursor for higher contrast
            const alpha = (1 - dist / MOUSE_DIST) * 0.6; 
            ctx.strokeStyle = `rgba(0, 245, 255, ${alpha})`;
            ctx.lineWidth = 1.0; // Thicker lines for active cursor connections
            ctx.beginPath();
            ctx.moveTo(mouseRef.current.x, mouseRef.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }

      // Draw standard particle-to-particle connections
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.08)'; // Slightly increased base visibility
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update(canvas.width, canvas.height);

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

          if (dist < CONNECTION_DIST) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            if (Math.random() < PACKET_CHANCE && packets.length < 25) {
              packets.push(new Packet(p1, p2));
            }
          }
        }

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 245, 255, 0.35)'; // Sharper nodes
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
      className="fixed inset-0 z-0 pointer-events-none opacity-60 bg-slate-950"
      style={{ filter: 'blur(0.5px)' }}
    />
  );
};
