const personas = [
  {
    id: "lumi",
    name: "루미",
    role: "스토리텔러",
    trait: "따뜻함 · 통찰",
    color: "#f3b562",
    description: "아이디어를 부드럽게 확장하며 감성적인 설명을 더합니다.",
    replies: [
      "흥미로운 주제네요. 그 장면을 조금 더 선명하게 그려볼까요?",
      "지금 떠오른 키워드를 함께 모아보면 구조가 더 분명해질 거예요.",
      "좋아요. 고객이 느끼는 감정을 중심으로 이야기를 설계해보죠.",
    ],
  },
  {
    id: "noa",
    name: "노아",
    role: "프로덕트 코치",
    trait: "직관 · 실행",
    color: "#9ad0ec",
    description: "실행 가능한 다음 단계와 실험 설계를 제안합니다.",
    replies: [
      "핵심 가설을 한 줄로 정의해볼까요?",
      "1주일 안에 검증할 수 있는 실험을 골라봅시다.",
      "좋습니다. 지금 당장 필요한 KPI를 정리해볼게요.",
    ],
  },
  {
    id: "arin",
    name: "아린",
    role: "브랜드 디자이너",
    trait: "감각 · 선명함",
    color: "#f7d6bf",
    description: "브랜드 톤과 고객 경험의 디테일을 다룹니다.",
    replies: [
      "브랜드가 전달해야 할 첫 인상을 정의해볼까요?",
      "고객 여정의 첫 터치포인트를 강화해봅시다.",
      "사용자의 마음에 남을 한 문장을 만들어보죠.",
    ],
  },
  {
    id: "jin",
    name: "진",
    role: "데이터 전략가",
    trait: "분석 · 명료",
    color: "#c3aed6",
    description: "지표 중심으로 전략을 정리하고 리스크를 줄입니다.",
    replies: [
      "데이터로 검증 가능한 지점이 어디인지 살펴보죠.",
      "우선순위를 나누기 위해 영향도와 난이도를 비교해봅시다.",
      "관측 가능한 신호를 먼저 정의하면 방향이 선명해집니다.",
    ],
  },
];

const personaList = document.getElementById("personaList");
const personaName = document.getElementById("personaName");
const personaRole = document.getElementById("personaRole");
const personaTrait = document.getElementById("personaTrait");
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const chips = document.querySelectorAll(".chip");
const hint = document.querySelector(".hint");

let activePersona = personas[0];

const createPersonaItem = (persona) => {
  const li = document.createElement("li");
  li.className = "persona-item";
  li.dataset.id = persona.id;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.style.background = persona.color;
  avatar.textContent = persona.name.slice(0, 1);

  const meta = document.createElement("div");
  meta.className = "persona-meta";

  const name = document.createElement("strong");
  name.textContent = persona.name;

  const role = document.createElement("span");
  role.textContent = persona.role;

  const desc = document.createElement("span");
  desc.textContent = persona.description;

  meta.append(name, role, desc);
  li.append(avatar, meta);

  li.addEventListener("click", () => switchPersona(persona.id));

  return li;
};

const renderPersonaList = () => {
  personaList.innerHTML = "";
  personas.forEach((persona) => {
    const item = createPersonaItem(persona);
    if (persona.id === activePersona.id) {
      item.classList.add("active");
    }
    personaList.appendChild(item);
  });
};

const switchPersona = (id) => {
  const next = personas.find((persona) => persona.id === id);
  if (!next) return;
  activePersona = next;
  personaName.textContent = next.name;
  personaRole.textContent = next.role;
  personaTrait.textContent = next.trait;
  renderPersonaList();
  addBotMessage(`${next.name} 모드로 전환했습니다. ${next.replies[0]}`);
};

const addBotMessage = (text) => {
  const wrapper = document.createElement("div");
  wrapper.className = "message bot";
  wrapper.innerHTML = `<div class="bubble"><p>${text}</p></div>`;
  chatBody.appendChild(wrapper);
  chatBody.scrollTop = chatBody.scrollHeight;
};

const addUserMessage = (text) => {
  const wrapper = document.createElement("div");
  wrapper.className = "message user";
  wrapper.innerHTML = `<div class="bubble"><p>${text}</p></div>`;
  chatBody.appendChild(wrapper);
  chatBody.scrollTop = chatBody.scrollHeight;
};

const pickReply = () => {
  const pool = activePersona.replies;
  return pool[Math.floor(Math.random() * pool.length)];
};

const handleSend = () => {
  const text = chatInput.value.trim();
  if (!text) return;
  addUserMessage(text);
  chatInput.value = "";
  updateHint();
  setTimeout(() => {
    addBotMessage(pickReply());
  }, 400);
};

const updateHint = () => {
  if (chatInput.value.length > 0) {
    hint.parentElement.classList.add("has-text");
  } else {
    hint.parentElement.classList.remove("has-text");
  }
};

chatInput.addEventListener("input", updateHint);
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
});

sendBtn.addEventListener("click", handleSend);

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    addBotMessage(`현재 대화 톤을 "${chip.textContent}"로 맞췄어요.`);
  });
});

renderPersonaList();
updateHint();
