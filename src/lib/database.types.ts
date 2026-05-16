export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      agenda_eventos: {
        Row: {
          cliente_id: string | null;
          color: string | null;
          created_at: string;
          description: string | null;
          end_time: string;
          estado: string;
          google_calendar_id: string | null;
          google_etag: string | null;
          google_event_id: string | null;
          id: string;
          last_synced_at: string | null;
          negocio_id: string;
          start_time: string;
          title: string;
          ubicacion: string | null;
          updated_at: string;
        };
        Insert: {
          cliente_id?: string | null;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          end_time: string;
          estado?: string;
          google_calendar_id?: string | null;
          google_etag?: string | null;
          google_event_id?: string | null;
          id?: string;
          last_synced_at?: string | null;
          negocio_id: string;
          start_time: string;
          title: string;
          ubicacion?: string | null;
          updated_at?: string;
        };
        Update: {
          cliente_id?: string | null;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          end_time?: string;
          estado?: string;
          google_calendar_id?: string | null;
          google_etag?: string | null;
          google_event_id?: string | null;
          id?: string;
          last_synced_at?: string | null;
          negocio_id?: string;
          start_time?: string;
          title?: string;
          ubicacion?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agenda_eventos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agenda_eventos_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      citas: {
        Row: {
          cliente_id: string | null;
          color: string | null;
          created_at: string;
          descripcion: string | null;
          estado: string;
          fin: string;
          id: string;
          inicio: string;
          negocio_id: string;
          precio: number | null;
          recordatorio_min: number | null;
          titulo: string;
          ubicacion: string | null;
          updated_at: string;
        };
        Insert: {
          cliente_id?: string | null;
          color?: string | null;
          created_at?: string;
          descripcion?: string | null;
          estado?: string;
          fin: string;
          id?: string;
          inicio: string;
          negocio_id: string;
          precio?: number | null;
          recordatorio_min?: number | null;
          titulo: string;
          ubicacion?: string | null;
          updated_at?: string;
        };
        Update: {
          cliente_id?: string | null;
          color?: string | null;
          created_at?: string;
          descripcion?: string | null;
          estado?: string;
          fin?: string;
          id?: string;
          inicio?: string;
          negocio_id?: string;
          precio?: number | null;
          recordatorio_min?: number | null;
          titulo?: string;
          ubicacion?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "citas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "citas_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          cif: string | null;
          ciudad: string | null;
          codigo_postal: string | null;
          created_at: string;
          direccion: string | null;
          email: string | null;
          estado: string;
          etiquetas: string[] | null;
          facturacion_anual: number | null;
          id: string;
          logo_url: string | null;
          negocio_id: string;
          nombre: string;
          notas: string | null;
          num_empleados: number | null;
          pais: string | null;
          sector: string | null;
          sitio_web: string | null;
          telefono: string | null;
          updated_at: string;
        };
        Insert: {
          cif?: string | null;
          ciudad?: string | null;
          codigo_postal?: string | null;
          created_at?: string;
          direccion?: string | null;
          email?: string | null;
          estado?: string;
          etiquetas?: string[] | null;
          facturacion_anual?: number | null;
          id?: string;
          logo_url?: string | null;
          negocio_id: string;
          nombre: string;
          notas?: string | null;
          num_empleados?: number | null;
          pais?: string | null;
          sector?: string | null;
          sitio_web?: string | null;
          telefono?: string | null;
          updated_at?: string;
        };
        Update: {
          cif?: string | null;
          ciudad?: string | null;
          codigo_postal?: string | null;
          created_at?: string;
          direccion?: string | null;
          email?: string | null;
          estado?: string;
          etiquetas?: string[] | null;
          facturacion_anual?: number | null;
          id?: string;
          logo_url?: string | null;
          negocio_id?: string;
          nombre?: string;
          notas?: string | null;
          num_empleados?: number | null;
          pais?: string | null;
          sector?: string | null;
          sitio_web?: string | null;
          telefono?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      comunicaciones: {
        Row: {
          asunto: string | null;
          cliente_id: string;
          contenido: string | null;
          created_at: string;
          id: string;
          leido: boolean;
          metadata: Json | null;
          negocio_id: string;
          tipo: string;
        };
        Insert: {
          asunto?: string | null;
          cliente_id: string;
          contenido?: string | null;
          created_at?: string;
          id?: string;
          leido?: boolean;
          metadata?: Json | null;
          negocio_id: string;
          tipo: string;
        };
        Update: {
          asunto?: string | null;
          cliente_id?: string;
          contenido?: string | null;
          created_at?: string;
          id?: string;
          leido?: boolean;
          metadata?: Json | null;
          negocio_id?: string;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comunicaciones_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comunicaciones_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      config_keys: {
        Row: {
          alias: string | null;
          created_at: string;
          id: string;
          metadata: Json | null;
          negocio_id: string;
          servicio: string;
          updated_at: string;
          valor_cifrado: string;
        };
        Insert: {
          alias?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          negocio_id: string;
          servicio: string;
          updated_at?: string;
          valor_cifrado: string;
        };
        Update: {
          alias?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          negocio_id?: string;
          servicio?: string;
          updated_at?: string;
          valor_cifrado?: string;
        };
        Relationships: [
          {
            foreignKeyName: "config_keys_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      consentimientos_rgpd: {
        Row: {
          aceptado: boolean;
          cliente_id: string | null;
          created_at: string;
          fecha: string;
          firma_url: string | null;
          id: string;
          ip: unknown;
          negocio_id: string;
          revocado_en: string | null;
          texto_version: string;
          tipo: string;
          user_agent: string | null;
        };
        Insert: {
          aceptado: boolean;
          cliente_id?: string | null;
          created_at?: string;
          fecha?: string;
          firma_url?: string | null;
          id?: string;
          ip?: unknown;
          negocio_id: string;
          revocado_en?: string | null;
          texto_version: string;
          tipo: string;
          user_agent?: string | null;
        };
        Update: {
          aceptado?: boolean;
          cliente_id?: string | null;
          created_at?: string;
          fecha?: string;
          firma_url?: string | null;
          id?: string;
          ip?: unknown;
          negocio_id?: string;
          revocado_en?: string | null;
          texto_version?: string;
          tipo?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "consentimientos_rgpd_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consentimientos_rgpd_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      contactos_cliente: {
        Row: {
          apellidos: string | null;
          cliente_id: string;
          created_at: string;
          departamento: string | null;
          email: string | null;
          es_decisor: boolean;
          id: string;
          negocio_id: string;
          nombre: string;
          notas: string | null;
          puesto: string | null;
          reports_to: string | null;
          telefono: string | null;
          updated_at: string;
        };
        Insert: {
          apellidos?: string | null;
          cliente_id: string;
          created_at?: string;
          departamento?: string | null;
          email?: string | null;
          es_decisor?: boolean;
          id?: string;
          negocio_id: string;
          nombre: string;
          notas?: string | null;
          puesto?: string | null;
          reports_to?: string | null;
          telefono?: string | null;
          updated_at?: string;
        };
        Update: {
          apellidos?: string | null;
          cliente_id?: string;
          created_at?: string;
          departamento?: string | null;
          email?: string | null;
          es_decisor?: boolean;
          id?: string;
          negocio_id?: string;
          nombre?: string;
          notas?: string | null;
          puesto?: string | null;
          reports_to?: string | null;
          telefono?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contactos_cliente_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contactos_cliente_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contactos_cliente_reports_to_fkey";
            columns: ["reports_to"];
            isOneToOne: false;
            referencedRelation: "contactos_cliente";
            referencedColumns: ["id"];
          },
        ];
      };
      dispositivos_conocidos: {
        Row: {
          device_hash: string;
          device_name: string | null;
          id: string;
          ip: unknown;
          notificado: boolean;
          pais: string | null;
          primer_login: string;
          ultimo_login: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          device_hash: string;
          device_name?: string | null;
          id?: string;
          ip?: unknown;
          notificado?: boolean;
          pais?: string | null;
          primer_login?: string;
          ultimo_login?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          device_hash?: string;
          device_name?: string | null;
          id?: string;
          ip?: unknown;
          notificado?: boolean;
          pais?: string | null;
          primer_login?: string;
          ultimo_login?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      documentos: {
        Row: {
          anio: number;
          base_imponible: number;
          cliente_id: string | null;
          cliente_snapshot: Json;
          condiciones_pago: string | null;
          created_at: string;
          descuento_total: number;
          emisor_snapshot: Json;
          estado: string;
          fecha_emision: string;
          fecha_vencimiento: string | null;
          finanza_id: string | null;
          id: string;
          irpf_pct: number;
          irpf_total: number;
          iva_total: number;
          lineas: Json;
          metodo_pago: string | null;
          negocio_id: string;
          notas: string | null;
          numero: number | null;
          pdf_url: string | null;
          referencia: string | null;
          serie: string;
          subtotal: number;
          tipo: string;
          total: number;
          updated_at: string;
        };
        Insert: {
          anio?: number;
          base_imponible?: number;
          cliente_id?: string | null;
          cliente_snapshot?: Json;
          condiciones_pago?: string | null;
          created_at?: string;
          descuento_total?: number;
          emisor_snapshot?: Json;
          estado?: string;
          fecha_emision?: string;
          fecha_vencimiento?: string | null;
          finanza_id?: string | null;
          id?: string;
          irpf_pct?: number;
          irpf_total?: number;
          iva_total?: number;
          lineas?: Json;
          metodo_pago?: string | null;
          negocio_id: string;
          notas?: string | null;
          numero?: number | null;
          pdf_url?: string | null;
          referencia?: string | null;
          serie?: string;
          subtotal?: number;
          tipo: string;
          total?: number;
          updated_at?: string;
        };
        Update: {
          anio?: number;
          base_imponible?: number;
          cliente_id?: string | null;
          cliente_snapshot?: Json;
          condiciones_pago?: string | null;
          created_at?: string;
          descuento_total?: number;
          emisor_snapshot?: Json;
          estado?: string;
          fecha_emision?: string;
          fecha_vencimiento?: string | null;
          finanza_id?: string | null;
          id?: string;
          irpf_pct?: number;
          irpf_total?: number;
          iva_total?: number;
          lineas?: Json;
          metodo_pago?: string | null;
          negocio_id?: string;
          notas?: string | null;
          numero?: number | null;
          pdf_url?: string | null;
          referencia?: string | null;
          serie?: string;
          subtotal?: number;
          tipo?: string;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documentos_finanza_id_fkey";
            columns: ["finanza_id"];
            isOneToOne: false;
            referencedRelation: "finanzas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documentos_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      fichajes: {
        Row: {
          corregido: boolean;
          corrige_a: string | null;
          created_at: string;
          gps_accuracy_m: number | null;
          gps_lat: number | null;
          gps_lng: number | null;
          id: string;
          ip: unknown;
          negocio_id: string;
          observaciones: string | null;
          tipo: Database["public"]["Enums"]["tipo_fichaje"];
          ts: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          corregido?: boolean;
          corrige_a?: string | null;
          created_at?: string;
          gps_accuracy_m?: number | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          ip?: unknown;
          negocio_id: string;
          observaciones?: string | null;
          tipo: Database["public"]["Enums"]["tipo_fichaje"];
          ts?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          corregido?: boolean;
          corrige_a?: string | null;
          created_at?: string;
          gps_accuracy_m?: number | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          ip?: unknown;
          negocio_id?: string;
          observaciones?: string | null;
          tipo?: Database["public"]["Enums"]["tipo_fichaje"];
          ts?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fichajes_corrige_a_fkey";
            columns: ["corrige_a"];
            isOneToOne: false;
            referencedRelation: "fichajes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fichajes_corrige_a_fkey";
            columns: ["corrige_a"];
            isOneToOne: false;
            referencedRelation: "v_fichaje_estado_actual";
            referencedColumns: ["ultimo_id"];
          },
          {
            foreignKeyName: "fichajes_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      fichajes_archivo: {
        Row: {
          corregido: boolean;
          corrige_a: string | null;
          created_at: string;
          gps_accuracy_m: number | null;
          gps_lat: number | null;
          gps_lng: number | null;
          id: string;
          ip: unknown;
          negocio_id: string;
          observaciones: string | null;
          tipo: Database["public"]["Enums"]["tipo_fichaje"];
          ts: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          corregido?: boolean;
          corrige_a?: string | null;
          created_at?: string;
          gps_accuracy_m?: number | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          ip?: unknown;
          negocio_id: string;
          observaciones?: string | null;
          tipo: Database["public"]["Enums"]["tipo_fichaje"];
          ts?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          corregido?: boolean;
          corrige_a?: string | null;
          created_at?: string;
          gps_accuracy_m?: number | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          ip?: unknown;
          negocio_id?: string;
          observaciones?: string | null;
          tipo?: Database["public"]["Enums"]["tipo_fichaje"];
          ts?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      finanzas: {
        Row: {
          archivo_url: string | null;
          base_imponible: number;
          categoria: string | null;
          cliente_id: string | null;
          concepto: string;
          created_at: string;
          estado_pago: string;
          fecha: string;
          id: string;
          irpf_importe: number | null;
          irpf_porcentaje: number;
          iva_importe: number | null;
          iva_porcentaje: number;
          metodo_pago: string | null;
          negocio_id: string;
          notas: string | null;
          numero_factura: string | null;
          ocr_extraido: Json | null;
          tipo: string;
          total: number | null;
          updated_at: string;
        };
        Insert: {
          archivo_url?: string | null;
          base_imponible: number;
          categoria?: string | null;
          cliente_id?: string | null;
          concepto: string;
          created_at?: string;
          estado_pago?: string;
          fecha?: string;
          id?: string;
          irpf_importe?: number | null;
          irpf_porcentaje?: number;
          iva_importe?: number | null;
          iva_porcentaje?: number;
          metodo_pago?: string | null;
          negocio_id: string;
          notas?: string | null;
          numero_factura?: string | null;
          ocr_extraido?: Json | null;
          tipo: string;
          total?: number | null;
          updated_at?: string;
        };
        Update: {
          archivo_url?: string | null;
          base_imponible?: number;
          categoria?: string | null;
          cliente_id?: string | null;
          concepto?: string;
          created_at?: string;
          estado_pago?: string;
          fecha?: string;
          id?: string;
          irpf_importe?: number | null;
          irpf_porcentaje?: number;
          iva_importe?: number | null;
          iva_porcentaje?: number;
          metodo_pago?: string | null;
          negocio_id?: string;
          notas?: string | null;
          numero_factura?: string | null;
          ocr_extraido?: Json | null;
          tipo?: string;
          total?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "finanzas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finanzas_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      google_connections: {
        Row: {
          access_token_cifrado: string;
          channel_expiration: string | null;
          channel_id: string | null;
          channel_resource_id: string | null;
          channel_token: string | null;
          created_at: string;
          expires_at: string;
          google_account_email: string | null;
          id: string;
          last_full_sync_at: string | null;
          negocio_id: string;
          refresh_token_cifrado: string;
          scope: string | null;
          sync_token: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token_cifrado: string;
          channel_expiration?: string | null;
          channel_id?: string | null;
          channel_resource_id?: string | null;
          channel_token?: string | null;
          created_at?: string;
          expires_at: string;
          google_account_email?: string | null;
          id?: string;
          last_full_sync_at?: string | null;
          negocio_id: string;
          refresh_token_cifrado: string;
          scope?: string | null;
          sync_token?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token_cifrado?: string;
          channel_expiration?: string | null;
          channel_id?: string | null;
          channel_resource_id?: string | null;
          channel_token?: string | null;
          created_at?: string;
          expires_at?: string;
          google_account_email?: string | null;
          id?: string;
          last_full_sync_at?: string | null;
          negocio_id?: string;
          refresh_token_cifrado?: string;
          scope?: string | null;
          sync_token?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "google_connections_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      kanban_columnas: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          negocio_id: string;
          nombre: string;
          posicion: number;
          slug: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          negocio_id: string;
          nombre: string;
          posicion?: number;
          slug: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          negocio_id?: string;
          nombre?: string;
          posicion?: number;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kanban_columnas_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      metodos_pago: {
        Row: {
          created_at: string;
          detalle: string | null;
          etiqueta: string;
          id: string;
          negocio_id: string;
          predeterminado: boolean;
          tipo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          detalle?: string | null;
          etiqueta: string;
          id?: string;
          negocio_id: string;
          predeterminado?: boolean;
          tipo?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          detalle?: string | null;
          etiqueta?: string;
          id?: string;
          negocio_id?: string;
          predeterminado?: boolean;
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "metodos_pago_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      miembros_negocio: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          estado: Database["public"]["Enums"]["estado_miembro"];
          id: string;
          invited_at: string;
          invited_by: string | null;
          negocio_id: string;
          nombre: string | null;
          privacidad_version: string | null;
          revoked_at: string | null;
          rol: Database["public"]["Enums"]["rol_miembro"];
          terminos_version: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          estado?: Database["public"]["Enums"]["estado_miembro"];
          id?: string;
          invited_at?: string;
          invited_by?: string | null;
          negocio_id: string;
          nombre?: string | null;
          privacidad_version?: string | null;
          revoked_at?: string | null;
          rol?: Database["public"]["Enums"]["rol_miembro"];
          terminos_version?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          estado?: Database["public"]["Enums"]["estado_miembro"];
          id?: string;
          invited_at?: string;
          invited_by?: string | null;
          negocio_id?: string;
          nombre?: string | null;
          privacidad_version?: string | null;
          revoked_at?: string | null;
          rol?: Database["public"]["Enums"]["rol_miembro"];
          terminos_version?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "miembros_negocio_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      pagos_stripe: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          description: string | null;
          hosted_invoice_url: string | null;
          id: string;
          invoice_pdf_url: string | null;
          negocio_id: string;
          paid_at: string | null;
          status: string;
          stripe_charge_id: string | null;
          stripe_invoice_id: string | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          hosted_invoice_url?: string | null;
          id?: string;
          invoice_pdf_url?: string | null;
          negocio_id: string;
          paid_at?: string | null;
          status: string;
          stripe_charge_id?: string | null;
          stripe_invoice_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          hosted_invoice_url?: string | null;
          id?: string;
          invoice_pdf_url?: string | null;
          negocio_id?: string;
          paid_at?: string | null;
          status?: string;
          stripe_charge_id?: string | null;
          stripe_invoice_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pagos_stripe_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      perfiles_negocio: {
        Row: {
          cif_nif: string | null;
          created_at: string;
          direccion: string | null;
          email_contacto: string | null;
          id: string;
          logo_url: string | null;
          moneda: string;
          nombre_negocio: string;
          onboarding_completado: boolean;
          onboarding_completado_en: string | null;
          plan: string;
          sector: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_cancel_at_period_end: boolean;
          subscription_period_end: string | null;
          subscription_price_id: string | null;
          subscription_status: string | null;
          telefono: string | null;
          updated_at: string;
          user_id: string;
          zona_horaria: string;
        };
        Insert: {
          cif_nif?: string | null;
          created_at?: string;
          direccion?: string | null;
          email_contacto?: string | null;
          id?: string;
          logo_url?: string | null;
          moneda?: string;
          nombre_negocio: string;
          onboarding_completado?: boolean;
          onboarding_completado_en?: string | null;
          plan?: string;
          sector?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_cancel_at_period_end?: boolean;
          subscription_period_end?: string | null;
          subscription_price_id?: string | null;
          subscription_status?: string | null;
          telefono?: string | null;
          updated_at?: string;
          user_id: string;
          zona_horaria?: string;
        };
        Update: {
          cif_nif?: string | null;
          created_at?: string;
          direccion?: string | null;
          email_contacto?: string | null;
          id?: string;
          logo_url?: string | null;
          moneda?: string;
          nombre_negocio?: string;
          onboarding_completado?: boolean;
          onboarding_completado_en?: string | null;
          plan?: string;
          sector?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_cancel_at_period_end?: boolean;
          subscription_period_end?: string | null;
          subscription_price_id?: string | null;
          subscription_status?: string | null;
          telefono?: string | null;
          updated_at?: string;
          user_id?: string;
          zona_horaria?: string;
        };
        Relationships: [];
      };
      productos: {
        Row: {
          activo: boolean;
          categoria: string | null;
          codigo: string | null;
          color: string | null;
          created_at: string;
          descripcion: string | null;
          id: string;
          imagen_url: string | null;
          iva_pct: number;
          negocio_id: string;
          nombre: string;
          precio_coste: number;
          precio_venta: number;
          stock_actual: number;
          stock_minimo: number;
          stock_tracking: boolean;
          tipo: string;
          unidad: string;
          updated_at: string;
        };
        Insert: {
          activo?: boolean;
          categoria?: string | null;
          codigo?: string | null;
          color?: string | null;
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          imagen_url?: string | null;
          iva_pct?: number;
          negocio_id: string;
          nombre: string;
          precio_coste?: number;
          precio_venta?: number;
          stock_actual?: number;
          stock_minimo?: number;
          stock_tracking?: boolean;
          tipo?: string;
          unidad?: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          categoria?: string | null;
          codigo?: string | null;
          color?: string | null;
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          imagen_url?: string | null;
          iva_pct?: number;
          negocio_id?: string;
          nombre?: string;
          precio_coste?: number;
          precio_venta?: number;
          stock_actual?: number;
          stock_minimo?: number;
          stock_tracking?: boolean;
          tipo?: string;
          unidad?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "productos_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movimientos: {
        Row: {
          cantidad: number;
          id: string;
          motivo: string | null;
          negocio_id: string;
          producto_id: string;
          referencia: string | null;
          tipo: string;
          ts: string;
          user_id: string | null;
        };
        Insert: {
          cantidad: number;
          id?: string;
          motivo?: string | null;
          negocio_id: string;
          producto_id: string;
          referencia?: string | null;
          tipo: string;
          ts?: string;
          user_id?: string | null;
        };
        Update: {
          cantidad?: number;
          id?: string;
          motivo?: string | null;
          negocio_id?: string;
          producto_id?: string;
          referencia?: string | null;
          tipo?: string;
          ts?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movimientos_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movimientos_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movimientos_archivo: {
        Row: {
          cantidad: number;
          id: string;
          motivo: string | null;
          negocio_id: string;
          producto_id: string;
          referencia: string | null;
          tipo: string;
          ts: string;
          user_id: string | null;
        };
        Insert: {
          cantidad: number;
          id?: string;
          motivo?: string | null;
          negocio_id: string;
          producto_id: string;
          referencia?: string | null;
          tipo: string;
          ts?: string;
          user_id?: string | null;
        };
        Update: {
          cantidad?: number;
          id?: string;
          motivo?: string | null;
          negocio_id?: string;
          producto_id?: string;
          referencia?: string | null;
          tipo?: string;
          ts?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      tareas_kanban: {
        Row: {
          cliente_id: string | null;
          columna: string;
          columna_id: string | null;
          completada: boolean;
          created_at: string;
          descripcion: string | null;
          etiquetas: string[] | null;
          fecha_limite: string | null;
          id: string;
          negocio_id: string;
          posicion: number;
          prioridad: string;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          cliente_id?: string | null;
          columna?: string;
          columna_id?: string | null;
          completada?: boolean;
          created_at?: string;
          descripcion?: string | null;
          etiquetas?: string[] | null;
          fecha_limite?: string | null;
          id?: string;
          negocio_id: string;
          posicion?: number;
          prioridad?: string;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          cliente_id?: string | null;
          columna?: string;
          columna_id?: string | null;
          completada?: boolean;
          created_at?: string;
          descripcion?: string | null;
          etiquetas?: string[] | null;
          fecha_limite?: string | null;
          id?: string;
          negocio_id?: string;
          posicion?: number;
          prioridad?: string;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tareas_kanban_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tareas_kanban_columna_id_fkey";
            columns: ["columna_id"];
            isOneToOne: false;
            referencedRelation: "kanban_columnas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tareas_kanban_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      terminos_versiones: {
        Row: {
          contenido_md: string | null;
          documento: string;
          id: string;
          url: string | null;
          version: string;
          vigente_desde: string;
        };
        Insert: {
          contenido_md?: string | null;
          documento: string;
          id?: string;
          url?: string | null;
          version: string;
          vigente_desde?: string;
        };
        Update: {
          contenido_md?: string | null;
          documento?: string;
          id?: string;
          url?: string | null;
          version?: string;
          vigente_desde?: string;
        };
        Relationships: [];
      };
      tpv_venta_items: {
        Row: {
          cantidad: number;
          descuento_pct: number;
          id: string;
          importe_linea: number | null;
          iva_pct: number;
          negocio_id: string;
          nombre: string;
          precio_unit: number;
          producto_id: string;
          ts: string;
          venta_id: string;
        };
        Insert: {
          cantidad?: number;
          descuento_pct?: number;
          id?: string;
          importe_linea?: number | null;
          iva_pct?: number;
          negocio_id: string;
          nombre: string;
          precio_unit?: number;
          producto_id: string;
          ts?: string;
          venta_id: string;
        };
        Update: {
          cantidad?: number;
          descuento_pct?: number;
          id?: string;
          importe_linea?: number | null;
          iva_pct?: number;
          negocio_id?: string;
          nombre?: string;
          precio_unit?: number;
          producto_id?: string;
          ts?: string;
          venta_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tpv_venta_items_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tpv_venta_items_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "productos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tpv_venta_items_venta_id_fkey";
            columns: ["venta_id"];
            isOneToOne: false;
            referencedRelation: "tpv_ventas";
            referencedColumns: ["id"];
          },
        ];
      };
      tpv_venta_items_archivo: {
        Row: {
          cantidad: number;
          descuento_pct: number;
          id: string;
          importe_linea: number | null;
          iva_pct: number;
          negocio_id: string;
          nombre: string;
          precio_unit: number;
          producto_id: string;
          ts: string;
          venta_id: string;
        };
        Insert: {
          cantidad?: number;
          descuento_pct?: number;
          id?: string;
          importe_linea?: number | null;
          iva_pct?: number;
          negocio_id: string;
          nombre: string;
          precio_unit?: number;
          producto_id: string;
          ts?: string;
          venta_id: string;
        };
        Update: {
          cantidad?: number;
          descuento_pct?: number;
          id?: string;
          importe_linea?: number | null;
          iva_pct?: number;
          negocio_id?: string;
          nombre?: string;
          precio_unit?: number;
          producto_id?: string;
          ts?: string;
          venta_id?: string;
        };
        Relationships: [];
      };
      tpv_ventas: {
        Row: {
          abierta_at: string;
          cerrada_at: string | null;
          cliente_id: string | null;
          descuento: number;
          estado: string;
          id: string;
          iva_total: number;
          mesa: string | null;
          metodo_pago: string | null;
          negocio_id: string;
          notas: string | null;
          subtotal: number;
          total: number;
          user_id: string | null;
        };
        Insert: {
          abierta_at?: string;
          cerrada_at?: string | null;
          cliente_id?: string | null;
          descuento?: number;
          estado?: string;
          id?: string;
          iva_total?: number;
          mesa?: string | null;
          metodo_pago?: string | null;
          negocio_id: string;
          notas?: string | null;
          subtotal?: number;
          total?: number;
          user_id?: string | null;
        };
        Update: {
          abierta_at?: string;
          cerrada_at?: string | null;
          cliente_id?: string | null;
          descuento?: number;
          estado?: string;
          id?: string;
          iva_total?: number;
          mesa?: string | null;
          metodo_pago?: string | null;
          negocio_id?: string;
          notas?: string | null;
          subtotal?: number;
          total?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tpv_ventas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tpv_ventas_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
      tpv_ventas_archivo: {
        Row: {
          abierta_at: string;
          cerrada_at: string | null;
          cliente_id: string | null;
          descuento: number;
          estado: string;
          id: string;
          iva_total: number;
          mesa: string | null;
          metodo_pago: string | null;
          negocio_id: string;
          notas: string | null;
          subtotal: number;
          total: number;
          user_id: string | null;
        };
        Insert: {
          abierta_at?: string;
          cerrada_at?: string | null;
          cliente_id?: string | null;
          descuento?: number;
          estado?: string;
          id?: string;
          iva_total?: number;
          mesa?: string | null;
          metodo_pago?: string | null;
          negocio_id: string;
          notas?: string | null;
          subtotal?: number;
          total?: number;
          user_id?: string | null;
        };
        Update: {
          abierta_at?: string;
          cerrada_at?: string | null;
          cliente_id?: string | null;
          descuento?: number;
          estado?: string;
          id?: string;
          iva_total?: number;
          mesa?: string | null;
          metodo_pago?: string | null;
          negocio_id?: string;
          notas?: string | null;
          subtotal?: number;
          total?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_equipo_negocio: {
        Row: {
          accepted_at: string | null;
          email: string | null;
          es_owner: boolean | null;
          estado: string | null;
          invited_at: string | null;
          miembro_id: string | null;
          negocio_id: string | null;
          nombre: string | null;
          rol: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      v_fichaje_estado_actual: {
        Row: {
          negocio_id: string | null;
          ultimo_id: string | null;
          ultimo_tipo: Database["public"]["Enums"]["tipo_fichaje"] | null;
          ultimo_ts: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fichajes_negocio_id_fkey";
            columns: ["negocio_id"];
            isOneToOne: false;
            referencedRelation: "perfiles_negocio";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      aceptar_invitacion: {
        Args: { p_ip?: unknown; p_user_agent?: string };
        Returns: string;
      };
      archive_fichajes_antiguos: { Args: { p_meses?: number }; Returns: number };
      archive_stock_movimientos_antiguos: {
        Args: { p_meses?: number };
        Returns: number;
      };
      archive_tpv_ventas_cerradas: {
        Args: { p_meses?: number };
        Returns: number;
      };
      cerrar_venta_tpv: {
        Args: { p_metodo_pago?: string; p_venta_id: string };
        Returns: {
          abierta_at: string;
          cerrada_at: string | null;
          cliente_id: string | null;
          descuento: number;
          estado: string;
          id: string;
          iva_total: number;
          mesa: string | null;
          metodo_pago: string | null;
          negocio_id: string;
          notas: string | null;
          subtotal: number;
          total: number;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "tpv_ventas";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      clear_google_watch_channel: { Args: never; Returns: undefined };
      current_negocio_id: { Args: never; Returns: string };
      get_config_key: {
        Args: { p_alias: string; p_servicio: string };
        Returns: string;
      };
      get_google_tokens: {
        Args: never;
        Returns: {
          access_token: string;
          email: string;
          expires_at: string;
          refresh_token: string;
          sync_token: string;
        }[];
      };
      registrar_dispositivo: {
        Args: {
          p_device_hash: string;
          p_device_name?: string;
          p_ip?: unknown;
          p_user_agent?: string;
        };
        Returns: boolean;
      };
      registrar_fichaje: {
        Args: {
          p_gps_accuracy_m?: number;
          p_gps_lat?: number;
          p_gps_lng?: number;
          p_ip?: unknown;
          p_observaciones?: string;
          p_tipo: Database["public"]["Enums"]["tipo_fichaje"];
          p_user_agent?: string;
        };
        Returns: {
          corregido: boolean;
          corrige_a: string | null;
          created_at: string;
          gps_accuracy_m: number | null;
          gps_lat: number | null;
          gps_lng: number | null;
          id: string;
          ip: unknown;
          negocio_id: string;
          observaciones: string | null;
          tipo: Database["public"]["Enums"]["tipo_fichaje"];
          ts: string;
          user_agent: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "fichajes";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      registrar_onboarding: {
        Args: { p_consentimientos: Json; p_ip?: unknown; p_user_agent?: string };
        Returns: string;
      };
      reordenar_tarea: {
        Args: { p_columna: string; p_posicion: number; p_tarea_id: string };
        Returns: undefined;
      };
      set_config_key: {
        Args: {
          p_alias: string;
          p_metadata?: Json;
          p_servicio: string;
          p_valor: string;
        };
        Returns: string;
      };
      set_google_sync_token: {
        Args: { p_sync_token: string };
        Returns: undefined;
      };
      set_google_tokens: {
        Args: {
          p_access_token: string;
          p_email?: string;
          p_expires_at: string;
          p_refresh_token: string;
          p_scope?: string;
        };
        Returns: string;
      };
      set_google_watch_channel: {
        Args: {
          p_channel_expiration: string;
          p_channel_id: string;
          p_channel_resource_id: string;
          p_channel_token: string;
        };
        Returns: undefined;
      };
      siguiente_numero_documento: {
        Args: { p_anio?: number; p_serie?: string; p_tipo: string };
        Returns: number;
      };
      update_google_access_token: {
        Args: { p_access_token: string; p_expires_at: string };
        Returns: undefined;
      };
    };
    Enums: {
      estado_miembro: "invitado" | "activo" | "revocado";
      rol_miembro: "admin" | "editor" | "lector";
      tipo_fichaje: "entrada" | "inicio_descanso" | "fin_descanso" | "salida";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      estado_miembro: ["invitado", "activo", "revocado"],
      rol_miembro: ["admin", "editor", "lector"],
      tipo_fichaje: ["entrada", "inicio_descanso", "fin_descanso", "salida"],
    },
  },
} as const;
