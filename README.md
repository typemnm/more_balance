# ⚖️ 밸런스 게임

실시간 멀티플레이어 밸런스 게임입니다. 플레이어들은 매 라운드 두 가지 선택지 중 하나를 고르며, 소수 의견 쪽에 투표한 플레이어는 탈락합니다. 마지막까지 살아남은 플레이어가 승리!

## 게임 방법

1. **호스트**가 관리자 대시보드에 로그인해 라운드(주제 + 선택지 두 개 + 타이머)를 만들고 게임을 시작합니다.
2. **플레이어**가 홈 화면에서 닉네임을 입력하고 게임 화면에 입장합니다.
3. 매 라운드마다 살아있는 플레이어는 타이머가 끝나기 전에 **A** 또는 **B**를 선택합니다.
4. 다수결로 승패가 결정되며, 패배한 쪽에 투표한 플레이어는 **관전자**가 됩니다.
5. 동점일 경우 관리자 결정표로 승자가 결정되며, 결정표가 없으면 모두 생존합니다.
6. 마지막까지 살아남은 플레이어가 승리합니다.

## 로컬 개발

```bash
# 의존성 설치
npm install

# 서버 시작 (http://localhost:3000)
npm start

# 파일 변경 시 자동 재시작
npm run dev
```

브라우저에서 접속:
- **플레이어 참가 페이지**: http://localhost:3000
- **게임 화면**: http://localhost:3000/game.html
- **관리자 대시보드**: http://localhost:3000/admin.html

## 환경 변수

| 변수               | 기본값       | 설명                             |
|--------------------|-------------|----------------------------------|
| `PORT`             | `3000`      | 서버가 수신할 포트               |
| `ADMIN_PASSWORD`   | `admin123`  | 관리자 대시보드 비밀번호         |

`.env` 파일이나 호스팅 플랫폼의 환경 변수 설정에서 지정하세요.

> ⚠️ **프로덕션 배포 전에 반드시 `ADMIN_PASSWORD`를 변경하세요.**

---

## Render 배포 (추천)

### 원클릭 배포

아래 버튼을 클릭하면 이 저장소가 Render에 자동으로 배포됩니다.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/typemnm/more_balance)

> `render.yaml`이 포함되어 있어 서비스 설정이 자동으로 적용됩니다.  
> `ADMIN_PASSWORD`는 Render가 안전한 랜덤 값을 **자동 생성**합니다.  
> 배포 후 **대시보드 → 서비스 → Environment** 탭에서 생성된 비밀번호를 확인하고 메모해 두세요.

### 수동 설정

원클릭 배포 대신 직접 서비스를 만들고 싶다면:

1. [Render](https://render.com) 에서 **Web Service** 생성:
   - **저장소**: 이 GitHub 저장소 연결
   - **빌드 명령**: `npm install`
   - **시작 명령**: `node server.js`
   - **런타임**: Node

2. Render 대시보드에서 **환경 변수** 추가:
   | 키                | 값                        |
   |-------------------|---------------------------|
   | `ADMIN_PASSWORD`  | 사용할 강력한 비밀번호    |
   | `NODE_ENV`        | `production`              |

### 자동 배포 (GitHub Actions)

`main` 브랜치에 푸시할 때마다 자동으로 배포하려면 GitHub 저장소에 Secrets를 등록하세요  
(`Settings → Secrets and variables → Actions`):

| Secret              | 설명                                        |
|---------------------|---------------------------------------------|
| `RENDER_API_KEY`    | Render API 키 (대시보드 → Settings → API Keys) |
| `RENDER_SERVICE_ID` | Render 서비스 ID (예: `srv-xxxx`)            |

설정 후 `main` 브랜치 푸시 시 `.github/workflows/deploy.yml` 워크플로우가 자동으로 실행됩니다.

---

## 기술 스택

- **백엔드**: Node.js, Express, Socket.IO
- **프론트엔드**: Vanilla HTML/CSS/JS (빌드 단계 없음)
- **실시간 통신**: Socket.IO WebSocket

## 게임 규칙

- 게임 **진행 중** 참가한 플레이어는 자동으로 관전자가 됩니다.
- **패배 선택지**에 투표한 플레이어는 이후 라운드에서 관전자가 됩니다.
- 라운드가 **동점**이고 관리자 결정표가 있으면 결정표로 승자가 결정됩니다.
- 라운드가 **동점**이고 결정표가 없으면 **모두 생존**합니다.
- 설정된 모든 라운드가 끝나면 게임이 종료됩니다.
- 연결이 끊긴 플레이어는 생존/관전자 상태가 유지되며, 재접속 시 이어서 참가할 수 있습니다.
