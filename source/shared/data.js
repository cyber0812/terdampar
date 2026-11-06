// Game rules shared by the server and the client.
export const ITEMS = {
  stick: { n: 'Ranting', i: '🥢', s: 40 }, stone: { n: 'Batu', i: '🪨', s: 40 }, wood: { n: 'Kayu', i: '🪵', s: 60 }, fiber: { n: 'Serat', i: '🌾', s: 40 }, rope: { n: 'Tali', i: '🧵', s: 30 },
  cloth: { n: 'Kain', i: '🧻', s: 30 }, hide: { n: 'Kulit', i: '🦌', s: 30 }, scrap: { n: 'Besi Tua', i: '⚙️', s: 40 }, ore: { n: 'Bijih Besi', i: '⛰️', s: 40 }, iron: { n: 'Batang Besi', i: '🔩', s: 40 }, charcoal: { n: 'Arang', i: '⬛', s: 30 },
  arrow: { n: 'Anak Panah', i: '➶', s: 40 }, fuel: { n: 'Jerigen Bensin', i: '⛽', s: 5, desc: 'Buat mobil dan pesawat' }, wheel: { n: 'Roda', i: '🛞', s: 4 }, carengine: { n: 'Mesin Mobil', i: '🔧', s: 1 },
  coconut: { n: 'Kelapa', i: '🥥', s: 12, food: 16, water: 26 }, berry: { n: 'Beri', i: '🫐', s: 20, food: 7, water: 4 }, shroom: { n: 'Jamur', i: '🍄', s: 20, food: 10 }, shroom_red: { n: 'Jamur Merah', i: '🍄', s: 20, food: 6, hp: -18 },
  meat: { n: 'Daging Mentah', i: '🥩', s: 12, food: 12, hp: -10 }, meat_cooked: { n: 'Daging Bakar', i: '🍖', s: 12, food: 42, hp: 6 }, bandage: { n: 'Perban', i: '🩹', s: 10, hp: 32 },
  bottle: { n: 'Botol Kosong', i: '🍶', s: 1 }, bottle_full: { n: 'Botol Air', i: '🧴', s: 1, water: 46, gives: 'bottle' },
  axe_stone: { n: 'Kapak Batu', i: '🪓', s: 1, tool: 'axe', pow: 18, dmg: 14, dur: 110 }, pick_stone: { n: 'Beliung Batu', i: '⛏️', s: 1, tool: 'pick', pow: 18, dmg: 13, dur: 110 }, axe_iron: { n: 'Kapak Besi', i: '🪓', s: 1, tool: 'axe', pow: 34, dmg: 26, dur: 320 }, pick_iron: { n: 'Beliung Besi', i: '⛏️', s: 1, tool: 'pick', pow: 34, dmg: 24, dur: 320 },
  spear: { n: 'Tombak', i: '🗡️', s: 1, tool: 'spear', dmg: 26, dur: 90 }, bow: { n: 'Busur', i: '🏹', s: 1, tool: 'bow', dmg: 40, dur: 140 }, hammer: { n: 'Palu', i: '🔨', s: 1, tool: 'hammer', dmg: 9, dur: 400 }, torch: { n: 'Obor', i: '🔥', s: 1, tool: 'torch', dmg: 8, dur: 240 },
  rod: { n: 'Pancing', i: '🎣', s: 1, tool: 'rod', dmg: 5, dur: 60 }, fish: { n: 'Ikan Mentah', i: '🐟', s: 12, food: 10, hp: -6 }, fish_cooked: { n: 'Ikan Bakar', i: '🐠', s: 12, food: 34, hp: 4 }, seed: { n: 'Benih', i: '🌱', s: 20 }, veg: { n: 'Sayur', i: '🥕', s: 20, food: 20, water: 10 },
};
export const CRAFT = [
  { id: 'rope', st: null, out: ['rope', 1], cost: { fiber: 3 } }, { id: 'axe_stone', st: null, out: ['axe_stone', 1], cost: { stick: 2, stone: 3, rope: 1 } }, { id: 'pick_stone', st: null, out: ['pick_stone', 1], cost: { stick: 2, stone: 3, rope: 1 } },
  { id: 'hammer', st: null, out: ['hammer', 1], cost: { stick: 2, stone: 2, rope: 1 } }, { id: 'spear', st: null, out: ['spear', 1], cost: { stick: 4, stone: 2, rope: 1 } }, { id: 'torch', st: null, out: ['torch', 1], cost: { stick: 2, fiber: 2 } }, { id: 'rod', st: null, out: ['rod', 1], cost: { stick: 3, rope: 2 } }, { id: 'bandage', st: null, out: ['bandage', 1], cost: { cloth: 2 } },
  { id: 'bow', st: 'workbench', out: ['bow', 1], cost: { wood: 4, rope: 3 } }, { id: 'arrow', st: 'workbench', out: ['arrow', 6], cost: { stick: 3, stone: 1, fiber: 2 } }, { id: 'axe_iron', st: 'workbench', out: ['axe_iron', 1], cost: { iron: 3, wood: 2, rope: 1 } }, { id: 'pick_iron', st: 'workbench', out: ['pick_iron', 1], cost: { iron: 3, wood: 2, rope: 1 } }, { id: 'bottle', st: 'workbench', out: ['bottle', 1], cost: { scrap: 2 } },
  { id: 'meat_cooked', st: 'campfire', out: ['meat_cooked', 1], cost: { meat: 1 } }, { id: 'fish_cooked', st: 'campfire', out: ['fish_cooked', 1], cost: { fish: 1 } }, { id: 'charcoal', st: 'campfire', out: ['charcoal', 2], cost: { wood: 3 } },
  { id: 'iron_ore', st: 'forge', out: ['iron', 1], cost: { ore: 2, charcoal: 1 } }, { id: 'iron_scrap', st: 'forge', out: ['iron', 1], cost: { scrap: 3, charcoal: 1 } }, { id: 'fuel', st: 'forge', out: ['fuel', 1], cost: { coconut: 3, charcoal: 2, scrap: 1 } },
  { id: 'wheel', st: 'garage', out: ['wheel', 1], cost: { iron: 1, hide: 2, rope: 1 } }, { id: 'carengine', st: 'garage', out: ['carengine', 1], cost: { iron: 6, scrap: 8, rope: 2 } },
];
export const BUILD = {
  foundation: { n: 'Fondasi', i: '▦', cost: { wood: 6, stone: 2 }, kind: 'cell' }, wall: { n: 'Dinding', i: '▮', cost: { wood: 5 }, kind: 'edge' }, doorway: { n: 'Dinding Pintu', i: '🚪', cost: { wood: 7, rope: 1 }, kind: 'edge' }, window: { n: 'Dinding Jendela', i: '🪟', cost: { wood: 5 }, kind: 'edge' },
  floor: { n: 'Lantai Atas', i: '▤', cost: { wood: 6 }, kind: 'cell2' }, roof: { n: 'Atap Rumbia', i: '⛰', cost: { wood: 3, fiber: 6 }, kind: 'roof' }, gable: { n: 'Dinding Segitiga', i: '◢', cost: { wood: 3 }, kind: 'edge2' }, stair: { n: 'Tangga', i: '🪜', cost: { wood: 6 }, kind: 'cell' },
  campfire: { n: 'Api Unggun', i: '🔥', cost: { stone: 5, stick: 4 }, kind: 'free', r: .9, desc: 'Masak dan penerangan' }, workbench: { n: 'Meja Kerja', i: '🛠️', cost: { wood: 12, stone: 6 }, kind: 'free', r: 1, desc: 'Craft alat lanjutan' }, forge: { n: 'Tungku', i: '🏭', cost: { stone: 18, wood: 6 }, kind: 'free', r: 1.2, desc: 'Lebur besi, bikin bensin' },
  bed: { n: 'Tempat Tidur', i: '🛏️', cost: { wood: 8, cloth: 3 }, kind: 'free', r: .9, desc: 'Titik respawn dan tidur' }, chest: { n: 'Peti', i: '📦', cost: { wood: 10 }, kind: 'free', r: .6, desc: 'Simpan 24 slot' }, rain: { n: 'Penampung Hujan', i: '💧', cost: { wood: 5, cloth: 2 }, kind: 'free', r: .7, desc: 'Air bersih saat hujan' }, garage: { n: 'Bengkel', i: '🚧', cost: { wood: 24, iron: 4, stone: 10 }, kind: 'free', r: 2.2, desc: 'Rakit mobil' },
  plot: { n: 'Kebun', i: '🌿', cost: { wood: 4, fiber: 4 }, kind: 'free', r: 1.1, desc: 'Tanam benih jadi sayur' }, boat: { n: 'Perahu Jukung', i: '🛶', cost: { wood: 24, rope: 6, cloth: 4 }, kind: 'water', desc: 'Taruh di air, ke pulau kecil' },
};
export const CAR_FRAME_COST = { wood: 20, iron: 8, scrap: 6 };
export const PART_INFO = {
  engine: { n: 'Mesin Pesawat', cost: { iron: 8, scrap: 6, rope: 2 }, hint: 'Hutan selatan danau' }, prop: { n: 'Baling-baling', cost: { iron: 4, scrap: 2 }, hint: 'Pantai barat danau' }, wing: { n: 'Potongan Sayap', cost: { iron: 8, cloth: 4 }, hint: 'Rak gunung barat laut' },
  gear: { n: 'Roda Pendarat', cost: { iron: 4, hide: 4 }, hint: 'Pantai selatan' }, radio: { n: 'Panel Kokpit', cost: { scrap: 6, rope: 3 }, hint: 'Bukit serigala di barat' }, tank: { n: 'Tangki Bensin', cost: { iron: 5, scrap: 3 }, hint: 'Punggung gunung utara' },
};
export const PLANE_FUEL = 3, STORM_SEC = 180, GROW_SEC = 420;
const T = (a, b) => ({ hp: 70, tool: 'axe', drop: [['wood', a, b], ['stick', 0, 2]], respawn: 900, radius: .34 });
export function entDef(type) {
  if (ENT[type]) return ENT[type];
  if (type.startsWith('tree_pine')) return ENT._pine; if (type.startsWith('tree_dead')) return ENT._dead; if (type.startsWith('tree_')) return ENT._tree; if (type.startsWith('rock_')) return ENT._rock; if (type.startsWith('boulder')) return ENT._boulder; return null;
}
export const ENT = {
  _tree: T(4, 7), _pine: T(5, 8), _dead: { hp: 40, tool: 'axe', drop: [['wood', 2, 4], ['stick', 1, 3]], respawn: 1200, radius: .3 }, palm: { hp: 46, tool: 'axe', drop: [['wood', 2, 4], ['coconut', 1, 3], ['fiber', 1, 2]], respawn: 800, radius: .32 },
  _rock: { hp: 80, tool: 'pick', drop: [['stone', 4, 7]], respawn: 1100, radius: 1 }, _boulder: { solid: true, radius: 2.6 }, ore: { hp: 100, tool: 'pick', drop: [['ore', 2, 4], ['stone', 1, 2]], respawn: 1500, radius: 1 },
  berry: { take: 1, drop: [['berry', 2, 4], ['fiber', 0, 1], ['seed', 0, 1]], respawn: 500 }, fiber: { take: 1, drop: [['fiber', 2, 4], ['seed', 0, 1]], respawn: 420 }, shroom: { take: 1, drop: [['shroom', 1, 2]], respawn: 700 }, shroom_red: { take: 1, drop: [['shroom_red', 1, 2]], respawn: 700 }, stick: { take: 1, drop: [['stick', 1, 3]], respawn: 360 }, pebble: { take: 1, drop: [['stone', 1, 2]], respawn: 360 },
  crate: { take: 1, loot: 'crate', respawn: 2400, radius: .6, label: 'Peti Kargo' }, barrel: { take: 1, loot: 'barrel', respawn: 2400, radius: .5, label: 'Drum' }, scrap_pile: { take: 1, drop: [['scrap', 2, 4], ['cloth', 0, 1]], respawn: 1500, label: 'Puing Pesawat' },
  cave_ore: { hp: 100, tool: 'pick', drop: [['ore', 3, 5], ['stone', 1, 2]], respawn: 1800, radius: 1 }, crate2: { take: 1, loot: 'crate', respawn: 2400, radius: .6, label: 'Peti Kargo' }, treasure: { take: 1, loot: 'treasure', respawn: 5400, radius: .7, label: 'Peti Harta' }, crystal: { take: 1, drop: [['iron', 1, 2], ['charcoal', 0, 1]], respawn: 3000, label: 'Kristal Besi' },
};
export const LOOT = { treasure: [['iron', 5, 9], ['rope', 2, 4], ['cloth', 2, 4], ['fuel', 1, 2], ['bandage', 1, 2]], crate: [['cloth', 2, 5], ['rope', 1, 3], ['scrap', 1, 4], ['bandage', 0, 2], ['bottle', 0, 1], ['charcoal', 0, 2]], barrel: [['scrap', 2, 4], ['charcoal', 1, 2], ['fuel', 0, 1]] };
export const ANIMALS = {
  Deer: { n: 'Rusa', hp: 55, sp: 8.4, walk: 1.5, scale: 1, flee: 1, drop: [['meat', 2, 3], ['hide', 1, 2]], count: 34, h: 1.1 }, Stag: { n: 'Rusa Jantan', hp: 90, sp: 8.8, walk: 1.5, scale: 1.05, flee: 1, charge: 1, dmg: 18, drop: [['meat', 3, 4], ['hide', 2, 3]], count: 14, h: 1.2 },
  Fox: { n: 'Rubah', hp: 32, sp: 8, walk: 1.5, scale: 1, flee: 1, drop: [['meat', 1, 1], ['hide', 1, 1]], count: 12, h: .5 }, Bull: { n: 'Banteng', hp: 170, sp: 7.4, walk: 1.2, scale: 1.05, charge: 1, dmg: 26, drop: [['meat', 4, 6], ['hide', 3, 4]], count: 10, h: 1.3 },
  Wolf: { n: 'Serigala', hp: 72, sp: 7, walk: 1.5, scale: 1.08, hostile: 1, dmg: 9, drop: [['meat', 1, 2], ['hide', 1, 2]], count: 15, h: .8 },
};
export const STAT = { hungerSec: 1500, thirstSec: 1100, starveDmg: 1.2, dayLen: 1500 };
export const CELL = 3; export const FLOOR_H = 3; export const FOOT_H = .4;
export const START_INV = [['bottle_full', 1], ['berry', 3], ['cloth', 2]];
export const SLOTS = 28, HOTBAR = 7, CHEST_SLOTS = 24;
