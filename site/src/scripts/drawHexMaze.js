// drawHexMaze.js - animated hex-grid line system with flat-top doubled-row coordinates
export default function initHexMaze({ canvas, container } = {}) {
  const host = container || document.body;
  let createdCanvas = false;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    host.appendChild(canvas);
    createdCanvas = true;
  }

  const ctx = canvas.getContext('2d');

  const HEX_SIZE = 20; // hex radius (center to vertex)
  const SQRT3 = Math.sqrt(3);
  const LINE_SPEED = 3; // nodes per second
  const LINE_SEGMENT_COUNT_MAX = 20; // increase max segments so agents wander farther
  const LINE_SEGMENT_COUNT_VARIANCE = 10; // wider variance for longer/shorter paths
  // Default stroke colour for the maze lines (can be overridden with CSS var)
  const LINE_COLOR = '#00A69C'; // , #538349ff,  , #9AB5FF, #61cf5a, #FF46A2, #00A69C, #61cf5a

  // Spawning behavior
  const SPAWN_COUNT_CLICK = 6; 
  const SPAWN_COUNT_MOVE = 1;  
  const MOVE_THROTTLE_MS = 150;

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
    const margin = HEX_SIZE * 3;
    const hexWidth = HEX_SIZE * SQRT3;
    const hexHeight = HEX_SIZE * 1.5;
    
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
          const vx = hexX + HEX_SIZE * Math.cos(angle);
          const vy = hexY + HEX_SIZE * Math.sin(angle);
          
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
    const validNodes = [];
    const nodeIdMapping = new Map();
    
    nodeList.forEach((node) => {
      if (node.x >= -margin && node.x <= width + margin && 
          node.y >= -margin && node.y <= height + margin) {
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
          .map(neighborId => nodeIdMapping.get(neighborId))
          .filter(id => id !== undefined);
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
    
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      if (dist < nearestDist) {
        nearestDist = dist;
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
    const searchRadius = HEX_SIZE * 3;
    for (let j = 0; j < nodeList.length; j++) {
      const node = nodeList[j];
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      if (dist < searchRadius) {
        nearbyNodes.push(j);
      }
    }
    
    for (let i = 0; i < count; i++) {
      // Spread starting nodes around the area to avoid clustering
      let startNodeId = nearestNodeId;
      
      if (i > 0 && nearbyNodes.length > 1) {
        startNodeId = nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)];
      }
      
      lines.push(new Line(startNodeId));
    }

    if (!animating) {
      allEnded = false;
      animating = true;
      rafId = requestAnimationFrame(animate);
    }
  }

  // Line/Agent constructor
  function Line(startNodeId) {
    this.current = startNodeId;
    this.prev = null;
    this.target = null;
    this.progress = 0; // 0 to 1
    this.vertices = [startNodeId]; // visited nodes for drawing
    this.end = false;
    
    // Generate segment count: minimum segments + random variance
    const minSegments = LINE_SEGMENT_COUNT_MAX - LINE_SEGMENT_COUNT_VARIANCE;
    this.segmentCount = Math.floor(Math.random() * LINE_SEGMENT_COUNT_VARIANCE) + minSegments;
    
    // Pick initial target
    this.pickNextTarget();
  }

  Line.prototype.pickNextTarget = function() {
    const neighbors = adj.get(this.current) || [];
    if (neighbors.length === 0) {
      this.end = true;
      return;
    }
    
    // Prefer not to backtrack immediately
    const available = neighbors.filter(n => n !== this.prev);
    const choices = available.length > 0 ? available : neighbors;
    
    this.target = choices[Math.floor(Math.random() * choices.length)];
  };

  Line.prototype.step = function(deltaTime) {
    if (this.end || this.target === null) return;
    
    this.progress += LINE_SPEED * deltaTime;
    
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
  };

  Line.prototype.draw = function(ctx) {
    if (this.vertices.length === 0) return;
    
    // Read styling from CSS variables
    const cs = getComputedStyle(host instanceof Element ? host : document.documentElement);
    const strokeColor = cs.getPropertyValue('--maze-line-color') || LINE_COLOR;
    const strokeWidth = parseFloat(cs.getPropertyValue('--maze-line-width')) || 2;
    
    ctx.beginPath();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor.trim();
    
    // Start from first vertex
    const startNode = nodeList[this.vertices[0]];
    ctx.moveTo(startNode.x, startNode.y);
    
    // Draw through all visited vertices
    for (let i = 1; i < this.vertices.length; i++) {
      const node = nodeList[this.vertices[i]];
      ctx.lineTo(node.x, node.y);
    }
    
    // Draw progress to current target if not ended
    if (!this.end && this.target !== null && this.progress > 0) {
      const currentNode = nodeList[this.current];
      const targetNode = nodeList[this.target];
      const progressX = currentNode.x + (targetNode.x - currentNode.x) * this.progress;
      const progressY = currentNode.y + (targetNode.y - currentNode.y) * this.progress;
      ctx.lineTo(progressX, progressY);
    }
    
    ctx.stroke();
  };

  // Animation loop
  let lastTime = 0;
  function animate(time) {
    const deltaTime = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;

    if (!allEnded) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      allEnded = true;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.end) {
          allEnded = false;
          line.step(deltaTime);
        }
        line.draw(ctx);
      }

      rafId = requestAnimationFrame(animate);
    } else {
      // Final draw when all ended
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < lines.length; i++) {
        lines[i].draw(ctx);
      }
      animating = false;
      rafId = 0;
    }
  }

  // Resize handling
  function resizeCanvas() {
    const rect = host === document.body ? 
      { width: window.innerWidth, height: window.innerHeight } : 
      host.getBoundingClientRect();
    
    const newWidth = Math.round(rect.width);
    const newHeight = Math.round(rect.height);
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Rebuild graph only if canvas expanded beyond current graph bounds
    if (newWidth > graphWidth || newHeight > graphHeight) {
      // Clear lines before rebuilding to prevent stale node references
      lines = [];
      buildGraph(newWidth, newHeight);
      
      // Restart animation if needed
      if (!animating) {
        animating = true;
        allEnded = false;
        rafId = requestAnimationFrame(animate);
      }
    }
  }

  // Pointer controls
  function onClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spawnFromCursor(x, y, SPAWN_COUNT_CLICK);
  }

  let lastMove = 0;
  function onPointerMove(e) {
    const now = Date.now();
    if (now - lastMove > MOVE_THROTTLE_MS) {
      lastMove = now;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spawnFromCursor(x, y, SPAWN_COUNT_MOVE);
    }
  }

  // Initialize
  resizeCanvas();
  buildGraph(canvas.width, canvas.height); // Build initial graph
  window.addEventListener('resize', resizeCanvas);
  host.addEventListener('click', onClick);
  host.addEventListener('pointermove', onPointerMove);

  // Initial seed
  const seedX = canvas.width / 2;
  const seedY = canvas.height / 2;
  spawnFromCursor(seedX, seedY, 3);

  // Return destroy method for cleanup
  return {
    destroy() {
      window.removeEventListener('resize', resizeCanvas);
      host.removeEventListener('click', onClick);
      host.removeEventListener('pointermove', onPointerMove);
      if (rafId) cancelAnimationFrame(rafId);
      lines = [];
      animating = false;
      if (createdCanvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };
}