import { Component } from '@angular/core';
import { KmeansCanvasComponent } from './kmeans-canvas/kmeans-canvas.component';

@Component({
  selector: 'app-root',
  imports: [KmeansCanvasComponent],
  template: `
    <header class="app-header">
      <div class="brand">
        <span class="logo" aria-hidden="true">
          <span class="dot d1"></span>
          <span class="dot d2"></span>
          <span class="dot d3"></span>
        </span>
        <div class="titles">
          <h1>K-Means en tiempo real</h1>
          <p class="subtitle">
            Coloca centroides con un clic, lanza el algoritmo y observa cómo convergen.
          </p>
        </div>
      </div>

      
    </header>

    <main class="app-main">
      <app-kmeans-canvas />
    </main>

    <footer class="app-footer">
      <span>Hecho con Angular · Canvas 2D</span>
    </footer>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      color: #0f172a;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    }

    /* ---------- Header ---------- */

    .app-header {
      display: flex;
      flex-wrap: wrap;
      gap: 16px 24px;
      align-items: center;
      justify-content: space-between;
      padding: 22px 28px;
      background: linear-gradient(120deg, #0f172a 0%, #1e293b 55%, #334155 100%);
      color: #f8fafc;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: 0 12px 30px -18px rgba(15, 23, 42, 0.6);
      position: relative;
      overflow: hidden;
    }

    /* Halo decorativo */
    .app-header::before {
      content: '';
      position: absolute;
      inset: -40% -10% auto auto;
      width: 520px;
      height: 520px;
      background: radial-gradient(
        circle at center,
        rgba(37, 99, 235, 0.35),
        rgba(37, 99, 235, 0) 60%
      );
      pointer-events: none;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
      position: relative;
      z-index: 1;
    }

    .logo {
      display: grid;
      grid-template-columns: repeat(2, 14px);
      grid-template-rows: repeat(2, 14px);
      gap: 4px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      backdrop-filter: blur(6px);
      flex: 0 0 auto;
    }

    .logo .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: block;
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.4);
    }
    .logo .d1 { background: #f43f5e; }
    .logo .d2 { background: #22c55e; }
    .logo .d3 { background: #3b82f6; grid-column: 1 / span 2; justify-self: center; }

    .titles h1 {
      margin: 0;
      font-size: clamp(1.15rem, 2.2vw, 1.6rem);
      font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1.15;
      background: linear-gradient(90deg, #ffffff, #cbd5e1);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: #cbd5e1;
      max-width: 60ch;
      line-height: 1.45;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      position: relative;
      z-index: 1;
    }

    .badge {
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #e2e8f0;
      backdrop-filter: blur(6px);
      transition: background 0.2s, transform 0.15s;
    }
    .badge:hover {
      background: rgba(255, 255, 255, 0.14);
      transform: translateY(-1px);
    }

    /* ---------- Main ---------- */

    .app-main {
      flex: 1;
      display: block;
      background:
        radial-gradient(circle at 15% 0%, #e2e8f0 0%, transparent 55%),
        radial-gradient(circle at 85% 100%, #dbeafe 0%, transparent 55%),
        #eef2f7;
      padding: 0;
    }

    /* ---------- Footer ---------- */

    .app-footer {
      padding: 18px 28px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    @media (max-width: 640px) {
      .app-header {
        padding: 18px 18px;
      }
      .subtitle { display: none; }
    }
  `],
})
export class App {}