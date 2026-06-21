--
-- PostgreSQL database dump
--

\restrict F5fWrztQz9neB7Br8X8nnESECTuqOwKmAulffYWAqjF3JI9E1bRgP2xbItqLd04

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-06-21 11:05:06

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
-- TOC entry 2 (class 3079 OID 16389)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5371 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 244 (class 1259 OID 16935)
-- Name: activity_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text
);


ALTER TABLE public.activity_types OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16837)
-- Name: approval_statuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.approval_statuses OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16970)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    table_name character varying(100) NOT NULL,
    record_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16810)
-- Name: change_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.change_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.change_types OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16583)
-- Name: changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    implementation_plan text,
    rollback_plan text,
    planned_start_time timestamp without time zone,
    planned_end_time timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    risk_level_id uuid,
    approval_status_id uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.changes OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16918)
-- Name: ci_relationship_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ci_relationship_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text
);


ALTER TABLE public.ci_relationship_types OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16797)
-- Name: ci_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ci_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ci_types OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16658)
-- Name: configuration_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.configuration_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    owner_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ci_type_id uuid,
    status_id uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.configuration_items OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16449)
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16538)
-- Name: incidents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    impact character varying(20) DEFAULT 'LOW'::character varying,
    urgency character varying(20) DEFAULT 'LOW'::character varying,
    affected_service character varying(100),
    resolution_notes text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.incidents OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16729)
-- Name: knowledge_articles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status_id uuid,
    category_id uuid
);


ALTER TABLE public.knowledge_articles OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16850)
-- Name: knowledge_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.knowledge_categories OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16427)
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    domain character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16783)
-- Name: priorities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.priorities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    level integer NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.priorities OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16640)
-- Name: problem_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.problem_changes (
    problem_id uuid NOT NULL,
    change_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.problem_changes OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16622)
-- Name: problem_incidents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.problem_incidents (
    problem_id uuid NOT NULL,
    incident_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.problem_incidents OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16603)
-- Name: problems; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.problems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    root_cause text,
    workaround text,
    permanent_solution text,
    known_error boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.problems OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16823)
-- Name: risk_levels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.risk_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    level integer NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.risk_levels OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16436)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16558)
-- Name: service_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    requested_for uuid NOT NULL,
    approval_status character varying(20) DEFAULT 'PENDING'::character varying,
    fulfillment_notes text,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    approval_status_id uuid
);


ALTER TABLE public.service_requests OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16756)
-- Name: statuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module character varying(50) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.statuses OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16705)
-- Name: ticket_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    created_by uuid NOT NULL,
    comment text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    activity_type_id uuid
);


ALTER TABLE public.ticket_activities OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16682)
-- Name: ticket_configuration_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_configuration_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    ci_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    relationship_type_id uuid
);


ALTER TABLE public.ticket_configuration_items OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16770)
-- Name: ticket_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ticket_types OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16498)
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    created_by uuid NOT NULL,
    assigned_to uuid,
    department_id uuid,
    ticket_number character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status_id uuid,
    ticket_type_id uuid,
    priority_id uuid
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16466)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    role_id uuid NOT NULL,
    department_id uuid,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5364 (class 0 OID 16935)
-- Dependencies: 244
-- Data for Name: activity_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_types (id, name, description) FROM stdin;
78990f7f-47e8-46f7-a644-c3a04b2b3c46	WORK_NOTE	Internal investigation note
34f6b85c-cb15-4608-8ddd-d1776d7a74b9	COMMENT	User visible comment
5e15417f-15b4-41de-9962-5932e34c22e1	STATUS_CHANGE	Ticket status update
caea9a94-35d1-4241-9502-c15299687fc9	ASSIGNMENT_CHANGE	Assignment update
\.


--
-- TOC entry 5361 (class 0 OID 16837)
-- Dependencies: 241
-- Data for Name: approval_statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_statuses (id, name, description, created_at) FROM stdin;
4351b8f3-9e29-47e9-a8be-f6a91ea95530	PENDING	Awaiting approval	2026-06-20 20:52:23.221933
010834a7-c3a9-4035-ab19-8118eca639d1	APPROVED	Approved	2026-06-20 20:52:23.221933
c41731c1-fb24-4d62-996a-3c29a63d2fcc	REJECTED	Rejected	2026-06-20 20:52:23.221933
\.


--
-- TOC entry 5365 (class 0 OID 16970)
-- Dependencies: 245
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, organization_id, table_name, record_id, action, old_value, new_value, changed_by, created_at) FROM stdin;
\.


--
-- TOC entry 5359 (class 0 OID 16810)
-- Dependencies: 239
-- Data for Name: change_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.change_types (id, name, description, created_at) FROM stdin;
\.


--
-- TOC entry 5347 (class 0 OID 16583)
-- Dependencies: 227
-- Data for Name: changes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.changes (id, ticket_id, implementation_plan, rollback_plan, planned_start_time, planned_end_time, created_at, risk_level_id, approval_status_id, updated_at) FROM stdin;
bc1cf931-fd85-4521-8d2e-7d74655c1294	e1336e18-ccea-4b2c-abf9-6f1307198eec	Deploy version 2.5 during maintenance window	Rollback to version 2.4 if deployment fails	\N	\N	2026-06-20 16:31:53.991024	5684aa7d-0bce-49cb-9814-9c408ac1900e	4351b8f3-9e29-47e9-a8be-f6a91ea95530	2026-06-20 20:31:55.093219
\.


--
-- TOC entry 5363 (class 0 OID 16918)
-- Dependencies: 243
-- Data for Name: ci_relationship_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ci_relationship_types (id, name, description) FROM stdin;
0115882b-e93f-4c3c-89ae-38394fccf058	AFFECTED	CI impacted by ticket
89195920-b1bd-4e5d-a8a8-2db73b6940e5	CHANGED	CI modified by change
5a827597-4531-4035-9aa9-cde3d8f6590e	ROOT_CAUSE	CI responsible for issue
\.


--
-- TOC entry 5358 (class 0 OID 16797)
-- Dependencies: 238
-- Data for Name: ci_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ci_types (id, name, description, created_at) FROM stdin;
2364a724-9070-434e-95b3-711f11b3b478	SERVER	Server	2026-06-20 20:11:18.446015
d831b89b-f329-488f-ac3a-85a915ba4a98	DATABASE	Database	2026-06-20 20:11:18.446015
f5e204c4-7f50-47b8-9260-b7d5e20a1eb6	APPLICATION	Application	2026-06-20 20:11:18.446015
b971c1af-90af-44e6-98b4-523814ac565f	NETWORK_DEVICE	Network device	2026-06-20 20:11:18.446015
55ff2035-5c85-4211-ae4a-d5dfb16725c8	CLOUD_RESOURCE	Cloud resource	2026-06-20 20:11:18.446015
\.


--
-- TOC entry 5351 (class 0 OID 16658)
-- Dependencies: 231
-- Data for Name: configuration_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuration_items (id, organization_id, name, description, owner_id, created_at, ci_type_id, status_id, updated_at) FROM stdin;
63334a63-8b8e-49bd-9482-b47f64c81290	50e7023d-d38e-4b81-b0dd-4a211818fe58	APP-SERVER-01	Main application server	ab8f8bc4-2795-406b-b861-830300da36fb	2026-06-20 19:33:04.383417	2364a724-9070-434e-95b3-711f11b3b478	ff7d2efd-c874-416d-ba08-99606664fec1	2026-06-20 20:31:55.093219
47fd7453-caaa-4398-8949-dbf1139af8f6	50e7023d-d38e-4b81-b0dd-4a211818fe58	CUSTOMER-DB-01	Customer database server	ab8f8bc4-2795-406b-b861-830300da36fb	2026-06-20 19:33:04.383417	d831b89b-f329-488f-ac3a-85a915ba4a98	ff7d2efd-c874-416d-ba08-99606664fec1	2026-06-20 20:31:55.093219
22f5ba6d-050f-41c2-9285-20fc2c08fe38	50e7023d-d38e-4b81-b0dd-4a211818fe58	VPN-GATEWAY-01	Corporate VPN gateway device	ab8f8bc4-2795-406b-b861-830300da36fb	2026-06-20 19:33:04.383417	b971c1af-90af-44e6-98b4-523814ac565f	ff7d2efd-c874-416d-ba08-99606664fec1	2026-06-20 20:31:55.093219
\.


--
-- TOC entry 5342 (class 0 OID 16449)
-- Dependencies: 222
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, organization_id, name, description, created_at) FROM stdin;
ed83c36d-72de-4db0-abe2-38824260eae2	50e7023d-d38e-4b81-b0dd-4a211818fe58	IT Support	Handles user incidents and requests	2026-06-20 12:07:04.205835
f23ee6c8-bb2c-484f-bc1a-a7ce6f35d5f7	50e7023d-d38e-4b81-b0dd-4a211818fe58	Network Team	Handles network and connectivity issues	2026-06-20 12:07:04.205835
ae46e581-7d7d-4b16-8575-513a409b25d0	50e7023d-d38e-4b81-b0dd-4a211818fe58	Application Team	Handles business application issues	2026-06-20 12:07:04.205835
\.


--
-- TOC entry 5345 (class 0 OID 16538)
-- Dependencies: 225
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incidents (id, ticket_id, impact, urgency, affected_service, resolution_notes, resolved_at, created_at) FROM stdin;
da95399d-a881-4b1a-8d72-81b3fa1b08d7	1a638281-7ce4-46ca-b41d-0c020a63995c	HIGH	HIGH	VPN Service	Pending investigation	\N	2026-06-20 16:16:46.025978
\.


--
-- TOC entry 5354 (class 0 OID 16729)
-- Dependencies: 234
-- Data for Name: knowledge_articles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_articles (id, organization_id, title, content, created_by, created_at, updated_at, status_id, category_id) FROM stdin;
d4c6c9b6-2a25-480c-a698-c1d5fb288d34	50e7023d-d38e-4b81-b0dd-4a211818fe58	VPN Troubleshooting After Firmware Upgrade	If VPN connectivity fails after a firmware change:\n1. Check gateway logs.\n2. Verify firmware version.\n3. Roll back firmware if required.	ab8f8bc4-2795-406b-b861-830300da36fb	2026-06-20 19:54:56.783772	2026-06-20 19:54:56.783772	5455346c-f1fa-4c37-9616-5fbfe8ea9f13	c28b1a6d-952e-4f46-9b40-23d8db076d77
\.


--
-- TOC entry 5362 (class 0 OID 16850)
-- Dependencies: 242
-- Data for Name: knowledge_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_categories (id, name, description, created_at) FROM stdin;
c28b1a6d-952e-4f46-9b40-23d8db076d77	NETWORK	Network articles	2026-06-20 20:11:18.446015
47b59ec9-7bb2-4485-bf8b-485f8f6e5c9b	DATABASE	Database articles	2026-06-20 20:11:18.446015
de5f37a3-c802-4158-930a-7f2d2ed70032	APPLICATION	Application articles	2026-06-20 20:11:18.446015
34b8face-6676-4192-a959-896434b3e812	SECURITY	Security articles	2026-06-20 20:11:18.446015
abb9a9e1-a5af-499d-9dfc-178c3367fb69	CLOUD	Cloud articles	2026-06-20 20:11:18.446015
\.


--
-- TOC entry 5340 (class 0 OID 16427)
-- Dependencies: 220
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, name, domain, created_at) FROM stdin;
50e7023d-d38e-4b81-b0dd-4a211818fe58	ABC Technologies	abc.com	2026-06-20 12:03:03.070608
\.


--
-- TOC entry 5357 (class 0 OID 16783)
-- Dependencies: 237
-- Data for Name: priorities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.priorities (id, name, level, description, created_at) FROM stdin;
78bdf06c-f0e8-4d12-bc33-75eb08a932b1	CRITICAL	1	Critical impact	2026-06-20 20:11:18.446015
cd1811ad-20fe-4dd8-826e-3c42431d6d02	HIGH	2	High impact	2026-06-20 20:11:18.446015
4e829e78-16a7-4284-bd03-f5b06cc9628b	MEDIUM	3	Medium impact	2026-06-20 20:11:18.446015
8eb9dbbc-9207-4104-855a-c805a84218de	LOW	4	Low impact	2026-06-20 20:11:18.446015
\.


--
-- TOC entry 5350 (class 0 OID 16640)
-- Dependencies: 230
-- Data for Name: problem_changes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.problem_changes (problem_id, change_id, created_at) FROM stdin;
\.


--
-- TOC entry 5349 (class 0 OID 16622)
-- Dependencies: 229
-- Data for Name: problem_incidents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.problem_incidents (problem_id, incident_id, created_at) FROM stdin;
\.


--
-- TOC entry 5348 (class 0 OID 16603)
-- Dependencies: 228
-- Data for Name: problems; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.problems (id, ticket_id, root_cause, workaround, permanent_solution, known_error, created_at, updated_at) FROM stdin;
05925ef2-61e0-4fca-95f0-bacd186cea03	9da6210e-5d4a-48b6-b2e8-5ad67cacbcc4	VPN gateway firmware defect	Restart VPN gateway service	Upgrade VPN gateway firmware	f	2026-06-20 16:37:55.997203	2026-06-20 20:31:55.093219
\.


--
-- TOC entry 5360 (class 0 OID 16823)
-- Dependencies: 240
-- Data for Name: risk_levels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.risk_levels (id, name, level, description, created_at) FROM stdin;
087c78bf-fdaa-42e8-a79b-d8c5d180e0aa	LOW	1	Minimal impact	2026-06-20 20:52:23.221933
5684aa7d-0bce-49cb-9814-9c408ac1900e	MEDIUM	2	Moderate impact	2026-06-20 20:52:23.221933
a50bd27e-8beb-4df8-86c8-3ca952f2d224	HIGH	3	Significant impact	2026-06-20 20:52:23.221933
76725917-86d4-40b9-adcd-41c0eeb539b8	CRITICAL	4	Severe business impact	2026-06-20 20:52:23.221933
\.


--
-- TOC entry 5341 (class 0 OID 16436)
-- Dependencies: 221
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, created_at) FROM stdin;
d10e7868-c1bb-429d-a6fd-49f7d9adfbc7	EMPLOYEE	Can create and view own tickets	2026-06-20 11:52:24.635361
0f8e4479-b5da-41d4-a740-6a9fe656dbba	IT_AGENT	Can manage assigned tickets	2026-06-20 11:52:24.635361
a7c1392f-6834-43e4-85ca-c8b871043b4b	MANAGER	Can approve changes and view reports	2026-06-20 11:52:24.635361
c1f73380-e05f-4af5-a949-196b85fbba7a	ADMIN	Full system administration	2026-06-20 11:52:24.635361
\.


--
-- TOC entry 5346 (class 0 OID 16558)
-- Dependencies: 226
-- Data for Name: service_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_requests (id, ticket_id, requested_for, approval_status, fulfillment_notes, completed_at, created_at, approval_status_id) FROM stdin;
74beb929-b262-441e-95f5-eeb6916fcb18	2a1e6bb1-1814-4cdf-a511-1289cb253615	ab8f8bc4-2795-406b-b861-830300da36fb	PENDING	Waiting for IT approval	\N	2026-06-20 16:27:01.088116	\N
\.


--
-- TOC entry 5355 (class 0 OID 16756)
-- Dependencies: 235
-- Data for Name: statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.statuses (id, module, name, description, created_at) FROM stdin;
b8fbc849-866a-411c-a0b2-fbe5023c3389	TICKET	OPEN	New ticket created	2026-06-20 20:01:08.646264
b3f929f9-f979-43bb-8e36-248af5afb8c0	TICKET	IN_PROGRESS	Work is being performed	2026-06-20 20:01:08.646264
30b3a4c7-e955-49da-8b55-2715dec93609	TICKET	RESOLVED	Solution provided	2026-06-20 20:01:08.646264
679a11bd-0291-4e1d-8aab-d35cc1a8266a	TICKET	CLOSED	Ticket completed	2026-06-20 20:01:08.646264
2b1d0a53-5633-44c8-84fe-e65a8555f41f	CHANGE	DRAFT	Change request being prepared	2026-06-20 20:01:08.646264
7b818821-b7da-46f7-b55a-5d7af1384078	CHANGE	APPROVED	Change approved	2026-06-20 20:01:08.646264
538fa177-12c7-4b43-ae18-380bf6c958cf	CHANGE	IMPLEMENTING	Change being implemented	2026-06-20 20:01:08.646264
22120d7b-a5b3-4613-a5f1-03421d4ae9b5	CHANGE	COMPLETED	Change completed	2026-06-20 20:01:08.646264
4fd90761-0a22-4c1b-a243-132c487d26ec	KNOWLEDGE	DRAFT	Article being prepared	2026-06-20 20:01:08.646264
91c5621f-124f-4b68-afb3-faa32e3dec6f	KNOWLEDGE	REVIEW	Article under review	2026-06-20 20:01:08.646264
5455346c-f1fa-4c37-9616-5fbfe8ea9f13	KNOWLEDGE	PUBLISHED	Article available for use	2026-06-20 20:01:08.646264
b96fcd1e-19e4-45bb-bf11-d6ac6071afc5	KNOWLEDGE	ARCHIVED	Article retired	2026-06-20 20:01:08.646264
ff7d2efd-c874-416d-ba08-99606664fec1	CI	ACTIVE	CI is operational	2026-06-20 20:31:55.093219
8830bb9c-caff-4a7f-b580-030cc256db9b	CI	MAINTENANCE	CI under maintenance	2026-06-20 20:31:55.093219
0c240f73-c6a3-47be-800b-e02758bde257	CI	RETIRED	CI no longer used	2026-06-20 20:31:55.093219
\.


--
-- TOC entry 5353 (class 0 OID 16705)
-- Dependencies: 233
-- Data for Name: ticket_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_activities (id, ticket_id, created_by, comment, created_at, activity_type_id) FROM stdin;
\.


--
-- TOC entry 5352 (class 0 OID 16682)
-- Dependencies: 232
-- Data for Name: ticket_configuration_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_configuration_items (id, ticket_id, ci_id, created_at, relationship_type_id) FROM stdin;
e6eb896d-415e-4aa5-9956-4911c32d0090	1a638281-7ce4-46ca-b41d-0c020a63995c	22f5ba6d-050f-41c2-9285-20fc2c08fe38	2026-06-20 19:41:46.478566	0115882b-e93f-4c3c-89ae-38394fccf058
f21c92e0-6052-4359-8c83-40a49cf845e2	e1336e18-ccea-4b2c-abf9-6f1307198eec	22f5ba6d-050f-41c2-9285-20fc2c08fe38	2026-06-20 19:42:59.340371	89195920-b1bd-4e5d-a8a8-2db73b6940e5
b4ca6bca-68cc-47ea-849a-24b7c2dd9199	9da6210e-5d4a-48b6-b2e8-5ad67cacbcc4	22f5ba6d-050f-41c2-9285-20fc2c08fe38	2026-06-20 19:45:39.368545	5a827597-4531-4035-9aa9-cde3d8f6590e
\.


--
-- TOC entry 5356 (class 0 OID 16770)
-- Dependencies: 236
-- Data for Name: ticket_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_types (id, name, description, created_at) FROM stdin;
ed8ae3ab-3e52-4825-b737-563d4fc39853	INCIDENT	Unplanned interruption	2026-06-20 20:11:18.446015
8ccf59d0-d115-4eb0-9e0a-3b9a63c0affa	SERVICE_REQUEST	User request	2026-06-20 20:11:18.446015
0ade6555-4e83-49fb-b71b-6a6d3bbc85eb	CHANGE	Infrastructure modification	2026-06-20 20:11:18.446015
444df7b1-00ea-413d-922b-86a81cc6f03f	PROBLEM	Root cause investigation	2026-06-20 20:11:18.446015
dbf3b501-cfe2-49e8-8410-e0b9e0c03565	REQUEST	User request for a service or information	2026-06-20 20:15:45.267447
\.


--
-- TOC entry 5344 (class 0 OID 16498)
-- Dependencies: 224
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tickets (id, organization_id, created_by, assigned_to, department_id, ticket_number, title, description, created_at, updated_at, status_id, ticket_type_id, priority_id) FROM stdin;
1a638281-7ce4-46ca-b41d-0c020a63995c	50e7023d-d38e-4b81-b0dd-4a211818fe58	ab8f8bc4-2795-406b-b861-830300da36fb	\N	\N	INC000001	VPN not connecting	User unable to connect to corporate VPN	2026-06-20 16:14:29.219587	2026-06-20 16:14:29.219587	b8fbc849-866a-411c-a0b2-fbe5023c3389	ed8ae3ab-3e52-4825-b737-563d4fc39853	cd1811ad-20fe-4dd8-826e-3c42431d6d02
e1336e18-ccea-4b2c-abf9-6f1307198eec	50e7023d-d38e-4b81-b0dd-4a211818fe58	ab8f8bc4-2795-406b-b861-830300da36fb	\N	\N	CHG000001	Deploy application version 2.5	Production deployment of application version 2.5	2026-06-20 16:31:06.3876	2026-06-20 16:31:06.3876	b8fbc849-866a-411c-a0b2-fbe5023c3389	0ade6555-4e83-49fb-b71b-6a6d3bbc85eb	4e829e78-16a7-4284-bd03-f5b06cc9628b
9da6210e-5d4a-48b6-b2e8-5ad67cacbcc4	50e7023d-d38e-4b81-b0dd-4a211818fe58	ab8f8bc4-2795-406b-b861-830300da36fb	\N	\N	PRB000001	Recurring VPN failures	Multiple incidents reported due to VPN instability	2026-06-20 16:37:00.929325	2026-06-20 16:37:00.929325	b8fbc849-866a-411c-a0b2-fbe5023c3389	444df7b1-00ea-413d-922b-86a81cc6f03f	cd1811ad-20fe-4dd8-826e-3c42431d6d02
2a1e6bb1-1814-4cdf-a511-1289cb253615	50e7023d-d38e-4b81-b0dd-4a211818fe58	ab8f8bc4-2795-406b-b861-830300da36fb	\N	\N	SR000001	Install VS Code	Need VS Code installed for development work	2026-06-20 16:24:54.875619	2026-06-20 16:24:54.875619	b8fbc849-866a-411c-a0b2-fbe5023c3389	dbf3b501-cfe2-49e8-8410-e0b9e0c03565	8eb9dbbc-9207-4104-855a-c805a84218de
\.


--
-- TOC entry 5343 (class 0 OID 16466)
-- Dependencies: 223
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, organization_id, role_id, department_id, name, email, password_hash, created_at, updated_at) FROM stdin;
ab8f8bc4-2795-406b-b861-830300da36fb	50e7023d-d38e-4b81-b0dd-4a211818fe58	c1f73380-e05f-4af5-a949-196b85fbba7a	ed83c36d-72de-4db0-abe2-38824260eae2	Suraj Admin	suraj@abc.com	test_hash	2026-06-20 12:36:45.478772	2026-06-20 20:31:55.093219
\.


--
-- TOC entry 5146 (class 2606 OID 16946)
-- Name: activity_types activity_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_types
    ADD CONSTRAINT activity_types_name_key UNIQUE (name);


--
-- TOC entry 5148 (class 2606 OID 16944)
-- Name: activity_types activity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_types
    ADD CONSTRAINT activity_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5134 (class 2606 OID 16849)
-- Name: approval_statuses approval_statuses_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_statuses
    ADD CONSTRAINT approval_statuses_name_key UNIQUE (name);


--
-- TOC entry 5136 (class 2606 OID 16847)
-- Name: approval_statuses approval_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_statuses
    ADD CONSTRAINT approval_statuses_pkey PRIMARY KEY (id);


--
-- TOC entry 5150 (class 2606 OID 16982)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5126 (class 2606 OID 16822)
-- Name: change_types change_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.change_types
    ADD CONSTRAINT change_types_name_key UNIQUE (name);


--
-- TOC entry 5128 (class 2606 OID 16820)
-- Name: change_types change_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.change_types
    ADD CONSTRAINT change_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5084 (class 2606 OID 16595)
-- Name: changes changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changes
    ADD CONSTRAINT changes_pkey PRIMARY KEY (id);


--
-- TOC entry 5086 (class 2606 OID 16597)
-- Name: changes changes_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changes
    ADD CONSTRAINT changes_ticket_id_key UNIQUE (ticket_id);


--
-- TOC entry 5142 (class 2606 OID 16929)
-- Name: ci_relationship_types ci_relationship_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ci_relationship_types
    ADD CONSTRAINT ci_relationship_types_name_key UNIQUE (name);


--
-- TOC entry 5144 (class 2606 OID 16927)
-- Name: ci_relationship_types ci_relationship_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ci_relationship_types
    ADD CONSTRAINT ci_relationship_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5122 (class 2606 OID 16809)
-- Name: ci_types ci_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ci_types
    ADD CONSTRAINT ci_types_name_key UNIQUE (name);


--
-- TOC entry 5124 (class 2606 OID 16807)
-- Name: ci_types ci_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ci_types
    ADD CONSTRAINT ci_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5098 (class 2606 OID 16671)
-- Name: configuration_items configuration_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuration_items
    ADD CONSTRAINT configuration_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5058 (class 2606 OID 16460)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 5075 (class 2606 OID 16550)
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- TOC entry 5077 (class 2606 OID 16552)
-- Name: incidents incidents_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_ticket_id_key UNIQUE (ticket_id);


--
-- TOC entry 5108 (class 2606 OID 16744)
-- Name: knowledge_articles knowledge_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_pkey PRIMARY KEY (id);


--
-- TOC entry 5138 (class 2606 OID 16862)
-- Name: knowledge_categories knowledge_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_categories
    ADD CONSTRAINT knowledge_categories_name_key UNIQUE (name);


--
-- TOC entry 5140 (class 2606 OID 16860)
-- Name: knowledge_categories knowledge_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_categories
    ADD CONSTRAINT knowledge_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5052 (class 2606 OID 16435)
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- TOC entry 5118 (class 2606 OID 16796)
-- Name: priorities priorities_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.priorities
    ADD CONSTRAINT priorities_name_key UNIQUE (name);


--
-- TOC entry 5120 (class 2606 OID 16794)
-- Name: priorities priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.priorities
    ADD CONSTRAINT priorities_pkey PRIMARY KEY (id);


--
-- TOC entry 5096 (class 2606 OID 16647)
-- Name: problem_changes problem_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_changes
    ADD CONSTRAINT problem_changes_pkey PRIMARY KEY (problem_id, change_id);


--
-- TOC entry 5094 (class 2606 OID 16629)
-- Name: problem_incidents problem_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_incidents
    ADD CONSTRAINT problem_incidents_pkey PRIMARY KEY (problem_id, incident_id);


--
-- TOC entry 5090 (class 2606 OID 16614)
-- Name: problems problems_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_pkey PRIMARY KEY (id);


--
-- TOC entry 5092 (class 2606 OID 16616)
-- Name: problems problems_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_ticket_id_key UNIQUE (ticket_id);


--
-- TOC entry 5130 (class 2606 OID 16836)
-- Name: risk_levels risk_levels_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_levels
    ADD CONSTRAINT risk_levels_name_key UNIQUE (name);


--
-- TOC entry 5132 (class 2606 OID 16834)
-- Name: risk_levels risk_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.risk_levels
    ADD CONSTRAINT risk_levels_pkey PRIMARY KEY (id);


--
-- TOC entry 5054 (class 2606 OID 16448)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 5056 (class 2606 OID 16446)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5080 (class 2606 OID 16570)
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5082 (class 2606 OID 16572)
-- Name: service_requests service_requests_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_ticket_id_key UNIQUE (ticket_id);


--
-- TOC entry 5110 (class 2606 OID 16767)
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (id);


--
-- TOC entry 5105 (class 2606 OID 16718)
-- Name: ticket_activities ticket_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_activities
    ADD CONSTRAINT ticket_activities_pkey PRIMARY KEY (id);


--
-- TOC entry 5102 (class 2606 OID 16692)
-- Name: ticket_configuration_items ticket_configuration_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_configuration_items
    ADD CONSTRAINT ticket_configuration_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5114 (class 2606 OID 16782)
-- Name: ticket_types ticket_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_name_key UNIQUE (name);


--
-- TOC entry 5116 (class 2606 OID 16780)
-- Name: ticket_types ticket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 2606 OID 16515)
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 5072 (class 2606 OID 16517)
-- Name: tickets tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);


--
-- TOC entry 5112 (class 2606 OID 16769)
-- Name: statuses unique_module_status; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT unique_module_status UNIQUE (module, name);


--
-- TOC entry 5060 (class 2606 OID 16482)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5062 (class 2606 OID 16480)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5151 (class 1259 OID 16994)
-- Name: idx_audit_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_changed_by ON public.audit_logs USING btree (changed_by);


--
-- TOC entry 5152 (class 1259 OID 16995)
-- Name: idx_audit_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_created_at ON public.audit_logs USING btree (created_at);


--
-- TOC entry 5153 (class 1259 OID 16993)
-- Name: idx_audit_table_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_table_record ON public.audit_logs USING btree (table_name, record_id);


--
-- TOC entry 5087 (class 1259 OID 16963)
-- Name: idx_changes_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_changes_ticket_id ON public.changes USING btree (ticket_id);


--
-- TOC entry 5073 (class 1259 OID 16962)
-- Name: idx_incidents_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incidents_ticket_id ON public.incidents USING btree (ticket_id);


--
-- TOC entry 5106 (class 1259 OID 16969)
-- Name: idx_knowledge_articles_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_knowledge_articles_org_id ON public.knowledge_articles USING btree (organization_id);


--
-- TOC entry 5088 (class 1259 OID 16964)
-- Name: idx_problems_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_problems_ticket_id ON public.problems USING btree (ticket_id);


--
-- TOC entry 5078 (class 1259 OID 16965)
-- Name: idx_service_requests_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_requests_ticket_id ON public.service_requests USING btree (ticket_id);


--
-- TOC entry 5103 (class 1259 OID 16968)
-- Name: idx_ticket_activities_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_activities_ticket_id ON public.ticket_activities USING btree (ticket_id);


--
-- TOC entry 5099 (class 1259 OID 16967)
-- Name: idx_ticket_ci_ci_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_ci_ci_id ON public.ticket_configuration_items USING btree (ci_id);


--
-- TOC entry 5100 (class 1259 OID 16966)
-- Name: idx_ticket_ci_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_ci_ticket_id ON public.ticket_configuration_items USING btree (ticket_id);


--
-- TOC entry 5063 (class 1259 OID 16958)
-- Name: idx_tickets_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_assigned_to ON public.tickets USING btree (assigned_to);


--
-- TOC entry 5064 (class 1259 OID 16957)
-- Name: idx_tickets_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_created_by ON public.tickets USING btree (created_by);


--
-- TOC entry 5065 (class 1259 OID 16956)
-- Name: idx_tickets_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_org_id ON public.tickets USING btree (organization_id);


--
-- TOC entry 5066 (class 1259 OID 16961)
-- Name: idx_tickets_priority_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_priority_id ON public.tickets USING btree (priority_id);


--
-- TOC entry 5067 (class 1259 OID 16959)
-- Name: idx_tickets_status_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_status_id ON public.tickets USING btree (status_id);


--
-- TOC entry 5068 (class 1259 OID 16960)
-- Name: idx_tickets_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_type_id ON public.tickets USING btree (ticket_type_id);


--
-- TOC entry 5184 (class 2606 OID 16719)
-- Name: ticket_activities fk_activity_ticket; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_activities
    ADD CONSTRAINT fk_activity_ticket FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5185 (class 2606 OID 16947)
-- Name: ticket_activities fk_activity_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_activities
    ADD CONSTRAINT fk_activity_type FOREIGN KEY (activity_type_id) REFERENCES public.activity_types(id);


--
-- TOC entry 5186 (class 2606 OID 16724)
-- Name: ticket_activities fk_activity_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_activities
    ADD CONSTRAINT fk_activity_user FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5187 (class 2606 OID 16868)
-- Name: knowledge_articles fk_article_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT fk_article_category FOREIGN KEY (category_id) REFERENCES public.knowledge_categories(id);


--
-- TOC entry 5188 (class 2606 OID 16750)
-- Name: knowledge_articles fk_article_creator; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT fk_article_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5189 (class 2606 OID 16745)
-- Name: knowledge_articles fk_article_organization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT fk_article_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5190 (class 2606 OID 16863)
-- Name: knowledge_articles fk_article_status; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT fk_article_status FOREIGN KEY (status_id) REFERENCES public.statuses(id);


--
-- TOC entry 5191 (class 2606 OID 16983)
-- Name: audit_logs fk_audit_organization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- TOC entry 5192 (class 2606 OID 16988)
-- Name: audit_logs fk_audit_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_user FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5169 (class 2606 OID 16908)
-- Name: changes fk_change_approval_status; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changes
    ADD CONSTRAINT fk_change_approval_status FOREIGN KEY (approval_status_id) REFERENCES public.approval_statuses(id);


--
-- TOC entry 5170 (class 2606 OID 16903)
-- Name: changes fk_change_risk_level; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changes
    ADD CONSTRAINT fk_change_risk_level FOREIGN KEY (risk_level_id) REFERENCES public.risk_levels(id);


--
-- TOC entry 5171 (class 2606 OID 16598)
-- Name: changes fk_change_ticket; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changes
    ADD CONSTRAINT fk_change_ticket FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5177 (class 2606 OID 16672)
-- Name: configuration_items fk_ci_organization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuration_items
    ADD CONSTRAINT fk_ci_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5178 (class 2606 OID 16677)
-- Name: configuration_items fk_ci_owner; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuration_items
    ADD CONSTRAINT fk_ci_owner FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5179 (class 2606 OID 16898)
-- Name: configuration_items fk_ci_status; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuration_items
    ADD CONSTRAINT fk_ci_status FOREIGN KEY (status_id) REFERENCES public.statuses(id);


--
-- TOC entry 5180 (class 2606 OID 16873)
-- Name: configuration_items fk_ci_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuration_items
    ADD CONSTRAINT fk_ci_type FOREIGN KEY (ci_type_id) REFERENCES public.ci_types(id);


--
-- TOC entry 5154 (class 2606 OID 16461)
-- Name: departments fk_department_organization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_department_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5165 (class 2606 OID 16553)
-- Name: incidents fk_incident_ticket; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT fk_incident_ticket FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5175 (class 2606 OID 16653)
-- Name: problem_changes fk_problem_change_change; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_changes
    ADD CONSTRAINT fk_problem_change_change FOREIGN KEY (change_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5176 (class 2606 OID 16648)
-- Name: problem_changes fk_problem_change_problem; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_changes
    ADD CONSTRAINT fk_problem_change_problem FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE;


--
-- TOC entry 5173 (class 2606 OID 16635)
-- Name: problem_incidents fk_problem_incident_incident; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_incidents
    ADD CONSTRAINT fk_problem_incident_incident FOREIGN KEY (incident_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5174 (class 2606 OID 16630)
-- Name: problem_incidents fk_problem_incident_problem; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_incidents
    ADD CONSTRAINT fk_problem_incident_problem FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE;


--
-- TOC entry 5172 (class 2606 OID 16617)
-- Name: problems fk_problem_ticket; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT fk_problem_ticket FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5166 (class 2606 OID 16913)
-- Name: service_requests fk_request_approval; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT fk_request_approval FOREIGN KEY (approval_status_id) REFERENCES public.approval_statuses(id);


--
-- TOC entry 5167 (class 2606 OID 16573)
-- Name: service_requests fk_service_request_ticket; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT fk_service_request_ticket FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5168 (class 2606 OID 16578)
-- Name: service_requests fk_service_request_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT fk_service_request_user FOREIGN KEY (requested_for) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5158 (class 2606 OID 16528)
-- Name: tickets fk_ticket_assignee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_assignee FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5181 (class 2606 OID 16700)
-- Name: ticket_configuration_items fk_ticket_ci_ci; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_configuration_items
    ADD CONSTRAINT fk_ticket_ci_ci FOREIGN KEY (ci_id) REFERENCES public.configuration_items(id) ON DELETE CASCADE;


--
-- TOC entry 5182 (class 2606 OID 16930)
-- Name: ticket_configuration_items fk_ticket_ci_relationship; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_configuration_items
    ADD CONSTRAINT fk_ticket_ci_relationship FOREIGN KEY (relationship_type_id) REFERENCES public.ci_relationship_types(id);


--
-- TOC entry 5183 (class 2606 OID 16695)
-- Name: ticket_configuration_items fk_ticket_ci_ticket; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_configuration_items
    ADD CONSTRAINT fk_ticket_ci_ticket FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5159 (class 2606 OID 16523)
-- Name: tickets fk_ticket_creator; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5160 (class 2606 OID 16533)
-- Name: tickets fk_ticket_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- TOC entry 5161 (class 2606 OID 16518)
-- Name: tickets fk_ticket_organization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5162 (class 2606 OID 16888)
-- Name: tickets fk_ticket_priority; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_priority FOREIGN KEY (priority_id) REFERENCES public.priorities(id);


--
-- TOC entry 5163 (class 2606 OID 16878)
-- Name: tickets fk_ticket_status; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_status FOREIGN KEY (status_id) REFERENCES public.statuses(id);


--
-- TOC entry 5164 (class 2606 OID 16883)
-- Name: tickets fk_ticket_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT fk_ticket_type FOREIGN KEY (ticket_type_id) REFERENCES public.ticket_types(id);


--
-- TOC entry 5155 (class 2606 OID 16493)
-- Name: users fk_user_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- TOC entry 5156 (class 2606 OID 16483)
-- Name: users fk_user_organization; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_user_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5157 (class 2606 OID 16488)
-- Name: users fk_user_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


-- Completed on 2026-06-21 11:05:07

--
-- PostgreSQL database dump complete
--

\unrestrict F5fWrztQz9neB7Br8X8nnESECTuqOwKmAulffYWAqjF3JI9E1bRgP2xbItqLd04

