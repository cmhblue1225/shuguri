# Shuguridan

C++ 언어 버전 간 차이를 분석하고 LLM/RAG 기반으로 문서를 자동 생성하는 도구입니다.

## Features

- **Version Diff**: C++11 ~ C++23 표준 간 차이점 분석
- **LLM Document Generation**: AI 기반 마이그레이션 가이드, 릴리즈 노트 생성
- **RAG Pipeline**: C++ 표준 문서 기반 정확한 정보 제공
- **Export**: Markdown, HTML, PDF 형식으로 내보내기

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Backend | Node.js, Hono, TypeScript |
| Database | Supabase (PostgreSQL + pgvector) |
| LLM | Claude, OpenAI (Model Agnostic) |
| Monorepo | Turborepo |

## Project Structure

```
Shuguridan/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Hono API server
├── packages/
│   └── shared/       # Shared types & utilities
├── supabase/
│   └── migrations/   # Database migrations
└── docs/             # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development servers
npm run dev
```

### Environment Variables

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## Development

```bash
# Run all apps in development mode
npm run dev

# Build all packages
npm run build

# Lint all packages
npm run lint
```

## Database Setup

Apply migrations to your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or manually run SQL files in supabase/migrations/
```

## License

MIT
