export const GRID_STEP = 48;
export const ISO_ROTATION_DEG = 45;
export const ISO_SCALE_Y = 0.5;

export const MAP_TILES = 30;
export const MAP_SIZE = MAP_TILES * GRID_STEP;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1.6;
export const CAMERA_SPEED = 1650; 

export const UNIT_RADIUS = 14;
export const UNIT_SPEED = 150;
export const EDGE_PADDING = 8;

// Здания квадратные NxN: size — сторона в клетках сетки
export const BUILDING_TYPES = [
  { type: 'house',  label: 'Дом',      size: 1 },
  { type: 'barrack', label: 'Казарма', size: 2 },
  { type: 'fort',   label: 'Крепость', size: 3 }
];

// Типы событий, накопленных за кадр
export const EVENT_TYPE = {
  SELECT_UNITS: 'SELECT_UNITS',
  MOVE_UNITS: 'MOVE_UNITS',
  ZOOM_CAMERA: 'ZOOM_CAMERA',
  BUILD_BUILDING: 'BUILD_BUILDING'
};

// Слои отрисовки
export const Z_INDEX = {
  SELECTION_RECT: 50,
  CONTROLS_PANEL: 100,
  BUILD_PANEL: 100,
  GHOST: 10
};

// Зум: шаг колеса и предела
export const ZOOM_STEP = 1.15;

// Порог в пикселях, после которого зажатая ЛКМ считается перетаскиванием
export const DRAG_THRESHOLD = 4;
