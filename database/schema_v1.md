# AI-ITSM Database Schema v1

## Status
Database v1.0 completed.

## Core Tables
- organizations
- departments
- users
- roles

## ITSM Tables
- tickets
- incidents
- service_requests
- changes
- problems

## Relationship Tables
- problem_incidents
- problem_changes
- ticket_configuration_items

## CMDB
- configuration_items

## Knowledge
- knowledge_articles

## Activity / Audit
- ticket_activities
- audit_logs

## Lookup Tables
- statuses
- ticket_types
- priorities
- ci_types
- risk_levels
- approval_statuses
- knowledge_categories
- activity_types
- ci_relationship_types

## Design Notes
- All ITSM records use the parent `tickets` table.
- Incident, request, change, and problem details are stored in child tables.
- CI relationships are stored using `ticket_configuration_items`.
- Lookup/reference tables are used instead of free-text status/type fields.
- Audit logs will track future record changes.