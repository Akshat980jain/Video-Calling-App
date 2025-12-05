CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, is_online, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    false,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: call_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    caller_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    status text DEFAULT 'missed'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer DEFAULT 0,
    CONSTRAINT call_history_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'missed'::text, 'declined'::text])))
);


--
-- Name: meeting_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_code text NOT NULL,
    host_id uuid NOT NULL,
    name text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval)
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_content_length CHECK (((char_length(content) >= 1) AND (char_length(content) <= 2000)))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    avatar_url text,
    is_online boolean DEFAULT false,
    last_seen timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profiles_public WITH (security_invoker='true') AS
 SELECT id,
    name,
    avatar_url,
    is_online,
    last_seen,
    created_at,
    updated_at
   FROM public.profiles;


--
-- Name: call_history call_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_history
    ADD CONSTRAINT call_history_pkey PRIMARY KEY (id);


--
-- Name: meeting_rooms meeting_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_pkey PRIMARY KEY (id);


--
-- Name: meeting_rooms meeting_rooms_room_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_room_code_key UNIQUE (room_code);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: idx_call_history_caller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_caller ON public.call_history USING btree (caller_id);


--
-- Name: idx_call_history_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_receiver ON public.call_history USING btree (receiver_id);


--
-- Name: idx_call_history_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_started ON public.call_history USING btree (started_at DESC);


--
-- Name: idx_meeting_rooms_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_rooms_code ON public.meeting_rooms USING btree (room_code);


--
-- Name: idx_meeting_rooms_host; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_rooms_host ON public.meeting_rooms USING btree (host_id);


--
-- Name: idx_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_receiver ON public.messages USING btree (receiver_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: call_history call_history_caller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_history
    ADD CONSTRAINT call_history_caller_id_fkey FOREIGN KEY (caller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: call_history call_history_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_history
    ADD CONSTRAINT call_history_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: meeting_rooms meeting_rooms_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: meeting_rooms Hosts can delete their rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hosts can delete their rooms" ON public.meeting_rooms FOR DELETE USING ((auth.uid() = host_id));


--
-- Name: meeting_rooms Hosts can update their rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hosts can update their rooms" ON public.meeting_rooms FOR UPDATE USING ((auth.uid() = host_id));


--
-- Name: call_history Participants can update call history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Participants can update call history" ON public.call_history FOR UPDATE USING (((auth.uid() = caller_id) OR (auth.uid() = receiver_id)));


--
-- Name: call_history Users can create call history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create call history" ON public.call_history FOR INSERT WITH CHECK ((auth.uid() = caller_id));


--
-- Name: meeting_rooms Users can create rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create rooms" ON public.meeting_rooms FOR INSERT WITH CHECK ((auth.uid() = host_id));


--
-- Name: messages Users can delete their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own messages" ON public.messages FOR DELETE USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: messages Users can update their received messages (mark as read); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their received messages (mark as read)" ON public.messages FOR UPDATE USING ((auth.uid() = receiver_id));


--
-- Name: meeting_rooms Users can view active rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view active rooms" ON public.meeting_rooms FOR SELECT USING ((is_active = true));


--
-- Name: call_history Users can view their own call history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own call history" ON public.call_history FOR SELECT USING (((auth.uid() = caller_id) OR (auth.uid() = receiver_id)));


--
-- Name: messages Users can view their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: call_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


