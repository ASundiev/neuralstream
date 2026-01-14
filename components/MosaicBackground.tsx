import React, { useEffect, useRef } from 'react';

const MAX_TILE_SIZE = 6;
const MIN_TILE_SIZE = 3;
const SPACING = 2;
const HEIGHT_PERCENTAGE = 0.35;
const TOP_ZONE_PERCENTAGE = 0.5;

const BASE_COLOR = 'rgba(255, 255, 255,';
const CYAN_COLOR = 'rgba(0, 245, 255,';
const MAGENTA_COLOR = 'rgba(255, 19, 136,';

export const MosaicBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let tiles: Tile[] = [];
        let drops: Drop[] = [];

        class Drop {
            col: number;
            y: number;
            speed: number;
            length: number;

            constructor(col: number, totalRows: number) {
                this.col = col;
                this.y = -Math.random() * totalRows;
                // Increased speed a tiny bit more
                this.speed = 0.04 + Math.random() * 0.12;
                // Longer tails for more visible "lighter bits"
                this.length = 6 + Math.random() * 12;
            }

            update(totalRows: number) {
                this.y += this.speed;
                if (this.y > totalRows + this.length) {
                    this.y = -this.length;
                    this.speed = 0.04 + Math.random() * 0.12;
                }
            }
        }

        class Tile {
            x: number;
            y: number;
            actualY: number;
            col: number;
            row: number;
            isBottomZone: boolean;
            baseSize: number;
            currentSize: number;
            baseAlpha: number;
            currentAlpha: number;
            color: string;

            constructor(col: number, row: number, totalCols: number, totalRows: number) {
                this.col = col;
                this.row = row;
                this.isBottomZone = row / totalRows > TOP_ZONE_PERCENTAGE;
                this.baseSize = this.isBottomZone ? MIN_TILE_SIZE : MAX_TILE_SIZE;
                this.currentSize = this.baseSize;

                this.x = col * (MAX_TILE_SIZE + SPACING);
                this.actualY = row * (MAX_TILE_SIZE + SPACING);

                const rowRatio = row / totalRows;
                const colRatio = col / totalCols;
                const horizontalDist = Math.abs(colRatio - 0.5) * 2;

                // Sharper central concentration (power of 2.5 instead of 1.5)
                const horizontalFade = Math.pow(Math.max(0, 1 - horizontalDist * 1.5), 2.5);
                const verticalFade = Math.max(0, 1 - rowRatio);
                const distanceFade = verticalFade * horizontalFade;

                // Base alpha reflecting the central glow - boosted dim tiles visibility
                this.baseAlpha = (0.015 + Math.random() * 0.04) * distanceFade;
                this.currentAlpha = this.baseAlpha;

                const colorRand = Math.random();
                // Central tiles are more likely to have brand colors
                const brandProbability = 0.96 - (horizontalFade * 0.06);
                if (colorRand > 0.985) {
                    this.color = MAGENTA_COLOR;
                } else if (colorRand > brandProbability) {
                    this.color = CYAN_COLOR;
                } else {
                    this.color = BASE_COLOR;
                }
            }

            update(columnDrops: Drop[]) {
                let maxImpact = 0;
                for (const drop of columnDrops) {
                    const dist = Math.abs(this.row - drop.y);
                    if (dist < drop.length) {
                        const impact = 1 - (dist / drop.length);
                        maxImpact = Math.max(maxImpact, impact);
                    }
                }

                if (this.isBottomZone) {
                    // Subtle size pulse
                    this.currentSize = this.baseSize + (maxImpact * (MAX_TILE_SIZE - MIN_TILE_SIZE) * 0.3);
                    this.currentAlpha = this.baseAlpha + (maxImpact * 0.12); // Dimmed
                } else {
                    // Dimmed pulsed highlights significantly more (0.22 multiplier)
                    this.currentAlpha = this.baseAlpha + (maxImpact * 0.22);
                    this.currentSize = this.baseSize;
                }
            }

            draw(context: CanvasRenderingContext2D) {
                if (this.currentAlpha <= 0) return;

                context.fillStyle = `${this.color}${this.currentAlpha.toFixed(3)})`;
                const offset = (MAX_TILE_SIZE - this.currentSize) / 2;
                context.fillRect(
                    this.x + offset,
                    this.actualY + offset,
                    this.currentSize,
                    this.currentSize
                );
            }
        }

        const initGrid = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const totalCols = Math.ceil(canvas.width / (MAX_TILE_SIZE + SPACING));
            const totalRows = Math.ceil((canvas.height * HEIGHT_PERCENTAGE) / (MAX_TILE_SIZE + SPACING));

            tiles = [];
            drops = [];

            const colHeights = new Array(totalCols).fill(0).map((_, i) => {
                const colRatio = i / totalCols;
                const horizontalDist = Math.abs(colRatio - 0.5) * 2;
                // Sharper triangular base height (1.6 instead of 1.5)
                const baseHeightRatio = Math.max(0, 1 - horizontalDist * 1.6);
                const noise = Math.random() * 0.3;
                return totalRows * (baseHeightRatio * 0.8 + noise * 0.2);
            });

            for (let c = 0; c < totalCols; c++) {
                const maxHeight = colHeights[c];
                const colRatio = c / totalCols;
                const horizontalDist = Math.abs(colRatio - 0.5) * 2;
                // Sharper central concentration for drops
                const centralFactor = Math.pow(Math.max(0, 1 - horizontalDist * 1.5), 2);

                // High concentration in the center
                const dropProbability = 0.5 + (centralFactor * 0.5);
                if (Math.random() < dropProbability) {
                    drops.push(new Drop(c, totalRows));
                }

                for (let r = 0; r < maxHeight; r++) {
                    // Slight variation in tile population
                    if (Math.random() > 0.12) {
                        tiles.push(new Tile(c, r, totalCols, totalRows));
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const totalRows = Math.ceil((canvas.height * HEIGHT_PERCENTAGE) / (MAX_TILE_SIZE + SPACING));

            for (const drop of drops) {
                drop.update(totalRows);
            }

            for (const tile of tiles) {
                const columnDrops = drops.filter(d => d.col === tile.col);
                tile.update(columnDrops);
                tile.draw(ctx);
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', initGrid);
        initGrid();
        animate();

        return () => {
            window.removeEventListener('resize', initGrid);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ filter: 'blur(0.4px)' }}
        />
    );
};
