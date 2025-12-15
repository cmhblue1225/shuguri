-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- C++ Version metadata
CREATE TABLE cpp_versions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  standard_doc TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Spec documents for RAG
CREATE TABLE spec_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id TEXT REFERENCES cpp_versions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Diff analysis results
CREATE TABLE diff_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_version TEXT REFERENCES cpp_versions(id),
  target_version TEXT REFERENCES cpp_versions(id),
  diff_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LLM generated documents
CREATE TABLE generated_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diff_result_id UUID REFERENCES diff_results(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('migration_guide', 'release_notes', 'test_points')),
  content TEXT NOT NULL,
  format TEXT DEFAULT 'markdown' CHECK (format IN ('markdown', 'html', 'pdf')),
  options JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LLM response cache
CREATE TABLE llm_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash TEXT UNIQUE NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_spec_documents_version ON spec_documents(version_id);
CREATE INDEX idx_spec_documents_embedding ON spec_documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_diff_results_project ON diff_results(project_id);
CREATE INDEX idx_diff_results_versions ON diff_results(source_version, target_version);
CREATE INDEX idx_generated_docs_diff ON generated_docs(diff_result_id);
CREATE INDEX idx_llm_cache_hash ON llm_cache(prompt_hash);
CREATE INDEX idx_llm_cache_expires ON llm_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE diff_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_docs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own diff results" ON diff_results
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create diff results in own projects" ON diff_results
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own generated docs" ON generated_docs
  FOR SELECT USING (
    diff_result_id IN (
      SELECT dr.id FROM diff_results dr
      JOIN projects p ON dr.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generated docs for own diffs" ON generated_docs
  FOR INSERT WITH CHECK (
    diff_result_id IN (
      SELECT dr.id FROM diff_results dr
      JOIN projects p ON dr.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Public read access for cpp_versions and spec_documents
ALTER TABLE cpp_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cpp versions" ON cpp_versions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view spec documents" ON spec_documents
  FOR SELECT USING (true);
