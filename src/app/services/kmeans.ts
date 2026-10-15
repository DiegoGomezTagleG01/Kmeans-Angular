import { Injectable } from '@angular/core';
import { Centroid, Point } from '../models/kmeans-models';

@Injectable({ providedIn: 'root' })
export class KMeansService {

  /** Distancia euclidiana entre dos posiciones */
  distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Paso 1: asigna cada punto al centroide más cercano (muta point.cluster) */
  assign(points: Point[], centroids: Centroid[]): void {
    for (const p of points) {
      let best = 0;
      let bestDist = Infinity;
      centroids.forEach((c, i) => {
        const d = this.distance(p, c);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      p.clusterId = best;
    }
  }

  /** Paso 2: devuelve nuevos centroides = media de los puntos de cada cluster */
  update(points: Point[], centroids: Centroid[]): Centroid[] {
    const sums = centroids.map(() => ({ x: 0, y: 0, n: 0 }));

    for (const p of points) {
      if (p.clusterId < 0) continue;
      const s = sums[p.clusterId];
      s.x += p.x;
      s.y += p.y;
      s.n++;
    }

    return sums.map((s, i) =>
      // Si un cluster quedó vacío, el centroide se queda donde estaba
      s.n === 0
        ? { ...centroids[i] }
        : { ...centroids[i], x: s.x / s.n, y: s.y / s.n }
    );
  }

  /** Paso 3: ¿se movió algún centroide más que epsilon? */
  hasConverged(oldC: Centroid[], newC: Centroid[], epsilon = 0.01): boolean {
    return oldC.every((c, i) => this.distance(c, newC[i]) < epsilon);
  }

  /** Una iteración completa. Devuelve los nuevos centroides y si convergió */
  step(points: Point[], centroids: Centroid[]) {
    this.assign(points, centroids);
    const next = this.update(points, centroids);
    return { centroids: next, converged: this.hasConverged(centroids, next) };
  }
}