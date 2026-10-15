import {
  Component, ElementRef, NgZone, OnDestroy, AfterViewInit,
  ViewChild, inject, signal, computed
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Centroid, Point } from '../models/kmeans-models';

const PAUSE_MS = 500;
const LERP_FACTOR = 0.15;

export type Distribution =
  | 'gaussian'
  | 'uniform'
  | 'ring'
  | 'spiral'
  | 'grid'
  | 'line';

export type Status = 'idle' | 'running' | 'paused' | 'converged';

interface DistributionOption {
  value: Distribution;
  label: string;
}

interface CentroidListItem {
  index: number;
  x: number;
  y: number;
  color: string;
  count: number;
}

/** Color HSL aleatorio con saturación/luminosidad altas para buen contraste. */
function randomColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 65 + Math.floor(Math.random() * 25);
  const l = 45 + Math.floor(Math.random() * 15);
  return `hsl(${h} ${s}% ${l}%)`;
}

@Component({
  selector: 'app-kmeans-canvas',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './kmeans-canvas.component.html',
  styleUrl: './kmeans-canvas.component.css',
})
export class KmeansCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private zone = inject(NgZone);

  private ctx!: CanvasRenderingContext2D;
  private points: Point[] = [];
  private target: Centroid[] = [];
  private display: Centroid[] = [];
  private colors: string[] = [];

  private rafId = 0;
  private lastStep = 0;
  private converged = false;
  /** Evita re-disparar el loop cuando se pausa */
  private looping = false;

  // Estado para la plantilla
  iterations = signal(0);
  status = signal<Status>('idle');
  centroidCount = signal(0);
  pointCount = signal(10000);
  distribution = signal<Distribution>('gaussian');
  autoK = signal(3);
  inertia = signal(0);
  selectedIndex = signal<number | null>(null);

  private clusterCounts = signal<number[]>([]);
  private pointsVersion = signal(0);

  centroidList = computed<CentroidListItem[]>(() => {
    const counts = this.clusterCounts();
    this.centroidCount();
    this.pointsVersion();
    return this.target.map((c, i) => ({
      index: i,
      x: c.x,
      y: c.y,
      color: this.colors[i] ?? '#000',
      count: counts[i] ?? 0,
    }));
  });

  readonly distributionOptions: DistributionOption[] = [
    { value: 'gaussian', label: 'Agrupados (nubes gaussianas)' },
    { value: 'uniform',  label: 'Aleatorios (uniforme)' },
    { value: 'ring',     label: 'Anillo' },
    { value: 'spiral',   label: 'Espiral' },
    { value: 'grid',     label: 'Cuadrícula' },
    { value: 'line',     label: 'Líneas paralelas' },
  ];

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.generatePoints();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  // ---------- Controles de UI ----------

  onCountChange(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(raw)) return;
    this.pointCount.set(Math.max(100, Math.min(50000, Math.round(raw))));
  }

  onDistributionChange(event: Event): void {
    this.distribution.set((event.target as HTMLSelectElement).value as Distribution);
  }

  onAutoKChange(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(raw)) return;
    this.autoK.set(Math.max(1, Math.min(200, Math.round(raw))));
  }

  selectCentroid(index: number): void {
    this.selectedIndex.set(this.selectedIndex() === index ? null : index);
    this.draw();
  }

  // ---------- Generación de puntos ----------

  generatePoints(): void {
    this.stopInternal();
    this.buildPoints();
    this.pointsVersion.update(v => v + 1);
    this.resetCentroids();
  }

  shufflePoints(): void {
    if (this.status() === 'running') return;
    this.buildPoints();
    this.pointsVersion.update(v => v + 1);
    this.iterations.set(0);
    this.inertia.set(0);
    this.converged = false;
    this.status.set('idle');
    this.points.forEach(p => (p.clusterId = -1));
    this.recomputeStats();
    this.draw();
  }

  private buildPoints(): void {
    const { width, height } = this.canvasRef.nativeElement;
    const count = this.pointCount();
    switch (this.distribution()) {
      case 'uniform':  this.points = this.buildUniform(count, width, height); break;
      case 'ring':     this.points = this.buildRing(count, width, height); break;
      case 'spiral':   this.points = this.buildSpiral(count, width, height); break;
      case 'grid':     this.points = this.buildGrid(count, width, height); break;
      case 'line':     this.points = this.buildLines(count, width, height); break;
      case 'gaussian':
      default:         this.points = this.buildGaussian(count, width, height); break;
    }
  }

  private buildUniform(count: number, width: number, height: number): Point[] {
    return Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      clusterId: -1,
    }));
  }

  private buildGaussian(count: number, width: number, height: number): Point[] {
    const blobs = 3 + Math.floor(Math.random() * 20);
    const centers = Array.from({ length: blobs }, () => ({
      x: 100 + Math.random() * (width - 300),
      y: 100 + Math.random() * (height - 200),
    }));

    return Array.from({ length: count }, () => {
      const c = centers[Math.floor(Math.random() * blobs)];
      return {
        x: this.clamp(c.x + this.gaussian() * 40, 0, width),
        y: this.clamp(c.y + this.gaussian() * 40, 0, height),
        clusterId: -1,
      };
    });
  }

  private buildRing(count: number, width: number, height: number): Point[] {
    const cx = width / 2;
    const cy = height / 2;
    const outer = Math.min(width, height) * 0.42;
    const rings = 1 + Math.floor(Math.random() * 3);
    const radii: number[] = [];
    for (let i = 0; i < rings; i++) {
      radii.push(outer * (0.4 + 0.6 * ((i + 1) / rings)));
    }

    return Array.from({ length: count }, () => {
      const r = radii[Math.floor(Math.random() * radii.length)] + this.gaussian() * 12;
      const theta = Math.random() * Math.PI * 2;
      return {
        x: this.clamp(cx + Math.cos(theta) * r, 0, width),
        y: this.clamp(cy + Math.sin(theta) * r, 0, height),
        clusterId: -1,
      };
    });
  }

  private buildSpiral(count: number, width: number, height: number): Point[] {
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) * 0.45;
    const turns = 3 + Math.random() * 2;

    return Array.from({ length: count }, () => {
      const t = Math.random();
      const theta = t * turns * Math.PI * 2;
      const r = t * maxR + this.gaussian() * 8;
      return {
        x: this.clamp(cx + Math.cos(theta) * r, 0, width),
        y: this.clamp(cy + Math.sin(theta) * r, 0, height),
        clusterId: -1,
      };
    });
  }

  private buildGrid(count: number, width: number, height: number): Point[] {
    const cols = Math.ceil(Math.sqrt(count * (width / height)));
    const rows = Math.ceil(count / cols);
    const cellW = width / cols;
    const cellH = height / rows;

    const pts: Point[] = [];
    for (let r = 0; r < rows && pts.length < count; r++) {
      for (let c = 0; c < cols && pts.length < count; c++) {
        pts.push({
          x: this.clamp((c + 0.5) * cellW + this.gaussian() * 6, 0, width),
          y: this.clamp((r + 0.5) * cellH + this.gaussian() * 6, 0, height),
          clusterId: -1,
        });
      }
    }
    return pts;
  }

  private buildLines(count: number, width: number, height: number): Point[] {
    const lines = 2 + Math.floor(Math.random() * 5);
    const angle = Math.random() * Math.PI;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    return Array.from({ length: count }, () => {
      const lineIdx = Math.floor(Math.random() * lines);
      const offset = ((lineIdx + 1) / (lines + 1)) * Math.min(width, height);
      const t = Math.random();
      const baseX = t * width;
      const baseY = t * height;
      const px = -dy * offset;
      const py = dx * offset;
      return {
        x: this.clamp(baseX + px + this.gaussian() * 5, 0, width),
        y: this.clamp(baseY + py + this.gaussian() * 5, 0, height),
        clusterId: -1,
      };
    });
  }

  private gaussian(): number {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  private clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v));
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Una iteración de K-means sobre `target`. */
  private step(): { centroids: Centroid[]; converged: boolean; inertia: number } {
    const sums = this.target.map(() => ({ x: 0, y: 0, count: 0 }));

    for (const point of this.points) {
      let nearest = 0;
      for (let i = 1; i < this.target.length; i++) {
        if (this.distance(point, this.target[i]) < this.distance(point, this.target[nearest])) {
          nearest = i;
        }
      }
      point.clusterId = nearest;
      sums[nearest].x += point.x;
      sums[nearest].y += point.y;
      sums[nearest].count++;
    }

    const centroids: Centroid[] = this.target.map((centroid, i) => sums[i].count > 0
      ? {
          x: sums[i].x / sums[i].count,
          y: sums[i].y / sums[i].count,
          clusterId: centroid.clusterId,
        }
      : { ...centroid });
    const converged = centroids.every((centroid, i) => this.distance(centroid, this.target[i]) <= 0.5);

    // Inercia = suma de distancias² de cada punto a su centroide
    let inertia = 0;
    for (const p of this.points) {
      if (p.clusterId < 0) continue;
      const c = centroids[p.clusterId];
      inertia += (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
    }

    return { centroids, converged, inertia };
  }

  private recomputeStats(): void {
    const counts = this.target.map(() => 0);
    let inertia = 0;
    for (const p of this.points) {
      if (p.clusterId >= 0 && p.clusterId < counts.length) {
        counts[p.clusterId]++;
        const c = this.target[p.clusterId];
        inertia += (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
      }
    }
    this.clusterCounts.set(counts);
    this.inertia.set(inertia);
  }

  // ---------- Interacción con el ratón ----------

  onCanvasClick(event: MouseEvent): void {
    if (this.status() === 'running') return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    // Shift + clic: eliminar el centroide más cercano
    if (event.shiftKey) {
      if (this.target.length === 0) return;
      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < this.target.length; i++) {
        const d = this.distance({ x, y }, this.target[i]);
        if (d < best) { best = d; nearest = i; }
      }
      this.target.splice(nearest, 1);
      this.display.splice(nearest, 1);
      this.colors.splice(nearest, 1);

      for (const p of this.points) {
        if (p.clusterId === nearest) p.clusterId = -1;
        else if (p.clusterId > nearest) p.clusterId--;
      }

      if (this.selectedIndex() === nearest) this.selectedIndex.set(null);
      else if ((this.selectedIndex() ?? -1) > nearest) this.selectedIndex.update(i => (i ?? 0) - 1);

      this.afterCentroidChange();
      return;
    }

    this.target.push({ x, y, clusterId: -1 });
    this.display.push({ x, y, clusterId: -1 });
    this.colors.push(randomColor());
    this.afterCentroidChange();
  }

  private afterCentroidChange(): void {
    this.centroidCount.set(this.target.length);
    this.points.forEach(p => (p.clusterId = -1));
    this.iterations.set(0);
    this.inertia.set(0);
    this.converged = false;
    this.status.set('idle');
    this.recomputeStats();
    this.draw();
  }

  // ---------- Colocación automática ----------

  autoPlaceCentroids(): void {
    if (this.status() === 'running' || this.points.length === 0) return;
    const k = this.autoK();

    const chosen: { x: number; y: number }[] = [];
    const first = this.points[Math.floor(Math.random() * this.points.length)];
    chosen.push({ x: first.x, y: first.y });

    while (chosen.length < k && chosen.length < this.points.length) {
      const dists = this.points.map(p => {
        let d2 = Infinity;
        for (const c of chosen) {
          const dd = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
          if (dd < d2) d2 = dd;
        }
        return d2;
      });
      const total = dists.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < dists.length; i++) {
        r -= dists[i];
        if (r <= 0) { idx = i; break; }
      }
      chosen.push({ x: this.points[idx].x, y: this.points[idx].y });
    }

    this.target = chosen.map(c => ({ x: c.x, y: c.y, clusterId: -1 }));
    this.display = chosen.map(c => ({ x: c.x, y: c.y, clusterId: -1 }));
    this.colors = chosen.map(() => randomColor());
    this.selectedIndex.set(null);
    this.afterCentroidChange();
  }

  randomPlaceCentroids(): void {
    if (this.status() === 'running') return;
    const { width, height } = this.canvasRef.nativeElement;
    const k = this.autoK();

    this.target = [];
    this.display = [];
    this.colors = [];
    for (let i = 0; i < k; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.target.push({ x, y, clusterId: -1 });
      this.display.push({ x, y, clusterId: -1 });
      this.colors.push(randomColor());
    }
    this.selectedIndex.set(null);
    this.afterCentroidChange();
  }

  resetCentroids(): void {
    this.stopInternal();
    this.target = [];
    this.display = [];
    this.colors = [];
    this.points.forEach(p => (p.clusterId = -1));
    this.iterations.set(0);
    this.inertia.set(0);
    this.centroidCount.set(0);
    this.status.set('idle');
    this.selectedIndex.set(null);
    this.clusterCounts.set([]);
    this.draw();
  }

  // ---------- Control de la animación ----------

  start(): void {
    if (this.target.length === 0) return;
    if (this.status() === 'running') return;
    if (this.status() === 'converged') return;

    if (this.status() === 'idle') {
      this.lastStep = 0;
      this.converged = false;
    }

    this.status.set('running');
    this.looping = true;

    this.zone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame(this.loop);
    });
  }

  pause(): void {
    if (this.status() !== 'running') return;
    this.looping = false;
    cancelAnimationFrame(this.rafId);
    this.status.set('paused');
  }

  /** Para uso interno (reset, regenerar puntos, etc.) sin cambiar el estado visual a "paused". */
  private stopInternal(): void {
    this.looping = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Ejecuta una sola iteración (modo paso a paso). */
  stepOnce(): void {
    if (this.target.length === 0) return;
    if (this.status() === 'running' || this.status() === 'converged') return;

    // Aplica la iteración inmediatamente y ancla los display a la nueva posición.
    const result = this.step();
    this.target = result.centroids;
    this.converged = result.converged;

    // Sincroniza la animación para que los centroides "salten" suavemente
    this.display.forEach((d, i) => {
      d.x = this.target[i].x;
      d.y = this.target[i].y;
    });

    this.iterations.update(n => n + 1);
    this.inertia.set(result.inertia);
    this.recomputeStats();
    this.status.set(this.converged ? 'converged' : 'paused');
    this.draw();
  }

  private loop = (time: number): void => {
    if (!this.looping) return;

    let settled = true;
    this.display.forEach((d, i) => {
      const t = this.target[i];
      if (this.distance(d, t) > 0.5) {
        d.x += (t.x - d.x) * LERP_FACTOR;
        d.y += (t.y - d.y) * LERP_FACTOR;
        settled = false;
      } else {
        d.x = t.x;
        d.y = t.y;
      }
    });

    this.draw();

    if (settled && time - this.lastStep > PAUSE_MS) {
      if (this.converged) {
        this.looping = false;
        this.zone.run(() => this.status.set('converged'));
        return;
      }

      const result = this.step();
      this.target = result.centroids;
      this.converged = result.converged;
      this.lastStep = time;

      this.zone.run(() => {
        this.iterations.update(n => n + 1);
        this.inertia.set(result.inertia);
        this.recomputeStats();
        this.centroidCount.set(this.target.length);
      });
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  // ---------- Exportar PNG ----------

  exportPng(): void {
    const canvas = this.canvasRef.nativeElement;

    // Creamos un canvas temporal con el doble de resolución para exportar nítido
    const scale = 2;
    const out = document.createElement('canvas');
    out.width = canvas.width * scale;
    out.height = canvas.height * scale;

    const ctx = out.getContext('2d');
    if (!ctx) return;

    // Fondo blanco (el canvas original es transparente)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);

    // Escala y dibuja el canvas original encima
    ctx.drawImage(canvas, 0, 0, out.width, out.height);

    // Marca de agua / metadatos discretos
    const stamp = `k=${this.centroidCount()} · iter=${this.iterations()} · inercia=${Math.round(this.inertia())}`;
    ctx.font = `600 ${14 * scale}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(stamp, out.width - 12 * scale, out.height - 10 * scale);

    // Descarga
    const url = out.toDataURL('image/png');
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `kmeans-${ts}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---------- Dibujo ----------

  private draw(): void {
    const { width, height } = this.canvasRef.nativeElement;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    const sel = this.selectedIndex();

    for (const p of this.points) {
      const belongs = sel === null || p.clusterId === sel;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.clusterId < 0
        ? '#9ca3af'
        : (this.colors[p.clusterId] ?? '#9ca3af');
      ctx.globalAlpha = belongs ? 0.75 : 0.08;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.display.forEach((c, i) => {
      const isSelected = sel === i;
      const size = isSelected ? 10 : 8;

      ctx.beginPath();
      ctx.rect(c.x - size, c.y - size, size * 2, size * 2);
      ctx.fillStyle = this.colors[i] ?? '#000';
      ctx.fill();
      ctx.lineWidth = isSelected ? 4 : 3;
      ctx.strokeStyle = isSelected ? '#2563eb' : '#000';
      ctx.stroke();

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, size + 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }
}