# Railway 배포 가이드

## 개요

Shuguridan은 두 개의 서비스로 구성됩니다:
- **Web**: Next.js 프론트엔드 (포트 3000)
- **API**: Hono 백엔드 (포트 3001)

---

## 1. Railway 프로젝트 설정

### 1.1 새 프로젝트 생성

1. [Railway](https://railway.app)에 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. `Shuguridan` 레포지토리 선택

### 1.2 서비스 구성 (Monorepo)

Railway는 모노레포를 지원합니다. 두 개의 서비스를 생성해야 합니다:

#### API 서비스 생성
1. 프로젝트에서 "+ New" → "GitHub Repo" 클릭
2. 동일 레포지토리 선택
3. Settings에서:
   - **Root Directory**: `/` (루트)
   - **Dockerfile Path**: `Dockerfile.api`
   - **Service Name**: `shuguridan-api`

#### Web 서비스 생성
1. 프로젝트에서 "+ New" → "GitHub Repo" 클릭
2. 동일 레포지토리 선택
3. Settings에서:
   - **Root Directory**: `/` (루트)
   - **Dockerfile Path**: `Dockerfile.web`
   - **Service Name**: `shuguridan-web`

---

## 2. 환경 변수 설정

### 2.1 API 서비스 환경 변수

```
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM
ANTHROPIC_API_KEY=sk-ant-api03-xxx
OPENAI_API_KEY=sk-proj-xxx

# Compiler
COMPILER_PROVIDER=wandbox
```

### 2.2 Web 서비스 환경 변수

```
# API URL - API 서비스 배포 후 URL 확인
NEXT_PUBLIC_API_URL=https://shuguridan-api-production.up.railway.app

# Supabase (공개 키만)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**중요**: Web 서비스의 `NEXT_PUBLIC_API_URL`은 API 서비스 배포 후 생성되는 URL로 설정해야 합니다.

---

## 3. 도메인 설정

### 3.1 자동 생성 도메인

Railway는 각 서비스에 자동으로 도메인을 생성합니다:
- API: `https://shuguridan-api-xxx.railway.app`
- Web: `https://shuguridan-web-xxx.railway.app`

### 3.2 커스텀 도메인 (선택)

1. 서비스 Settings → Domains
2. "Add Custom Domain" 클릭
3. DNS 설정 지시에 따라 CNAME 레코드 추가

---

## 4. 배포 순서

### 4.1 첫 번째 배포

1. **API 서비스 먼저 배포**
   - 환경 변수 설정
   - 배포 후 URL 확인

2. **Web 서비스 배포**
   - `NEXT_PUBLIC_API_URL`을 API URL로 설정
   - 배포

### 4.2 배포 확인

```bash
# API 헬스 체크
curl https://your-api-url.railway.app/

# 응답 예시:
# {"name":"Shuguridan API","version":"0.1.0","status":"ok"}
```

---

## 5. 문제 해결

### 5.1 빌드 실패

- Dockerfile 경로 확인
- Root Directory가 `/`인지 확인
- Railway 빌드 로그 확인

### 5.2 API 연결 실패

- CORS 설정 확인 (API에서 모든 origin 허용 중)
- `NEXT_PUBLIC_API_URL` 환경 변수 확인
- 네트워크 탭에서 실제 요청 URL 확인

### 5.3 환경 변수 미적용

- Next.js 빌드 시 `NEXT_PUBLIC_*` 변수는 빌드 타임에 주입됨
- 환경 변수 변경 후 재배포 필요

---

## 6. 비용 최적화

### 6.1 Sleep 설정

개발/테스트 용도라면 사용하지 않을 때 서비스를 sleep 모드로:
- Settings → Sleep → Enable

### 6.2 리소스 제한

- Settings → Resources
- 필요에 따라 CPU/Memory 조정

---

## 7. 로컬 테스트

배포 전 로컬에서 Docker 빌드 테스트:

```bash
# API 빌드 테스트
docker build -f Dockerfile.api -t shuguridan-api .

# Web 빌드 테스트
docker build -f Dockerfile.web -t shuguridan-web \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your-url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key .
```

---

## 8. 환경 변수 체크리스트

### API 서비스 (필수)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `OPENAI_API_KEY`

### API 서비스 (선택)
- [ ] `COMPILER_PROVIDER` (기본값: wandbox)
- [ ] `NODE_ENV` (기본값: production)

### Web 서비스 (필수)
- [ ] `NEXT_PUBLIC_API_URL` (API 서비스 URL)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 9. 업데이트 배포

GitHub에 푸시하면 자동으로 재배포됩니다:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Railway 대시보드에서 배포 상태를 확인할 수 있습니다.
