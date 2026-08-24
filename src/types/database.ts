export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: "admin" | "collaborator" | "viewer";
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: "admin" | "collaborator" | "viewer";
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: "admin" | "collaborator" | "viewer";
          updated_at?: string;
        };
        Relationships: [];
      };
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
        Relationships: [];
      };
      asistencias: {
        Row: {
          id: string;
          alumno_id: string;
          fecha: string;
          estado: "present" | "absent" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          alumno_id: string;
          fecha: string;
          estado?: "present" | "absent" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          alumno_id?: string;
          fecha?: string;
          estado?: "present" | "absent" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "asistencias_alumno_id_fkey";
            columns: ["alumno_id"];
            isOneToOne: false;
            referencedRelation: "alumnos";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

