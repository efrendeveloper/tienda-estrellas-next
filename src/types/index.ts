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
  >;
  price: number;
  file: string;
  title: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "estrella", key: "estrellas", price: 30, file: "star.png", title: "Estrella" },
  { id: "maxi", key: "maxiestrellas", price: 50, file: "power_moon.png", title: "Maxi Estrella" },
  { id: "ultra", key: "ultraestrellas", price: 80, file: "ultra_star.png", title: "Ultra Estrella" },
  { id: "hongo", key: "hongos", price: 20, file: "mushroom.png", title: "Hongo 1-UP" },
  { id: "item_box", key: "item_box", price: 10, file: "item_box1.gif", title: "Caja Sorpresa" },
  { id: "luna", key: "luna", price: 12, file: "luna.png", title: "Luna" },
  { id: "pow", key: "pow", price: 200, file: "pow.png", title: "POW" },
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
];
