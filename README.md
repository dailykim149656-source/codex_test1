# RSS 인사이트 대시보드

RSS 뉴스 피드를 수집해 주요 이벤트와 투자 인사이트를 요약해주는 Next.js 기반 대시보드입니다. 로그인은 Google OAuth로 처리하며, 분석 요청 시 Gemini 또는 Claude API 키를 입력받아 사용합니다.

## 프로젝트 구조

- `app/`: Next.js App Router 기반 UI 및 API 라우트
  - `page.tsx`: 메인 대시보드 화면 (로그인/분석 UI)
  - `layout.tsx`: 전역 레이아웃
  - `components/Providers.tsx`: NextAuth 세션 Provider
  - `api/analyze/route.ts`: RSS 수집 + AI 분석 API
  - `api/auth/[...nextauth]/route.ts`: NextAuth 인증 엔드포인트
  - `api/history/route.ts`: 로그인 사용자별 최근 분석 기록 조회 API
- `middleware.ts`: Request ID 주입 + CORS 프리플라이트 처리
- `lib/`: 서버 로직 모음
  - `auth.ts`: Google OAuth 설정
  - `authz.ts`: 인증/인가(RBAC/ABAC) + 테넌트 식별
  - `rss.ts`: RSS 피드 수집 및 점수화 로직
  - `ai.ts`: Gemini/Claude 호출 및 응답 파싱
  - `api.ts`: 전역 API 에러 핸들러 + Request ID + CORS/RateLimit
  - `errors.ts`: AppError 정의
  - `security.ts`: CORS/CSRF 보호 유틸
  - `rate-limit.ts`: 요청 제한 유틸 (인메모리)
  - `request.ts`: Request ID/IP 추출 유틸
  - `validation.ts`: 요청 검증 로직
  - `env.ts`: 운영 환경 변수 필수값 검증
  - `audit-log.ts`: 감사 로그 기록
  - `history.ts`: 최근 분석 기록 저장/조회 (로컬 JSON)
- `news_analyst/`: Google Apps Script 기반 레거시 리포트/수집 스크립트
- `next.config.mjs`: Next.js 설정
- `package.json`: 실행 스크립트 및 의존성

## 로컬 개발

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 환경 변수

| 변수 | 설명 |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 |
| `NEXTAUTH_SECRET` | NextAuth 세션 암호화용 시크릿 |
| `NEXTAUTH_URL` | 배포 URL 또는 로컬 URL (예: `http://localhost:3000`) |
| `APP_ORIGINS` | CORS/CSRF 허용 Origin 목록 (쉼표 구분) |
| `ALLOWED_EMAIL_DOMAINS` | 허용할 이메일 도메인 목록 (쉼표 구분) |
| `ADMIN_EMAILS` | 관리자 이메일 목록 (쉼표 구분) |
| `DEFAULT_TENANT_ID` | 도메인 없을 때 사용할 테넌트 ID |

> 분석용 API Key는 사용자가 화면에서 입력하며, 서버에 저장하지 않습니다.

### 로컬 .env.local 설정

`.env.local.example`를 `.env.local`로 복사한 뒤 값을 채웁니다. 환경 변수가 누락되면
Google 로그인 버튼이 비활성화됩니다. `NEXTAUTH_SECRET`는 아래 명령으로 생성할 수 있습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

환경 변수를 변경했다면 `npm run dev`를 재시작합니다.

## 최근 분석 기록

- Google 로그인 계정 이메일 기준으로 최근 10건을 저장하고 표시합니다.
- 로컬 개발에서는 `.data/analysis-history.json`에 저장됩니다.
- Vercel 등 서버리스 환경에서는 파일이 유지되지 않을 수 있으므로, 운영 환경에서는 DB로 교체를 권장합니다.

## 보안 및 에러 처리

- 모든 API 응답은 `code`, `message`, `requestId`를 포함하며 운영 환경에서 내부 정보/스택/키가 노출되지 않습니다.
- `x-request-id` 헤더가 자동으로 부여되어 추적과 로깅에 사용됩니다.
- CORS/CSRF는 `APP_ORIGINS` 기준으로 허용된 Origin만 통과합니다.
- Rate Limit(인메모리): 분석 10회/분, 기록 조회 30회/분.
- 감사 로그는 `.data/audit-log.jsonl`에 저장됩니다. 운영 환경에서는 중앙 로그/DB 연동을 권장합니다.
- 보안 헤더(CSP/HSTS 등)는 `next.config.mjs`에서 설정합니다.

### 시크릿 관리/회전

- `NEXTAUTH_SECRET`을 교체하면 기존 세션이 무효화되므로 재로그인이 필요합니다.
- 배포 환경에서는 주기적인 회전을 권장하며, 변경 후 배포를 재시작합니다.

### 의존성 취약점 점검

```bash
npm audit
```

## Vercel 배포 가이드

1. **Vercel에서 새 프로젝트 생성**
   - Git 리포지토리를 연결하고 Framework Preset은 **Next.js**로 선택합니다.
   - 루트 디렉터리는 기본값(`./`)을 사용합니다.

2. **환경 변수 설정**
   - Vercel 프로젝트의 **Settings → Environment Variables**에 아래 값을 등록합니다.
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL` (예: `https://<project>.vercel.app`)

3. **Google OAuth 리디렉션 URI 추가**
   - Google Cloud Console에서 OAuth 클라이언트의 승인된 리디렉션 URI에 다음을 추가합니다.
     - `https://<project>.vercel.app/api/auth/callback/google`
     - 로컬 개발용: `http://localhost:3000/api/auth/callback/google`

4. **배포 확인**
   - Vercel이 자동으로 `npm run build` → `npm run start`를 실행합니다.
   - 배포 후 로그인 및 분석 버튼이 정상 동작하는지 확인합니다.
