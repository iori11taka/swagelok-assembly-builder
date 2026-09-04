"use strict";

const canvas = document.getElementById("assemblyCanvas");
const workspace = document.getElementById("workspace");
const deleteBtn = document.getElementById("deleteBtn");
const rotateBtn = document.getElementById("rotateBtn");
const gridToggle = document.getElementById("gridToggle");
const snapToggle = document.getElementById("snapToggle");
const zoomIn = document.getElementById("zoomIn");
const zoomOut = document.getElementById("zoomOut");
const zoomValue = document.getElementById("zoomValue");
const newProjectBtn = document.getElementById("newProjectBtn");
const searchInput = document.getElementById("componentSearch");
const hintText = document.getElementById("hintText");
const selectToolBtn = document.getElementById("selectToolBtn");
const tubingToolBtn = document.getElementById("tubingToolBtn");
const tubingMenu = document.getElementById("tubingMenu");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const propertiesPanel = document.getElementById("propertiesPanel");
const propertiesTitle = document.getElementById("propertiesTitle");
const propertiesBody = document.getElementById("propertiesBody");
const closePropertiesBtn = document.getElementById("closePropertiesBtn");

let selectedComponent = null;
let selectedTubeId = null;
let draggingComponent = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let componentCounter = 0;
let tubingCounter = 0;
let zoom = 1;
let cameraX = 0;
let cameraY = 0;
let currentTool = "select";
let isPanning = false;
let isSpacePressed = false;
let panPointerId = null;
let panStartClientX = 0;
let panStartClientY = 0;
let panStartCameraX = 0;
let panStartCameraY = 0;
let tubingStart = null;
let selectedTubeShape = "straight";
let draggingRigidGroup = false;

const HISTORY_LIMIT = 60;
let undoStack = [];
let redoStack = [];
let isRestoringState = false;

const SNAP_DISTANCE = 115;
const GRID_SIZE = 20;
const PORT_ALIGNMENT_TOLERANCE = 35;

const TUBING_RULES = {
  "1/4": {
    bendRadius: 28,
    leadLength: 50
  }
};

let connections = [];
let tubingConnections = [];

const SVG_NS = "http://www.w3.org/2000/svg";
const tubingLayer = document.createElementNS(SVG_NS, "svg");
tubingLayer.classList.add("tubing-layer");
canvas.appendChild(tubingLayer);

const snapGuide = document.createElement("div");
snapGuide.className = "snap-guide";
canvas.appendChild(snapGuide);

const componentLibrary = {
  regulator: {
    name: "Regulador KPR",
    image: "assets/KPR1.png",
    className: "regulator",
    width: 230,
    height: 230,
    ports: [
      { id: "top-left", x: 0.245, y: 0.225, direction: 225, connection: { family: "thread", standard: "NPT", size: "1/4", gender: "female" } },
      { id: "top-right", x: 0.755, y: 0.225, direction: 315, connection: { family: "thread", standard: "NPT", size: "1/4", gender: "female" } },
      { id: "left", x: 0.055, y: 0.50, direction: 180, connection: { family: "thread", standard: "NPT", size: "1/4", gender: "female" } },
      { id: "right", x: 0.945, y: 0.50, direction: 0, connection: { family: "thread", standard: "NPT", size: "1/4", gender: "female" } }
    ]
  },

  gauge: {
    name: "Manómetro PGI",
    image: "assets/PGI.png",
    className: "gauge",
    width: 175,
    height: 225,
    ports: [
      {
        id: "npt",
        x: 0.50,
        y: 0.965,
        direction: 90,
        insertionDepth: 22,
        connection: { family: "thread", standard: "NPT", size: "1/4", gender: "male" }
      }
    ]
  },

  adapter400: {
    name: "400-1-4",
    image: "assets/400-1-4.png",
    className: "adapter400",
    width: 170,
    height: 77,
    ports: [
      {
        id: "npt",
        x: 0.018,
        y: 0.50,
        direction: 180,
        insertionDepth: 52,
        connection: { family: "thread", standard: "NPT", size: "1/4", gender: "male" }
      },
      {
        id: "tube",
        x: 0.985,
        y: 0.50,
        direction: 0,
        tubingInsertion: 17,
        connection: { family: "tube", size: "1/4", role: "tube-fitting" }
      }
    ]
  },

  union400: {

    name:
      "SS-400-6",

    image:
      "assets/SS-400-6.png",

    className:
      "union400",

    width:
      190,

    height:
      82,

    ports: [

      {
        id:
          "tube-left",

        x:
          0.015,

        y:
          0.50,

        direction:
          180,

        tubingInsertion:
          17,

        connection: {

          family:
            "tube",

          size:
            "1/4",

          role:
            "tube-fitting"

        }

      },

      {
        id:
          "tube-right",

        x:
          0.985,

        y:
          0.50,

        direction:
          0,

        tubingInsertion:
          17,

        connection: {

          family:
            "tube",

          size:
            "1/4",

          role:
            "tube-fitting"

        }

      }

    ]

  },

  needleValve: {

    name:
      "SS-1RS4",

    className:
      "needleValve",

    defaultView:
      "c1",

    category:
      "Válvula",

    cv:
      "0,37",

    connectionLabel:
      '1/4" Swagelok OD × 1/4" Swagelok OD',

    views: {

      c1: {

        label:
          "C1 · Vista superior",

        image:
          "assets/SS-1RS4 C1.png",

        width:
          270,

        height:
          180,

        ports: [

          {
            id:
              "tube-left",

            x:
              0.018,

            y:
              0.50,

            direction:
              180,

            tubingInsertion:
              18,

            connection: {

              family:
                "tube",

              size:
                "1/4",

              role:
                "tube-fitting"

            }

          },

          {
            id:
              "tube-right",

            x:
              0.982,

            y:
              0.50,

            direction:
              0,

            tubingInsertion:
              18,

            connection: {

              family:
                "tube",

              size:
                "1/4",

              role:
                "tube-fitting"

            }

          }

        ]

      },

      c2: {

        label:
          "C2 · Vista frontal",

        image:
          "assets/SS-1RS4 C2.png",

        width:
          220,

        height:
          278,

        ports: [

          {
            id:
              "tube-left",

            x:
              0.012,

            y:
              0.728,

            direction:
              180,

            tubingInsertion:
              18,

            connection: {

              family:
                "tube",

              size:
                "1/4",

              role:
                "tube-fitting"

            }

          },

          {
            id:
              "tube-right",

            x:
              0.988,

            y:
              0.728,

            direction:
              0,

            tubingInsertion:
              18,

            connection: {

              family:
                "tube",

              size:
                "1/4",

              role:
                "tube-fitting"

            }

          }

        ]

      }

    }

  },

  ballValve: {

    name:
      "SS-43GS4",

    className:
      "ballValve",

    defaultView:
      "c2",

    category:
      "Válvula de bola",

    connectionLabel:
      '1/4" Swagelok OD × 1/4" Swagelok OD',

    views: {

      c1: {

        label:
          "C1 · Vista superior",

        image:
          "assets/SS-43GS4 C1.png",

        /*
          Imagen muy panorámica.
          Se mantiene una escala equivalente a fittings 1/4".
        */
        width:
          300,

        height:
          119,

        ports: [

          {
            id:
              "tube-left",

            x:
              0.018,

            y:
              0.515,

            direction:
              180,

            tubingInsertion:
              18,

            connection: {

              family:
                "tube",

              size:
                "1/4",

              role:
                "tube-fitting"

            }

          },

          {
            id:
              "tube-right",

            x:
              0.982,

            y:
              0.515,

            direction:
              0,

            tubingInsertion:
              18,

            connection: {

              family:
                "tube",

              size:
                "1/4",

              role:
                "tube-fitting"

            }

          }

        ]

      },

      c2: {

        label:
          "C2 · Vista frontal",

        image:
          "assets/SS-43GS4 C2.png",

        /*
          Relación original 1536 × 1024 = 1.5.
        */
        width:
          240,

        height:
          160,

        ports: [

          {
            id:
              "tube-left",

            x:
              0.035,

            y:
              0.735,

            direction:
              180,

            tubingInsertion:
              18,

            connection: {

              family:
                "tube",

              size:
                "1/4",

              role:
                "tube-fitting"

            }

          },

          {
            id:
              "tube-right",

            x:
              0.965,

            y:
              0.735,

            direction:
              0,

            tubingInsertion:
              18,

            connection: {

              family:
                "tube",

              size:
                "1/4",

              role:
                "tube-fitting"

            }

          }

        ]

      }

    }

  },

  unionTee400: {

    name:
      "SS-400-3",

    image:
      "assets/SS-400-3.png",

    className:
      "unionTee400",

    width:
      220,

    height:
      147,

    category:
      "Tube Fitting",

    connectionLabel:
      '1/4" Swagelok OD × 1/4" Swagelok OD × 1/4" Swagelok OD',

    ports: [

      {
        id:
          "tube-left",

        x:
          0.018,

        y:
          0.755,

        direction:
          180,

        tubingInsertion:
          18,

        connection: {

          family:
            "tube",

          size:
            "1/4",

          role:
            "tube-fitting"

        }

      },

      {
        id:
          "tube-right",

        x:
          0.982,

        y:
          0.755,

        direction:
          0,

        tubingInsertion:
          18,

        connection: {

          family:
            "tube",

          size:
            "1/4",

          role:
            "tube-fitting"

        }

      },

      {
        id:
          "tube-top",

        x:
          0.505,

        y:
          0.018,

        direction:
          270,

        tubingInsertion:
          18,

        connection: {

          family:
            "tube",

          size:
            "1/4",

          role:
            "tube-fitting"

        }

      }

    ]

  }
};

document.querySelectorAll(".component-card").forEach(card => {
  card.addEventListener("dragstart", event => {
    event.dataTransfer.setData("component-type", card.dataset.component);
    event.dataTransfer.effectAllowed = "copy";
  });
});

workspace.addEventListener("dragover", event => event.preventDefault());

workspace.addEventListener("drop", event => {
  event.preventDefault();

  const type = event.dataTransfer.getData("component-type");
  if (!type) return;

  setTool("select");

  const point = screenToCanvas(event.clientX, event.clientY);
  const component = createComponent(type, point.x, point.y);

  if (component && type !== "regulator" && snapToggle.checked) {
    trySnapComponent(component, true);
  }
});


/* =========================================================
   TOUCH / TABLET DRAG FROM COMPONENT LIBRARY
========================================================= */

/*
  HTML5 Drag & Drop funciona bien con mouse, pero no es
  consistente en iOS/Android. Para touch/pen usamos
  Pointer Events y un "ghost" visual independiente.
*/

let libraryTouchDrag = null;


function createLibraryDragGhost(
  card
) {
  const ghost =
    document.createElement(
      "div"
    );

  ghost.className =
    "library-drag-ghost";

  const image =
    card.querySelector(
      "img"
    );

  const name =
    card.querySelector(
      "strong"
    );

  if (image) {
    const ghostImage =
      image.cloneNode(
        true
      );

    ghost.appendChild(
      ghostImage
    );
  }

  if (name) {
    const label =
      document.createElement(
        "span"
      );

    label.textContent =
      name.textContent.trim();

    ghost.appendChild(
      label
    );
  }

  document.body.appendChild(
    ghost
  );

  return ghost;
}


function positionLibraryDragGhost(
  clientX,
  clientY
) {
  if (
    !libraryTouchDrag ||
    !libraryTouchDrag.ghost
  ) {
    return;
  }

  libraryTouchDrag.ghost.style.left =
    `${clientX}px`;

  libraryTouchDrag.ghost.style.top =
    `${clientY}px`;
}


function isPointInsideWorkspace(
  clientX,
  clientY
) {
  const rect =
    workspace.getBoundingClientRect();

  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}


function cancelLibraryTouchDrag() {
  if (!libraryTouchDrag) {
    return;
  }

  if (
    libraryTouchDrag.ghost
  ) {
    libraryTouchDrag.ghost.remove();
  }

  document.body.classList.remove(
    "library-touch-dragging"
  );

  workspace.classList.remove(
    "touch-drop-target"
  );

  libraryTouchDrag =
    null;
}


document
  .querySelectorAll(
    ".component-card"
  )
  .forEach(card => {

    card.addEventListener(
      "pointerdown",
      event => {

        /*
          Mouse sigue usando el drag/drop original.
          Solo interceptamos touch o stylus.
        */
        if (
          event.pointerType !==
            "touch" &&
          event.pointerType !==
            "pen"
        ) {
          return;
        }

        if (
          event.button !==
          0
        ) {
          return;
        }

        const type =
          card.dataset.component;

        if (!type) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const ghost =
          createLibraryDragGhost(
            card
          );

        libraryTouchDrag = {
          pointerId:
            event.pointerId,

          type:
            type,

          ghost:
            ghost,

          startX:
            event.clientX,

          startY:
            event.clientY
        };

        positionLibraryDragGhost(
          event.clientX,
          event.clientY
        );

        document.body.classList.add(
          "library-touch-dragging"
        );

        try {
          card.setPointerCapture(
            event.pointerId
          );
        }
        catch (error) {}

      },
      {
        passive:
          false
      }
    );

  });


document.addEventListener(
  "pointermove",
  event => {

    if (
      !libraryTouchDrag ||
      event.pointerId !==
        libraryTouchDrag.pointerId
    ) {
      return;
    }

    event.preventDefault();

    positionLibraryDragGhost(
      event.clientX,
      event.clientY
    );

    workspace.classList.toggle(
      "touch-drop-target",
      isPointInsideWorkspace(
        event.clientX,
        event.clientY
      )
    );

  },
  {
    passive:
      false
  }
);


document.addEventListener(
  "pointerup",
  event => {

    if (
      !libraryTouchDrag ||
      event.pointerId !==
        libraryTouchDrag.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const type =
      libraryTouchDrag.type;

    const canDrop =
      isPointInsideWorkspace(
        event.clientX,
        event.clientY
      );

    if (canDrop) {
      setTool(
        "select"
      );

      const point =
        screenToCanvas(
          event.clientX,
          event.clientY
        );

      const component =
        createComponent(
          type,
          point.x,
          point.y
        );

      if (
        component &&
        type !==
          "regulator" &&
        snapToggle.checked
      ) {
        trySnapComponent(
          component,
          true
        );
      }

      showHint(
        "Componente colocado"
      );

      queueMicrotask(
        () => {
          commitHistory();
          renderPropertiesPanel();
        }
      );
    }

    cancelLibraryTouchDrag();

  },
  {
    passive:
      false
  }
);


document.addEventListener(
  "pointercancel",
  event => {

    if (
      !libraryTouchDrag ||
      event.pointerId !==
        libraryTouchDrag.pointerId
    ) {
      return;
    }

    cancelLibraryTouchDrag();

  }
);

selectToolBtn.addEventListener("click", () => setTool("select"));

tubingToolBtn.addEventListener("click", event => {
  event.stopPropagation();
  if (!tubingMenu) return;
  tubingMenu.hidden = !tubingMenu.hidden;
});

if (tubingMenu) {
  tubingMenu.querySelectorAll("[data-tube-shape]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();

      selectedTubeShape = button.dataset.tubeShape;

      tubingMenu.querySelectorAll("[data-tube-shape]").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      tubingMenu.hidden = true;
      setTool("tubing");
      showHint(`${getTubeShapeName(selectedTubeShape)}: selecciona dos Tube Fittings`);
    });
  });
}

document.addEventListener("pointerdown", event => {
  if (!tubingMenu) return;
  if (!event.target.closest(".tubing-tool-group")) {
    tubingMenu.hidden = true;
  }
});


/* =========================================================
   WORKSPACE PAN / MOVER MAPA
========================================================= */

function startWorkspacePan(
  event
) {
  /*
    AutoCAD-style:
    - botón central / rueda presionada
    - Espacio + clic izquierdo
  */

  const middleMouse =
    event.button === 1;

  const interactiveTarget =
    event.target.closest(
      ".connection-port, .canvas-component, .tube-group, button, input, .properties-panel, .floating-toolbar, .zoom-box"
    );

  const spaceLeftMouse =
    isSpacePressed &&
    event.button === 0 &&
    !interactiveTarget;

  if (
    !middleMouse &&
    !spaceLeftMouse
  ) {
    return false;
  }

  event.preventDefault();

  isPanning =
    true;

  panPointerId =
    event.pointerId;

  panStartClientX =
    event.clientX;

  panStartClientY =
    event.clientY;

  panStartCameraX =
    cameraX;

  panStartCameraY =
    cameraY;

  workspace.classList.add(
    "is-panning"
  );

  try {
    workspace.setPointerCapture(
      event.pointerId
    );
  }
  catch (error) {}

  return true;
}


function moveWorkspacePan(
  event
) {
  if (
    !isPanning ||
    event.pointerId !==
      panPointerId
  ) {
    return;
  }

  const deltaX =
    event.clientX -
    panStartClientX;

  const deltaY =
    event.clientY -
    panStartClientY;

  /*
    El lienzo ya no usa scrollbars. El arrastre modifica
    directamente la posición de la cámara virtual.
  */
  cameraX =
    panStartCameraX +
    deltaX;

  cameraY =
    panStartCameraY +
    deltaY;

  updateCameraTransform();
}


function stopWorkspacePan(
  event
) {
  if (
    !isPanning
  ) {
    return;
  }

  if (
    event &&
    panPointerId !== null &&
    event.pointerId !==
      panPointerId
  ) {
    return;
  }

  isPanning =
    false;

  workspace.classList.remove(
    "is-panning"
  );

  if (
    event &&
    panPointerId !== null
  ) {
    try {
      workspace.releasePointerCapture(
        panPointerId
      );
    }
    catch (error) {}
  }

  panPointerId =
    null;
}


workspace.addEventListener(
  "pointerdown",
  event => {
    startWorkspacePan(
      event
    );
  },
  true
);


workspace.addEventListener(
  "pointermove",
  moveWorkspacePan
);


workspace.addEventListener(
  "pointerup",
  stopWorkspacePan
);


workspace.addEventListener(
  "pointercancel",
  stopWorkspacePan
);


/*
  Evita que el navegador active el autoscroll
  al presionar la rueda del mouse.
*/
workspace.addEventListener(
  "auxclick",
  event => {
    if (
      event.button === 1
    ) {
      event.preventDefault();
    }
  }
);


/* =========================================================
   INFINITE CANVAS / CÁMARA VIRTUAL
========================================================= */

function updateCameraTransform() {
  canvas.style.transform =
    `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`;

  const minor =
    GRID_SIZE *
    zoom;

  const major =
    GRID_SIZE *
    5 *
    zoom;

  workspace.style.setProperty(
    "--grid-minor",
    `${minor}px`
  );

  workspace.style.setProperty(
    "--grid-major",
    `${major}px`
  );

  workspace.style.setProperty(
    "--grid-x",
    `${cameraX}px`
  );

  workspace.style.setProperty(
    "--grid-y",
    `${cameraY}px`
  );

  zoomValue.textContent =
    `${Math.round(zoom * 100)}%`;
}


function setTool(tool) {
  currentTool = tool;

  selectToolBtn.classList.toggle("active", tool === "select");
  tubingToolBtn.classList.toggle("active", tool === "tubing");
  canvas.classList.toggle("tubing-mode", tool === "tubing");

  cancelTubingStart();

  if (tool === "tubing") {
    selectComponent(null);
    selectTube(null);
  }
}

function screenToCanvas(clientX, clientY) {
  const rect = workspace.getBoundingClientRect();

  return {
    x:
      (
        clientX -
        rect.left -
        cameraX
      ) /
      zoom,

    y:
      (
        clientY -
        rect.top -
        cameraY
      ) /
      zoom
  };
}

function getComponentDefinitionByType(
  type,
  viewKey = null
) {
  const base =
    componentLibrary[
      type
    ];

  if (!base) {
    return null;
  }

  if (!base.views) {
    return base;
  }

  const resolvedViewKey =
    viewKey ||
    base.defaultView ||
    Object.keys(base.views)[0];

  const view =
    base.views[
      resolvedViewKey
    ] ||
    base.views[
      base.defaultView
    ] ||
    Object.values(base.views)[0];

  return {
    ...base,
    ...view,
    viewKey:
      resolvedViewKey
  };
}


function createComponent(
  type,
  centerX,
  centerY,
  initialView = null
) {
  const baseDefinition =
    componentLibrary[
      type
    ];

  if (!baseDefinition) {
    return null;
  }

  const initialViewKey =
    baseDefinition.views
      ? (
          initialView ||
          baseDefinition.defaultView ||
          Object.keys(baseDefinition.views)[0]
        )
      : null;

  const definition =
    getComponentDefinitionByType(
      type,
      initialViewKey
    );

  if (!definition) {
    return null;
  }

  componentCounter++;

  const component =
    document.createElement(
      "div"
    );

  component.className =
    `canvas-component ${baseDefinition.className}`;

  component.dataset.id =
    String(
      componentCounter
    );

  component.dataset.type =
    type;

  component.dataset.rotation =
    "0";

  if (
    baseDefinition.views
  ) {
    component.dataset.view =
      initialViewKey;
  }

  component.style.width =
    `${definition.width}px`;

  component.style.height =
    `${definition.height}px`;

  component.style.left =
    `${
      centerX -
      definition.width /
      2
    }px`;

  component.style.top =
    `${
      centerY -
      definition.height /
      2
    }px`;

  const visual =
    document.createElement(
      "div"
    );

  visual.className =
    "component-visual";

  const image =
    document.createElement(
      "img"
    );

  image.src =
    definition.image;

  image.alt =
    definition.name;

  visual.appendChild(
    image
  );

  component.appendChild(
    visual
  );

  const selection =
    document.createElement(
      "div"
    );

  selection.className =
    "selection-box";

  component.appendChild(
    selection
  );

  definition.ports.forEach(
    portDefinition => {

      const port =
        document.createElement(
          "div"
        );

      port.className =
        "connection-port";

      port.dataset.portId =
        portDefinition.id;

      if (
        portDefinition.connection.family ===
        "tube"
      ) {
        port.classList.add(
          "tube-fitting-port"
        );
      }

      port.addEventListener(
        "pointerdown",
        event => {

          if (
            currentTool !==
            "tubing" ||
            event.button !==
            0
          ) {
            return;
          }

          /*
            El puerto tiene prioridad sobre paneo y arrastre.
          */
          event.preventDefault();
          event.stopPropagation();

          const currentPort =
            getPortDefinition(
              component,
              port.dataset.portId
            );

          if (!currentPort) {
            return;
          }

          handleTubingPortClick(
            component,
            currentPort,
            port
          );

        }
      );

      component.appendChild(
        port
      );

    }
  );

  canvas.appendChild(
    component
  );

  updateVisualPorts(
    component
  );

  enableDragging(
    component
  );

  selectComponent(
    component
  );

  return component;
}


function changeComponentView(
  component,
  viewKey,
  commit = true
) {
  if (!component) {
    return false;
  }

  const baseDefinition =
    componentLibrary[
      component.dataset.type
    ];

  if (
    !baseDefinition ||
    !baseDefinition.views ||
    !baseDefinition.views[
      viewKey
    ]
  ) {
    return false;
  }

  if (
    component.dataset.view ===
    viewKey
  ) {
    return true;
  }

  const oldDefinition =
    getComponentDefinition(
      component
    );

  const oldLeft =
    parseFloat(
      component.style.left
    );

  const oldTop =
    parseFloat(
      component.style.top
    );

  const centerX =
    oldLeft +
    oldDefinition.width /
    2;

  const centerY =
    oldTop +
    oldDefinition.height /
    2;

  component.dataset.view =
    viewKey;

  const newDefinition =
    getComponentDefinition(
      component
    );

  component.style.width =
    `${newDefinition.width}px`;

  component.style.height =
    `${newDefinition.height}px`;

  component.style.left =
    `${
      centerX -
      newDefinition.width /
      2
    }px`;

  component.style.top =
    `${
      centerY -
      newDefinition.height /
      2
    }px`;

  const image =
    component.querySelector(
      ".component-visual img"
    );

  if (image) {
    image.src =
      newDefinition.image;

    image.alt =
      `${newDefinition.name} · ${newDefinition.label || viewKey}`;
  }

  updateVisualPorts(
    component
  );

  updateTubing();

  refreshPorts();

  renderPropertiesPanel();

  showHint(
    `${newDefinition.name} · ${newDefinition.label || viewKey}`
  );

  if (
    commit &&
    !isRestoringState
  ) {
    commitHistory();
  }

  return true;
}

function selectComponent(component) {
  canvas.querySelectorAll(".canvas-component.selected").forEach(item => {
    item.classList.remove("selected");
  });

  selectedComponent = component;

  if (component) {
    component.classList.add("selected");
    selectTube(null);
  }

  refreshPorts();
  renderPropertiesPanel();
}

function selectTube(tubeId) {
  selectedTubeId = tubeId;

  tubingLayer.querySelectorAll(".tube-group").forEach(group => {
    group.classList.toggle("selected", group.dataset.tubeId === tubeId);
  });

  renderPropertiesPanel();
}

workspace.addEventListener("pointerdown", event => {
  if (currentTool !== "select") return;
  if (event.target.closest(".canvas-component")) return;
  if (event.target.closest(".tube-group")) return;

  selectComponent(null);
  selectTube(null);
  clearSnapPreview();
});


function getComponentPosition(
  component
) {
  return {
    left:
      parseFloat(
        component.style.left
      ) || 0,

    top:
      parseFloat(
        component.style.top
      ) || 0
  };
}


function alignComponentToPort(
  component,
  portDefinition,
  targetPoint,
  axis
) {
  const currentPoint =
    getPortWorldPoint(
      component,
      portDefinition
    );

  const position =
    getComponentPosition(
      component
    );

  if (
    axis === "y"
  ) {
    component.style.top =
      `${
        position.top +
        (
          targetPoint.y -
          currentPoint.y
        )
      }px`;
  }

  else if (
    axis === "x"
  ) {
    component.style.left =
      `${
        position.left +
        (
          targetPoint.x -
          currentPoint.x
        )
      }px`;
  }

  updateVisualPorts(
    component
  );

  updateTubing();
}


function tryAutoAlignStraightTube(
  firstComponent,
  firstPort,
  secondComponent,
  secondPort
) {
  if (
    selectedTubeShape !==
    "straight"
  ) {
    return;
  }

  const pointA =
    getPortWorldPoint(
      firstComponent,
      firstPort
    );

  const pointB =
    getPortWorldPoint(
      secondComponent,
      secondPort
    );

  const deltaX =
    Math.abs(
      pointA.x -
      pointB.x
    );

  const deltaY =
    Math.abs(
      pointA.y -
      pointB.y
    );

  /*
    Si ambos puertos están casi en la misma horizontal,
    alineamos en Y. Esto evita tubing recto levemente inclinado.
  */
  if (
    deltaY <=
      PORT_ALIGNMENT_TOLERANCE &&
    deltaX >
      PORT_ALIGNMENT_TOLERANCE
  ) {
    alignComponentToPort(
      secondComponent,
      secondPort,
      pointA,
      "y"
    );

    showHint(
      "Puertos alineados horizontalmente"
    );

    return;
  }

  /*
    Si ambos puertos están casi en la misma vertical,
    alineamos en X.
  */
  if (
    deltaX <=
      PORT_ALIGNMENT_TOLERANCE &&
    deltaY >
      PORT_ALIGNMENT_TOLERANCE
  ) {
    alignComponentToPort(
      secondComponent,
      secondPort,
      pointA,
      "x"
    );

    showHint(
      "Puertos alineados verticalmente"
    );
  }
}


function handleTubingPortClick(component, portDefinition, portElement) {
  const connection = portDefinition.connection;

  if (connection.family !== "tube") return;

  if (isPortOccupied(component.dataset.id, portDefinition.id)) {
    showHint("Ese Tube Fitting ya está ocupado");
    return;
  }

  if (!tubingStart) {
    tubingStart = { component, port: portDefinition, portElement };
    portElement.classList.add("tube-start");
    showHint("Selecciona el segundo Tube Fitting");
    return;
  }

  if (tubingStart.component === component && tubingStart.port.id === portDefinition.id) {
    cancelTubingStart();
    return;
  }

  if (tubingStart.port.connection.size !== connection.size) {
    showHint("Los tamaños de tubing no coinciden");
    return;
  }

  /*
    Para tubing recto, si los puertos están casi alineados,
    ajustamos ligeramente la segunda pieza para que el tubing
    quede perfectamente horizontal o vertical.
  */
  tryAutoAlignStraightTube(
    tubingStart.component,
    tubingStart.port,
    component,
    portDefinition
  );

  createTubing(
    tubingStart.component,
    tubingStart.port,
    component,
    portDefinition
  );

  cancelTubingStart();
  updateTubing();

  showHint(`Tubing ${connection.size}" OD · ${getTubeShapeName(selectedTubeShape)}`);
}

function cancelTubingStart() {
  if (tubingStart?.portElement) {
    tubingStart.portElement.classList.remove("tube-start");
  }

  tubingStart = null;
}

function createTubing(componentA, portA, componentB, portB) {
  tubingCounter++;

  const id = `tube-${tubingCounter}`;
  const group = document.createElementNS(SVG_NS, "g");

  group.classList.add("tube-group");
  group.dataset.tubeId = id;

  [
    "tube-hitbox",
    "tube-outer",
    "tube-body",
    "tube-reflection",
    "tube-shine"
  ].forEach(className => {
    const path = document.createElementNS(SVG_NS, "path");
    path.classList.add(className);
    path.setAttribute("fill", "none");
    group.appendChild(path);
  });

  group.addEventListener("pointerdown", event => {
    if (currentTool !== "select") return;

    event.stopPropagation();
    selectComponent(null);
    selectTube(id);
  });

  tubingLayer.appendChild(group);

  tubingConnections.push({
    id,
    size: portA.connection.size,
    material: "316SS",
    shape: selectedTubeShape,

    /*
      Parámetros editables del tubing.
      Se usan especialmente en geometría 90°.
    */
    legA: (TUBING_RULES[portA.connection.size] || TUBING_RULES["1/4"]).leadLength,
    legB: (TUBING_RULES[portA.connection.size] || TUBING_RULES["1/4"]).leadLength,

    aId: componentA.dataset.id,
    aPortId: portA.id,
    bId: componentB.dataset.id,
    bPortId: portB.id
  });

  refreshPorts();

  if (!isRestoringState) {
    commitHistory();
  }
}

function updateTubing() {
  tubingConnections.forEach(tube => {
    const geometry = getTubeGeometry(tube);
    if (!geometry) return;

    const points = buildTubeByShape(
      geometry.start,
      geometry.directionA,
      geometry.end,
      geometry.directionB,
      tube.shape,
      tube.size,
      tube
    );

    const rules = TUBING_RULES[tube.size] || TUBING_RULES["1/4"];

    const cleanPoints = simplifyTubePoints(points);

    const pathData = roundedPolylinePath(
      cleanPoints,
      rules.bendRadius
    );

    const group = tubingLayer.querySelector(
      `[data-tube-id="${tube.id}"]`
    );

    if (!group) return;

    group.querySelectorAll("path").forEach(path => {
      path.setAttribute("d", pathData);
    });
  });
}

function getTubeGeometry(tube) {
  const componentA = getComponentById(tube.aId);
  const componentB = getComponentById(tube.bId);

  if (!componentA || !componentB) return null;

  const portA = getPortDefinition(componentA, tube.aPortId);
  const portB = getPortDefinition(componentB, tube.bPortId);

  if (!portA || !portB) return null;

  const rawA = getPortWorldPoint(componentA, portA);
  const rawB = getPortWorldPoint(componentB, portB);

  const directionA = getPortWorldDirection(componentA, portA);
  const directionB = getPortWorldDirection(componentB, portB);

  const vectorA = directionVector(directionA);
  const vectorB = directionVector(directionB);

  const start = {
    x: rawA.x - vectorA.x * (portA.tubingInsertion || 0),
    y: rawA.y - vectorA.y * (portA.tubingInsertion || 0)
  };

  const end = {
    x: rawB.x - vectorB.x * (portB.tubingInsertion || 0),
    y: rawB.y - vectorB.y * (portB.tubingInsertion || 0)
  };

  return {
    start,
    end,
    directionA,
    directionB
  };
}

function buildTubeByShape(
  start,
  directionA,
  end,
  directionB,
  shape,
  size,
  tube
) {
  switch (shape) {
    case "45":
      return build45TubePoints(
        start,
        directionA,
        end,
        directionB,
        size
      );

    case "90":
      return build90TubePoints(
        start,
        directionA,
        end,
        directionB,
        size,
        tube
      );

    case "straight":
    default:
      return [start, end];
  }
}

function build45TubePoints(
  start,
  directionA,
  end,
  directionB,
  size
) {
  const rules = TUBING_RULES[size] || TUBING_RULES["1/4"];
  const lead = rules.leadLength;

  const dirA = snapDirectionTo90(directionA);
  const dirB = snapDirectionTo90(directionB);

  const vectorA = directionVector(dirA);
  const vectorB = directionVector(dirB);

  const leadA = {
    x: start.x + vectorA.x * lead,
    y: start.y + vectorA.y * lead
  };

  const leadB = {
    x: end.x + vectorB.x * lead,
    y: end.y + vectorB.y * lead
  };

  const dx = leadB.x - leadA.x;
  const dy = leadB.y - leadA.y;

  const diagonal = Math.min(
    Math.abs(dx),
    Math.abs(dy)
  );

  const signX = dx >= 0 ? 1 : -1;
  const signY = dy >= 0 ? 1 : -1;

  const diagonalPoint = {
    x: leadA.x + diagonal * signX,
    y: leadA.y + diagonal * signY
  };

  if (Math.abs(dx) > Math.abs(dy)) {
    return [
      start,
      leadA,
      diagonalPoint,
      { x: leadB.x, y: diagonalPoint.y },
      leadB,
      end
    ];
  }

  if (Math.abs(dy) > Math.abs(dx)) {
    return [
      start,
      leadA,
      diagonalPoint,
      { x: diagonalPoint.x, y: leadB.y },
      leadB,
      end
    ];
  }

  return [
    start,
    leadA,
    diagonalPoint,
    leadB,
    end
  ];
}

function build90TubePoints(
  start,
  directionA,
  end,
  directionB,
  size,
  tube
) {
  const rules = TUBING_RULES[size] || TUBING_RULES["1/4"];

  const leadAValue = Math.max(
    rules.bendRadius + 8,
    Number(tube?.legA ?? rules.leadLength)
  );

  const leadBValue = Math.max(
    rules.bendRadius + 8,
    Number(tube?.legB ?? rules.leadLength)
  );

  const dirA = snapDirectionTo90(directionA);
  const dirB = snapDirectionTo90(directionB);

  const vectorA = directionVector(dirA);
  const vectorB = directionVector(dirB);

  const leadA = {
    x: start.x + vectorA.x * leadAValue,
    y: start.y + vectorA.y * leadAValue
  };

  const leadB = {
    x: end.x + vectorB.x * leadBValue,
    y: end.y + vectorB.y * leadBValue
  };

  if (
    isHorizontalDirection(dirA) &&
    isHorizontalDirection(dirB)
  ) {
    const middleX = (leadA.x + leadB.x) / 2;

    return [
      start,
      leadA,
      { x: middleX, y: leadA.y },
      { x: middleX, y: leadB.y },
      leadB,
      end
    ];
  }

  if (
    isVerticalDirection(dirA) &&
    isVerticalDirection(dirB)
  ) {
    const middleY = (leadA.y + leadB.y) / 2;

    return [
      start,
      leadA,
      { x: leadA.x, y: middleY },
      { x: leadB.x, y: middleY },
      leadB,
      end
    ];
  }

  if (isHorizontalDirection(dirA)) {
    return [
      start,
      leadA,
      { x: leadB.x, y: leadA.y },
      leadB,
      end
    ];
  }

  return [
    start,
    leadA,
    { x: leadA.x, y: leadB.y },
    leadB,
    end
  ];
}

function roundedPolylinePath(points, radius) {
  if (!points || points.length < 2) return "";

  if (points.length === 2) {
    return (
      `M ${points[0].x} ${points[0].y} ` +
      `L ${points[1].x} ${points[1].y}`
    );
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1];
    const current = points[i];
    const next = points[i + 1];

    const incoming = {
      x: previous.x - current.x,
      y: previous.y - current.y
    };

    const outgoing = {
      x: next.x - current.x,
      y: next.y - current.y
    };

    const incomingLength = Math.hypot(
      incoming.x,
      incoming.y
    );

    const outgoingLength = Math.hypot(
      outgoing.x,
      outgoing.y
    );

    if (
      incomingLength < 1 ||
      outgoingLength < 1
    ) {
      continue;
    }

    const usableRadius = Math.min(
      radius,
      incomingLength / 2,
      outgoingLength / 2
    );

    const incomingUnit = {
      x: incoming.x / incomingLength,
      y: incoming.y / incomingLength
    };

    const outgoingUnit = {
      x: outgoing.x / outgoingLength,
      y: outgoing.y / outgoingLength
    };

    const curveStart = {
      x: current.x + incomingUnit.x * usableRadius,
      y: current.y + incomingUnit.y * usableRadius
    };

    const curveEnd = {
      x: current.x + outgoingUnit.x * usableRadius,
      y: current.y + outgoingUnit.y * usableRadius
    };

    path += ` L ${curveStart.x} ${curveStart.y}`;
    path +=
      ` Q ${current.x} ${current.y} ` +
      `${curveEnd.x} ${curveEnd.y}`;
  }

  const last = points[points.length - 1];

  path += ` L ${last.x} ${last.y}`;

  return path;
}

function simplifyTubePoints(points) {
  const result = [];

  points.forEach(point => {
    const previous = result[result.length - 1];

    if (
      previous &&
      Math.abs(previous.x - point.x) < 0.1 &&
      Math.abs(previous.y - point.y) < 0.1
    ) {
      return;
    }

    result.push({
      x: point.x,
      y: point.y
    });
  });

  let changed = true;

  while (changed) {
    changed = false;

    for (let i = 1; i < result.length - 1; i++) {
      const a = result[i - 1];
      const b = result[i];
      const c = result[i + 1];

      const abX = b.x - a.x;
      const abY = b.y - a.y;

      const bcX = c.x - b.x;
      const bcY = c.y - b.y;

      const cross =
        abX * bcY -
        abY * bcX;

      if (Math.abs(cross) < 0.01) {
        result.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  return result;
}

function enableDragging(component) {
  component.addEventListener("pointerdown", event => {
    if (currentTool !== "select") return;
    if (event.button !== 0) return;

    event.preventDefault();

    selectComponent(component);

    /*
      REGLA DE MOVIMIENTO DEL ENSAMBLE

      1) Si arrastras el regulador KPR, se mueve todo el
         conjunto rígidamente conectado.

      2) Si mantienes SHIFT mientras arrastras cualquier
         componente conectado, también se mueve todo el conjunto.

      3) Si arrastras normalmente un accesorio conectado
         (manómetro, 400-1-4, etc.), ese accesorio se desune
         y puede moverse libremente.
    */

    const hasRigidConnections =
      componentHasRigidConnections(
        component.dataset.id
      );

    draggingRigidGroup =
      hasRigidConnections &&
      (
        component.dataset.type === "regulator" ||
        event.shiftKey
      );

    if (
      hasRigidConnections &&
      !draggingRigidGroup
    ) {
      disconnectRigidConnections(
        component.dataset.id
      );

      showHint(
        "Pieza desunida · muévela libremente"
      );
    }

    else if (
      draggingRigidGroup
    ) {
      showHint(
        event.shiftKey
          ? "Moviendo ensamble completo"
          : "Moviendo ensamble desde el regulador"
      );
    }

    draggingComponent = component;
    component.classList.add("dragging");

    const rect = component.getBoundingClientRect();

    dragOffsetX =
      (event.clientX - rect.left) /
      zoom;

    dragOffsetY =
      (event.clientY - rect.top) /
      zoom;

    component.setPointerCapture(
      event.pointerId
    );
  });

  component.addEventListener("pointermove", event => {
    if (draggingComponent !== component) return;

    const point = screenToCanvas(
      event.clientX,
      event.clientY
    );

    let newLeft =
      point.x -
      dragOffsetX;

    let newTop =
      point.y -
      dragOffsetY;

    if (snapToggle.checked) {
      newLeft =
        Math.round(newLeft / GRID_SIZE) *
        GRID_SIZE;

      newTop =
        Math.round(newTop / GRID_SIZE) *
        GRID_SIZE;
    }

    const oldLeft =
      parseFloat(component.style.left);

    const oldTop =
      parseFloat(component.style.top);

    const dx =
      newLeft -
      oldLeft;

    const dy =
      newTop -
      oldTop;

    component.style.left =
      `${newLeft}px`;

    component.style.top =
      `${newTop}px`;

    /*
      Solo movemos el resto del ensamble cuando el gesto
      actual fue identificado como movimiento de grupo.
    */
    if (
      draggingRigidGroup
    ) {
      moveConnectedComponents(
        component.dataset.id,
        dx,
        dy
      );
    }

    updateTubing();

    if (
      !componentHasRigidConnections(component.dataset.id) &&
      snapToggle.checked
    ) {
      previewSnap(component);
    }
  });

  component.addEventListener("pointerup", event => {
    if (draggingComponent !== component) return;

    draggingComponent = null;
    draggingRigidGroup = false;

    component.classList.remove(
      "dragging"
    );

    clearSnapPreview();

    if (
      snapToggle.checked &&
      !componentHasRigidConnections(
        component.dataset.id
      )
    ) {
      trySnapComponent(
        component,
        false
      );
    }

    updateTubing();

    try {
      component.releasePointerCapture(
        event.pointerId
      );
    } catch (error) {}

    refreshPorts();
  });
}

function areConnectionsCompatible(a, b) {
  if (!a || !b) return false;
  if (a.size !== b.size) return false;
  if (a.family !== b.family) return false;

  if (a.family === "thread") {
    if (a.standard !== b.standard) return false;

    return (
      (
        a.gender === "male" &&
        b.gender === "female"
      ) ||
      (
        a.gender === "female" &&
        b.gender === "male"
      )
    );
  }

  return false;
}

function findBestConnection(
  sourceComponent,
  extendedRange = false
) {
  const sourceDefinition =
    getComponentDefinition(
      sourceComponent
    );

  if (!sourceDefinition) return null;

  const maximumDistance =
    extendedRange
      ? SNAP_DISTANCE * 1.6
      : SNAP_DISTANCE;

  let best = null;

  sourceDefinition.ports.forEach(sourcePort => {
    if (
      isPortOccupied(
        sourceComponent.dataset.id,
        sourcePort.id
      )
    ) {
      return;
    }

    const sourcePoint =
      getPortWorldPoint(
        sourceComponent,
        sourcePort
      );

    canvas
      .querySelectorAll(
        ".canvas-component"
      )
      .forEach(targetComponent => {
        if (
          targetComponent ===
          sourceComponent
        ) {
          return;
        }

        const targetDefinition =
          getComponentDefinition(
            targetComponent
          );

        if (!targetDefinition) return;

        targetDefinition.ports.forEach(targetPort => {
          if (
            isPortOccupied(
              targetComponent.dataset.id,
              targetPort.id
            )
          ) {
            return;
          }

          if (
            !areConnectionsCompatible(
              sourcePort.connection,
              targetPort.connection
            )
          ) {
            return;
          }

          const targetPoint =
            getPortWorldPoint(
              targetComponent,
              targetPort
            );

          const distance =
            Math.hypot(
              sourcePoint.x -
              targetPoint.x,
              sourcePoint.y -
              targetPoint.y
            );

          if (
            distance <=
            maximumDistance &&
            (
              !best ||
              distance <
              best.distance
            )
          ) {
            best = {
              sourceComponent,
              sourcePort,
              targetComponent,
              targetPort,
              targetPoint,
              distance
            };
          }
        });
      });
  });

  return best;
}

function trySnapComponent(
  component,
  extendedRange
) {
  const match =
    findBestConnection(
      component,
      extendedRange
    );

  if (!match) return false;

  connectPorts(match);

  return true;
}

function connectPorts(match) {
  const sourceComponent =
    match.sourceComponent;

  const sourcePort =
    match.sourcePort;

  const targetComponent =
    match.targetComponent;

  const targetPort =
    match.targetPort;

  const targetDirection =
    getPortWorldDirection(
      targetComponent,
      targetPort
    );

  const desiredDirection =
    normalizeAngle(
      targetDirection +
      180
    );

  const rotation =
    normalizeAngle(
      desiredDirection -
      sourcePort.direction
    );

  setComponentRotation(
    sourceComponent,
    rotation
  );

  positionComponentForConnection(
    sourceComponent,
    sourcePort,
    targetComponent,
    targetPort,
    desiredDirection
  );

  connections.push({
    aId:
      sourceComponent.dataset.id,
    aPortId:
      sourcePort.id,
    bId:
      targetComponent.dataset.id,
    bPortId:
      targetPort.id
  });

  sourceComponent.classList.add(
    "connected"
  );

  syncConnectedClasses();
  refreshPorts();
  renderPropertiesPanel();
  updateTubing();
}

function positionComponentForConnection(
  sourceComponent,
  sourcePort,
  targetComponent,
  targetPort,
  desiredDirection
) {
  const definition =
    getComponentDefinition(
      sourceComponent
    );

  const target =
    getPortWorldPoint(
      targetComponent,
      targetPort
    );

  const rotation =
    Number(
      sourceComponent.dataset.rotation ||
      0
    );

  const localX =
    (
      sourcePort.x -
      0.5
    ) *
    definition.width;

  const localY =
    (
      sourcePort.y -
      0.5
    ) *
    definition.height;

  const rotated =
    rotateVector(
      localX,
      localY,
      rotation
    );

  const insertion =
    sourcePort.insertionDepth ||
    0;

  const inward =
    directionVector(
      desiredDirection
    );

  const insertedTarget = {
    x:
      target.x +
      inward.x *
      insertion,
    y:
      target.y +
      inward.y *
      insertion
  };

  const centerX =
    insertedTarget.x -
    rotated.x;

  const centerY =
    insertedTarget.y -
    rotated.y;

  sourceComponent.style.left =
    `${
      centerX -
      definition.width /
      2
    }px`;

  sourceComponent.style.top =
    `${
      centerY -
      definition.height /
      2
    }px`;
}

function getPortWorldPoint(
  component,
  port
) {
  const definition =
    getComponentDefinition(
      component
    );

  const left =
    parseFloat(
      component.style.left
    );

  const top =
    parseFloat(
      component.style.top
    );

  const centerX =
    left +
    definition.width /
    2;

  const centerY =
    top +
    definition.height /
    2;

  const localX =
    (
      port.x -
      0.5
    ) *
    definition.width;

  const localY =
    (
      port.y -
      0.5
    ) *
    definition.height;

  const rotated =
    rotateVector(
      localX,
      localY,
      Number(
        component.dataset.rotation ||
        0
      )
    );

  return {
    x:
      centerX +
      rotated.x,
    y:
      centerY +
      rotated.y
  };
}

function getPortWorldDirection(
  component,
  port
) {
  return normalizeAngle(
    port.direction +
    Number(
      component.dataset.rotation ||
      0
    )
  );
}

function isPortOccupied(
  componentId,
  portId
) {
  const rigid =
    connections.some(connection => {
      return (
        (
          connection.aId ===
          componentId &&
          connection.aPortId ===
          portId
        ) ||
        (
          connection.bId ===
          componentId &&
          connection.bPortId ===
          portId
        )
      );
    });

  const tube =
    tubingConnections.some(tubing => {
      return (
        (
          tubing.aId ===
          componentId &&
          tubing.aPortId ===
          portId
        ) ||
        (
          tubing.bId ===
          componentId &&
          tubing.bPortId ===
          portId
        )
      );
    });

  return rigid || tube;
}

function moveConnectedComponents(
  rootId,
  dx,
  dy
) {
  const visited =
    new Set([rootId]);

  const queue =
    [rootId];

  while (queue.length) {
    const current =
      queue.shift();

    connections.forEach(connection => {
      let otherId = null;

      if (
        connection.aId ===
        current
      ) {
        otherId =
          connection.bId;
      }

      else if (
        connection.bId ===
        current
      ) {
        otherId =
          connection.aId;
      }

      if (
        !otherId ||
        visited.has(
          otherId
        )
      ) {
        return;
      }

      visited.add(
        otherId
      );

      queue.push(
        otherId
      );

      const component =
        getComponentById(
          otherId
        );

      if (!component) return;

      component.style.left =
        `${
          parseFloat(
            component.style.left
          ) +
          dx
        }px`;

      component.style.top =
        `${
          parseFloat(
            component.style.top
          ) +
          dy
        }px`;
    });
  }
}

function disconnectRigidConnections(
  componentId
) {
  connections =
    connections.filter(connection => {
      return (
        connection.aId !==
        componentId &&
        connection.bId !==
        componentId
      );
    });

  canvas
    .querySelectorAll(".canvas-component")
    .forEach(component => {
      component.classList.toggle(
        "connected",
        componentHasRigidConnections(
          component.dataset.id
        )
      );
    });

  refreshPorts();
}


function removeTubingForComponent(
  componentId
) {
  const affected =
    tubingConnections.filter(tube => {
      return (
        tube.aId ===
        componentId ||
        tube.bId ===
        componentId
      );
    });

  affected.forEach(tube => {
    const element =
      tubingLayer.querySelector(
        `[data-tube-id="${tube.id}"]`
      );

    if (element) {
      element.remove();
    }
  });

  tubingConnections =
    tubingConnections.filter(tube => {
      return (
        tube.aId !==
        componentId &&
        tube.bId !==
        componentId
      );
    });

  refreshPorts();
}

function deleteSelectedTube() {
  if (!selectedTubeId) {
    return false;
  }

  const element =
    tubingLayer.querySelector(
      `[data-tube-id="${selectedTubeId}"]`
    );

  if (element) {
    element.remove();
  }

  tubingConnections =
    tubingConnections.filter(
      tube =>
        tube.id !==
        selectedTubeId
    );

  selectedTubeId = null;

  refreshPorts();

  return true;
}

function previewSnap(component) {
  clearSnapPreview();

  const match =
    findBestConnection(
      component,
      false
    );

  if (!match) return;

  const element =
    findPortElement(
      match.targetComponent,
      match.targetPort.id
    );

  if (element) {
    element.classList.add(
      "snap-target"
    );
  }

  snapGuide.textContent =
    `${formatConnection(
      match.sourcePort.connection
    )} compatible`;

  snapGuide.style.left =
    `${
      match.targetPoint.x +
      14
    }px`;

  snapGuide.style.top =
    `${
      match.targetPoint.y -
      36
    }px`;

  snapGuide.classList.add(
    "visible"
  );
}

function clearSnapPreview() {
  canvas
    .querySelectorAll(
      ".connection-port"
    )
    .forEach(port => {
      port.classList.remove(
        "snap-target"
      );
    });

  snapGuide.classList.remove(
    "visible"
  );
}

function refreshPorts() {
  canvas
    .querySelectorAll(
      ".canvas-component"
    )
    .forEach(component => {
      const definition =
        getComponentDefinition(
          component
        );

      if (!definition) return;

      definition.ports.forEach(port => {
        const element =
          findPortElement(
            component,
            port.id
          );

        if (!element) return;

        element.classList.toggle(
          "occupied",
          isPortOccupied(
            component.dataset.id,
            port.id
          )
        );
      });
    });
}

rotateBtn.addEventListener(
  "click",
  rotateSelected
);

function rotateSelected() {
  if (!selectedComponent) return;

  if (
    componentHasRigidConnections(
      selectedComponent.dataset.id
    )
  ) {
    showHint(
      "La pieza está conectada rígidamente"
    );
    return;
  }

  let rotation =
    Number(
      selectedComponent.dataset.rotation ||
      0
    );

  rotation =
    normalizeAngle(
      rotation +
      90
    );

  setComponentRotation(
    selectedComponent,
    rotation
  );

  updateTubing();

  if (!isRestoringState) {
    commitHistory();
  }

  renderPropertiesPanel();
}

function setComponentRotation(
  component,
  rotation
) {
  rotation =
    normalizeAngle(
      rotation
    );

  component.dataset.rotation =
    String(
      rotation
    );

  const visual =
    component.querySelector(
      ".component-visual"
    );

  if (visual) {
    visual.style.transform =
      `rotate(${rotation}deg)`;
  }

  updateVisualPorts(
    component
  );
}

function updateVisualPorts(
  component
) {
  const definition =
    getComponentDefinition(
      component
    );

  if (!definition) return;

  const rotation =
    Number(
      component.dataset.rotation ||
      0
    );

  definition.ports.forEach(port => {
    const element =
      findPortElement(
        component,
        port.id
      );

    if (!element) return;

    const localX =
      (
        port.x -
        0.5
      ) *
      definition.width;

    const localY =
      (
        port.y -
        0.5
      ) *
      definition.height;

    const rotated =
      rotateVector(
        localX,
        localY,
        rotation
      );

    element.style.left =
      `${
        definition.width /
        2 +
        rotated.x
      }px`;

    element.style.top =
      `${
        definition.height /
        2 +
        rotated.y
      }px`;
  });
}

function rotateVector(
  x,
  y,
  degrees
) {
  const radians =
    degrees *
    Math.PI /
    180;

  return {
    x:
      x *
      Math.cos(radians) -
      y *
      Math.sin(radians),

    y:
      x *
      Math.sin(radians) +
      y *
      Math.cos(radians)
  };
}

function directionVector(
  degrees
) {
  const radians =
    degrees *
    Math.PI /
    180;

  return {
    x:
      Math.cos(radians),

    y:
      Math.sin(radians)
  };
}

function normalizeAngle(angle) {
  angle %= 360;

  if (angle < 0) {
    angle += 360;
  }

  return angle;
}

function snapDirectionTo90(direction) {
  return normalizeAngle(
    Math.round(
      direction /
      90
    ) *
    90
  );
}

function isHorizontalDirection(
  direction
) {
  const value =
    normalizeAngle(
      direction
    );

  return (
    value === 0 ||
    value === 180
  );
}

function isVerticalDirection(
  direction
) {
  const value =
    normalizeAngle(
      direction
    );

  return (
    value === 90 ||
    value === 270
  );
}

function getComponentDefinition(
  component
) {
  if (!component) {
    return null;
  }

  return getComponentDefinitionByType(
    component.dataset.type,
    component.dataset.view ||
      null
  );
}

function getComponentById(id) {
  return canvas.querySelector(
    `.canvas-component[data-id="${id}"]`
  );
}

function getPortDefinition(
  component,
  portId
) {
  const definition =
    getComponentDefinition(
      component
    );

  if (!definition) return null;

  return definition
    .ports
    .find(
      port =>
        port.id ===
        portId
    ) || null;
}

function findPortElement(
  component,
  portId
) {
  return component.querySelector(
    `.connection-port[data-port-id="${portId}"]`
  );
}

function getTubeById(tubeId) {
  return tubingConnections
    .find(
      tube =>
        tube.id ===
        tubeId
    ) || null;
}

function componentHasRigidConnections(
  componentId
) {
  return connections.some(connection => {
    return (
      connection.aId ===
      componentId ||
      connection.bId ===
      componentId
    );
  });
}

function getTubeShapeName(shape) {
  if (shape === "45") {
    return "Doblado 45°";
  }

  if (shape === "90") {
    return "Doblado 90°";
  }

  return "Recto libre";
}

function formatConnection(
  connection
) {
  if (!connection) {
    return "Conexión";
  }

  if (
    connection.family ===
    "thread"
  ) {
    const gender =
      connection.gender ===
      "male"
        ? "MNPT"
        : "FNPT";

    return (
      `${connection.size}" ${gender}`
    );
  }

  if (
    connection.family ===
    "tube"
  ) {
    return (
      `${connection.size}" Tube`
    );
  }

  return "Conexión";
}

deleteBtn.addEventListener(
  "click",
  deleteCurrentSelection
);

function deleteCurrentSelection() {
  if (selectedTubeId) {
    deleteSelectedTube();
    return;
  }

  if (!selectedComponent) {
    return;
  }

  const id =
    selectedComponent.dataset.id;

  disconnectRigidConnections(id);
  removeTubingForComponent(id);
  selectedComponent.remove();

  selectedComponent = null;

  refreshPorts();
  renderPropertiesPanel();

  if (!isRestoringState) {
    commitHistory();
  }
}

document.addEventListener("keydown", event => {
  if (isEditingText()) return;

  if (event.key === "Escape") {
    setTool("select");
    selectComponent(null);
    selectTube(null);

    if (tubingMenu) {
      tubingMenu.hidden = true;
    }

    return;
  }

  if (
    event.key === "Delete" ||
    event.key === "Backspace"
  ) {
    event.preventDefault();
    deleteCurrentSelection();
  }

  if (
    event.key
      .toLowerCase() ===
    "r"
  ) {
    rotateSelected();
  }
});


document.addEventListener(
  "keyup",
  event => {

    if (
      event.code ===
      "Space"
    ) {
      isSpacePressed =
        false;

      document.body.classList.remove(
        "pan-ready"
      );

      if (
        isPanning
      ) {
        stopWorkspacePan(
          null
        );
      }
    }

  }
);


/*
  Si la ventana pierde el foco, liberamos el modo paneo
  para evitar que quede "trabado".
*/
window.addEventListener(
  "blur",
  () => {

    isSpacePressed =
      false;

    document.body.classList.remove(
      "pan-ready"
    );

    stopWorkspacePan(
      null
    );

  }
);


gridToggle.addEventListener("change", () => {
  workspace.classList.toggle(
    "grid-off",
    !gridToggle.checked
  );
});

snapToggle.addEventListener("change", () => {
  clearSnapPreview();
  refreshPorts();
});

zoomIn.addEventListener("click", () => {
  changeZoom(
    0.1
  );
});

zoomOut.addEventListener("click", () => {
  changeZoom(
    -0.1
  );
});


/*
  Zoom con rueda del ratón.

  - Rueda hacia arriba  -> acercar
  - Rueda hacia abajo   -> alejar

  El punto que está debajo del cursor se mantiene
  prácticamente en el mismo lugar de la pantalla,
  como en programas CAD.
*/
workspace.addEventListener(
  "wheel",
  event => {

    /*
      Evitamos el scroll normal porque, dentro del
      workspace, la rueda queda dedicada al zoom.
    */
    event.preventDefault();

    const amount =
      event.deltaY < 0
        ? 0.1
        : -0.1;

    changeZoom(
      amount,
      event.clientX,
      event.clientY
    );

  },
  {
    passive:
      false
  }
);


function changeZoom(
  amount,
  clientX = null,
  clientY = null
) {
  const oldZoom =
    zoom;

  const newZoom =
    Math.max(
      0.25,
      Math.min(
        4,
        oldZoom +
        amount
      )
    );

  if (
    newZoom ===
    oldZoom
  ) {
    return;
  }

  const rect =
    workspace.getBoundingClientRect();

  const anchorX =
    clientX ??
    (
      rect.left +
      rect.width /
      2
    );

  const anchorY =
    clientY ??
    (
      rect.top +
      rect.height /
      2
    );

  /*
    Coordenada del mundo situada bajo el cursor
    antes de modificar el zoom.
  */
  const worldX =
    (
      anchorX -
      rect.left -
      cameraX
    ) /
    oldZoom;

  const worldY =
    (
      anchorY -
      rect.top -
      cameraY
    ) /
    oldZoom;

  zoom =
    newZoom;

  /*
    Conservamos ese mismo punto de mundo debajo
    del cursor después del zoom.
  */
  cameraX =
    anchorX -
    rect.left -
    worldX *
    zoom;

  cameraY =
    anchorY -
    rect.top -
    worldY *
    zoom;

  updateCameraTransform();
}

newProjectBtn.addEventListener("click", () => {
  const components =
    canvas.querySelectorAll(
      ".canvas-component"
    );

  if (
    components.length === 0 &&
    tubingConnections.length === 0
  ) {
    return;
  }

  if (
    !confirm(
      "¿Deseas eliminar el ensamble actual?"
    )
  ) {
    return;
  }

  components.forEach(component => {
    component.remove();
  });

  tubingLayer.innerHTML = "";

  connections = [];
  tubingConnections = [];
  selectedComponent = null;
  selectedTubeId = null;
  draggingComponent = null;
  tubingStart = null;

  setTool("select");
  showHint("Proyecto nuevo");
  renderPropertiesPanel();

  if (!isRestoringState) {
    commitHistory();
  }
});

searchInput.addEventListener("input", () => {
  const search =
    searchInput.value
      .toLowerCase()
      .trim();

  document
    .querySelectorAll(
      ".component-card"
    )
    .forEach(card => {
      card.style.display =
        card.innerText
          .toLowerCase()
          .includes(search)
          ? "flex"
          : "none";
    });
});

function showHint(message) {
  if (hintText) {
    hintText.textContent =
      message;
  }
}

function isEditingText() {
  const active =
    document.activeElement;

  return (
    active &&
    (
      active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA"
    )
  );
}



/* =========================================================
   PROPERTIES PANEL
========================================================= */

function renderPropertiesPanel() {
  if (
    !propertiesPanel ||
    !propertiesTitle ||
    !propertiesBody
  ) {
    return;
  }

  if (selectedComponent) {
    const definition =
      getComponentDefinition(
        selectedComponent
      );

    if (!definition) {
      hidePropertiesPanel();
      return;
    }

    propertiesPanel.classList.remove(
      "hidden"
    );

    propertiesTitle.textContent =
      definition.name;

    const rotation =
      Number(
        selectedComponent.dataset.rotation ||
        0
      );

    const portsHtml =
      definition.ports.map(port => {
        const occupied =
          isPortOccupied(
            selectedComponent.dataset.id,
            port.id
          );

        return `
          <div class="property-port">
            <div class="property-port-main">
              <span class="property-port-name">
                ${escapeHtml(getPortDisplayName(port.id))}
              </span>

              <span class="property-port-type">
                ${escapeHtml(formatConnection(port.connection))}
              </span>
            </div>

            <span class="port-status ${occupied ? "used" : "free"}">
              ${occupied ? "Ocupado" : "Disponible"}
            </span>
          </div>
        `;
      }).join("");

    propertiesBody.innerHTML = `
      <div class="property-block">
        <div class="property-label">Tipo</div>
        <div class="property-value">
          ${escapeHtml(getComponentCategoryName(selectedComponent.dataset.type))}
        </div>
      </div>

      ${
        (() => {
          const baseDefinition =
            componentLibrary[
              selectedComponent.dataset.type
            ];

          if (
            !baseDefinition ||
            !baseDefinition.views
          ) {
            return "";
          }

          const cvHtml =
            baseDefinition.cv
              ? `
                <div class="property-block">
                  <div class="property-label">Cv</div>
                  <div class="property-value">
                    ${escapeHtml(baseDefinition.cv)}
                  </div>
                </div>
              `
              : "";

          const connectionHtml =
            baseDefinition.connectionLabel
              ? `
                <div class="property-block">
                  <div class="property-label">Conexiones</div>
                  <div class="property-value">
                    ${escapeHtml(baseDefinition.connectionLabel)}
                  </div>
                </div>
              `
              : "";

          return `
            ${cvHtml}
            ${connectionHtml}

            <div class="property-block">
              <div class="property-label">Vista</div>

              <div class="property-actions view-selector">
                <button
                  type="button"
                  class="property-btn ${selectedComponent.dataset.view === "c1" ? "active" : ""}"
                  data-component-view="c1"
                >
                  C1 · Superior
                </button>

                <button
                  type="button"
                  class="property-btn ${selectedComponent.dataset.view === "c2" ? "active" : ""}"
                  data-component-view="c2"
                >
                  C2 · Frontal
                </button>
              </div>
            </div>
          `;
        })()
      }

      <div class="property-block">
        <div class="property-label">Rotación</div>
        <div class="property-value">
          ${rotation}°
        </div>
      </div>

      <div class="property-block">
        <div class="property-label">Puertos</div>
        <div class="property-port-list">
          ${portsHtml}
        </div>
      </div>

      <div class="property-block">
        <div class="property-label">Acciones</div>

        <div class="property-actions">
          <button
            class="property-btn"
            type="button"
            data-property-action="rotate"
            ${componentHasRigidConnections(selectedComponent.dataset.id) ? "disabled" : ""}
          >
            ↻ Rotar
          </button>

          <button
            class="property-btn danger"
            type="button"
            data-property-action="delete-component"
          >
            🗑 Eliminar
          </button>
        </div>
      </div>
    `;

    return;
  }

  if (selectedTubeId) {
    const tube =
      getTubeById(
        selectedTubeId
      );

    if (!tube) {
      hidePropertiesPanel();
      return;
    }

    propertiesPanel.classList.remove(
      "hidden"
    );

    propertiesTitle.textContent =
      `Tubing ${tube.size}" OD`;

    propertiesBody.innerHTML = `
      <div class="property-block">
        <div class="property-label">Material</div>
        <div class="property-value">
          ${escapeHtml(tube.material || "316SS")}
        </div>
      </div>

      <div class="property-block">
        <div class="property-label">Geometría</div>

        <div class="property-actions">
          <button
            type="button"
            class="property-btn ${tube.shape === "straight" ? "active" : ""}"
            data-tube-property-shape="straight"
          >
            ╱ Recto libre
          </button>

          <button
            type="button"
            class="property-btn ${tube.shape === "45" ? "active" : ""}"
            data-tube-property-shape="45"
          >
            ⟋ 45°
          </button>

          <button
            type="button"
            class="property-btn ${tube.shape === "90" ? "active" : ""}"
            data-tube-property-shape="90"
          >
            └ 90°
          </button>
        </div>
      </div>

      ${
        tube.shape === "90"
          ? `
            <div class="property-block">
              <div class="property-label">
                Longitudes del doblado
              </div>

              <div class="tube-leg-control">
                <div class="tube-leg-header">
                  <span>Pierna A</span>
                  <strong>${Math.round(Number(tube.legA ?? 50))} px</strong>
                </div>

                <input
                  type="range"
                  min="36"
                  max="260"
                  step="5"
                  value="${Number(tube.legA ?? 50)}"
                  data-tube-leg="A"
                >
              </div>

              <div class="tube-leg-control">
                <div class="tube-leg-header">
                  <span>Pierna B</span>
                  <strong>${Math.round(Number(tube.legB ?? 50))} px</strong>
                </div>

                <input
                  type="range"
                  min="36"
                  max="260"
                  step="5"
                  value="${Number(tube.legB ?? 50)}"
                  data-tube-leg="B"
                >
              </div>

              <button
                class="property-btn secondary tube-reset-legs"
                type="button"
                data-property-action="reset-tube-legs"
              >
                Restablecer longitudes
              </button>
            </div>
          `
          : ""
      }

      <div class="property-block">
        <div class="property-label">Acciones</div>

        <div class="property-actions">
          <button
            class="property-btn danger"
            type="button"
            data-property-action="delete-tube"
          >
            🗑 Eliminar tubing
          </button>
        </div>
      </div>
    `;

    return;
  }

  hidePropertiesPanel();
}


function hidePropertiesPanel() {
  if (!propertiesPanel) {
    return;
  }

  propertiesPanel.classList.add(
    "hidden"
  );
}


function getPortDisplayName(portId) {
  const labels = {
    "top-left": "Superior izquierdo",
    "top-right": "Superior derecho",
    "left": "Izquierdo",
    "right": "Derecho",
    "npt": "NPT",
    "tube": "Tube fitting",
    "tube-left": "Tube fitting izquierdo",
    "tube-right": "Tube fitting derecho",
    "tube-top": "Tube fitting superior"
  };

  return labels[portId] || portId;
}


function getComponentCategoryName(type) {
  const labels = {
    regulator: "Regulador",
    gauge: "Instrumentación",
    adapter400: "Conector",
    union400: "Tube Fitting",
    needleValve: "Válvula de aguja",
    ballValve: "Válvula de bola",
    unionTee400: "Unión tee"
  };

  return labels[type] || "Componente";
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


if (closePropertiesBtn) {
  closePropertiesBtn.addEventListener(
    "click",
    () => {
      selectComponent(null);
      selectTube(null);
    }
  );
}


if (propertiesBody) {
  propertiesBody.addEventListener(
    "input",
    event => {
      const legInput =
        event.target.closest(
          "[data-tube-leg]"
        );

      if (
        !legInput ||
        !selectedTubeId
      ) {
        return;
      }

      const tube =
        getTubeById(
          selectedTubeId
        );

      if (
        !tube ||
        tube.shape !== "90"
      ) {
        return;
      }

      const value =
        Number(
          legInput.value
        );

      if (
        legInput.dataset.tubeLeg ===
        "A"
      ) {
        tube.legA =
          value;
      }

      else {
        tube.legB =
          value;
      }

      const valueLabel =
        legInput
          .closest(".tube-leg-control")
          ?.querySelector(
            ".tube-leg-header strong"
          );

      if (
        valueLabel
      ) {
        valueLabel.textContent =
          `${Math.round(value)} px`;
      }

      updateTubing();
    }
  );

  propertiesBody.addEventListener(
    "change",
    event => {
      if (
        event.target.closest(
          "[data-tube-leg]"
        )
      ) {
        commitHistory();
      }
    }
  );

  propertiesBody.addEventListener(
    "click",
    event => {
      const viewButton =
        event.target.closest(
          "[data-component-view]"
        );

      if (
        viewButton &&
        selectedComponent
      ) {
        changeComponentView(
          selectedComponent,
          viewButton.dataset.componentView,
          true
        );

        return;
      }

      const shapeButton =
        event.target.closest(
          "[data-tube-property-shape]"
        );

      if (shapeButton && selectedTubeId) {
        const tube =
          getTubeById(
            selectedTubeId
          );

        if (!tube) {
          return;
        }

        tube.shape =
          shapeButton.dataset.tubePropertyShape;

        if (
          tube.shape === "90"
        ) {
          const rules =
            TUBING_RULES[tube.size] ||
            TUBING_RULES["1/4"];

          if (
            !Number.isFinite(
              Number(tube.legA)
            )
          ) {
            tube.legA =
              rules.leadLength;
          }

          if (
            !Number.isFinite(
              Number(tube.legB)
            )
          ) {
            tube.legB =
              rules.leadLength;
          }
        }

        updateTubing();
        renderPropertiesPanel();
        showHint(
          `Tubing actualizado · ${getTubeShapeName(tube.shape)}`
        );

        commitHistory();
        return;
      }

      const actionButton =
        event.target.closest(
          "[data-property-action]"
        );

      if (!actionButton) {
        return;
      }

      const action =
        actionButton.dataset.propertyAction;

      if (action === "rotate") {
        rotateSelected();
      }

      else if (
        action ===
        "reset-tube-legs"
      ) {
        const tube =
          getTubeById(
            selectedTubeId
          );

        if (
          tube
        ) {
          const rules =
            TUBING_RULES[tube.size] ||
            TUBING_RULES["1/4"];

          tube.legA =
            rules.leadLength;

          tube.legB =
            rules.leadLength;

          updateTubing();
          renderPropertiesPanel();
          showHint(
            "Longitudes del tubing restablecidas"
          );
          commitHistory();
        }
      }

      else if (
        action ===
        "delete-component"
      ) {
        deleteCurrentSelection();
      }

      else if (
        action ===
        "delete-tube"
      ) {
        if (
          deleteSelectedTube()
        ) {
          renderPropertiesPanel();
          commitHistory();
        }
      }
    }
  );
}


/* =========================================================
   HISTORY / UNDO / REDO
========================================================= */

function serializeProjectState() {
  const components =
    Array.from(
      canvas.querySelectorAll(
        ".canvas-component"
      )
    ).map(component => ({
      id:
        component.dataset.id,

      type:
        component.dataset.type,

      left:
        parseFloat(
          component.style.left
        ),

      top:
        parseFloat(
          component.style.top
        ),

      rotation:
        Number(
          component.dataset.rotation ||
          0
        ),

      view:
        component.dataset.view ||
        null
    }));

  return {
    componentCounter,
    tubingCounter,
    components,
    connections:
      JSON.parse(
        JSON.stringify(
          connections
        )
      ),

    tubingConnections:
      JSON.parse(
        JSON.stringify(
          tubingConnections
        )
      )
  };
}


function projectStateKey(state) {
  return JSON.stringify(
    state
  );
}


function commitHistory(force = false) {
  if (isRestoringState) {
    return;
  }

  const state =
    serializeProjectState();

  const currentKey =
    undoStack.length
      ? projectStateKey(
          undoStack[
            undoStack.length -
            1
          ]
        )
      : null;

  const nextKey =
    projectStateKey(
      state
    );

  if (
    !force &&
    currentKey ===
      nextKey
  ) {
    updateHistoryButtons();
    return;
  }

  undoStack.push(
    state
  );

  if (
    undoStack.length >
    HISTORY_LIMIT
  ) {
    undoStack.shift();
  }

  redoStack = [];

  updateHistoryButtons();
}


function updateHistoryButtons() {
  if (undoBtn) {
    undoBtn.disabled =
      undoStack.length <= 1;
  }

  if (redoBtn) {
    redoBtn.disabled =
      redoStack.length === 0;
  }
}


function undoProject() {
  if (
    undoStack.length <=
    1
  ) {
    return;
  }

  const current =
    undoStack.pop();

  redoStack.push(
    current
  );

  const previous =
    undoStack[
      undoStack.length -
      1
    ];

  restoreProjectState(
    previous
  );

  updateHistoryButtons();
  showHint("Deshacer");
}


function redoProject() {
  if (
    redoStack.length ===
    0
  ) {
    return;
  }

  const state =
    redoStack.pop();

  undoStack.push(
    state
  );

  restoreProjectState(
    state
  );

  updateHistoryButtons();
  showHint("Rehacer");
}


function restoreProjectState(state) {
  if (!state) {
    return;
  }

  isRestoringState =
    true;

  cancelTubingStart();

  canvas
    .querySelectorAll(
      ".canvas-component"
    )
    .forEach(
      component =>
        component.remove()
    );

  tubingLayer.innerHTML =
    "";

  connections = [];
  tubingConnections = [];
  selectedComponent = null;
  selectedTubeId = null;
  draggingComponent = null;

  componentCounter = 0;
  tubingCounter = 0;

  state.components.forEach(
    saved => {
      const definition =
        getComponentDefinitionByType(
          saved.type,
          saved.view ||
            null
        );

      if (!definition) {
        return;
      }

      const component =
        createComponent(
          saved.type,
          saved.left +
            definition.width /
            2,
          saved.top +
            definition.height /
            2,
          saved.view ||
            null
        );

      if (!component) {
        return;
      }

      component.dataset.id =
        String(
          saved.id
        );

      component.style.left =
        `${saved.left}px`;

      component.style.top =
        `${saved.top}px`;

      setComponentRotation(
        component,
        saved.rotation
      );
    }
  );

  componentCounter =
    Number(
      state.componentCounter ||
      0
    );

  tubingCounter =
    Number(
      state.tubingCounter ||
      0
    );

  connections =
    JSON.parse(
      JSON.stringify(
        state.connections ||
        []
      )
    );

  tubingConnections =
    JSON.parse(
      JSON.stringify(
        state.tubingConnections ||
        []
      )
    );

  tubingConnections.forEach(
    tube => {
      createTubeSvgElement(
        tube.id
      );
    }
  );

  selectComponent(null);
  selectTube(null);

  refreshPorts();
  updateTubing();

  isRestoringState =
    false;

  renderPropertiesPanel();
}


function createTubeSvgElement(
  id
) {
  const group =
    document.createElementNS(
      SVG_NS,
      "g"
    );

  group.classList.add(
    "tube-group"
  );

  group.dataset.tubeId =
    id;

  [
    "tube-hitbox",
    "tube-outer",
    "tube-body",
    "tube-reflection",
    "tube-shine"
  ].forEach(
    className => {
      const path =
        document.createElementNS(
          SVG_NS,
          "path"
        );

      path.classList.add(
        className
      );

      path.setAttribute(
        "fill",
        "none"
      );

      group.appendChild(
        path
      );
    }
  );

  group.addEventListener(
    "pointerdown",
    event => {
      if (
        currentTool !==
        "select"
      ) {
        return;
      }

      event.stopPropagation();
      selectComponent(null);
      selectTube(id);
    }
  );

  tubingLayer.appendChild(
    group
  );
}


if (undoBtn) {
  undoBtn.addEventListener(
    "click",
    undoProject
  );
}


if (redoBtn) {
  redoBtn.addEventListener(
    "click",
    redoProject
  );
}


/*
  Guardamos un estado al terminar de mover una pieza.

  commitHistory() elimina estados duplicados, por lo que un
  simple clic sobre una pieza no ensucia el historial.
*/
document.addEventListener(
  "pointerup",
  event => {
    if (
      event.target.closest(
        ".canvas-component"
      )
    ) {
      queueMicrotask(
        () => {
          commitHistory();
          renderPropertiesPanel();
        }
      );
    }
  }
);


/*
  Una pieza nueva se crea mediante drop.
*/
workspace.addEventListener(
  "drop",
  () => {
    queueMicrotask(
      () => {
        commitHistory();
        renderPropertiesPanel();
      }
    );
  }
);


/*
  Nuevo proyecto ya modifica el estado en su listener original.
*/
newProjectBtn.addEventListener(
  "click",
  () => {
    queueMicrotask(
      () => {
        commitHistory();
        renderPropertiesPanel();
      }
    );
  }
);


/* =========================================================
   KEYBOARD HISTORY SHORTCUTS
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.code ===
        "Space" &&
      !isEditingText()
    ) {
      isSpacePressed =
        true;

      document.body.classList.add(
        "pan-ready"
      );

      event.preventDefault();
    }

    if (isEditingText()) {
      return;
    }

    const modifier =
      event.ctrlKey ||
      event.metaKey;

    if (
      modifier &&
      !event.shiftKey &&
      event.key.toLowerCase() ===
        "z"
    ) {
      event.preventDefault();
      undoProject();
      return;
    }

    if (
      modifier &&
      (
        event.key.toLowerCase() ===
          "y" ||
        (
          event.shiftKey &&
          event.key.toLowerCase() ===
            "z"
        )
      )
    ) {
      event.preventDefault();
      redoProject();
    }
  }
);

refreshPorts();
renderPropertiesPanel();
commitHistory(true);
updateHistoryButtons();

updateCameraTransform();
