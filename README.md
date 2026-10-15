# K-Means Angular

Visualizador interactivo del algoritmo **K-Means** construido con Angular 22 y Canvas 2D. Coloca centroides con un clic, lanza el algoritmo y observa en tiempo real cómo convergen. Incluye modo paso a paso, cálculo de inercia, exportación a PNG y múltiples generadores de datos.

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Características

- **Centroides ilimitados**: agrega tantos como quieras con un clic en el canvas. Shift + clic elimina el más cercano.
- **Inicialización automática**: k-means++ (distribución inteligente) o posiciones aleatorias en el lienzo.
- **Múltiples distribuciones de datos**: nubes gaussianas, uniforme, anillo, espiral, cuadrícula y líneas paralelas.
- **Paso a paso**: avanza una iteración manualmente con `⏭ Paso` o deja que corra solo con `▶ Iniciar`.
- **Métrica de inercia en vivo**: chip en la toolbar + HUD flotante sobre el canvas (WCSS: suma de distancias² intra-cluster).
- **Colores aleatorios por centroide**: cada cluster recibe un color HSL único con buen contraste.
- **Lista lateral de centroides**: coordenadas, color, número de puntos asignados y selección interactiva que atenúa los clusters no seleccionados.
- **Exportar PNG** en 2× de resolución con marca de agua (k, iteración, inercia).
- **Responsive**: layout en grid que colapsa a una columna en pantallas pequeñas.

---

## 🚀 Inicio rápido

### Requisitos

- Node.js ≥ 20
- npm ≥ 10
- Angular CLI ≥ 22 (`npm i -g @angular/cli`)

### Instalación

```bash
git clone https://github.com/tu-usuario/Kmeans-Angular.git
cd Kmeans-Angular
npm install
```

### Servidor de desarrollo

```bash
ng serve
```

Abre `http://localhost:4200/`. La app se recarga automáticamente al modificar archivos fuente.

---

## 🎮 Uso

1. **Genera puntos** con `🎲 Nuevos puntos`. Elige cantidad (100–50 000) y distribución en la toolbar.
2. **Coloca centroides**:
   - **Manual**: clic en cualquier parte del canvas.
   - **Automático**: botón `🎯 k-means++` o `🔀 Al azar` (define primero cuántos en el input *Auto-colocar*).
   - **Eliminar**: Shift + clic sobre el centroide más cercano.
3. **Ejecuta**:
   - `▶ Iniciar` → animación fluida con una iteración cada 500 ms.
   - `⏭ Paso` → una sola iteración (ideal para explicar en clase).
   - `⏸ Pausar` → detiene la animación pero conserva el estado.
4. **Observa** la inercia bajar y las iteraciones aumentar en el chip amarillo o en el HUD.
5. **Exporta** el resultado con `📷 Exportar PNG`.

### Atajos

| Acción | Gesto |
| --- | --- |
| Añadir centroide | Clic en el canvas |
| Eliminar centroide más cercano | Shift + clic |
| Seleccionar/desmarcar centroide | Clic en la lista lateral |

---

## 🧠 Cómo funciona el algoritmo

K-Means alterna dos pasos hasta que los centroides dejan de moverse:

1. **Asignación**: cada punto se asigna al centroide más cercano (distancia euclídea).
2. **Actualización**: cada centroide se mueve a la media aritmética de sus puntos.
3. **Convergencia**: si el movimiento total es menor a 0.5 px, el algoritmo termina.

### Inercia (WCSS)

La **inercia** es la suma de distancias al cuadrado de cada punto a su centroide:

$$
\text{Inercia} = \sum_{i=1}^{k} \sum_{x \in C_i} \| x - \mu_i \|^2
$$

Es la función que K-Means **minimiza**. En cada iteración baja o se mantiene — nunca sube. Cuando se estanca, el algoritmo ha convergido.

**Interpretación**: inercia baja ⇒ clusters compactos; inercia alta ⇒ clusters dispersos. No es comparable entre datasets distintos y siempre baja al aumentar `k` (con `k = n`, inercia = 0). Por eso se usa el *método del codo* para elegir `k` óptimo.

---

## 🏗️ Estructura del proyecto

```
src/
├── app/
│   ├── kmeans-canvas/
│   │   ├── kmeans-canvas.component.ts     # Lógica: puntos, K-Means, animación, export
│   │   ├── kmeans-canvas.component.html   # Toolbar + canvas + panel lateral
│   │   └── kmeans-canvas.component.css    # Estilos del componente
│   ├── models/
│   │   └── kmeans-models.ts               # Tipos Point, Centroid
│   ├── app.ts                             # Shell: header, layout, footer
│   └── app.config.ts
├── styles.css                             # Reset global + scrollbars
└── main.ts
```

### Puntos clave del componente

| Método | Qué hace |
| --- | --- |
| `generatePoints()` | Construye puntos según la distribución activa. |
| `step()` | Una iteración de K-Means: asigna + actualiza + calcula inercia. |
| `stepOnce()` | Fuerza una única iteración síncrona (modo paso a paso). |
| `start()` / `pause()` | Arranca o pausa el `requestAnimationFrame`. |
| `exportPng()` | Renderiza a 2× y descarga `kmeans-<timestamp>.png`. |
| `autoPlaceCentroids()` | k-means++ sobre los puntos actuales. |
| `randomPlaceCentroids()` | `k` centroides aleatorios en el lienzo. |

---

## 🛠️ Scripts

| Comando | Descripción |
| --- | --- |
| `ng serve` | Servidor de desarrollo en `http://localhost:4200/`. |
| `ng build` | Build de producción en `dist/`. |
| `ng test` | Tests unitarios con [Vitest](https://vitest.dev/). |
| `ng e2e` | End-to-end (requiere añadir un framework, p. ej. Playwright). |
| `ng generate component <name>` | Genera un componente nuevo. |

### Build de producción

```bash
ng build
```

Los artefactos quedan en `dist/`. El build de producción aplica optimizaciones (minificación, tree-shaking, AOT).

### Tests

```bash
ng test
```

El proyecto usa **Vitest** como runner. Los tests existentes cubren `step()` y los generadores de puntos.

### E2E

Angular CLI no incluye un framework e2e por defecto. Para añadirlo:

```bash
ng e2e
```

Y elige Playwright, Cypress o el que prefieras cuando se te pregunte.

---

## 🧩 Stack técnico

- **Angular 22** con componentes standalone y **signals** para el estado reactivo.
- **Canvas 2D** para el renderizado (bucle `requestAnimationFrame` fuera de la zona de Angular para máximo rendimiento).
- **`NgZone.runOutsideAngular`** durante la animación y `zone.run()` sólo cuando hay que actualizar signals visibles.
- **Sin dependencias externas** más allá de Angular. Cero librerías de gráficos.

---

## 📋 Roadmap / Ideas

- [ ] Método del codo: gráfico de inercia vs. k.
- [ ] Persistencia en `localStorage` / URL.
- [ ] Modo oscuro automático (`prefers-color-scheme`).
- [ ] Métricas de distancia alternativas (Manhattan, Chebyshev).
- [ ] Tooltips en el canvas al pasar sobre centroides.
- [ ] Modal "¿Cómo funciona?" con explicación animada.
- [ ] Tests e2e con Playwright.

---

## 🤝 Contribuir

1. Haz fork del repo.
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`.
3. Commit: `git commit -m "feat: añade X"`.
4. Push: `git push origin feature/nueva-funcionalidad`.
5. Abre un Pull Request.

Se agradecen issues con bugs, sugerencias didácticas o mejoras de UI.

---

## 📄 Licencia

MIT. Ver [LICENSE](LICENSE) para más detalles.

---

## 📚 Recursos

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Angular Signals](https://angular.dev/guide/signals)
- [Canvas API – MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [K-Means – Wikipedia](https://en.wikipedia.org/wiki/K-means_clustering)
- [k-means++ paper (Arthur & Vassilvitskii, 2007)](https://theory.stanford.edu/~sergei/papers/kMeansPP-soda.pdf)