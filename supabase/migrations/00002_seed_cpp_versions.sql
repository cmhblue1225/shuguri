-- Seed C++ versions data
INSERT INTO cpp_versions (id, name, year, standard_doc, features) VALUES
('cpp98', 'C++98', 1998, 'ISO/IEC 14882:1998',
  '["STL", "Templates", "Exceptions", "RTTI"]'::jsonb),

('cpp03', 'C++03', 2003, 'ISO/IEC 14882:2003',
  '["Value initialization fix", "Standard library fixes"]'::jsonb),

('cpp11', 'C++11', 2011, 'ISO/IEC 14882:2011',
  '["auto keyword", "Range-based for", "Lambda expressions", "Smart pointers", "Move semantics", "nullptr", "constexpr", "Variadic templates", "Thread support"]'::jsonb),

('cpp14', 'C++14', 2014, 'ISO/IEC 14882:2014',
  '["Generic lambdas", "Return type deduction", "Variable templates", "Binary literals", "Digit separators", "std::make_unique"]'::jsonb),

('cpp17', 'C++17', 2017, 'ISO/IEC 14882:2017',
  '["Structured bindings", "if constexpr", "Fold expressions", "std::optional", "std::variant", "std::string_view", "Filesystem library", "Parallel algorithms"]'::jsonb),

('cpp20', 'C++20', 2020, 'ISO/IEC 14882:2020',
  '["Concepts", "Ranges", "Coroutines", "Modules", "Three-way comparison", "std::format", "std::span", "Calendar and timezone"]'::jsonb),

('cpp23', 'C++23', 2023, 'ISO/IEC 14882:2023',
  '["std::expected", "std::flat_map", "std::mdspan", "std::generator", "Deducing this", "std::print", "Ranges improvements"]'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  year = EXCLUDED.year,
  standard_doc = EXCLUDED.standard_doc,
  features = EXCLUDED.features;
