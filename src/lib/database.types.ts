export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      catalog_completions: {
        Row: {
          completed_at: string;
          day: number;
          id: string;
          meal_type: string;
          user_id: string;
          week: number;
        };
        Insert: {
          completed_at?: string;
          day: number;
          id?: string;
          meal_type: string;
          user_id: string;
          week: number;
        };
        Update: {
          completed_at?: string;
          day?: number;
          id?: string;
          meal_type?: string;
          user_id?: string;
          week?: number;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          created_at: string | null;
          id: string;
          role: string;
          session_id: string;
          text: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role: string;
          session_id: string;
          text: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: string;
          session_id?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'chat_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_sessions: {
        Row: {
          created_at: string | null;
          id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      days: {
        Row: {
          calorie_target: number | null;
          carbs_target_g: number | null;
          day_number: number;
          day_type: string;
          fat_target_g: number | null;
          id: string;
          phase_id: string;
          protein_target_g: number | null;
          week_number: number;
        };
        Insert: {
          calorie_target?: number | null;
          carbs_target_g?: number | null;
          day_number: number;
          day_type?: string;
          fat_target_g?: number | null;
          id?: string;
          phase_id: string;
          protein_target_g?: number | null;
          week_number: number;
        };
        Update: {
          calorie_target?: number | null;
          carbs_target_g?: number | null;
          day_number?: number;
          day_type?: string;
          fat_target_g?: number | null;
          id?: string;
          phase_id?: string;
          protein_target_g?: number | null;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'days_phase_id_fkey';
            columns: ['phase_id'];
            isOneToOne: false;
            referencedRelation: 'phases';
            referencedColumns: ['id'];
          },
        ];
      };
      dish_ratings: {
        Row: {
          comment: string | null;
          id: string;
          rated_at: string;
          rating: number;
          recipe_id: string;
          user_id: string;
        };
        Insert: {
          comment?: string | null;
          id?: string;
          rated_at?: string;
          rating: number;
          recipe_id: string;
          user_id: string;
        };
        Update: {
          comment?: string | null;
          id?: string;
          rated_at?: string;
          rating?: number;
          recipe_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dish_ratings_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          },
        ];
      };
      health_assessments: {
        Row: {
          allergens: string[];
          allergens_other: string | null;
          avoided_ingredients: string[] | null;
          created_at: string;
          dietary_restrictions: string[];
          dietary_restrictions_other: string | null;
          disclaimer_accepted: boolean;
          disclaimer_accepted_at: string | null;
          eating_disorder_flag: boolean;
          eating_disorder_ui_mode: boolean;
          eating_disorder_anorexia_restrictive: boolean;
          eating_disorder_binge: boolean;
          eating_disorder_orthorexia: boolean;
          glucose_tracking_enabled: boolean;
          health_goals: string[];
          id: string;
          is_breastfeeding: boolean;
          is_postpartum: boolean;
          is_pregnant: boolean;
          medical_conditions: string[];
          medical_conditions_other: string | null;
          medications: string | null;
          medications_text: string | null;
          postpartum_weeks_since_birth: number | null;
          pregnancy_trimester: number | null;
          primary_goal: string | null;
          protein_cap_g_per_kg: number | null;
          protein_target_g: number | null;
          secondary_goals: string[];
          sodium_tracking_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          allergens?: string[];
          allergens_other?: string | null;
          avoided_ingredients?: string[] | null;
          created_at?: string;
          dietary_restrictions?: string[];
          dietary_restrictions_other?: string | null;
          disclaimer_accepted?: boolean;
          disclaimer_accepted_at?: string | null;
          eating_disorder_flag?: boolean;
          eating_disorder_ui_mode?: boolean;
          eating_disorder_anorexia_restrictive?: boolean;
          eating_disorder_binge?: boolean;
          eating_disorder_orthorexia?: boolean;
          glucose_tracking_enabled?: boolean;
          health_goals?: string[];
          id?: string;
          is_breastfeeding?: boolean;
          is_postpartum?: boolean;
          is_pregnant?: boolean;
          medical_conditions?: string[];
          medical_conditions_other?: string | null;
          medications?: string | null;
          medications_text?: string | null;
          postpartum_weeks_since_birth?: number | null;
          pregnancy_trimester?: number | null;
          primary_goal?: string | null;
          protein_cap_g_per_kg?: number | null;
          protein_target_g?: number | null;
          secondary_goals?: string[];
          sodium_tracking_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          allergens?: string[];
          allergens_other?: string | null;
          avoided_ingredients?: string[] | null;
          created_at?: string;
          dietary_restrictions?: string[];
          dietary_restrictions_other?: string | null;
          disclaimer_accepted?: boolean;
          disclaimer_accepted_at?: string | null;
          eating_disorder_flag?: boolean;
          eating_disorder_ui_mode?: boolean;
          eating_disorder_anorexia_restrictive?: boolean;
          eating_disorder_binge?: boolean;
          eating_disorder_orthorexia?: boolean;
          glucose_tracking_enabled?: boolean;
          health_goals?: string[];
          id?: string;
          is_breastfeeding?: boolean;
          is_postpartum?: boolean;
          is_pregnant?: boolean;
          medical_conditions?: string[];
          medical_conditions_other?: string | null;
          medications?: string | null;
          medications_text?: string | null;
          postpartum_weeks_since_birth?: number | null;
          pregnancy_trimester?: number | null;
          primary_goal?: string | null;
          protein_cap_g_per_kg?: number | null;
          protein_target_g?: number | null;
          secondary_goals?: string[];
          sodium_tracking_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          calories: number;
          carbs_g: number;
          category: string;
          created_at: string;
          fat_g: number;
          fiber_g: number;
          id: string;
          name_en: string | null;
          name_ru: string;
          protein_g: number;
        };
        Insert: {
          calories?: number;
          carbs_g?: number;
          category?: string;
          created_at?: string;
          fat_g?: number;
          fiber_g?: number;
          id?: string;
          name_en?: string | null;
          name_ru: string;
          protein_g?: number;
        };
        Update: {
          calories?: number;
          carbs_g?: number;
          category?: string;
          created_at?: string;
          fat_g?: number;
          fiber_g?: number;
          id?: string;
          name_en?: string | null;
          name_ru?: string;
          protein_g?: number;
        };
        Relationships: [];
      };
      meal_completions: {
        Row: {
          completed_at: string;
          id: string;
          meal_plan_id: string;
          meal_type: string;
          slot_date: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          id?: string;
          meal_plan_id: string;
          meal_type: string;
          slot_date: string;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          id?: string;
          meal_plan_id?: string;
          meal_type?: string;
          slot_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meal_completions_meal_plan_id_fkey';
            columns: ['meal_plan_id'];
            isOneToOne: false;
            referencedRelation: 'meal_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      meal_plans: {
        Row: {
          created_at: string;
          id: string;
          slots: Json;
          training_schedule: Json;
          updated_at: string;
          user_id: string;
          week_start_date: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          slots?: Json;
          training_schedule?: Json;
          updated_at?: string;
          user_id: string;
          week_start_date: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          slots?: Json;
          training_schedule?: Json;
          updated_at?: string;
          user_id?: string;
          week_start_date?: string;
        };
        Relationships: [];
      };
      meal_redos: {
        Row: {
          affected_date: string;
          created_at: string | null;
          id: string;
          meal_plan_id: string | null;
          paid: boolean | null;
          reason: string | null;
          redo_type: string;
          user_id: string;
          week_number: number | null;
        };
        Insert: {
          affected_date: string;
          created_at?: string | null;
          id?: string;
          meal_plan_id?: string | null;
          paid?: boolean | null;
          reason?: string | null;
          redo_type: string;
          user_id: string;
          week_number?: number | null;
        };
        Update: {
          affected_date?: string;
          created_at?: string | null;
          id?: string;
          meal_plan_id?: string | null;
          paid?: boolean | null;
          reason?: string | null;
          redo_type?: string;
          user_id?: string;
          week_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'meal_redos_meal_plan_id_fkey';
            columns: ['meal_plan_id'];
            isOneToOne: false;
            referencedRelation: 'meal_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      meals: {
        Row: {
          carbs_g: number | null;
          day: number;
          day_id: string | null;
          description: string | null;
          fat_g: number | null;
          id: string;
          is_batch: boolean;
          is_flexible: boolean;
          kcal: number | null;
          meal_type: string;
          name: string;
          phase: number;
          prep_time_min: number | null;
          protein_g: number | null;
          week: number;
        };
        Insert: {
          carbs_g?: number | null;
          day: number;
          day_id?: string | null;
          description?: string | null;
          fat_g?: number | null;
          id?: string;
          is_batch?: boolean;
          is_flexible?: boolean;
          kcal?: number | null;
          meal_type: string;
          name: string;
          phase: number;
          prep_time_min?: number | null;
          protein_g?: number | null;
          week: number;
        };
        Update: {
          carbs_g?: number | null;
          day?: number;
          day_id?: string | null;
          description?: string | null;
          fat_g?: number | null;
          id?: string;
          is_batch?: boolean;
          is_flexible?: boolean;
          kcal?: number | null;
          meal_type?: string;
          name?: string;
          phase?: number;
          prep_time_min?: number | null;
          protein_g?: number | null;
          week?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'meals_day_id_fkey';
            columns: ['day_id'];
            isOneToOne: false;
            referencedRelation: 'days';
            referencedColumns: ['id'];
          },
        ];
      };
      nutrition_logs: {
        Row: {
          calories: number;
          carbs_g: number;
          created_at: string;
          fat_g: number;
          food_name: string;
          id: string;
          logged_date: string;
          meal_type: string;
          photo_url: string | null;
          protein_g: number;
          user_id: string;
        };
        Insert: {
          calories?: number;
          carbs_g?: number;
          created_at?: string;
          fat_g?: number;
          food_name: string;
          id?: string;
          logged_date: string;
          meal_type: string;
          photo_url?: string | null;
          protein_g?: number;
          user_id: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number;
          created_at?: string;
          fat_g?: number;
          food_name?: string;
          id?: string;
          logged_date?: string;
          meal_type?: string;
          photo_url?: string | null;
          protein_g?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      phases: {
        Row: {
          created_at: string;
          duration_weeks: number;
          goal_type: string;
          id: string;
          name: string;
          order_index: number;
        };
        Insert: {
          created_at?: string;
          duration_weeks: number;
          goal_type: string;
          id?: string;
          name: string;
          order_index: number;
        };
        Update: {
          created_at?: string;
          duration_weeks?: number;
          goal_type?: string;
          id?: string;
          name?: string;
          order_index?: number;
        };
        Relationships: [];
      };
      program_meal_checks: {
        Row: {
          checks: Json;
          day_id: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          checks?: Json;
          day_id: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          checks?: Json;
          day_id?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'program_meal_checks_day_id_fkey';
            columns: ['day_id'];
            isOneToOne: false;
            referencedRelation: 'days';
            referencedColumns: ['id'];
          },
        ];
      };
      recipes: {
        Row: {
          calories_per_100g: number | null;
          calories_per_serving: number | null;
          carbs_per_100g: number | null;
          carbs_per_serving: number | null;
          created_at: string;
          created_by_user_id: string | null;
          dietary_tags: string[];
          fat_per_100g: number | null;
          fat_per_serving: number | null;
          goal_tags: string[];
          id: string;
          image_url: string | null;
          ingredients: Json;
          instructions: string[];
          prep_time_min: number | null;
          protein_per_100g: number | null;
          protein_per_serving: number | null;
          servings: number;
          source: string;
          stores: string[];
          substitutions: Json;
          title: string;
        };
        Insert: {
          calories_per_100g?: number | null;
          calories_per_serving?: number | null;
          carbs_per_100g?: number | null;
          carbs_per_serving?: number | null;
          created_at?: string;
          created_by_user_id?: string | null;
          dietary_tags?: string[];
          fat_per_100g?: number | null;
          fat_per_serving?: number | null;
          goal_tags?: string[];
          id?: string;
          image_url?: string | null;
          ingredients?: Json;
          instructions?: string[];
          prep_time_min?: number | null;
          protein_per_100g?: number | null;
          protein_per_serving?: number | null;
          servings?: number;
          source?: string;
          stores?: string[];
          substitutions?: Json;
          title: string;
        };
        Update: {
          calories_per_100g?: number | null;
          calories_per_serving?: number | null;
          carbs_per_100g?: number | null;
          carbs_per_serving?: number | null;
          created_at?: string;
          created_by_user_id?: string | null;
          dietary_tags?: string[];
          fat_per_100g?: number | null;
          fat_per_serving?: number | null;
          goal_tags?: string[];
          id?: string;
          image_url?: string | null;
          ingredients?: Json;
          instructions?: string[];
          prep_time_min?: number | null;
          protein_per_100g?: number | null;
          protein_per_serving?: number | null;
          servings?: number;
          source?: string;
          stores?: string[];
          substitutions?: Json;
          title?: string;
        };
        Relationships: [];
      };
      saved_recipes: {
        Row: {
          id: string;
          recipe_id: string;
          saved_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          saved_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          saved_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saved_recipes_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          },
        ];
      };
      shared_plans: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          meal_plan_id: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          meal_plan_id: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          meal_plan_id?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shared_plans_meal_plan_id_fkey';
            columns: ['meal_plan_id'];
            isOneToOne: false;
            referencedRelation: 'meal_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      shopping_items: {
        Row: {
          category: string;
          category_order: number;
          id: string;
          item_name: string;
          phase: number;
          phase_id: string | null;
          quantity_per_person: string | null;
          shopping_window: string;
          store: string | null;
          url: string | null;
          week: number;
        };
        Insert: {
          category: string;
          category_order?: number;
          id?: string;
          item_name: string;
          phase: number;
          phase_id?: string | null;
          quantity_per_person?: string | null;
          shopping_window: string;
          store?: string | null;
          url?: string | null;
          week: number;
        };
        Update: {
          category?: string;
          category_order?: number;
          id?: string;
          item_name?: string;
          phase?: number;
          phase_id?: string | null;
          quantity_per_person?: string | null;
          shopping_window?: string;
          store?: string | null;
          url?: string | null;
          week?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'shopping_items_phase_id_fkey';
            columns: ['phase_id'];
            isOneToOne: false;
            referencedRelation: 'phases';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          id: string;
          is_founder: boolean;
          plan: string;
          status: string;
          updated_at: string;
          user_id: string;
          yookassa_payment_method_id: string | null;
          yookassa_subscription_id: string | null;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          is_founder?: boolean;
          plan?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          yookassa_payment_method_id?: string | null;
          yookassa_subscription_id?: string | null;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          is_founder?: boolean;
          plan?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          yookassa_payment_method_id?: string | null;
          yookassa_subscription_id?: string | null;
        };
        Relationships: [];
      };
      user_goals: {
        Row: {
          activity_level: string | null;
          age: number | null;
          carbs_target_g: number;
          created_at: string;
          daily_calorie_target: number;
          fat_target_g: number;
          height_cm: number | null;
          id: string;
          primary_goal: string | null;
          protein_target_g: number;
          sex: string | null;
          updated_at: string;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          activity_level?: string | null;
          age?: number | null;
          carbs_target_g?: number;
          created_at?: string;
          daily_calorie_target?: number;
          fat_target_g?: number;
          height_cm?: number | null;
          id?: string;
          primary_goal?: string | null;
          protein_target_g?: number;
          sex?: string | null;
          updated_at?: string;
          user_id: string;
          weight_kg?: number | null;
        };
        Update: {
          activity_level?: string | null;
          age?: number | null;
          carbs_target_g?: number;
          created_at?: string;
          daily_calorie_target?: number;
          fat_target_g?: number;
          height_cm?: number | null;
          id?: string;
          primary_goal?: string | null;
          protein_target_g?: number;
          sex?: string | null;
          updated_at?: string;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      user_metrics: {
        Row: {
          activity_level: string | null;
          age: number | null;
          calories_target: number | null;
          carbs_target: number | null;
          created_at: string;
          daily_calorie_goal: number | null;
          daily_carbs_goal_g: number | null;
          daily_fat_goal_g: number | null;
          daily_protein_goal_g: number | null;
          fat_target: number | null;
          gender: string | null;
          goal: string | null;
          height_cm: number | null;
          id: string;
          protein_target: number | null;
          updated_at: string;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          activity_level?: string | null;
          age?: number | null;
          calories_target?: number | null;
          carbs_target?: number | null;
          created_at?: string;
          daily_calorie_goal?: number | null;
          daily_carbs_goal_g?: number | null;
          daily_fat_goal_g?: number | null;
          daily_protein_goal_g?: number | null;
          fat_target?: number | null;
          gender?: string | null;
          goal?: string | null;
          height_cm?: number | null;
          id?: string;
          protein_target?: number | null;
          updated_at?: string;
          user_id: string;
          weight_kg?: number | null;
        };
        Update: {
          activity_level?: string | null;
          age?: number | null;
          calories_target?: number | null;
          carbs_target?: number | null;
          created_at?: string;
          daily_calorie_goal?: number | null;
          daily_carbs_goal_g?: number | null;
          daily_fat_goal_g?: number | null;
          daily_protein_goal_g?: number | null;
          fat_target?: number | null;
          gender?: string | null;
          goal?: string | null;
          height_cm?: number | null;
          id?: string;
          protein_target?: number | null;
          updated_at?: string;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      user_plan_config: {
        Row: {
          created_at: string;
          id: string;
          macro_preference_override: Json | null;
          plan_start_date: string | null;
          reference_tdee: number;
          tdee_kcal: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          macro_preference_override?: Json | null;
          plan_start_date?: string | null;
          reference_tdee?: number;
          tdee_kcal?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          macro_preference_override?: Json | null;
          plan_start_date?: string | null;
          reference_tdee?: number;
          tdee_kcal?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          budget_preference: string | null;
          created_at: string;
          id: string;
          language: string;
          notification_prefs: Json;
          tone_mode: string | null;
          training_days: number[];
          units: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          budget_preference?: string | null;
          created_at?: string;
          id?: string;
          language?: string;
          notification_prefs?: Json;
          tone_mode?: string | null;
          training_days?: number[];
          units?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          budget_preference?: string | null;
          created_at?: string;
          id?: string;
          language?: string;
          notification_prefs?: Json;
          tone_mode?: string | null;
          training_days?: number[];
          units?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_shopping_state: {
        Row: {
          id: string;
          links: Json;
          people: number;
          shop_assignments: Json;
          shop_checks: Json;
          shopping_window: string;
          updated_at: string;
          user_id: string;
          week: number;
        };
        Insert: {
          id?: string;
          links?: Json;
          people?: number;
          shop_assignments?: Json;
          shop_checks?: Json;
          shopping_window: string;
          updated_at?: string;
          user_id: string;
          week: number;
        };
        Update: {
          id?: string;
          links?: Json;
          people?: number;
          shop_assignments?: Json;
          shop_checks?: Json;
          shopping_window?: string;
          updated_at?: string;
          user_id?: string;
          week?: number;
        };
        Relationships: [];
      };
      user_taste_portrait: {
        Row: {
          generated_at: string;
          id: string;
          portrait_data: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          generated_at?: string;
          id?: string;
          portrait_data?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          generated_at?: string;
          id?: string;
          portrait_data?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      water_logs: {
        Row: {
          amount_ml: number;
          id: string;
          logged_at: string;
          user_id: string;
        };
        Insert: {
          amount_ml: number;
          id?: string;
          logged_at?: string;
          user_id: string;
        };
        Update: {
          amount_ml?: number;
          id?: string;
          logged_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: {
          created_at: string | null;
          id: string;
          logged_date: string;
          updated_at: string | null;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          logged_date: string;
          updated_at?: string | null;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          logged_date?: string;
          updated_at?: string | null;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
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
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
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
    Enums: {},
  },
} as const;
