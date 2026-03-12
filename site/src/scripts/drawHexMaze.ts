// drawHexMaze.ts - animated hex-grid line system with flat-top doubled-row coordinates

export interface InitHexMazeOptions {
  canvas?: HTMLCanvasElement;
  container?: HTMLElement;
}

export interface HexNode {
  id: number;
  x: number;
  y: number;
}

const CONFIG = {
  HEX_SIZE: 20, // hex radius (center to vertex)
  SQRT3: Math.sqrt(3),
  LINE_SPEED: 3, // nodes per second
  LINE_SEGMENT_COUNT_MAX: 20,
  LINE_SEGMENT_COUNT_VARIANCE: 10,
  LINE_COLOR: "#00A69C",
  SPAWN_COUNT_CLICK: 6,
  SPAWN_COUNT_MOVE: 1,
  MOVE_THROTTLE_MS: 150,
};

class MazeLine {
  current: number;
  prev: number | null;
  target: number | null;
  progress: number;
  vertices: number[];
  end: boolean;
  adj: Map<number, number[]>;
  nodeList: HexNode[];
  segmentCount: number;

  constructor(startNodeId: number, adj: Map<number, number[]>, nodeList: HexNode[]) {
    this.current = startNodeId;
    this.prev = null;
    this.target = null;
    this.progress = 0; // 0 to 1
    this.vertices = [startNodeId]; // visited nodes for drawing
    this.end = false;
    this.adj = adj;
    this.nodeList = nodeList;

    // Generate segment count: minimum segments + random variance
    const minSegments = CONFIG.LINE_SEGMENT_COUNT_MAX - CONFIG.LINE_SEGMENT_COUNT_VARIANCE;
    this.segmentCount = Math.floor(Math.random() * CONFIG.LINE_SEGMENT_COUNT_VARIANCE) + minSegments;

    // Pick initial target
    this.pickNextTarget();
  }

  pickNextTarget() {
    const neighbors = this.adj.get(this.current) || [];
    if (neighbors.length === 0) {
      this.end = true;
      return;
    }

    // Prefer not to backtrack immediately
    const available = neighbors.filter((n) => n !== this.prev);
    const choices = available.length > 0 ? available : neighbors;

    this.target = choices[Math.floor(Math.random() * choices.length)];
  }

  step(deltaTime: number) {
    if (this.end || this.target === null) return;

    this.progress += CONFIG.LINE_SPEED * deltaTime;

    while (this.progress >= 1.0 && !this.end) {
      // Complete the step
      this.prev = this.current;
      this.current = this.target;
      this.vertices.push(this.current);
      this.progress -= 1.0;

      // Check if we should end
      if (this.vertices.length >= this.segmentCount) {
        this.end = true;
        break;
      }

      // Pick next target
      this.pickNextTarget();
      if (this.end) break;
    }
  }

  draw(ctx: CanvasRenderingContext2D, strokeColor: string, strokeWidth: number) {
    if (this.vertices.length === 0) return;

    ctx.beginPath();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor.trim();

    // Start from first vertex
    const startNode = this.nodeList[this.vertices[0]];
    ctx.moveTo(startNode.x, startNode.y);

    // Draw through all visited vertices
    for (let i = 1; i < this.vertices.length; i++) {
      const node = this.nodeList[this.vertices[i]];
      ctx.lineTo(node.x, node.y);
    }

    // Draw progress to current target if not ended
    if (!this.end && this.target !== null && this.progress > 0) {
      const currentNode = this.nodeList[this.current];
      const targetNode = this.nodeList[this.target];
      const progressX = currentNode.x + (targetNode.x - currentNode.x) * this.progress;
      const progressY = currentNode.y + (targetNode.y - currentNode.y) * this.progress;
      ctx.lineTo(progressX, progressY);
    }

    ctx.stroke();
  }
}

export default function initHexMaze({ canvas, container }: InitHexMazeOptions = {}) {
  const host = container || document.body;
  let createdCanvas = false;

  if (!canvas) {
    canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
    });
    host.appendChild(canvas);
    createdCanvas = true;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy() {} };

  // Offscreen canvas for completed lines to fix memory leak
  const bgCanvas = document.createElement("canvas");
  const bgCtx = bgCanvas.getContext("2d");

  let allEnded = false;
  let animating = false;
  let lines: MazeLine[] = [];
  let rafId = 0;
  let nodeList: HexNode[] = [];
  let adj = new Map<number, number[]>();
  let graphWidth = 0;
  let graphHeight = 0;

  function buildGraph(width: number, height: number) {
    const margin = CONFIG.HEX_SIZE * 3;
    const hexWidth = CONFIG.HEX_SIZE * CONFIG.SQRT3;
    const hexHeight = CONFIG.HEX_SIZE * 1.5;

    nodeList = [];
    adj = new Map();
    const nodeMap = new Map<string, number>();
    let nodeIdCounter = 0;

    graphWidth = width;
    graphHeight = height;

    const minCol = Math.floor(-margin / hexWidth);
    const maxCol = Math.ceil((width + margin) / hexWidth);
    const minRow = Math.floor(-margin / hexHeight);
    const maxRow = Math.ceil((height + margin) / hexHeight);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const hexX = col * hexWidth + (row % 2) * hexWidth * 0.5;
        const hexY = row * hexHeight;

        const hexVertices: number[] = [];
        for (let v = 0; v < 6; v++) {
          const angle = (Math.PI / 3) * v + Math.PI / 6;
          const vx = hexX + CONFIG.HEX_SIZE * Math.cos(angle);
          const vy = hexY + CONFIG.HEX_SIZE * Math.sin(angle);

          const key = `${Math.round(vx * 100)},${Math.round(vy * 100)}`;

          if (!nodeMap.has(key)) {
            const nodeId = nodeIdCounter++;
            nodeMap.set(key, nodeId);
            nodeList.push({ id: nodeId, x: vx, y: vy });
            adj.set(nodeId, []);
          }
          hexVertices.push(nodeMap.get(key)!);
        }

        for (let v = 0; v < 6; v++) {
          const nodeA = hexVertices[v];
          const nodeB = hexVertices[(v + 1) % 6];

          if (!adj.get(nodeA)!.includes(nodeB)) {
            adj.get(nodeA)!.push(nodeB);
          }
          if (!adj.get(nodeB)!.includes(nodeA)) {
            adj.get(nodeB)!.push(nodeA);
          }
        }
      }
    }

    const validNodes: HexNode[] = [];
    const nodeIdMapping = new Map<number, number>();

    nodeList.forEach((node) => {
      if (
        node.x >= -margin &&
        node.x <= width + margin &&
        node.y >= -margin &&
        node.y <= height + margin
      ) {
        const newId = validNodes.length;
        nodeIdMapping.set(node.id, newId);
        validNodes.push({ id: newId, x: node.x, y: node.y });
      }
    });

    const newAdj = new Map<number, number[]>();
    adj.forEach((neighbors, oldId) => {
      const newId = nodeIdMapping.get(oldId);
      if (newId !== undefined) {
        const newNeighbors = neighbors
          .map((neighborId) => nodeIdMapping.get(neighborId))
          .filter((id): id is number => id !== undefined);
        newAdj.set(newId, newNeighbors);
      }
    });

    nodeList = validNodes;
    adj = newAdj;
  }

  function spawnFromCursor(x: number, y: number, count: number) {
    if (nodeList.length === 0) return;

    // Combine O(N) loops to find nearest and nearby nodes simultaneously
    let nearestNodeId = 0;
    let nearestDist = Infinity;
    const nearbyNodes: number[] = [];
    const searchRadiusSq = (CONFIG.HEX_SIZE * 3) ** 2;

    for (let j = 0; j < nodeList.length; j++) {
      const node = nodeList[j];
      const distSq = (node.x - x) ** 2 + (node.y - y) ** 2;
      
      if (distSq < nearestDist) {
        nearestDist = distSq;
        nearestNodeId = j;
      }
      if (distSq < searchRadiusSq) {
        nearbyNodes.push(j);
      }
    }

    for (let i = 0; i < count; i++) {
      let startNodeId = nearestNodeId;
      if (i > 0 && nearbyNodes.length > 1) {
        startNodeId = nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)];
      }
      lines.push(new MazeLine(startNodeId, adj, nodeList));
    }

    if (!animating) {
      allEnded = false;
      animating = true;
      rafId = requestAnimationFrame(animate);
    }
  }

  let lastTime = 0;
  let lastStrokeColor = "";

  function animate(time: number) {
    const deltaTime = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;

    // Cache computed styles once per frame instead of per line
    const cs = getComputedStyle(host instanceof Element ? host : document.documentElement);
    const strokeColor = cs.getPropertyValue("--maze-line-color") || CONFIG.LINE_COLOR;
    const strokeWidth = parseFloat(cs.getPropertyValue("--maze-line-width")) || 2;

    // Clear background canvas if theme color changed
    if (lastStrokeColor && lastStrokeColor !== strokeColor) {
      bgCanvas.width = canvas!.width; // forces clear
    }
    lastStrokeColor = strokeColor;

    if (!allEnded && ctx) {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      if (bgCanvas.width > 0) {
        ctx.drawImage(bgCanvas, 0, 0);
      }

      allEnded = true;
      
      const newLines: MazeLine[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.end) {
          allEnded = false;
          line.step(deltaTime);
          line.draw(ctx, strokeColor, strokeWidth);
          newLines.push(line);
        } else {
          // Line just ended, draw it to the background offscreen canvas
          if (bgCtx) line.draw(bgCtx, strokeColor, strokeWidth);
          // Draw it to the main canvas one last time to prevent a 1-frame flicker
          line.draw(ctx, strokeColor, strokeWidth);
        }
      }
      
      lines = newLines;
      rafId = requestAnimationFrame(animate);
    } else {
      if (ctx) {
        ctx.clearRect(0, 0, canvas!.width, canvas!.height);
        if (bgCanvas.width > 0) {
          ctx.drawImage(bgCanvas, 0, 0);
        }
      }
      animating = false;
      rafId = 0;
      lastTime = 0; 
    }
  }

  let resizeTimeout: number;
  function resizeCanvas() {
    const rect =
      host === document.body
        ? { width: window.innerWidth, height: window.innerHeight }
        : host.getBoundingClientRect();

    const newWidth = Math.round(rect.width);
    const newHeight = Math.round(rect.height);

    canvas!.width = newWidth;
    canvas!.height = newHeight;
    canvas!.style.width = rect.width + "px";
    canvas!.style.height = rect.height + "px";

    if (newWidth > graphWidth || newHeight > graphHeight) {
      // Resize background canvas, which automatically clears it
      bgCanvas.width = newWidth;
      bgCanvas.height = newHeight;

      lines = [];
      buildGraph(newWidth, newHeight);

      if (!animating) {
        animating = true;
        allEnded = false;
        rafId = requestAnimationFrame(animate);
      }
    } else {
      // Need to redraw if canvas resized but graph didn't
      if (!animating && ctx) {
        ctx.clearRect(0, 0, canvas!.width, canvas!.height);
        if (bgCanvas.width > 0) {
          ctx.drawImage(bgCanvas, 0, 0);
        }
      }
    }
  }

  function onResize() {
    clearTimeout(resizeTimeout);
    // @ts-ignore - setTimeout typing
    resizeTimeout = setTimeout(resizeCanvas, 200);
  }

  function getCanvasCoordinates(e: MouseEvent | PointerEvent) {
    const rect = canvas!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function onClick(e: MouseEvent) {
    const { x, y } = getCanvasCoordinates(e);
    spawnFromCursor(x, y, CONFIG.SPAWN_COUNT_CLICK);
  }

  let lastMove = 0;
  function onPointerMove(e: PointerEvent) {
    const now = Date.now();
    if (now - lastMove > CONFIG.MOVE_THROTTLE_MS) {
      lastMove = now;
      const { x, y } = getCanvasCoordinates(e);
      spawnFromCursor(x, y, CONFIG.SPAWN_COUNT_MOVE);
    }
  }

  resizeCanvas();
  buildGraph(canvas!.width, canvas!.height);
  window.addEventListener("resize", onResize);
  host.addEventListener("click", onClick as EventListener);
  host.addEventListener("pointermove", onPointerMove as EventListener);

  const seedX = canvas!.width / 2;
  const seedY = canvas!.height / 2;
  spawnFromCursor(seedX, seedY, 3);

  return {
    destroy() {
      window.removeEventListener("resize", onResize);
      host.removeEventListener("click", onClick as EventListener);
      host.removeEventListener("pointermove", onPointerMove as EventListener);
      if (rafId) cancelAnimationFrame(rafId);
      lines = [];
      animating = false;
      if (createdCanvas && canvas!.parentNode) {
        canvas!.parentNode.removeChild(canvas!);
      }
    },
  };
}