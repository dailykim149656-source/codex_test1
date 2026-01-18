# RSS 인사이트 대시보드

RSS 뉴스 피드를 수집해 주요 이벤트와 투자 인사이트를 요약해주는 Next.js 기반 대시보드입니다. 로그인은 Google OAuth로 처리하며, 분석 요청 시 Gemini 또는 Claude API 키를 입력받아 사용합니다.

## 프로젝트 구조

- `app/`: Next.js App Router 기반 UI 및 API 라우트
  - `page.tsx`: 메인 대시보드 화면 (로그인/분석 UI)
  - `layout.tsx`: 전역 레이아웃
  - `components/Providers.tsx`: NextAuth 세션 Provider
  - `api/analyze/route.ts`: RSS 수집 + AI 분석 API
  - `api/auth/[...nextauth]/route.ts`: NextAuth 인증 엔드포인트
- `lib/`: 서버 로직 모음
  - `auth.ts`: Google OAuth 설정
  - `rss.ts`: RSS 피드 수집 및 점수화 로직
  - `ai.ts`: Gemini/Claude 호출 및 응답 파싱
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

> 분석용 API Key는 사용자가 화면에서 입력하며, 서버에 저장하지 않습니다.

### 로컬 .env.local 설정

`.env.local.example`를 `.env.local`로 복사한 뒤 값을 채웁니다. 환경 변수가 누락되면
Google 로그인 버튼이 비활성화됩니다. `NEXTAUTH_SECRET`는 아래 명령으로 생성할 수 있습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

환경 변수를 변경했다면 `npm run dev`를 재시작합니다.

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
