SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."_migrations" (
                                                      "id" integer NOT NULL,
                                                      "name" "text" NOT NULL,
                                                      "executed_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."_migrations" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."_migrations_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."_migrations_id_seq" OWNED BY "public"."_migrations"."id";

CREATE TABLE IF NOT EXISTS "public"."characters" (
                                                     "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
                                                     "name" "text" NOT NULL,
                                                     "description" "text",
                                                     "created_at" timestamp with time zone DEFAULT "now"(),
                                                     "updated_at" timestamp with time zone DEFAULT "now"(),
                                                     "user_id" "uuid" NOT NULL
);

ALTER TABLE "public"."characters" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."folders" (
                                                  "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
                                                  "character_id" "uuid" NOT NULL,
                                                  "name" "text" NOT NULL,
                                                  "description" "text",
                                                  "created_at" timestamp with time zone DEFAULT "now"(),
                                                  "updated_at" timestamp with time zone DEFAULT "now"(),
                                                  "user_id" "uuid" NOT NULL
);

ALTER TABLE "public"."folders" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."images" (
                                                 "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
                                                 "folder_id" "uuid",
                                                 "filename" "text" NOT NULL,
                                                 "storage_path" "text" NOT NULL,
                                                 "positive_prompt" "text",
                                                 "negative_prompt" "text",
                                                 "model" "text",
                                                 "orientation" "text",
                                                 "width" integer,
                                                 "height" integer,
                                                 "batch_size" integer,
                                                 "sampler_name" "text",
                                                 "scheduler" "text",
                                                 "steps" integer,
                                                 "cfg_scale" real,
                                                 "seed" bigint,
                                                 "adetailer_enabled" boolean DEFAULT false,
                                                 "adetailer_model" "text",
                                                 "info_json" "jsonb",
                                                 "loras" "jsonb",
                                                 "created_at" timestamp with time zone DEFAULT "now"(),
                                                 "user_id" "uuid" NOT NULL,
                                                 "is_nsfw" boolean DEFAULT false,
                                                 "is_favorite" boolean DEFAULT false
);

ALTER TABLE "public"."images" OWNER TO "postgres";

ALTER TABLE ONLY "public"."_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."_migrations_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."_migrations"
    ADD CONSTRAINT "_migrations_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."_migrations"
    ADD CONSTRAINT "_migrations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_characters_user_id" ON "public"."characters" USING "btree" ("user_id");

CREATE INDEX "idx_folders_character_id" ON "public"."folders" USING "btree" ("character_id");

CREATE INDEX "idx_folders_user_id" ON "public"."folders" USING "btree" ("user_id");

CREATE INDEX "idx_images_created_at" ON "public"."images" USING "btree" ("created_at" DESC);

CREATE INDEX "idx_images_folder_id" ON "public"."images" USING "btree" ("folder_id");

CREATE INDEX "idx_images_user_id" ON "public"."images" USING "btree" ("user_id");

CREATE INDEX "images_is_favorite_idx" ON "public"."images" USING "btree" ("is_favorite");

CREATE INDEX "images_is_nsfw_idx" ON "public"."images" USING "btree" ("is_nsfw");

CREATE OR REPLACE TRIGGER "update_characters_updated_at" BEFORE UPDATE ON "public"."characters" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_folders_updated_at" BEFORE UPDATE ON "public"."folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE POLICY "Users can delete their own characters" ON "public"."characters" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete their own folders" ON "public"."folders" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete their own images" ON "public"."images" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own characters" ON "public"."characters" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own folders" ON "public"."folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own images" ON "public"."images" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update their own characters" ON "public"."characters" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update their own folders" ON "public"."folders" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update their own images" ON "public"."images" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own characters" ON "public"."characters" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own folders" ON "public"."folders" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can view their own images" ON "public"."images" FOR SELECT USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."_migrations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."characters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."images" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

GRANT ALL ON TABLE "public"."_migrations" TO "anon";
GRANT ALL ON TABLE "public"."_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."_migrations" TO "service_role";

GRANT ALL ON SEQUENCE "public"."_migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."_migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."_migrations_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."characters" TO "anon";
GRANT ALL ON TABLE "public"."characters" TO "authenticated";
GRANT ALL ON TABLE "public"."characters" TO "service_role";

GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";

GRANT ALL ON TABLE "public"."images" TO "anon";
GRANT ALL ON TABLE "public"."images" TO "authenticated";
GRANT ALL ON TABLE "public"."images" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";