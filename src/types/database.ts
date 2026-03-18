export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      alumnos: {
        Row: {
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
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          monedas?: number;
          estrellas?: number;
          maxiestrellas?: number;
          ultraestrellas?: number;
          hongos?: number;
          item_box?: number;
          luna?: number;
          pow?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          monedas?: number;
          estrellas?: number;
          maxiestrellas?: number;
          ultraestrellas?: number;
          hongos?: number;
          item_box?: number;
          luna?: number;
          pow?: number;
          created_at?: string;
        };
      };
    };
  };
}
