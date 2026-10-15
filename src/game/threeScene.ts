import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { type Tile } from './rules.ts';
import { getTileFrontTexture, getTileBackTexture, getFeltTexture, getWoodTexture } from './textures.ts';

export interface SceneCallbacks {
  onTileClick?: (tileId: string, location: 'rack' | 'board' | 'pouch', meldIndex?: number, tileIndex?: number) => void;
  onTileHover?: (tileId: string | null) => void;
}

export class RummikubScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private container: HTMLElement;
  private callbacks: SceneCallbacks;

  // Scene objects
  private tileMeshMap = new Map<string, THREE.Mesh>();
  private interactiveMeshes: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-999, -999);
  private hoveredMesh: THREE.Mesh | null = null;
  private clock = new THREE.Clock();

  // Camera targets & modes
  public cameraMode: 'title' | 'gameplay' | 'zoom-table' | 'zoom-rack' = 'title';
  private targetCameraPos = new THREE.Vector3(0, 8.5, 9.5);
  private targetCameraLook = new THREE.Vector3(0, 0, 0.5);
  private currentCameraLook = new THREE.Vector3(0, 0, 0.5);
  private titleAngle = 0;

  // Reusable materials & geometries
  private tileGeometry: THREE.BoxGeometry;
  private tileEdgeMaterial: THREE.MeshStandardMaterial;
  private tileBackMaterial: THREE.MeshStandardMaterial;
  private contactShadowGeo: THREE.PlaneGeometry;
  private contactShadowMat: THREE.MeshBasicMaterial;

  // Track currently selected tile for visual highlight
  public selectedTileId: string | null = null;

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c131a');
    this.scene.fog = new THREE.FogExp2('#0c131a', 0.035);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 9, 11);
    this.camera.lookAt(0, 0, 0);

    // 2. Renderer
    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Studio Room Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    this.setupLighting();

    // 5. Build 3D Gaming Table & Player Racks
    this.buildTableAndRacks();

    // 6. Shared tile resources
    this.tileGeometry = new THREE.BoxGeometry(0.72, 0.14, 1.02); // x, y (thickness), z (length)
    this.tileEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5eedb,
      roughness: 0.35,
      metalness: 0.05,
    });
    this.tileBackMaterial = new THREE.MeshStandardMaterial({
      map: getTileBackTexture(this.renderer.capabilities.getMaxAnisotropy()),
      roughness: 0.3,
      metalness: 0.05,
    });

    this.contactShadowGeo = new THREE.PlaneGeometry(0.8, 1.1);
    this.contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    // 7. Event listeners
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);

    window.addEventListener('resize', this.onWindowResize);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);

    // 8. Start Loop
    this.startLoop();
  }

  private setupLighting() {
    // Warm Key Directional Light
    const keyLight = new THREE.DirectionalLight(0xfff3db, 2.2);
    keyLight.position.set(5, 12, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    const d = 8;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Cool Hemisphere Fill Light
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.85);
    hemiLight.position.set(0, 15, 0);
    this.scene.add(hemiLight);

    // Soft Rim Light
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
    rimLight.position.set(-6, 8, -8);
    this.scene.add(rimLight);
  }

  private buildTableAndRacks() {
    const tableGroup = new THREE.Group();

    // A. Green Felt Tabletop Surface
    const feltGeo = new THREE.BoxGeometry(13, 0.4, 9.5);
    const feltMat = new THREE.MeshStandardMaterial({
      map: getFeltTexture(),
      roughness: 0.85,
      metalness: 0.05,
    });
    const feltMesh = new THREE.Mesh(feltGeo, feltMat);
    feltMesh.position.y = -0.2;
    feltMesh.receiveShadow = true;
    tableGroup.add(feltMesh);

    // B. Wooden Table Rim (4 borders with beveled mahogany)
    const woodMat = new THREE.MeshStandardMaterial({
      map: getWoodTexture(),
      roughness: 0.35,
      metalness: 0.1,
    });

    const borderThickness = 0.5;
    const borderHeight = 0.55;

    // Top & Bottom wooden borders
    const horizBorderGeo = new THREE.BoxGeometry(13.8, borderHeight, borderThickness);
    const topBorder = new THREE.Mesh(horizBorderGeo, woodMat);
    topBorder.position.set(0, 0, -4.75 - borderThickness / 2);
    topBorder.castShadow = true;
    topBorder.receiveShadow = true;
    tableGroup.add(topBorder);

    const bottomBorder = new THREE.Mesh(horizBorderGeo, woodMat);
    bottomBorder.position.set(0, 0, 4.75 + borderThickness / 2);
    bottomBorder.castShadow = true;
    bottomBorder.receiveShadow = true;
    tableGroup.add(bottomBorder);

    // Left & Right wooden borders
    const vertBorderGeo = new THREE.BoxGeometry(borderThickness, borderHeight, 10.5);
    const leftBorder = new THREE.Mesh(vertBorderGeo, woodMat);
    leftBorder.position.set(-6.5 - borderThickness / 2, 0, 0);
    leftBorder.castShadow = true;
    leftBorder.receiveShadow = true;
    tableGroup.add(leftBorder);

    const rightBorder = new THREE.Mesh(vertBorderGeo, woodMat);
    rightBorder.position.set(6.5 + borderThickness / 2, 0, 0);
    rightBorder.castShadow = true;
    rightBorder.receiveShadow = true;
    tableGroup.add(rightBorder);

    // Brass corner brackets
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2,
    });
    const cornerOffsets = [
      [-6.7, -5],
      [6.7, -5],
      [-6.7, 5],
      [6.7, 5],
    ];
    cornerOffsets.forEach(([cx, cz]) => {
      const cornerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), brassMat);
      cornerMesh.position.set(cx, 0.05, cz);
      cornerMesh.castShadow = true;
      tableGroup.add(cornerMesh);
    });

    // C. 3 Wooden Tile Racks:
    // 1. Bottom Rack: Player 1 (You)
    this.createPlayerRack(tableGroup, 0, 0.1, 4.0, 0, true);

    // 2. Left Rack: Player 2
    this.createPlayerRack(tableGroup, -5.3, 0.1, -0.5, Math.PI / 2, false);

    // 3. Right Rack: Player 3
    this.createPlayerRack(tableGroup, 5.3, 0.1, -0.5, -Math.PI / 2, false);

    this.scene.add(tableGroup);
  }

  private createPlayerRack(
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    rotationY: number,
    isLocalPlayer: boolean
  ) {
    const rackGroup = new THREE.Group();
    rackGroup.position.set(x, y, z);
    rackGroup.rotation.y = rotationY;

    const rackMat = new THREE.MeshStandardMaterial({
      map: getWoodTexture(),
      roughness: 0.35,
      metalness: 0.08,
    });

    const rackWidth = isLocalPlayer ? 8.6 : 5.8;

    // 2-tier rack base
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, 0.22, 1.4), rackMat);
    baseMesh.position.set(0, 0.11, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    rackGroup.add(baseMesh);

    // Slanted back support for tiles to rest on
    const backSupport = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, 0.6, 0.18), rackMat);
    backSupport.position.set(0, 0.35, -0.55);
    backSupport.rotation.x = -0.22; // slight backward slant
    backSupport.castShadow = true;
    backSupport.receiveShadow = true;
    rackGroup.add(backSupport);

    // Center divider ridge between lower and upper tier
    const divider = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, 0.16, 0.1), rackMat);
    divider.position.set(0, 0.26, 0.05);
    divider.castShadow = true;
    rackGroup.add(divider);

    parent.add(rackGroup);
  }

  /**
   * Updates all 3D tiles: local player's rack, opponent racks, board melds, and center pouch stack
   */
  public updateSceneState(params: {
    playerHand: Tile[];
    player2Count: number;
    player3Count: number;
    board: Tile[][];
    pouchCount: number;
    selectedTileId: string | null;
  }) {
    this.selectedTileId = params.selectedTileId;
    this.interactiveMeshes = [];

    // Keep track of active tile ids to remove unused ones
    const activeTileIds = new Set<string>();

    // 1. Render Local Player's Rack Tiles
    const hand = params.playerHand;
    const tilesPerRow = Math.max(12, Math.ceil(hand.length / 2));
    const tileSpacingX = 0.78;
    const startX = -((Math.min(hand.length, tilesPerRow) - 1) * tileSpacingX) / 2;

    hand.forEach((tile, idx) => {
      activeTileIds.add(tile.id);
      const isSelected = this.selectedTileId === tile.id;
      const isTopRow = idx >= tilesPerRow;
      const colIdx = isTopRow ? idx - tilesPerRow : idx;

      // Position on 2-tier rack
      const posX = startX + colIdx * tileSpacingX;
      const posY = (isTopRow ? 0.72 : 0.48) + (isSelected ? 0.28 : 0);
      const posZ = (isTopRow ? 3.55 : 4.05) - (isSelected ? 0.12 : 0);
      const rotX = -0.32; // angled up toward camera
      const rotY = 0;
      const rotZ = 0;

      this.upsertTileMesh({
        tile,
        position: new THREE.Vector3(posX, posY, posZ),
        rotation: new THREE.Euler(rotX, rotY, rotZ),
        faceUp: true,
        interactive: true,
        metadata: { location: 'rack', tileIndex: idx },
        highlight: isSelected,
      });
    });

    // 2. Render Opponent Racks (facedown/back facing center)
    // Player 2 (Left)
    for (let i = 0; i < params.player2Count; i++) {
      const dummyId = `opp-p2-${i}`;
      activeTileIds.add(dummyId);
      const colIdx = i % 8;
      const rowIdx = Math.floor(i / 8);
      const spacing = 0.65;
      const offsetZ = -1.8 + colIdx * spacing;
      const posY = 0.38 + rowIdx * 0.28;
      const posX = -5.3;

      this.upsertDummyTileMesh({
        id: dummyId,
        position: new THREE.Vector3(posX, posY, offsetZ),
        rotation: new THREE.Euler(0, Math.PI / 2, 0.25),
      });
    }

    // Player 3 (Right)
    for (let i = 0; i < params.player3Count; i++) {
      const dummyId = `opp-p3-${i}`;
      activeTileIds.add(dummyId);
      const colIdx = i % 8;
      const rowIdx = Math.floor(i / 8);
      const spacing = 0.65;
      const offsetZ = -1.8 + colIdx * spacing;
      const posY = 0.38 + rowIdx * 0.28;
      const posX = 5.3;

      this.upsertDummyTileMesh({
        id: dummyId,
        position: new THREE.Vector3(posX, posY, offsetZ),
        rotation: new THREE.Euler(0, -Math.PI / 2, -0.25),
      });
    }

    // 3. Render Board Melds (Center Table)
    const board = params.board;
    // Layout melds in rows across center table (-3.5 to +3.5 in X, -2.5 to 1.8 in Z)
    const meldRowSpacing = 1.35;
    const tileSpacing = 0.76;
    let currentZ = -2.6;
    let currentX = -4.2;

    board.forEach((meld, meldIdx) => {
      const meldWidth = meld.length * tileSpacing;
      // Wrap to next line if exceeds table width
      if (currentX + meldWidth > 4.4 && currentX > -4.2) {
        currentX = -4.2;
        currentZ += meldRowSpacing;
      }

      meld.forEach((tile, tileIdx) => {
        activeTileIds.add(tile.id);
        const posX = currentX + tileIdx * tileSpacing + 0.38;
        const posY = 0.08;
        const posZ = currentZ;

        this.upsertTileMesh({
          tile,
          position: new THREE.Vector3(posX, posY, posZ),
          rotation: new THREE.Euler(-Math.PI / 2, 0, 0), // laying flat on felt face up
          faceUp: true,
          interactive: true,
          metadata: { location: 'board', meldIndex: meldIdx, tileIndex: tileIdx },
          highlight: false,
        });
      });

      // Spacing between sets
      currentX += meldWidth + 0.55;
    });

    // 4. Render Draw Pouch / Center Tile Stack
    // Render top stack tile if pouchCount > 0
    if (params.pouchCount > 0) {
      const stackCount = Math.min(6, Math.ceil(params.pouchCount / 10));
      for (let s = 0; s < stackCount; s++) {
        const pouchTileId = `pouch-stack-${s}`;
        activeTileIds.add(pouchTileId);
        const isTop = s === stackCount - 1;

        this.upsertTileMesh({
          tile: { id: pouchTileId, number: 0, color: 'black', isJoker: false },
          position: new THREE.Vector3(-0.1 + s * 0.02, 0.08 + s * 0.15, -3.8 + s * 0.02),
          rotation: new THREE.Euler(Math.PI / 2, 0, s * 0.06), // face down
          faceUp: false,
          interactive: isTop,
          metadata: { location: 'pouch' },
          highlight: false,
        });
      }
    }

    // 5. Clean up old meshes no longer in active state
    for (const [id, mesh] of this.tileMeshMap.entries()) {
      if (!activeTileIds.has(id)) {
        this.scene.remove(mesh);
        this.tileMeshMap.delete(id);
      }
    }
  }

  private upsertTileMesh(params: {
    tile: Tile;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    faceUp: boolean;
    interactive: boolean;
    metadata: { location: 'rack' | 'board' | 'pouch'; meldIndex?: number; tileIndex?: number };
    highlight: boolean;
  }) {
    let mesh = this.tileMeshMap.get(params.tile.id);

    if (!mesh) {
      // Create materials:
      // Box face order: +X, -X, +Y (front face), -Y (back face), +Z, -Z
      const frontTex = getTileFrontTexture(params.tile, this.renderer.capabilities.getMaxAnisotropy());
      const frontMat = params.faceUp
        ? new THREE.MeshStandardMaterial({
            map: frontTex,
            roughness: 0.28,
            metalness: 0.05,
          })
        : this.tileBackMaterial;

      const materials = [
        this.tileEdgeMaterial, // +X
        this.tileEdgeMaterial, // -X
        frontMat, // +Y
        this.tileBackMaterial, // -Y
        this.tileEdgeMaterial, // +Z
        this.tileEdgeMaterial, // -Z
      ];

      mesh = new THREE.Mesh(this.tileGeometry, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.copy(params.position);
      mesh.rotation.copy(params.rotation);

      this.scene.add(mesh);
      this.tileMeshMap.set(params.tile.id, mesh);
    } else {
      // Smoothly animate towards target position
      mesh.position.lerp(params.position, 0.22);
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, params.rotation.x, 0.22);
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, params.rotation.y, 0.22);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, params.rotation.z, 0.22);
    }

    // Attach metadata for raycasting
    mesh.userData = {
      tileId: params.tile.id,
      ...params.metadata,
      highlight: params.highlight,
    };

    if (params.interactive) {
      this.interactiveMeshes.push(mesh);
    }
  }

  private upsertDummyTileMesh(params: {
    id: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
  }) {
    let mesh = this.tileMeshMap.get(params.id);
    if (!mesh) {
      const materials = [
        this.tileEdgeMaterial,
        this.tileEdgeMaterial,
        this.tileBackMaterial,
        this.tileBackMaterial,
        this.tileEdgeMaterial,
        this.tileEdgeMaterial,
      ];
      mesh = new THREE.Mesh(this.tileGeometry, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.copy(params.position);
      mesh.rotation.copy(params.rotation);
      this.scene.add(mesh);
      this.tileMeshMap.set(params.id, mesh);
    } else {
      mesh.position.lerp(params.position, 0.25);
      mesh.rotation.copy(params.rotation);
    }
  }

  public setCameraView(mode: 'title' | 'gameplay' | 'zoom-table' | 'zoom-rack') {
    this.cameraMode = mode;
    switch (mode) {
      case 'title':
        this.targetCameraLook.set(0, 0, 0);
        break;
      case 'gameplay':
        this.targetCameraPos.set(0, 10.2, 9.6);
        this.targetCameraLook.set(0, 0, 0.2);
        break;
      case 'zoom-table':
        this.targetCameraPos.set(0, 7.5, 6.2);
        this.targetCameraLook.set(0, 0.1, -0.6);
        break;
      case 'zoom-rack':
        this.targetCameraPos.set(0, 5.5, 6.8);
        this.targetCameraLook.set(0, 0.4, 3.8);
        break;
    }
  }

  private onPointerMove(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      if (this.hoveredMesh !== hit) {
        this.hoveredMesh = hit;
        this.renderer.domElement.style.cursor = 'pointer';
        if (this.callbacks.onTileHover) {
          this.callbacks.onTileHover(hit.userData.tileId || null);
        }
      }
    } else {
      if (this.hoveredMesh !== null) {
        this.hoveredMesh = null;
        this.renderer.domElement.style.cursor = 'default';
        if (this.callbacks.onTileHover) {
          this.callbacks.onTileHover(null);
        }
      }
    }
  }

  private onPointerDown(e: MouseEvent) {
    if (e.button !== 0) return; // Left click only
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const data = hit.userData;
      if (data && data.tileId && this.callbacks.onTileClick) {
        this.callbacks.onTileClick(data.tileId, data.location, data.meldIndex, data.tileIndex);
      }
    }
  }

  private onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private startLoop() {
    const tick = () => {
      this.animFrameId = requestAnimationFrame(tick);
      const dt = Math.min(this.clock.getDelta(), 0.05);

      // Camera motion
      if (this.cameraMode === 'title') {
        this.titleAngle += dt * 0.18;
        const radius = 12.5;
        this.camera.position.x = Math.sin(this.titleAngle) * radius;
        this.camera.position.z = Math.cos(this.titleAngle) * radius;
        this.camera.position.y = 8.5 + Math.sin(this.titleAngle * 0.5) * 1.5;
        this.currentCameraLook.lerp(new THREE.Vector3(0, 0, 0), dt * 3);
        this.camera.lookAt(this.currentCameraLook);
      } else {
        this.camera.position.lerp(this.targetCameraPos, dt * 4);
        this.currentCameraLook.lerp(this.targetCameraLook, dt * 4);
        this.camera.lookAt(this.currentCameraLook);
      }

      this.renderer.render(this.scene, this.camera);
    };

    tick();
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
