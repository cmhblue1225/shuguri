-- Add C++26 version
INSERT INTO cpp_versions (id, name, year, standard_doc, features) VALUES
('cpp26', 'C++26', 2026, 'ISO/IEC 14882:2026 (Draft)',
  '["Contracts", "Reflection", "std::execution", "Hazard pointers", "RCU", "Pack indexing", "Text encoding"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  year = EXCLUDED.year,
  standard_doc = EXCLUDED.standard_doc,
  features = EXCLUDED.features;
