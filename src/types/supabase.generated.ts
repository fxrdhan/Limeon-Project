export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4';
  };
  public: {
    Tables: {
      api_metrics: {
        Row: {
          created_at: string | null;
          endpoint: string;
          error_message: string | null;
          file_name: string | null;
          file_size: number | null;
          id: string;
          processing_time: number;
          response_size: number | null;
          status: string;
          timestamp: string | null;
        };
        Insert: {
          created_at?: string | null;
          endpoint: string;
          error_message?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          id?: string;
          processing_time: number;
          response_size?: number | null;
          status: string;
          timestamp?: string | null;
        };
        Update: {
          created_at?: string | null;
          endpoint?: string;
          error_message?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          id?: string;
          processing_time?: number;
          response_size?: number | null;
          status?: string;
          timestamp?: string | null;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        };
        Insert: {
          channel_id: string;
          created_at?: string | null;
          file_kind?: string | null;
          file_mime_type?: string | null;
          file_name?: string | null;
          file_preview_error?: string | null;
          file_preview_page_count?: number | null;
          file_preview_status?: string | null;
          file_preview_url?: string | null;
          file_size?: number | null;
          file_storage_path?: string | null;
          id?: string;
          is_delivered?: boolean;
          is_read?: boolean | null;
          message: string;
          message_relation_kind?: string | null;
          message_type?: string | null;
          receiver_id: string;
          reply_to_id?: string | null;
          sender_id: string;
          shared_link_slug?: string | null;
          updated_at?: string | null;
        };
        Update: {
          channel_id?: string;
          created_at?: string | null;
          file_kind?: string | null;
          file_mime_type?: string | null;
          file_name?: string | null;
          file_preview_error?: string | null;
          file_preview_page_count?: number | null;
          file_preview_status?: string | null;
          file_preview_url?: string | null;
          file_size?: number | null;
          file_storage_path?: string | null;
          id?: string;
          is_delivered?: boolean;
          is_read?: boolean | null;
          message?: string;
          message_relation_kind?: string | null;
          message_type?: string | null;
          receiver_id?: string;
          reply_to_id?: string | null;
          sender_id?: string;
          shared_link_slug?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_receiver_id_fkey';
            columns: ['receiver_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_reply_to_id_fkey';
            columns: ['reply_to_id'];
            isOneToOne: false;
            referencedRelation: 'chat_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_shared_links: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          last_accessed_at: string | null;
          message_id: string | null;
          revoked_at: string | null;
          slug: string;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at?: string;
          id?: string;
          last_accessed_at?: string | null;
          message_id?: string | null;
          revoked_at?: string | null;
          slug: string;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          last_accessed_at?: string | null;
          message_id?: string | null;
          revoked_at?: string | null;
          slug?: string;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_shared_links_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'chat_messages';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_storage_cleanup_failures: {
        Row: {
          attempts: number;
          created_at: string;
          failure_stage: string;
          id: string;
          last_error: string | null;
          message_id: string | null;
          requested_by: string;
          resolved_at: string | null;
          storage_paths: string[];
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          failure_stage: string;
          id?: string;
          last_error?: string | null;
          message_id?: string | null;
          requested_by: string;
          resolved_at?: string | null;
          storage_paths?: string[];
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          failure_stage?: string;
          id?: string;
          last_error?: string | null;
          message_id?: string | null;
          requested_by?: string;
          resolved_at?: string | null;
          storage_paths?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_storage_cleanup_failures_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      company_profiles: {
        Row: {
          address: string;
          email: string | null;
          id: string;
          name: string | null;
          pharmacist_license: string | null;
          pharmacist_name: string | null;
          phone: string | null;
          tax_id: string | null;
          updated_at: string | null;
          website: string | null;
        };
        Insert: {
          address: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          pharmacist_license?: string | null;
          pharmacist_name?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string | null;
          website?: string | null;
        };
        Update: {
          address?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          pharmacist_license?: string | null;
          pharmacist_name?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          updated_at?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      customer_level_discounts: {
        Row: {
          created_at: string | null;
          customer_level_id: string;
          discount_percentage: number | null;
          discount_rules: Json | null;
          id: string;
          item_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          customer_level_id: string;
          discount_percentage?: number | null;
          discount_rules?: Json | null;
          id?: string;
          item_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          customer_level_id?: string;
          discount_percentage?: number | null;
          discount_rules?: Json | null;
          id?: string;
          item_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_customer_level';
            columns: ['customer_level_id'];
            isOneToOne: false;
            referencedRelation: 'customer_levels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_item';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_levels: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          level_name: string;
          price_percentage: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          level_name: string;
          price_percentage: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          level_name?: string;
          price_percentage?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          address: string | null;
          created_at: string | null;
          customer_level_id: string;
          email: string | null;
          id: string;
          name: string;
          person_id: string | null;
          phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string | null;
          customer_level_id: string;
          email?: string | null;
          id?: string;
          name: string;
          person_id?: string | null;
          phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string | null;
          customer_level_id?: string;
          email?: string | null;
          id?: string;
          name?: string;
          person_id?: string | null;
          phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_person_id_fkey';
            columns: ['person_id'];
            isOneToOne: false;
            referencedRelation: 'persons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_customer_level';
            columns: ['customer_level_id'];
            isOneToOne: false;
            referencedRelation: 'customer_levels';
            referencedColumns: ['id'];
          },
        ];
      };
      doctors: {
        Row: {
          address: string | null;
          birth_date: string | null;
          created_at: string | null;
          email: string | null;
          experience_years: number | null;
          gender: string | null;
          id: string;
          image_url: string | null;
          license_number: string | null;
          name: string;
          phone: string | null;
          qualification: string | null;
          specialization: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          birth_date?: string | null;
          created_at?: string | null;
          email?: string | null;
          experience_years?: number | null;
          gender?: string | null;
          id?: string;
          image_url?: string | null;
          license_number?: string | null;
          name: string;
          phone?: string | null;
          qualification?: string | null;
          specialization?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          birth_date?: string | null;
          created_at?: string | null;
          email?: string | null;
          experience_years?: number | null;
          gender?: string | null;
          id?: string;
          image_url?: string | null;
          license_number?: string | null;
          name?: string;
          phone?: string | null;
          qualification?: string | null;
          specialization?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      e_invoice_items: {
        Row: {
          batch_number: string | null;
          created_at: string | null;
          discount: number | null;
          expiry_date: string | null;
          id: string;
          invoice_id: string | null;
          item_id: string | null;
          product_name: string;
          quantity: number;
          sku: string | null;
          total_price: number;
          unit: string | null;
          unit_id: string | null;
          unit_price: number;
          updated_at: string | null;
        };
        Insert: {
          batch_number?: string | null;
          created_at?: string | null;
          discount?: number | null;
          expiry_date?: string | null;
          id?: string;
          invoice_id?: string | null;
          item_id?: string | null;
          product_name: string;
          quantity: number;
          sku?: string | null;
          total_price: number;
          unit?: string | null;
          unit_id?: string | null;
          unit_price: number;
          updated_at?: string | null;
        };
        Update: {
          batch_number?: string | null;
          created_at?: string | null;
          discount?: number | null;
          expiry_date?: string | null;
          id?: string;
          invoice_id?: string | null;
          item_id?: string | null;
          product_name?: string;
          quantity?: number;
          sku?: string | null;
          total_price?: number;
          unit?: string | null;
          unit_id?: string | null;
          unit_price?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'e_invoice_items_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'e_invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'e_invoice_items_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'e_invoice_items_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_packages';
            referencedColumns: ['id'];
          },
        ];
      };
      e_invoices: {
        Row: {
          checked_by: string | null;
          created_at: string | null;
          customer_address: string | null;
          customer_name: string;
          due_date: string | null;
          id: string;
          invoice_date: string;
          invoice_number: string;
          is_processed: boolean | null;
          json_data: Json | null;
          ppn: number | null;
          processing_notes: string | null;
          related_purchase_id: string | null;
          supplier_address: string | null;
          supplier_name: string;
          total_invoice: number;
          total_price: number;
          updated_at: string | null;
        };
        Insert: {
          checked_by?: string | null;
          created_at?: string | null;
          customer_address?: string | null;
          customer_name: string;
          due_date?: string | null;
          id?: string;
          invoice_date: string;
          invoice_number: string;
          is_processed?: boolean | null;
          json_data?: Json | null;
          ppn?: number | null;
          processing_notes?: string | null;
          related_purchase_id?: string | null;
          supplier_address?: string | null;
          supplier_name: string;
          total_invoice?: number;
          total_price?: number;
          updated_at?: string | null;
        };
        Update: {
          checked_by?: string | null;
          created_at?: string | null;
          customer_address?: string | null;
          customer_name?: string;
          due_date?: string | null;
          id?: string;
          invoice_date?: string;
          invoice_number?: string;
          is_processed?: boolean | null;
          json_data?: Json | null;
          ppn?: number | null;
          processing_notes?: string | null;
          related_purchase_id?: string | null;
          supplier_address?: string | null;
          supplier_name?: string;
          total_invoice?: number;
          total_price?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      entity_history: {
        Row: {
          action_type: string;
          change_description: string | null;
          changed_at: string | null;
          changed_by: string | null;
          changed_fields: Json | null;
          entity_data: Json;
          entity_id: string;
          entity_table: string;
          id: string;
          version_number: number;
        };
        Insert: {
          action_type: string;
          change_description?: string | null;
          changed_at?: string | null;
          changed_by?: string | null;
          changed_fields?: Json | null;
          entity_data: Json;
          entity_id: string;
          entity_table: string;
          id?: string;
          version_number: number;
        };
        Update: {
          action_type?: string;
          change_description?: string | null;
          changed_at?: string | null;
          changed_by?: string | null;
          changed_fields?: Json | null;
          entity_data?: Json;
          entity_id?: string;
          entity_table?: string;
          id?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'entity_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      gemini_api_logs: {
        Row: {
          completion_tokens: number | null;
          created_at: string;
          error_message: string | null;
          file_info: Json | null;
          id: number;
          prompt_tokens: number | null;
          request_type: string | null;
          response_data: Json | null;
          status: Database['public']['Enums']['api_status'];
          total_tokens: number | null;
        };
        Insert: {
          completion_tokens?: number | null;
          created_at?: string;
          error_message?: string | null;
          file_info?: Json | null;
          id?: number;
          prompt_tokens?: number | null;
          request_type?: string | null;
          response_data?: Json | null;
          status: Database['public']['Enums']['api_status'];
          total_tokens?: number | null;
        };
        Update: {
          completion_tokens?: number | null;
          created_at?: string;
          error_message?: string | null;
          file_info?: Json | null;
          id?: number;
          prompt_tokens?: number | null;
          request_type?: string | null;
          response_data?: Json | null;
          status?: Database['public']['Enums']['api_status'];
          total_tokens?: number | null;
        };
        Relationships: [];
      };
      item_categories: {
        Row: {
          code: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      item_dosages: {
        Row: {
          code: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          nci_code: string | null;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          nci_code?: string | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          nci_code?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      item_inventory_units: {
        Row: {
          code: string | null;
          created_at: string;
          description: string | null;
          id: string;
          kind: string;
          name: string;
          source_dosage_id: string | null;
          source_package_id: string | null;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind: string;
          name: string;
          source_dosage_id?: string | null;
          source_package_id?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          kind?: string;
          name?: string;
          source_dosage_id?: string | null;
          source_package_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_inventory_units_source_dosage_id_fkey';
            columns: ['source_dosage_id'];
            isOneToOne: false;
            referencedRelation: 'item_dosages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_inventory_units_source_package_id_fkey';
            columns: ['source_package_id'];
            isOneToOne: false;
            referencedRelation: 'item_packages';
            referencedColumns: ['id'];
          },
        ];
      };
      item_manufacturers: {
        Row: {
          address: string | null;
          code: string | null;
          created_at: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          code?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          code?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      item_packages: {
        Row: {
          code: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          nci_code: string | null;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          nci_code?: string | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          nci_code?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      item_types: {
        Row: {
          code: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      item_unit_hierarchy: {
        Row: {
          base_price_override: number | null;
          contains_quantity: number;
          created_at: string;
          factor_to_base: number;
          id: string;
          inventory_unit_id: string;
          item_id: string;
          parent_inventory_unit_id: string | null;
          sell_price_override: number | null;
          updated_at: string;
        };
        Insert: {
          base_price_override?: number | null;
          contains_quantity?: number;
          created_at?: string;
          factor_to_base?: number;
          id?: string;
          inventory_unit_id: string;
          item_id: string;
          parent_inventory_unit_id?: string | null;
          sell_price_override?: number | null;
          updated_at?: string;
        };
        Update: {
          base_price_override?: number | null;
          contains_quantity?: number;
          created_at?: string;
          factor_to_base?: number;
          id?: string;
          inventory_unit_id?: string;
          item_id?: string;
          parent_inventory_unit_id?: string | null;
          sell_price_override?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_unit_hierarchy_inventory_unit_id_fkey';
            columns: ['inventory_unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_inventory_units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_unit_hierarchy_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_unit_hierarchy_parent_inventory_unit_id_fkey';
            columns: ['parent_inventory_unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_inventory_units';
            referencedColumns: ['id'];
          },
        ];
      };
      item_units: {
        Row: {
          code: string;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      items: {
        Row: {
          barcode: string | null;
          base_inventory_unit_id: string | null;
          base_price: number | null;
          base_unit: string | null;
          category_id: string | null;
          code: string | null;
          created_at: string | null;
          description: string | null;
          dosage_id: string | null;
          has_expiry_date: boolean | null;
          id: string;
          image_urls: Json;
          is_active: boolean | null;
          is_level_pricing_active: boolean;
          is_medicine: boolean | null;
          manufacturer_id: string | null;
          measurement_denominator_unit_id: string | null;
          measurement_denominator_value: number | null;
          measurement_unit_id: string | null;
          measurement_value: number | null;
          min_stock: number | null;
          name: string;
          package_conversions: Json | null;
          package_id: string;
          rack: string | null;
          sell_price: number;
          stock: number;
          type_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          barcode?: string | null;
          base_inventory_unit_id?: string | null;
          base_price?: number | null;
          base_unit?: string | null;
          category_id?: string | null;
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          dosage_id?: string | null;
          has_expiry_date?: boolean | null;
          id?: string;
          image_urls?: Json;
          is_active?: boolean | null;
          is_level_pricing_active?: boolean;
          is_medicine?: boolean | null;
          manufacturer_id?: string | null;
          measurement_denominator_unit_id?: string | null;
          measurement_denominator_value?: number | null;
          measurement_unit_id?: string | null;
          measurement_value?: number | null;
          min_stock?: number | null;
          name: string;
          package_conversions?: Json | null;
          package_id: string;
          rack?: string | null;
          sell_price?: number;
          stock?: number;
          type_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          barcode?: string | null;
          base_inventory_unit_id?: string | null;
          base_price?: number | null;
          base_unit?: string | null;
          category_id?: string | null;
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          dosage_id?: string | null;
          has_expiry_date?: boolean | null;
          id?: string;
          image_urls?: Json;
          is_active?: boolean | null;
          is_level_pricing_active?: boolean;
          is_medicine?: boolean | null;
          manufacturer_id?: string | null;
          measurement_denominator_unit_id?: string | null;
          measurement_denominator_value?: number | null;
          measurement_unit_id?: string | null;
          measurement_value?: number | null;
          min_stock?: number | null;
          name?: string;
          package_conversions?: Json | null;
          package_id?: string;
          rack?: string | null;
          sell_price?: number;
          stock?: number;
          type_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'items_base_inventory_unit_id_fkey';
            columns: ['base_inventory_unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_inventory_units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_dosage_id_fkey';
            columns: ['dosage_id'];
            isOneToOne: false;
            referencedRelation: 'item_dosages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_manufacturer_id_fkey';
            columns: ['manufacturer_id'];
            isOneToOne: false;
            referencedRelation: 'item_manufacturers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_measurement_denominator_unit_id_fkey';
            columns: ['measurement_denominator_unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_measurement_unit_id_fkey';
            columns: ['measurement_unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'item_packages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'medicines_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'item_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'medicines_type_id_fkey';
            columns: ['type_id'];
            isOneToOne: false;
            referencedRelation: 'item_types';
            referencedColumns: ['id'];
          },
        ];
      };
      patients: {
        Row: {
          address: string | null;
          birth_date: string | null;
          created_at: string | null;
          email: string | null;
          gender: string | null;
          id: string;
          image_url: string | null;
          name: string;
          person_id: string | null;
          phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          birth_date?: string | null;
          created_at?: string | null;
          email?: string | null;
          gender?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          person_id?: string | null;
          phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          birth_date?: string | null;
          created_at?: string | null;
          email?: string | null;
          gender?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          person_id?: string | null;
          phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'patients_person_id_fkey';
            columns: ['person_id'];
            isOneToOne: false;
            referencedRelation: 'persons';
            referencedColumns: ['id'];
          },
        ];
      };
      persons: {
        Row: {
          address: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      purchase_items: {
        Row: {
          batch_no: string | null;
          created_at: string | null;
          discount: number | null;
          expiry_date: string | null;
          id: string;
          inventory_unit_id: string | null;
          item_id: string | null;
          price: number;
          purchase_id: string | null;
          quantity: number;
          subtotal: number;
          unit: string | null;
          unit_conversion_rate: number;
          unit_id: string | null;
          updated_at: string | null;
          vat_percentage: number | null;
        };
        Insert: {
          batch_no?: string | null;
          created_at?: string | null;
          discount?: number | null;
          expiry_date?: string | null;
          id?: string;
          inventory_unit_id?: string | null;
          item_id?: string | null;
          price: number;
          purchase_id?: string | null;
          quantity: number;
          subtotal: number;
          unit?: string | null;
          unit_conversion_rate?: number;
          unit_id?: string | null;
          updated_at?: string | null;
          vat_percentage?: number | null;
        };
        Update: {
          batch_no?: string | null;
          created_at?: string | null;
          discount?: number | null;
          expiry_date?: string | null;
          id?: string;
          inventory_unit_id?: string | null;
          item_id?: string | null;
          price?: number;
          purchase_id?: string | null;
          quantity?: number;
          subtotal?: number;
          unit?: string | null;
          unit_conversion_rate?: number;
          unit_id?: string | null;
          updated_at?: string | null;
          vat_percentage?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'purchase_items_inventory_unit_id_fkey';
            columns: ['inventory_unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_inventory_units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_items_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_items_purchase_id_fkey';
            columns: ['purchase_id'];
            isOneToOne: false;
            referencedRelation: 'purchases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_items_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_packages';
            referencedColumns: ['id'];
          },
        ];
      };
      purchases: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          customer_address: string | null;
          customer_name: string | null;
          date: string;
          due_date: string | null;
          id: string;
          invoice_number: string | null;
          is_vat_included: boolean | null;
          notes: string | null;
          payment_method: string | null;
          payment_status: string | null;
          so_number: string | null;
          supplier_id: string | null;
          total: number;
          updated_at: string | null;
          vat_amount: number | null;
          vat_percentage: number | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          customer_address?: string | null;
          customer_name?: string | null;
          date: string;
          due_date?: string | null;
          id?: string;
          invoice_number?: string | null;
          is_vat_included?: boolean | null;
          notes?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          so_number?: string | null;
          supplier_id?: string | null;
          total?: number;
          updated_at?: string | null;
          vat_amount?: number | null;
          vat_percentage?: number | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          customer_address?: string | null;
          customer_name?: string | null;
          date?: string;
          due_date?: string | null;
          id?: string;
          invoice_number?: string | null;
          is_vat_included?: boolean | null;
          notes?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          so_number?: string | null;
          supplier_id?: string | null;
          total?: number;
          updated_at?: string | null;
          vat_amount?: number | null;
          vat_percentage?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'purchases_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchases_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'suppliers';
            referencedColumns: ['id'];
          },
        ];
      };
      sale_items: {
        Row: {
          created_at: string | null;
          id: string;
          inventory_unit_id: string | null;
          item_id: string | null;
          price: number;
          quantity: number;
          sale_id: string | null;
          subtotal: number;
          unit_conversion_rate: number;
          unit_id: string | null;
          unit_name: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          inventory_unit_id?: string | null;
          item_id?: string | null;
          price: number;
          quantity: number;
          sale_id?: string | null;
          subtotal: number;
          unit_conversion_rate?: number;
          unit_id?: string | null;
          unit_name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          inventory_unit_id?: string | null;
          item_id?: string | null;
          price?: number;
          quantity?: number;
          sale_id?: string | null;
          subtotal?: number;
          unit_conversion_rate?: number;
          unit_id?: string | null;
          unit_name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sale_items_inventory_unit_id_fkey';
            columns: ['inventory_unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_inventory_units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_items_medicine_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_items_sale_id_fkey';
            columns: ['sale_id'];
            isOneToOne: false;
            referencedRelation: 'sales';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sale_items_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'item_packages';
            referencedColumns: ['id'];
          },
        ];
      };
      sales: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          customer_id: string | null;
          date: string;
          doctor_id: string | null;
          id: string;
          invoice_number: string | null;
          patient_id: string | null;
          payment_method: string | null;
          total: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          customer_id?: string | null;
          date: string;
          doctor_id?: string | null;
          id?: string;
          invoice_number?: string | null;
          patient_id?: string | null;
          payment_method?: string | null;
          total?: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          customer_id?: string | null;
          date?: string;
          doctor_id?: string | null;
          id?: string;
          invoice_number?: string | null;
          patient_id?: string | null;
          payment_method?: string | null;
          total?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sales_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'doctors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sales_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
        ];
      };
      suppliers: {
        Row: {
          address: string | null;
          contact_person: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          image_url: string | null;
          name: string;
          phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          contact_person?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          contact_person?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          created_at: string | null;
          id: string;
          preference_key: string;
          preference_value: Json;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          preference_key: string;
          preference_value?: Json;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          preference_key?: string;
          preference_value?: Json;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_presence: {
        Row: {
          id: string;
          is_online: boolean | null;
          last_chat_opened: string | null;
          last_seen: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          is_online?: boolean | null;
          last_chat_opened?: string | null;
          last_seen?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          is_online?: boolean | null;
          last_chat_opened?: string | null;
          last_seen?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_presence_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          name: string;
          profilephoto: string | null;
          profilephoto_path: string | null;
          profilephoto_thumb: string | null;
          role: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id: string;
          name: string;
          profilephoto?: string | null;
          profilephoto_path?: string | null;
          profilephoto_thumb?: string | null;
          role?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string;
          profilephoto?: string | null;
          profilephoto_path?: string | null;
          profilephoto_thumb?: string | null;
          role?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_item_stock_deltas: {
        Args: { p_updates: Json };
        Returns: undefined;
      };
      compute_dm_channel_id: {
        Args: { p_user_a: string; p_user_b: string };
        Returns: string;
      };
      convert_expiry_date: { Args: { month_year: string }; Returns: string };
      create_chat_message: {
        Args: {
          p_file_kind?: string;
          p_file_mime_type?: string;
          p_file_name?: string;
          p_file_preview_error?: string;
          p_file_preview_page_count?: number;
          p_file_preview_status?: string;
          p_file_preview_url?: string;
          p_file_size?: number;
          p_file_storage_path?: string;
          p_message: string;
          p_message_relation_kind?: string;
          p_message_type?: string;
          p_receiver_id: string;
          p_reply_to_id?: string;
        };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_user_can_view_presence: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      current_user_is_admin: { Args: never; Returns: boolean };
      decrement: { Args: { x: number }; Returns: number };
      delete_chat_message_thread: {
        Args: { p_message_id: string };
        Returns: string[];
      };
      delete_purchase_with_stock_restore: {
        Args: { p_purchase_id: string };
        Returns: undefined;
      };
      delete_sale_with_stock_restore: {
        Args: { p_sale_id: string };
        Returns: undefined;
      };
      edit_chat_message_text: {
        Args: {
          p_message: string;
          p_message_id: string;
          p_updated_at?: string;
        };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fetch_chat_message_context: {
        Args: {
          p_after_limit?: number;
          p_before_limit?: number;
          p_channel_id?: string;
          p_message_id?: string;
          p_target_user_id: string;
        };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      fetch_chat_messages_page: {
        Args: {
          p_before_created_at?: string;
          p_before_id?: string;
          p_channel_id?: string;
          p_limit?: number;
          p_target_user_id: string;
        };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      generate_chat_shared_link_slug: { Args: never; Returns: string };
      get_chat_message_by_id: {
        Args: { p_message_id: string };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_dashboard_summary: {
        Args: never;
        Returns: {
          current_month_sales: number;
          low_stock_count: number;
          previous_month_sales: number;
          total_medicines: number;
          total_purchases: number;
          total_sales: number;
        }[];
      };
      get_next_version_number: {
        Args: { p_entity_id: string; p_table: string };
        Returns: number;
      };
      get_top_selling_medicines: {
        Args: { limit_count: number };
        Returns: {
          name: string;
          total_quantity: number;
        }[];
      };
      get_user_presence: {
        Args: { p_user_id: string };
        Returns: {
          id: string;
          is_online: boolean | null;
          last_chat_opened: string | null;
          last_seen: string | null;
          updated_at: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'user_presence';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      hard_rollback_entity: {
        Args: {
          p_entity_id: string;
          p_entity_table: string;
          p_target_version: number;
        };
        Returns: Json;
      };
      list_active_user_presence_since: {
        Args: { p_since: string };
        Returns: {
          id: string;
          is_online: boolean | null;
          last_chat_opened: string | null;
          last_seen: string | null;
          updated_at: string | null;
          user_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'user_presence';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      list_chat_directory_users: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          email: string;
          id: string;
          last_message: string;
          last_message_created_at: string;
          name: string;
          profilephoto: string;
          profilephoto_thumb: string;
        }[];
      };
      list_undelivered_incoming_message_ids: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: string[];
      };
      mark_chat_message_ids_as_delivered: {
        Args: { p_message_ids: string[] };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      mark_chat_message_ids_as_read: {
        Args: { p_message_ids: string[] };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      mark_chat_messages_as_delivered: {
        Args: {
          p_channel_id?: string;
          p_receiver_id: string;
          p_sender_id: string;
        };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      mark_chat_messages_as_read: {
        Args: {
          p_channel_id?: string;
          p_receiver_id: string;
          p_sender_id: string;
        };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      process_e_invoice_to_purchase: {
        Args: { e_invoice_id: string };
        Returns: string;
      };
      process_purchase:
        | {
            Args: {
              p_date: string;
              p_due_date: string;
              p_invoice_number: string;
              p_is_vat_included: boolean;
              p_items: Json;
              p_notes: string;
              p_payment_method: string;
              p_payment_status: string;
              p_supplier_id: string;
              p_total: number;
              p_vat_amount: number;
            };
            Returns: string;
          }
        | {
            Args: {
              p_date: string;
              p_due_date: string;
              p_invoice_number: string;
              p_is_vat_included: boolean;
              p_items: Json;
              p_notes: string;
              p_payment_method: string;
              p_payment_status: string;
              p_so_number: string;
              p_supplier_id: string;
              p_total: number;
              p_vat_amount: number;
            };
            Returns: string;
          };
      process_purchase_v2: {
        Args: {
          p_customer_address: string;
          p_customer_name: string;
          p_date: string;
          p_due_date: string;
          p_invoice_number: string;
          p_is_vat_included: boolean;
          p_items: Json;
          p_notes: string;
          p_payment_method: string;
          p_payment_status: string;
          p_supplier_id: string;
          p_total: number;
          p_vat_amount: number;
          p_vat_percentage: number;
        };
        Returns: string;
      };
      process_sale_v1: {
        Args: {
          p_created_by: string;
          p_customer_id: string;
          p_date: string;
          p_doctor_id: string;
          p_invoice_number: string;
          p_items: Json;
          p_patient_id: string;
          p_payment_method: string;
          p_total: number;
        };
        Returns: string;
      };
      restore_entity_version: {
        Args: {
          p_entity_id: string;
          p_entity_table: string;
          p_version_number: number;
        };
        Returns: boolean;
      };
      search_chat_messages: {
        Args: {
          p_after_created_at?: string;
          p_after_id?: string;
          p_channel_id?: string;
          p_limit?: number;
          p_query?: string;
          p_target_user_id: string;
        };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      sync_user_presence_on_exit: {
        Args: {
          p_is_online?: boolean;
          p_last_seen?: string;
          p_user_id: string;
        };
        Returns: {
          id: string;
          is_online: boolean | null;
          last_chat_opened: string | null;
          last_seen: string | null;
          updated_at: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'user_presence';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_chat_file_preview_metadata: {
        Args: {
          p_file_preview_error?: string;
          p_file_preview_page_count?: number;
          p_file_preview_status?: string;
          p_file_preview_url?: string;
          p_message_id: string;
        };
        Returns: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          shared_link_slug: string | null;
          updated_at: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'chat_messages';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      upsert_user_presence: {
        Args: {
          p_is_online?: boolean;
          p_last_chat_opened?: string;
          p_user_id: string;
        };
        Returns: {
          id: string;
          is_online: boolean | null;
          last_chat_opened: string | null;
          last_seen: string | null;
          updated_at: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'user_presence';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      api_status: 'success' | 'error';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      api_status: ['success', 'error'],
    },
  },
} as const;
