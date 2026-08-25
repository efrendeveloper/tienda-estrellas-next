export interface Alumno {
  id: string;
  nombre: string;
  monedas: number;
  estrellas: number;
  maxiestrellas: number;
  ultraestrellas: number;
  hongos: number;
  item_box: number;
  luna: number;
  pow: number;
  cerezas: number;
  hongo_gold: number;
  key: number;
  rayo: number;
  red_coin: number;
  cube_yellow: number;
  created_at?: string;
}

export interface ShopItem {
  id: string;
  key: keyof Pick<
    Alumno,
    | "estrellas"
    | "maxiestrellas"
    | "ultraestrellas"
    | "hongos"
    | "item_box"
    | "luna"
    | "pow"
    | "cerezas"
    | "hongo_gold"
    | "key"
    | "rayo"
    | "red_coin"
    | "cube_yellow"
  >;
  price: number;
  file: string;
  title: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "estrella", key: "estrellas", price: 30, file: "star.png", title: "Estrella" },
  { id: "maxi", key: "maxiestrellas", price: 50, file: "maxi-star.png", title: "Maxi Estrella" },
  { id: "ultra", key: "ultraestrellas", price: 80, file: "ultra-star.png", title: "Ultra Estrella" },
  { id: "hongo", key: "hongos", price: 20, file: "1up.png", title: "Hongo 1-UP" },
  { id: "item_box", key: "item_box", price: 10, file: "item_box1.gif", title: "Caja Sorpresa" },
  { id: "luna", key: "luna", price: 100, file: "luna.png", title: "Luna" },
  { id: "pow", key: "pow", price: 200, file: "pow.png", title: "POW" },
  { id: "cerezas", key: "cerezas", price: 150, file: "cerezas.png", title: "Cerezas" },
  { id: "hongo_gold", key: "hongo_gold", price: 200, file: "hongo_gold.png", title: "Hongo Gold" },
  { id: "key", key: "key", price: 80, file: "key.png", title: "Key" },
  { id: "rayo", key: "rayo", price: 50, file: "rayo.png", title: "Rayo" },
  { id: "red_coin", key: "red_coin", price: 10, file: "red_coin.png", title: "Red Coin" },
  { id: "cube_yellow", key: "cube_yellow", price: 5, file: "cube_yellow.png", title: "Cube Yellow" },
];

export const ITEMS_FOR_DISPLAY = [
  { key: "monedas" as const, file: "coin.png" },
  { key: "estrellas" as const, file: "star.png" },
  { key: "maxiestrellas" as const, file: "maxi-star.png" },
  { key: "ultraestrellas" as const, file: "ultra-star.png" },
  { key: "hongos" as const, file: "1up.png" },
  { key: "item_box" as const, file: "item_box1.gif" },
  { key: "luna" as const, file: "luna.png" },
  { key: "pow" as const, file: "pow.png" },
  { key: "cerezas" as const, file: "cerezas.png" },
  { key: "hongo_gold" as const, file: "hongo_gold.png" },
  { key: "key" as const, file: "key.png" },
  { key: "rayo" as const, file: "rayo.png" },
  { key: "red_coin" as const, file: "red_coin.png" },
  { key: "cube_yellow" as const, file: "cube_yellow.png" },
];
