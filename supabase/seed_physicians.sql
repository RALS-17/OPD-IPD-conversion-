-- Seed default physicians for Global Care Canlubang
-- Run after schema.sql

INSERT INTO public.physicians (name, department, active) VALUES
  ('Dr. Maria Santos', 'Internal Medicine', true),
  ('Dr. Jose Reyes', 'Orthopedics', true),
  ('Dr. Angelo Cruz', 'General Surgery', true),
  ('Dr. Roberto Villanueva', 'Cardiology', true),
  ('Dr. Liza Mendoza', 'Obstetrics & Gynecology', true),
  ('Dr. Ana Patricia Gomez', 'Pediatrics', true),
  ('Dr. Paolo Enriquez', 'Pulmonology', true),
  ('Dr. Camille Sy', 'Emergency Medicine', true);
