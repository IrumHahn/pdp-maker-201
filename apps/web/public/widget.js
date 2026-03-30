(function () {
  function createStyles() {
    return `
      :host {
        all: initial;
      }

      .ra-root {
        position: fixed;
        right: 20px;
        bottom: 20px;
        font-family: Pretendard, sans-serif;
        z-index: 2147483000;
      }

      .ra-fab {
        width: 60px;
        height: 60px;
        border: 0;
        border-radius: 999px;
        background: #1f6f5c;
        color: #fff;
        font-size: 22px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 18px 35px rgba(31, 111, 92, 0.3);
      }

      .ra-panel {
        width: 380px;
        height: 600px;
        margin-bottom: 10px;
        border: 1px solid #dce3e8;
        border-radius: 18px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 22px 46px rgba(24, 32, 38, 0.16);
        display: none;
        flex-direction: column;
      }

      .ra-panel.open {
        display: flex;
      }

      .ra-header {
        background: linear-gradient(140deg, #1f6f5c, #2d8c75);
        color: #fff;
        padding: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ra-title {
        font-size: 14px;
        font-weight: 700;
      }

      .ra-sub {
        margin-top: 4px;
        font-size: 12px;
        opacity: 0.95;
      }

      .ra-close {
        border: 0;
        background: rgba(255, 255, 255, 0.18);
        color: #fff;
        border-radius: 10px;
        height: 30px;
        padding: 0 10px;
        cursor: pointer;
      }

      .ra-body {
        flex: 1;
        background: #f8fbfa;
        padding: 12px;
        overflow: auto;
      }

      .ra-bubble {
        font-size: 14px;
        line-height: 1.45;
        border-radius: 13px;
        padding: 10px 12px;
        margin-bottom: 8px;
        max-width: 84%;
      }

      .ra-bubble.bot {
        background: #fff;
        border: 1px solid #dce3e8;
      }

      .ra-bubble.user {
        margin-left: auto;
        background: #e7f4f0;
        border: 1px solid #cde9e2;
      }

      .ra-input-wrap {
        padding: 10px;
        border-top: 1px solid #dce3e8;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
      }

      .ra-input {
        width: 100%;
        height: 40px;
        border: 1px solid #dce3e8;
        border-radius: 10px;
        padding: 0 12px;
        font-family: inherit;
        font-size: 14px;
      }

      .ra-send {
        border: 0;
        width: 68px;
        border-radius: 10px;
        background: #1f6f5c;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      @media (max-width: 640px) {
        .ra-root {
          right: 12px;
          bottom: 12px;
        }

        .ra-panel {
          position: fixed;
          right: 10px;
          left: 10px;
          bottom: 84px;
          width: auto;
          height: calc(100dvh - 100px);
        }
      }
    `;
  }

  function createWidget(config) {
    var host = document.createElement("div");
    host.id = "runacademy-chatbot-root";
    host.style.position = "fixed";
    host.style.right = "0";
    host.style.bottom = "0";

    var shadow = host.attachShadow({ mode: "open" });

    var style = document.createElement("style");
    style.textContent = createStyles();

    var root = document.createElement("div");
    root.className = "ra-root";

    var panel = document.createElement("section");
    panel.className = "ra-panel";

    var header = document.createElement("div");
    header.className = "ra-header";

    var headerText = document.createElement("div");
    headerText.innerHTML =
      '<div class="ra-title">실행학교 상담봇</div><div class="ra-sub">온라인 · 즉시 응답</div>';

    var close = document.createElement("button");
    close.className = "ra-close";
    close.type = "button";
    close.textContent = "닫기";

    header.appendChild(headerText);
    header.appendChild(close);

    var body = document.createElement("div");
    body.className = "ra-body";

    function addMessage(role, text) {
      var el = document.createElement("div");
      el.className = "ra-bubble " + role;
      el.textContent = text;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
    }

    addMessage("bot", "안녕하세요. 실행학교 강의/결제/환불 상담을 도와드려요.");

    var inputWrap = document.createElement("div");
    inputWrap.className = "ra-input-wrap";

    var input = document.createElement("input");
    input.className = "ra-input";
    input.placeholder = "질문을 입력하세요";

    var send = document.createElement("button");
    send.type = "button";
    send.className = "ra-send";
    send.textContent = "전송";

    function onSend() {
      var text = input.value.trim();
      if (!text) return;
      addMessage("user", text);
      input.value = "";

      if (!config || !config.apiBaseUrl) {
        window.setTimeout(function () {
          addMessage("bot", "MVP Scaffold 답변입니다. apiBaseUrl 설정 시 실 API를 호출합니다.");
        }, 250);
        return;
      }

      fetch(config.apiBaseUrl.replace(/\\/$/, "") + "/v1/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      })
        .then(function (res) {
          if (!res.ok) throw new Error("request_failed");
          return res.json();
        })
        .then(function (data) {
          addMessage("bot", data && data.answer ? data.answer : "응답 형식이 올바르지 않습니다.");
        })
        .catch(function () {
          addMessage("bot", "현재 상담 서버 연결이 불안정합니다. 잠시 후 다시 시도해주세요.");
        });
    }

    send.addEventListener("click", onSend);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        onSend();
      }
    });

    inputWrap.appendChild(input);
    inputWrap.appendChild(send);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(inputWrap);

    var fab = document.createElement("button");
    fab.className = "ra-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", "챗봇 열기");
    fab.textContent = "?";

    function openPanel() {
      panel.classList.add("open");
    }

    function closePanel() {
      panel.classList.remove("open");
    }

    fab.addEventListener("click", function () {
      if (panel.classList.contains("open")) {
        closePanel();
      } else {
        openPanel();
      }
    });

    close.addEventListener("click", closePanel);

    root.appendChild(panel);
    root.appendChild(fab);

    shadow.appendChild(style);
    shadow.appendChild(root);

    document.body.appendChild(host);

    if (config && config.autoOpen) {
      openPanel();
    }
  }

  function init(config) {
    if (document.getElementById("runacademy-chatbot-root")) {
      return;
    }

    createWidget(config || {});
  }

  window.RunAcademyChat = {
    init: init
  };
})();
