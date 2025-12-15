# Shuguridan 기술 스택 문서

## 개요

Shuguridan은 C++ 코드 모던화 및 버전 비교를 위한 웹 애플리케이션입니다.
Turborepo 기반 모노레포 구조로, Next.js 프론트엔드와 Hono 백엔드로 구성됩니다.

---

## 프로젝트 구조

```
Shuguridan/
├── apps/
│   ├── web/          # Next.js 프론트엔드
│   └── api/          # Hono 백엔드 API
├── packages/
│   └── shared/       # 공유 타입 및 유틸리티
├── supabase/         # Supabase 마이그레이션
├── docs/             # 문서
├── Dockerfile.api    # API Docker 이미지
├── Dockerfile.web    # Web Docker 이미지
├── turbo.json        # Turborepo 설정
└── package.json      # 루트 패키지
```

---

## 빌드 시스템 & 모노레포

### Turborepo
- **버전**: `^2.3.3`
- **용도**: 모노레포 빌드 오케스트레이션
- **사용 이유**:
  - npm workspaces 기반의 효율적인 의존성 관리
  - 빌드 캐싱으로 CI/CD 속도 향상
  - `apps/web`, `apps/api`, `packages/shared` 간 의존성 자동 해결
  - 병렬 빌드 지원으로 개발 생산성 향상

### TypeScript
- **버전**: `^5.7.2`
- **용도**: 정적 타입 검사
- **사용 이유**:
  - 컴파일 타임 타입 안전성 보장
  - IDE 자동완성 및 리팩토링 지원
  - 대규모 코드베이스 유지보수성 향상
  - API 인터페이스 명확화

### tsx
- **버전**: `^4.19.2`
- **용도**: TypeScript 직접 실행
- **사용 이유**:
  - 개발 시 TypeScript 파일 직접 실행
  - ts-node 대비 빠른 실행 속도 (esbuild 기반)
  - ESM 모듈 완벽 지원

---

## 프론트엔드 (apps/web)

### 프레임워크

#### Next.js
- **버전**: `14.2.23`
- **용도**: React 풀스택 프레임워크
- **사용 이유**:
  - App Router로 서버 컴포넌트 지원
  - 파일 기반 라우팅으로 개발 편의성
  - 이미지 최적화, 폰트 최적화 내장
  - `output: 'standalone'` 옵션으로 Docker 배포 최적화
  - ISR/SSG/SSR 유연한 렌더링 전략

#### React
- **버전**: `^18.3.1`
- **용도**: UI 라이브러리
- **사용 이유**:
  - 선언적 UI 개발
  - 가상 DOM으로 효율적인 렌더링
  - 풍부한 생태계와 커뮤니티
  - Server Components 지원 (React 18)

### 스타일링

#### Tailwind CSS
- **버전**: `^3.4.17`
- **용도**: 유틸리티 기반 CSS 프레임워크
- **사용 이유**:
  - 클래스 기반으로 빠른 스타일링
  - 일관된 디자인 시스템 구축
  - PurgeCSS로 번들 크기 최소화
  - JIT 모드로 개발 시 즉시 반영

#### tailwindcss-animate
- **버전**: `^1.0.7`
- **용도**: Tailwind 애니메이션 확장
- **사용 이유**:
  - 선언적 애니메이션 클래스 제공
  - UI 인터랙션 개선

### 데이터 시각화

#### ReactFlow (@xyflow/react)
- **버전**: `^12.3.6`
- **용도**: 마인드맵 시각화
- **사용 이유**:
  - 노드/엣지 기반 그래프 렌더링
  - 줌, 패닝, 드래그 기본 지원
  - 커스텀 노드 컴포넌트 지원
  - C++ 버전 간 차이점을 트리 구조로 표현

### 코드 표시 & Diff

#### prism-react-renderer
- **버전**: `^2.4.1`
- **용도**: 코드 구문 강조
- **사용 이유**:
  - React 친화적인 Prism.js 래퍼
  - C++ 문법 하이라이팅 지원
  - 커스텀 테마 적용 가능
  - SSR 호환

#### react-diff-viewer-continued
- **버전**: `^4.0.5`
- **용도**: 코드 Diff 시각화
- **사용 이유**:
  - GitHub 스타일 Split/Unified diff 뷰
  - 원본 react-diff-viewer의 유지보수 버전
  - 변경 전/후 코드 비교에 최적화
  - 라인별 하이라이팅 지원

### 마크다운

#### react-markdown
- **버전**: `^9.0.1`
- **용도**: 마크다운 렌더링
- **사용 이유**:
  - AI 응답을 마크다운으로 표시
  - 커스텀 컴포넌트 매핑 지원
  - 보안 (XSS 방지)

#### remark-gfm
- **버전**: `^4.0.0`
- **용도**: GitHub Flavored Markdown 지원
- **사용 이유**:
  - 테이블, 체크박스, 취소선 등 확장 문법
  - 코드 블록 언어 지정

### 상태 관리 & 인증

#### @supabase/ssr
- **버전**: `^0.5.2`
- **용도**: Supabase SSR 인증
- **사용 이유**:
  - Next.js App Router와 완벽 호환
  - 서버/클라이언트 세션 동기화
  - 쿠키 기반 인증 자동 처리

#### @supabase/supabase-js
- **버전**: `^2.47.12`
- **용도**: Supabase 클라이언트
- **사용 이유**:
  - PostgreSQL 데이터베이스 접근
  - 실시간 구독 지원
  - 스토리지 API 제공

### 유틸리티

#### clsx
- **버전**: `^2.1.1`
- **용도**: 조건부 클래스 결합
- **사용 이유**:
  - 조건부 Tailwind 클래스 관리
  - 가독성 높은 클래스 조합

#### tailwind-merge
- **버전**: `^2.6.0`
- **용도**: Tailwind 클래스 병합
- **사용 이유**:
  - 중복/충돌 클래스 자동 해결
  - 컴포넌트 props로 스타일 오버라이드 시 필수

---

## 백엔드 (apps/api)

### 프레임워크

#### Hono
- **버전**: `^4.6.16`
- **용도**: 경량 웹 프레임워크
- **사용 이유**:
  - 초경량 (12KB)으로 빠른 콜드 스타트
  - Express 유사 API로 학습 곡선 낮음
  - TypeScript 퍼스트 설계
  - Edge Runtime 호환 (Cloudflare Workers 등)
  - 미들웨어 시스템 (CORS, 로깅 등)

#### @hono/node-server
- **버전**: `^1.13.8`
- **용도**: Node.js 어댑터
- **사용 이유**:
  - Hono를 Node.js 환경에서 실행
  - 기존 Node.js 인프라 활용

### LLM 통합

#### @anthropic-ai/sdk
- **버전**: `^0.33.1`
- **용도**: Claude API 클라이언트
- **사용 이유**:
  - C++ 코드 모던화 핵심 엔진
  - 코드 변환, 설명 생성, 테스트 케이스 생성
  - 스트리밍 응답 지원
  - 토큰 사용량 추적

#### openai
- **버전**: `^4.76.3`
- **용도**: OpenAI API 클라이언트 (대안)
- **사용 이유**:
  - GPT 모델 사용 옵션 제공
  - Claude 대비 비용/속도 트레이드오프
  - 텍스트 임베딩 (RAG용)

### 데이터베이스

#### @supabase/supabase-js
- **버전**: `^2.47.12`
- **용도**: Supabase 클라이언트
- **사용 이유**:
  - 프로젝트/버전 데이터 저장
  - 사용자 인증 연동
  - 서비스 롤 키로 관리자 작업

### 검증 & 파싱

#### zod
- **버전**: `^3.24.1`
- **용도**: 스키마 검증
- **사용 이유**:
  - API 요청 바디 검증
  - TypeScript 타입 자동 추론
  - 런타임 타입 안전성
  - 상세한 에러 메시지

#### pdf-parse
- **버전**: `^1.1.1`
- **용도**: PDF 파싱
- **사용 이유**:
  - C++ 표준 문서(PDF) 텍스트 추출
  - RAG 인덱싱용 문서 처리

### 환경 설정

#### dotenv
- **버전**: `^16.4.7`
- **용도**: 환경 변수 로드
- **사용 이유**:
  - `.env` 파일에서 설정 로드
  - API 키, DB URL 등 민감 정보 관리

#### uuid
- **버전**: `^11.0.3`
- **용도**: UUID 생성
- **사용 이유**:
  - 프로젝트/세션 고유 ID 생성
  - 데이터베이스 기본 키

---

## 공유 패키지 (packages/shared)

### 용도
- `apps/web`과 `apps/api` 간 공유 타입 정의
- 공통 유틸리티 함수
- C++ 버전 ID, API 응답 타입 등

### 구조
```typescript
// 예시: C++ 버전 타입
export type CppVersionId =
  | 'cpp98' | 'cpp03' | 'cpp11'
  | 'cpp14' | 'cpp17' | 'cpp20'
  | 'cpp23' | 'cpp26'
```

---

## 외부 서비스

### Supabase
- **용도**: Backend-as-a-Service
- **사용 기능**:
  - PostgreSQL 데이터베이스
  - 사용자 인증 (Auth)
  - 파일 스토리지 (Storage)
- **사용 이유**:
  - 무료 티어로 프로토타입 개발
  - Firebase 대비 PostgreSQL 기반으로 복잡한 쿼리 가능
  - 실시간 구독 기본 제공

### Wandbox API
- **용도**: 온라인 C++ 컴파일러
- **Base URL**: `https://wandbox.org/api`
- **사용 이유**:
  - 완전 무료 (API 키 불필요)
  - C++98 ~ C++23 지원
  - GCC/Clang 다양한 버전 제공
  - stdin/stdout 실행 지원
  - Judge0 유료화 대안

### Claude API (Anthropic)
- **용도**: LLM 코드 분석/생성
- **사용 이유**:
  - 코드 이해 능력 우수
  - 긴 컨텍스트 (200K 토큰)
  - C++ 표준별 차이점 설명 생성

---

## 인프라 & 배포

### Railway
- **용도**: 클라우드 배포 플랫폼
- **사용 이유**:
  - Docker 기반 배포 지원
  - GitHub 연동 자동 배포
  - 모노레포 다중 서비스 지원
  - 환경 변수 관리 UI
  - 무료 티어 제공

### Docker
- **용도**: 컨테이너화
- **Dockerfile 구조**:
  - `Dockerfile.api`: Hono API 서버
  - `Dockerfile.web`: Next.js 프론트엔드
- **사용 이유**:
  - 일관된 배포 환경
  - Multi-stage 빌드로 이미지 크기 최소화
  - 로컬-프로덕션 환경 일치

---

## 개발 도구

### Prettier
- **버전**: `^3.4.2`
- **용도**: 코드 포매팅
- **사용 이유**:
  - 일관된 코드 스타일 유지
  - 저장 시 자동 포맷
  - 팀 협업 시 스타일 충돌 방지

### ESLint (Next.js 내장)
- **용도**: 코드 린팅
- **사용 이유**:
  - 잠재적 버그 사전 탐지
  - React Hooks 규칙 검사
  - 접근성(a11y) 검사

---

## 버전 호환성

| 도구 | 최소 버전 | 권장 버전 |
|------|----------|----------|
| Node.js | 18.x | 20.x |
| npm | 8.x | 10.x |
| TypeScript | 5.0 | 5.7+ |

---

## 환경 변수

### API 서비스
```env
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# LLM
ANTHROPIC_API_KEY=sk-ant-api03-xxx
OPENAI_API_KEY=sk-proj-xxx

# Compiler
COMPILER_PROVIDER=wandbox
```

### Web 서비스
```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 의존성 요약

### 프로덕션 의존성 개수
| 패키지 | 의존성 수 |
|--------|----------|
| Root | 1 (turbo) |
| Web | 16 |
| API | 10 |
| Shared | 0 |

### 개발 의존성 개수
| 패키지 | 의존성 수 |
|--------|----------|
| Root | 5 |
| Web | 6 |
| API | 5 |
| Shared | 1 |

---

## 라이선스 정보

모든 주요 의존성은 MIT 또는 Apache 2.0 라이선스입니다.

| 라이브러리 | 라이선스 |
|-----------|---------|
| Next.js | MIT |
| React | MIT |
| Hono | MIT |
| Tailwind CSS | MIT |
| ReactFlow | MIT |
| Supabase | Apache 2.0 |

---

*문서 작성일: 2025-12-15*
*프로젝트 버전: 0.1.0*
