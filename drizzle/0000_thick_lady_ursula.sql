CREATE TABLE "exclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ingredient_id" uuid,
	"free_text" varchar(120),
	"reason" varchar(20) DEFAULT 'gusto' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	CONSTRAINT "favorites_user_id_recipe_id_pk" PRIMARY KEY("user_id","recipe_id")
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"aisle" varchar(40) NOT NULL,
	"allergen_tags" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "ingredients_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "meal_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"day_index" smallint NOT NULL,
	"meal_type" varchar(20) NOT NULL,
	"recipe_id" uuid NOT NULL,
	CONSTRAINT "meal_plan_items_slot_uq" UNIQUE("plan_id","day_index","meal_type")
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"servings" numeric(4, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_plans_user_week_uq" UNIQUE("user_id","week_start")
);
--> statement-breakpoint
CREATE TABLE "pantry" (
	"user_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	CONSTRAINT "pantry_user_id_ingredient_id_pk" PRIMARY KEY("user_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"adults" smallint DEFAULT 2 NOT NULL,
	"children" smallint DEFAULT 0 NOT NULL,
	"include_breakfast" boolean DEFAULT true NOT NULL,
	"include_lunch" boolean DEFAULT true NOT NULL,
	"include_dinner" boolean DEFAULT true NOT NULL,
	"max_prep_minutes" smallint DEFAULT 90 NOT NULL,
	"diet_tags" text[] DEFAULT '{}' NOT NULL,
	"budget_level" smallint DEFAULT 2 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"recipe_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"quantity" numeric(8, 2) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"optional" boolean DEFAULT false NOT NULL,
	CONSTRAINT "recipe_ingredients_recipe_id_ingredient_id_pk" PRIMARY KEY("recipe_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(140) NOT NULL,
	"name" varchar(140) NOT NULL,
	"description" text NOT NULL,
	"meal_types" text[] NOT NULL,
	"emoji" varchar(8) DEFAULT '🍽️' NOT NULL,
	"prep_minutes" smallint NOT NULL,
	"cook_minutes" smallint NOT NULL,
	"base_servings" smallint DEFAULT 4 NOT NULL,
	"difficulty" smallint DEFAULT 1 NOT NULL,
	"cost_level" smallint DEFAULT 2 NOT NULL,
	"calories" integer NOT NULL,
	"protein_g" numeric(6, 1) NOT NULL,
	"carbs_g" numeric(6, 1) NOT NULL,
	"fat_g" numeric(6, 1) NOT NULL,
	"fiber_g" numeric(6, 1) NOT NULL,
	"sodium_mg" integer NOT NULL,
	"diet_tags" text[] DEFAULT '{}' NOT NULL,
	"steps" text[] NOT NULL,
	CONSTRAINT "recipes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shopping_checks" (
	"plan_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "shopping_checks_plan_id_ingredient_id_pk" PRIMARY KEY("plan_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry" ADD CONSTRAINT "pantry_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry" ADD CONSTRAINT "pantry_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_checks" ADD CONSTRAINT "shopping_checks_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_checks" ADD CONSTRAINT "shopping_checks_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exclusions_user_idx" ON "exclusions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meal_plan_items_recipe_idx" ON "meal_plan_items" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipes_meal_types_idx" ON "recipes" USING btree ("meal_types");