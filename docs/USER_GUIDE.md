# 청파중앙교회 교육위원회 관리 시스템 - 사용자 안내서

> 이 안내서는 교회 교육위원회 담당자가 시스템을 처음 사용할 때 참고하는 문서입니다.
> 기술 용어를 최소화하고 단계별로 설명합니다.

---

## 1. 시작하기

### 접속 주소

**https://church-eight-delta.vercel.app**

휴대폰, 태블릿, PC 모두 사용 가능합니다.

### 회원가입

1. 접속 주소로 이동합니다.
2. "회원가입" 탭을 누릅니다.
3. **이름**, **이메일**, **비밀번호**를 입력합니다.
4. "회원가입" 버튼을 누릅니다.
5. **"승인 대기"** 화면이 나타납니다.

> 회원가입 후 바로 사용할 수 없습니다.
> 관리자(회장 또는 담당목사)가 가입을 **승인**해야 로그인이 가능합니다.
> 승인 요청은 회장 또는 담당목사에게 직접 연락해 주세요.

### 로그인

1. 접속 주소로 이동합니다.
2. 가입한 **이메일**과 **비밀번호**를 입력합니다.
3. "로그인" 버튼을 누릅니다.
4. 대시보드 화면이 나타나면 정상입니다.

### 비밀번호를 잊었을 때

현재 비밀번호 찾기 기능은 없습니다.
관리자에게 연락하여 비밀번호 초기화를 요청해 주세요.

---

## 2. 화면 구성

### 휴대폰 (모바일)

- **상단**: 교회 로고 + 알림 종 아이콘 + 메뉴 버튼
- **하단**: 주요 메뉴 바로가기 (대시보드, 출결, 보고서, 교인, 안내)
- 메뉴 버튼을 누르면 전체 메뉴가 내려옵니다.

### PC (데스크톱)

- **왼쪽**: 고정 사이드바 (전체 메뉴)
- **오른쪽**: 본문 영역
- 사이드바 하단에 내 이름과 소속 부서가 표시됩니다.

### 알림

- 상단 종 모양 아이콘을 누르면 알림 목록이 나타납니다.
- 읽지 않은 알림이 있으면 숫자 배지가 표시됩니다.
- 알림을 누르면 해당 보고서/페이지로 이동합니다.
- "모두 읽음" 버튼으로 한번에 처리할 수 있습니다.

---

## 3. 대시보드

로그인 후 가장 먼저 보이는 화면입니다.

### 표시 내용

- **환영 메시지**: 내 이름과 소속 부서
- **이번 주 출석 통계**: 예배 출석, 모임 출석, 재적 인원
- **빠른 메뉴**: 출결 관리, 보고서 작성, 교인 명단, 안내 바로가기
- **최근 보고서**: 최근 5건의 보고서 상태

### 관리자 추가 표시

- **결재 대기 건수**: 승인이 필요한 보고서 수

---

## 4. 출결 관리

매주 예배와 모임의 출석을 기록하는 페이지입니다.

### 출석 체크 방법

1. 메뉴에서 **"출결 관리"**를 누릅니다.
2. 상단에서 **부서**를 선택합니다.
3. **날짜**를 선택합니다.
4. 교인 목록이 나타나면, 각 교인 옆의 체크박스를 누릅니다.
   - **예배**: 주일 예배 출석 여부
   - **모임**: 소그룹/셀 모임 출석 여부
5. 체크하면 **자동 저장**됩니다. 별도 저장 버튼을 누를 필요 없습니다.

### 엑셀 내보내기

출석 기록을 엑셀 파일로 다운로드할 수 있습니다.

### 참고

- **팀장 이상**만 출석 체크가 가능합니다.
- 일반 회원은 조회만 가능합니다.
- 관리자가 아닌 경우, 본인 소속 부서만 보입니다.

---

## 5. 보고서

### 5-1. 보고서 목록

1. 메뉴에서 **"보고서"**를 누릅니다.
2. 상단 탭으로 보고서 유형을 선택합니다:
   - **주차**: 매주 작성하는 주간 보고서
   - **모임**: 소그룹/셀 모임 보고서
   - **교육**: 교육 프로그램 보고서
   - **셀장**: 셀장 보고서
3. 부서별, 상태별로 필터링할 수 있습니다.
4. 보고서를 누르면 상세 내용을 볼 수 있습니다.

### 보고서 상태 설명

| 상태 | 의미 |
|------|------|
| 임시저장 | 작성 중이며 아직 제출하지 않은 상태 |
| 제출됨 | 회장의 협조를 기다리는 상태 |
| 회장 협조 | 회장이 확인했고, 부장 결재를 기다리는 상태 |
| 부장 결재 | 부장이 결재했고, 담당목사 확인을 기다리는 상태 |
| 최종 승인 | 모든 결재가 완료된 상태 |
| 반려 | 수정이 필요하여 되돌려진 상태 |
| 수정 요청 | 일부 수정을 요청받은 상태 |

### 5-2. 보고서 작성 (팀장/셀장)

1. 보고서 목록에서 **"새 보고서"** 버튼을 누릅니다.
2. 보고서 유형을 선택합니다 (주차/모임/교육/셀장).
3. 각 항목을 입력합니다:
   - **진행 순서**: 시간, 내용, 담당자 (행 추가 가능)
   - **출석 현황**: 셀별 재적/예배/모임 인원
   - **새신자**: 이름, 연락처, 인도자 등
   - **비고**: 자유 텍스트 (서식 편집 가능)
   - **사진**: 활동 사진 첨부 (선택)
4. 하단에서 선택합니다:
   - **임시 저장**: 나중에 이어서 작성
   - **제출**: 결재 프로세스 시작

### 5-3. 결재 프로세스

보고서가 제출되면 아래 순서로 결재가 진행됩니다:

```
작성자(팀장) → 회장(협조) → 부장(결재) → 담당목사(최종 확인)
```

1. **작성자**: 보고서를 작성하고 "제출" 버튼을 누릅니다.
2. **회장**: 알림을 받고 결재함에서 보고서를 확인합니다.
   - "협조" 버튼: 다음 단계로 넘김
   - "반려" 버튼: 작성자에게 되돌림 (사유 입력)
3. **부장**: 알림을 받고 결재함에서 보고서를 확인합니다.
   - "결재" 버튼: 다음 단계로 넘김
   - "반려" 버튼: 작성자에게 되돌림
4. **담당목사**: 알림을 받고 결재함에서 보고서를 확인합니다.
   - "확인" 버튼: 최종 승인 완료
   - "반려" 버튼: 작성자에게 되돌림

### 반려 시 재제출

1. 반려 알림을 받으면 보고서를 엽니다.
2. 반려 사유를 확인합니다.
3. "수정" 버튼을 눌러 내용을 수정합니다.
4. 다시 "제출" 버튼을 눌러 결재를 재시작합니다.

---

## 5-4. 회의

회의 메뉴는 부서별 회의 기록을 남기는 기본 기능입니다.

### 회의 목록 보기

1. 메뉴에서 **"회의"**를 누릅니다.
2. 최근 회의가 최신순으로 표시됩니다.
3. 각 항목에서 제목, 부서, 회의일, 작성자를 확인할 수 있습니다.
4. 항목을 누르면 상세 페이지로 이동합니다.

### 회의 등록

- **등록 가능 역할**: 최고관리자, 회장, 팀장

1. 회의 목록에서 **"새 회의"** 버튼을 누릅니다.
2. 아래 항목을 입력합니다.
   - 회의 제목
   - 부서
   - 회의 일시
   - 장소
   - 회의 노트
3. **"저장"** 버튼을 누르면 회의가 등록됩니다.

### 회의 상세

회의 상세 페이지에서는 아래 정보를 확인할 수 있습니다.

- 회의 제목
- 부서
- 회의 일시
- 장소
- 회의 노트

추후 아래 항목이 추가될 예정입니다.

- 결정사항
- Task 연결
- AI 요약

---

## 6. 교인 명단

### 교인 목록 보기

1. 메뉴에서 **"교인 명단"**을 누릅니다.
2. 보기 방식을 선택합니다:
   - **그리드 보기**: 사진이 있는 카드 형태
   - **리스트 보기**: 표 형태
3. 필터를 사용하여 원하는 교인을 찾을 수 있습니다:
   - **부서 필터**: 드롭다운에서 부서 선택
   - **셀 필터**: 1청년부 선택 시에만 나타남 (1셀~6셀)
   - **생일 필터**: 1월~12월 버튼으로 해당 월 생일자 표시
   - **검색**: 이름 또는 연락처로 검색

### 교인 등록

1. 교인 목록에서 **"새 교인 등록"** 버튼을 누릅니다.
2. 정보를 입력합니다:
   - **이름** (필수)
   - 연락처, 이메일, 생년월일, 주소, 직업
   - **부서**: 체크박스로 여러 부서 선택 가능, 주 소속 부서 지정
   - **프로필 사진**: 사진 파일 업로드 (선택)
3. "저장" 버튼을 누릅니다.

### 교인 정보 수정

1. 교인 목록에서 수정할 교인을 누릅니다.
2. 상세 페이지에서 정보를 수정합니다.
3. "저장" 버튼을 누릅니다.

### 사진 일괄 업로드

여러 교인의 사진을 한꺼번에 올리고 싶을 때 사용합니다.

1. 교인 목록에서 **"사진 일괄 업로드"** 버튼을 누릅니다.
2. 부서를 선택합니다.
3. 사진 파일을 선택합니다.
   - 파일 이름이 교인 이름과 같으면 자동으로 매칭됩니다. (예: `홍길동.jpg`)
   - 매칭되지 않으면 드롭다운에서 수동으로 선택합니다.
4. "업로드" 버튼을 누릅니다.

### 엑셀 내보내기

교인 목록을 엑셀 파일로 다운로드할 수 있습니다.

---

## 7. 회계 관리

### 회계장부

1. 메뉴에서 **"회계 관리"**를 누릅니다.
2. 부서와 월을 선택합니다.
3. 수입/지출 내역이 표 형태로 나타납니다.
4. 하단에 월별 요약 (총 수입, 총 지출, 잔액)이 표시됩니다.

### 장부 입력

1. 회계 페이지에서 **"입력"** 버튼을 누릅니다.
2. 날짜, 적요(설명), 금액, 카테고리를 입력합니다.
3. "저장" 버튼을 누릅니다.

### 엑셀 가져오기/내보내기

- **가져오기**: 엑셀 파일을 업로드하여 장부에 반영
- **내보내기**: 현재 장부를 엑셀 파일로 다운로드

### 지출결의서

1. 회계 페이지에서 **"지출결의서"** 탭을 누릅니다.
2. **"새 결의서"** 버튼을 눌러 작성합니다.
3. 항목별로 날짜, 적요, 카테고리, 금액을 입력합니다.
4. 항목은 여러 개 추가할 수 있으며, 총액이 자동 계산됩니다.

### 회계 권한

- **회장, 부장, 담당목사**: 모든 부서의 장부를 조회하고 편집할 수 있습니다.
- **팀장**: 소속 부서의 장부만 조회할 수 있습니다.
- **일반 회원**: 회계 메뉴에 접근할 수 없습니다.

---

## 8. 활동 사진

1. 메뉴에서 **"활동 사진"**을 누릅니다.
2. 부서별로 등록된 활동 사진을 열람할 수 있습니다.

---

## 9. 알림

### 인앱 알림

- 화면 상단의 **종 모양 아이콘**을 누르면 알림 목록이 나타납니다.
- 알림은 보고서 제출, 협조 완료, 결재 완료, 반려 등의 상황에서 자동 발송됩니다.
- 알림을 누르면 해당 보고서 페이지로 이동합니다.

### 푸시 알림 (선택)

앱을 열지 않아도 휴대폰이나 PC에서 알림을 받을 수 있습니다.

**푸시 알림 허용 방법:**
1. 종 모양 아이콘을 누릅니다.
2. 알림 목록 하단에 **"푸시 알림 켜기"** 버튼이 있습니다.
3. 버튼을 누르면 브라우저가 알림 허용을 물어봅니다.
4. **"허용"**을 누르면 설정 완료됩니다.

**아이폰(iOS) 사용자:**
아이폰에서 푸시 알림을 받으려면 먼저 홈 화면에 앱을 추가해야 합니다.
1. Safari에서 사이트를 엽니다.
2. 하단 공유 버튼을 누릅니다.
3. **"홈 화면에 추가"**를 선택합니다.
4. 홈 화면에서 앱을 열고 푸시 알림을 활성화합니다.

### 알림이 오는 경우

| 상황 | 알림 받는 사람 |
|------|--------------|
| 보고서가 제출됨 | 회장 |
| 회장이 협조 완료 | 부장 |
| 부장이 결재 완료 | 담당목사 |
| 최종 승인 완료 | 보고서 작성자 |
| 보고서가 반려됨 | 보고서 작성자 |
| 수정 요청됨 | 보고서 작성자 |

---

## 10. 관리자 전용 기능

아래 기능들은 **회장, 부장, 담당목사** 등 관리자 역할일 때만 메뉴에 표시됩니다.

### 사용자 관리 (회장/담당목사만)

새로 가입한 사용자를 승인하고 역할을 부여합니다.

1. 관리자 메뉴에서 **"사용자 관리"**를 누릅니다.
2. **미승인 사용자** 목록이 나타납니다.
3. 각 사용자에 대해:
   - **역할**을 선택합니다 (회원, 팀장, 회계 등)
   - **소속 부서**를 선택합니다 (여러 부서 선택 가능)
   - **"승인"** 버튼을 누릅니다.
4. 기존 사용자의 역할이나 부서를 변경할 수도 있습니다.
5. 변경 후 **"저장"** 버튼을 누릅니다.

### 결재함 (관리자)

결재가 필요한 보고서를 확인하고 처리합니다.

1. 관리자 메뉴에서 **"결재함"**을 누릅니다.
2. **대기 중** 탭: 내가 처리해야 할 보고서 목록
3. **처리 완료** 탭: 이미 처리한 보고서 목록
4. 보고서를 누르면 상세 페이지에서 결재할 수 있습니다.

### 출석 통계 (관리자)

1. 관리자 메뉴에서 **"통계"**를 누릅니다.
2. 다양한 차트로 출석 현황을 확인합니다:
   - **주간 추이**: 시간별 출석 변화 그래프
   - **부서별 분포**: 원형 차트로 부서별 비율
   - **부서별 비교**: 막대 차트로 부서별 출석률 비교
3. 기간(월간/분기/연간)을 선택하여 필터링할 수 있습니다.
4. 통계 데이터를 엑셀로 내보낼 수 있습니다.

### 셀 관리 (관리자)

1. 관리자 메뉴에서 **"셀 관리"**를 누릅니다.
2. 1청년부의 셀(소그룹)을 추가, 수정, 순서 변경할 수 있습니다.

---

## 11. 역할별 권한 요약표

| 기능 | 일반 회원 | 팀장/셀장 | 부장(회계) | 회장 | 담당목사 |
|------|----------|----------|-----------|------|---------|
| 대시보드 조회 | O | O | O | O | O |
| 출석 조회 | O | O | O | O | O |
| 출석 체크 | X | O | O | O | O |
| 보고서 조회 | O | O | O | O | O |
| 보고서 작성 | X | O | O | O | O |
| 교인 등록/수정 | X | O | O | O | O |
| 교인 삭제 | X | O | O | O | O |
| 회계 조회 | X | O (소속) | O | O | O |
| 결재함 | X | X | O | O | O |
| 통계 | X | X | O | O | O |
| 사용자 관리 | X | X | X | O | O |
| 보고서 협조 | X | X | X | O | X |
| 보고서 결재 | X | X | O | X | X |
| 보고서 최종 확인 | X | X | X | X | O |

> **소속 부서 제한**: 팀장과 일반 회원은 본인이 속한 부서의 데이터만 볼 수 있습니다.
> 관리자(부장, 회장, 담당목사)는 모든 부서의 데이터를 볼 수 있습니다.

---

## 12. FAQ / 자주 묻는 질문

### Q: 비밀번호를 잊었어요.
**A:** 현재 비밀번호 찾기 기능은 없습니다. 관리자(회장 또는 담당목사)에게 연락하여 비밀번호 초기화를 요청해 주세요.

### Q: 가입했는데 로그인이 안 돼요.
**A:** 가입 후 관리자의 **승인**이 필요합니다. "승인 대기" 화면이 보인다면 정상입니다. 회장 또는 담당목사에게 승인을 요청해 주세요.

### Q: 보고서가 안 보여요.
**A:** 다음을 확인해 보세요:
- **부서 필터**가 올바른 부서로 설정되어 있는지 확인합니다.
- **임시저장** 상태의 보고서는 작성자 본인만 볼 수 있습니다.
- 팀장이 아닌 경우, 본인이 속한 부서의 보고서만 표시됩니다.

### Q: 다른 부서의 교인이 안 보여요.
**A:** 팀장이나 일반 회원은 본인 **소속 부서**의 교인만 볼 수 있습니다. 모든 부서를 보려면 관리자 역할이 필요합니다.

### Q: 보고서를 수정하고 싶어요.
**A:** 보고서 상태에 따라 다릅니다:
- **임시저장/반려**: 보고서 상세 페이지에서 "수정" 버튼을 누르면 됩니다.
- **제출됨 이후**: 이미 결재 중인 보고서는 수정할 수 없습니다. 반려 후 수정하거나 관리자에게 문의하세요.

### Q: 푸시 알림이 안 와요.
**A:** 다음을 확인해 보세요:
1. 알림 종 아이콘 → "푸시 알림 켜기"가 활성화되어 있는지 확인합니다.
2. 브라우저 설정에서 알림이 **"허용"**으로 되어 있는지 확인합니다.
3. 아이폰은 **홈 화면에 추가** 후 앱에서 열어야 푸시 알림을 받을 수 있습니다.
4. 그래도 안 되면 푸시 알림을 끄고 다시 켜 보세요.

### Q: 셀이 뭔가요?
**A:** 셀은 1청년부 내의 **소그룹**입니다 (1셀, 2셀, ... 6셀). 교인 등록 시 1청년부를 선택하면 셀을 지정할 수 있으며, 셀별로 출석을 관리하고 보고서를 작성할 수 있습니다.

### Q: 엑셀 파일은 어디서 받나요?
**A:** 교인 명단, 출결 기록, 통계 페이지에서 각각 **"엑셀 내보내기"** 버튼을 누르면 파일이 다운로드됩니다.

### Q: 여러 부서에 소속될 수 있나요?
**A:** 네, 교인은 여러 부서에 동시에 소속될 수 있습니다. 등록 시 여러 부서를 체크하고, **주 소속 부서**를 하나 지정하면 됩니다. 주 소속 부서는 파란색 태그로 표시됩니다.

## Meeting Minutes (2026-03-15)
- Open a meeting detail page to view structured sections for Discussion Notes, Decisions, and Handoff Notes.
- The new meeting form can save the base meeting information and structured minutes in a single submit.
- Leaders who can create meetings can also edit these sections and save them with an explicit Save Minutes button.
- General members can view the saved structured content in read-only mode.
- Team leaders can edit only meetings for departments they lead; other departments remain view-only.

## Report Save Stability (2026-03-26)
- While editing a report draft, child sections are now preserved more safely if a later save step fails.
- New local draft autosave and backup restore remain available, and edit saves now avoid clearing child data up front before replacement work succeeds.
- Report draft/save requests now go through a server save endpoint for more consistent handling of the base report and child sections.

## Report Save Stability Update (2026-03-26, RPC)
- Report draft/save now uses a stronger server-backed save path that groups the main report and related child sections more safely.
- In most failure cases, partial child-data loss risk is lower because the core report bundle is now persisted through one DB transaction path.
- Cell leader report attendance save still shows a warning if attendance data fails separately, but the main report save can remain intact.
- Photo upload is still a follow-up step after the main report save and may require retry if an upload problem occurs.


## Report Save Reliability Update (2026-03-26, Boundary Hardening)
- Draft autosave and explicit save now avoid more of the save timing collisions that could happen while editing the same report.
- If the save route returns an unexpected error payload, the screen now treats it as a structured save failure instead of failing on response parsing.
- Draft autosave updates now follow the same server-side edit permission check path as regular report edits.
## Report Save Reliability Update (2026-03-26, Final Hardening)
- While writing a draft, automatic draft save no longer shows a false failure message just because you pressed the main submit/save button at the same time.
- Draft autosave, explicit save, and edit save now follow a clearer server validation path for the target report.
- If you attach photos, the main report can still save first and photo upload may still need a retry separately.

## Reference Document (2026-04-18)
- A portfolio/submission document is now available at `docs/reference/mro-dx-ax-reference.md`.
- It summarizes the product, architecture, major functions, AX-ready design direction, and recommended screenshots for external presentation.

## Meeting PDF Attachments (2026-06-01)
- When creating a new meeting from the Meetings tab, users with meeting creation permission can attach a PDF minutes file.
- The attached PDF is preserved as the original file and can be viewed from the meeting detail page.
- The meeting detail page also provides a link to open the PDF in a new browser tab.
- Report approval still follows the existing chair, department, and pastor approval workflow in the report module.

## Report Delete and Feedback (2026-06-01)
- In the report list, users who can manage a report can tap the delete button on the right side of the row.
- In the report detail page, the same delete action is available from the top action buttons.
- In the report detail page, `super_admin`, `president`, and `accountant` can leave feedback separately from approval.
- Feedback does not change the approval status. It is only a comment trail for the report.

## Meeting Delete and Feedback (2026-06-01)
- In the meeting list, users who can edit the meeting content can tap the delete button on the right side of the row.
- In the meeting detail page, the same delete action is available from the top action buttons.
- In the meeting detail page, `super_admin`, `president`, and `accountant` can leave feedback separately from the meeting notes.
- Feedback does not change any meeting status. It is only a comment trail for the meeting.

## Attendance Save Reliability (2026-06-11)
- When checking attendance, the screen now keeps track of previously unchecked rows too, so checking someone again updates the existing record instead of failing in the background.
- If attendance cannot be saved because of permissions or network issues, the checkmark is reverted and an error message is shown.
- Bulk attendance buttons apply to the currently visible cell-filtered list.

## CU1 Data Operations Prepared (2026-06-11)
- A data-only SQL script is ready for adding Do Jisu to Dahui cell, Park Cheolho to Mina cell, and approving existing pending CU1 cell-leader reports in bulk.
- The script still needs to be run with a valid Supabase admin/PAT/MCP connection.

## Meeting Agenda Discussion (2026-06-18)
- In a meeting detail page, department leaders and administrators can add pre-meeting items before an in-person meeting.
- Each item can be marked as an agenda, question, or notice and is tied to a department.
- The meeting detail page groups items by department sections, such as common agenda, youth, CU1, CU2, and worship team sections.
- Department leaders and administrators can leave comments under each item to ask follow-up questions or share feedback.
- Items can be marked as resolved after the discussion is organized for the meeting.
- This discussion area is separate from finalized meeting minutes, PDF files, and admin-only meeting feedback.

## Meeting Edit And Submit Cancel (2026-06-18)
- In a meeting detail page, users with meeting edit permission can tap `수정` to update title, department, date/time, location, and description.
- Users with meeting delete permission can tap `제출 취소` to cancel the meeting registration.
- Meeting submit cancel removes the meeting and its related meeting content. It is not the same as report approval cancellation.

## Department Agenda PDF Attachments (2026-06-18)
- When adding a pre-meeting agenda item, department leaders and administrators can attach a PDF file for that department's agenda.
- The attached PDF appears under the agenda item with an `열기` link.
- Use this for original agenda documents, reference materials, or department-prepared PDFs before the in-person meeting.

## Meeting Team Leader Feedback And Agenda PDF Fix (2026-06-19)
- Department team leaders can attach PDF files to their pre-meeting agenda items.
- Department team leaders can leave feedback on meeting detail pages when they are responsible for that meeting department.
- This does not change report approvals or finalized meeting minutes.

## Meeting Agenda Participant Leader Permission (2026-06-19)
- In leader-meeting preparation, active users with the `team_leader` role can add pre-meeting agenda items for their linked departments.
- These leaders can also leave comments under agenda items to ask questions or share feedback before attending the meeting.
- Attached agenda PDFs follow the same department link rule.
- This does not grant permission to edit finalized meeting minutes or cancel/edit the meeting itself.

## Meeting Agenda And Comment Edit (2026-06-19)
- After posting a pre-meeting agenda item, permitted users can tap `수정` to change the agenda title, type, and content.
- After posting a comment, permitted users can tap `수정` to change the comment text.
- Save and cancel controls appear inline so the meeting detail page does not need a separate edit screen.
- This edit feature applies only to pre-meeting agenda discussion, not finalized meeting minutes.

## Meeting Agenda Edit UX (2026-06-22)
- When editing a long pre-meeting agenda item, the long read-only body is hidden while the edit fields are open.
- The edit fields appear directly under the agenda item header, with focus placed in the title field.
- Larger edit boxes are used for multi-line agenda/comment text, and Ctrl/Cmd+Enter saves the edit.
- This only changes the editing experience for pre-meeting agenda discussion.
