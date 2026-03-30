# RunAcademy Chatbot Embed Guide (MVP Scaffold)

## Podia 삽입 코드
```html
<script>
(function () {
  var s = document.createElement("script");
  s.src = "https://chat.runacademy.online/widget.js";
  s.async = true;
  s.onload = function () {
    window.RunAcademyChat.init({
      siteId: "RUNACADEMY",
      apiBaseUrl: "https://api.chat.runacademy.online",
      position: "bottom-right",
      theme: "light",
      autoOpen: false
    });
  };
  document.body.appendChild(s);
})();
</script>
```

## 현재 지원 옵션
- `siteId`: 사이트 식별자
- `apiBaseUrl`: API 서버 베이스 URL (예: `https://api.chat.runacademy.online`)
- `position`: 향후 확장용 (`bottom-right` 기본)
- `theme`: 향후 확장용 (`light` 기본)
- `autoOpen`: 페이지 로드 시 자동 오픈 여부

## 참고
- 현재 버전은 UI 스캐폴드 + 기본 API 호출(`POST /v1/chat/messages`)까지 포함합니다.
- 인증, 세션 식별, 실데이터 저장은 다음 단계에서 추가됩니다.
