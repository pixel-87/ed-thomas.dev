// drawHexMaze.js - animated hex-grid line system with flat-top doubled-row coordinates

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
  constructor(startNodeId, adj, nodeList) {
    this.current = startNodeId;
    this.prev = null;
    this.target = null;
    this.progress = 0; // 0 to 1
    this.vertices = [startNodeId]; // visited nodes for drawing
    this.end = false;
    this.adj = adj;
    this.nodeList = nodeList;

    // Generate segment count: minimum segments + random variance
    const minSegments =
      CONFIG.LINE_SEGMENT_COUNT_MAX - CONFIG.LINE_SEGMENT_COUNT_VARIANCE;
    this.segmentCount =
      Math.floor(Math.random() * CONFIG.LINE_SEGMENT_COUNT_VARIANCE) +
      minSegments;

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

  step(deltaTime) {
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

  draw(ctx, host) {
    if (this.vertices.length === 0) return;

    // Read styling from CSS variables
    const cs = getComputedStyle(
      host instanceof Element ? host : document.documentElement,
    );
    const strokeColor =
      cs.getPropertyValue("--maze-line-color") || CONFIG.LINE_COLOR;
    const strokeWidth =
      parseFloat(cs.getPropertyValue("--maze-line-width")) || 2;

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
      const progressX =
        currentNode.x + (targetNode.x - currentNode.x) * this.progress;
      const progressY =
        currentNode.y + (targetNode.y - currentNode.y) * this.progress;
      ctx.lineTo(progressX, progressY);
    }

    ctx.stroke();
  }
}

export default function initHexMaze({ canvas, container } = {}) {
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

  let allEnded = false;
  let animating = false;
  let lines = [];
  let rafId = 0;
  let nodeList = [];
  let adj = new Map();
  let graphWidth = 0;
  let graphHeight = 0;

  // Build the hex graph - create hexagon edges only
  function buildGraph(width, height) {
    const margin = CONFIG.HEX_SIZE * 3;
    const hexWidth = CONFIG.HEX_SIZE * CONFIG.SQRT3;
    const hexHeight = CONFIG.HEX_SIZE * 1.5;

    nodeList = [];
    adj = new Map();
    const nodeMap = new Map();
    let nodeIdCounter = 0;

    // Store the dimensions this graph was built for
    graphWidth = width;
    graphHeight = height;

    const minCol = Math.floor(-margin / hexWidth);
    const maxCol = Math.ceil((width + margin) / hexWidth);
    const minRow = Math.floor(-margin / hexHeight);
    const maxRow = Math.ceil((height + margin) / hexHeight);

    // Create all hex vertices and connect edges
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const hexX = col * hexWidth + (row % 2) * hexWidth * 0.5;
        const hexY = row * hexHeight;

        const hexVertices = [];
        for (let v = 0; v < 6; v++) {
          const angle = (Math.PI / 3) * v + Math.PI / 6;
          const vx = hexX + CONFIG.HEX_SIZE * Math.cos(angle);
          const vy = hexY + CONFIG.HEX_SIZE * Math.sin(angle);

          // Use integer keys for better map performance/reliability
          const key = `${Math.round(vx * 100)},${Math.round(vy * 100)}`;

          if (!nodeMap.has(key)) {
            const nodeId = nodeIdCounter++;
            nodeMap.set(key, nodeId);
            nodeList.push({ id: nodeId, x: vx, y: vy });
            adj.set(nodeId, []);
          }
          hexVertices.push(nodeMap.get(key));
        }

        // Connect hex edges
        for (let v = 0; v < 6; v++) {
          const nodeA = hexVertices[v];
          const nodeB = hexVertices[(v + 1) % 6];

          if (!adj.get(nodeA).includes(nodeB)) {
            adj.get(nodeA).push(nodeB);
          }
          if (!adj.get(nodeB).includes(nodeA)) {
            adj.get(nodeB).push(nodeA);
          }
        }
      }
    }

    // Filter nodes within bounds and remap IDs
    // This step ensures we don't keep nodes that are way off-screen
    const validNodes = [];
    const nodeIdMapping = new Map();

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

    // Update adjacency with new IDs
    const newAdj = new Map();
    adj.forEach((neighbors, oldId) => {
      const newId = nodeIdMapping.get(oldId);
      if (newId !== undefined) {
        const newNeighbors = neighbors
          .map((neighborId) => nodeIdMapping.get(neighborId))
          .filter((id) => id !== undefined);
        newAdj.set(newId, newNeighbors);
      }
    });

    nodeList = validNodes;
    adj = newAdj;
  }

  // Find nearest node to cursor position
  function findNearestNode(x, y) {
    if (nodeList.length === 0) return null;

    let nearestNode = 0;
    let nearestDist = Infinity;

    // Optimization: Check if we can skip some nodes?
    // For now, linear scan is fast enough for < 5000 nodes
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      const dx = node.x - x;
      const dy = node.y - y;
      // Avoid sqrt for comparison
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDist) {
        nearestDist = distSq;
        nearestNode = i;
      }
    }

    return nearestNode;
  }

  // Spawn lines from cursor
  function spawnFromCursor(x, y, count) {
    const nearestNodeId = findNearestNode(x, y);
    if (nearestNodeId === null) return;

    // Pre-calculate nearby nodes once for all spawns
    const nearbyNodes = [];
    const searchRadius = CONFIG.HEX_SIZE * 3;
    const searchRadiusSq = searchRadius * searchRadius;

    for (let j = 0; j < nodeList.length; j++) {
      const node = nodeList[j];
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < searchRadiusSq) {
        nearbyNodes.push(j);
      }
    }

    for (let i = 0; i < count; i++) {
      let startNodeId = nearestNodeId;

      if (i > 0 && nearbyNodes.length > 1) {
        startNodeId =
          nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)];
      }

      lines.push(new MazeLine(startNodeId, adj, nodeList));
    }

    if (!animating) {
      allEnded = false;
      animating = true;
      rafId = requestAnimationFrame(animate);
    }
  }

  // Animation loop
  let lastTime = 0;
  function animate(time) {
    const deltaTime = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;

    if (!allEnded) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      allEnded = true;
      // Filter out ended lines to keep array small
      lines = lines.filter((line) => {
        if (!line.end) {
          allEnded = false;
          line.step(deltaTime);
        }
        line.draw(ctx, host);
        // Keep line if not ended, or if it just ended (to draw one last time)
        // Actually, we can just keep them until we clear.
        // But for performance, maybe we want to remove them?
        // The original code kept them. Let's keep them to avoid flickering or disappearance.
        return true;
      });

      rafId = requestAnimationFrame(animate);
    } else {
      // Final draw when all ended
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < lines.length; i++) {
        lines[i].draw(ctx, host);
      }
      animating = false;
      rafId = 0;
      lastTime = 0; // Reset time for next animation start
    }
  }

  // Resize handling with debounce
  let resizeTimeout;
  function resizeCanvas() {
    const rect =
      host === document.body
        ? { width: window.innerWidth, height: window.innerHeight }
        : host.getBoundingClientRect();

    const newWidth = Math.round(rect.width);
    const newHeight = Math.round(rect.height);

    canvas.width = newWidth;
    canvas.height = newHeight;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    // Rebuild graph only if canvas expanded beyond current graph bounds
    if (newWidth > graphWidth || newHeight > graphHeight) {
      lines = [];
      buildGraph(newWidth, newHeight);

      if (!animating) {
        animating = true;
        allEnded = false;
        rafId = requestAnimationFrame(animate);
      }
    }
  }

  function onResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 200);
  }

  // Helper to convert pointer coordinates to canvas space
  function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  // Pointer controls
  function onClick(e) {
    const { x, y } = getCanvasCoordinates(e);
    spawnFromCursor(x, y, CONFIG.SPAWN_COUNT_CLICK);
  }

  let lastMove = 0;
  function onPointerMove(e) {
    const now = Date.now();
    if (now - lastMove > CONFIG.MOVE_THROTTLE_MS) {
      lastMove = now;
      const { x, y } = getCanvasCoordinates(e);
      spawnFromCursor(x, y, CONFIG.SPAWN_COUNT_MOVE);
    }
  }

  // Initialize
  resizeCanvas();
  buildGraph(canvas.width, canvas.height);
  window.addEventListener("resize", onResize);
  host.addEventListener("click", onClick);
  host.addEventListener("pointermove", onPointerMove);

  // Initial seed
  const seedX = canvas.width / 2;
  const seedY = canvas.height / 2;
  spawnFromCursor(seedX, seedY, 3);

  // Return destroy method for cleanup
  return {
    destroy() {
      window.removeEventListener("resize", onResize);
      host.removeEventListener("click", onClick);
      host.removeEventListener("pointermove", onPointerMove);
      if (rafId) cancelAnimationFrame(rafId);
      lines = [];
      animating = false;
      if (createdCanvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    },
  };
}