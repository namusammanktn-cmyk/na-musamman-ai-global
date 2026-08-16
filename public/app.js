const chat = document.getElementById("chat");
const input = document.getElementById("message");
const send = document.getElementById("send");
const mic = document.getElementById("mic");
const statusText = document.getElementById("statusText");

let history = [];
let isListening = false;


/* =========================
   CHAT MESSAGE
========================= */

function addMessage(role, text, typing = false) {

  const row = document.createElement("div");

  row.className = `message ${role}`;

  if (role === "assistant") {

    row.innerHTML = `
      <div class="avatar">N</div>
      <div>
        <div class="bubble ${typing ? "typing" : ""}"></div>
        ${typing ? "" : `
          <button class="speak-btn" type="button">
            🔊 Speak
          </button>
        `}
      </div>
    `;

  } else {

    row.innerHTML = `
      <div class="bubble"></div>
    `;

  }

  row.querySelector(".bubble").textContent = text;

  chat.appendChild(row);

  chat.scrollTop = chat.scrollHeight;

  if (role === "assistant" && !typing) {

    const speakButton =
      row.querySelector(".speak-btn");

    if (speakButton) {

      speakButton.addEventListener("click", () => {
        speakText(text);
      });

    }
  }

  return row;
}


/* =========================
   LANGUAGE DETECTION
========================= */

function detectLanguage(text) {

  const lower = text.toLowerCase();

  const hausaWords = [
    "ina",
    "yaya",
    "yaushe",
    "me",
    "menene",
    "miye",
    "waye",
    "wace",
    "wane",
    "don",
    "saboda",
    "kuma",
    "amma",
    "idan",
    "haka",
    "yanzu",
    "gaskiya",
    "ina so",
    "na gode",
    "barka",
    "sannu",
    "za ka",
    "zan",
    "kana",
    "kin",
    "mun",
    "sun"
  ];

  let score = 0;

  for (const word of hausaWords) {

    if (lower.includes(word)) {
      score++;
    }

  }

  return score > 0 ? "ha" : "en";
}


/* =========================
   VOICE OUTPUT
========================= */

function speakText(text) {

  if (!("speechSynthesis" in window)) {

    alert(
      "Voice output is not supported by this browser."
    );

    return;
  }

  window.speechSynthesis.cancel();

  const language = detectLanguage(text);

  const utterance =
    new SpeechSynthesisUtterance(text);

  /*
   Hausa voices are not available
   on every Android browser.

   We try Hausa first, then English.
  */

  if (language === "ha") {

    utterance.lang = "ha-NG";

  } else {

    utterance.lang = "en-US";

  }

  utterance.rate = 0.95;
  utterance.pitch = 1;

  window.speechSynthesis.speak(
    utterance
  );
}


/* =========================
   API STATUS
========================= */

async function checkStatus() {

  try {

    const response =
      await fetch("/api/status");

    const data =
      await response.json();

    if (data.configured) {

      statusText.textContent =
        "AI READY";

    } else {

      statusText.textContent =
        "API KEY NEEDED";

    }

  } catch (error) {

    statusText.textContent =
      "OFFLINE";

  }
}

checkStatus();


/* =========================
   SEND MESSAGE
========================= */

async function ask() {

  const message =
    input.value.trim();

  if (!message) return;

  input.value = "";

  input.style.height =
    "auto";

  addMessage(
    "user",
    message
  );

  const typing =
    addMessage(
      "assistant",
      "Thinking...",
      true
    );

  send.disabled = true;

  try {

    const response =
      await fetch("/api/chat", {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          message,

          history

        })

      });


    const data =
      await response.json();


    typing.remove();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Something went wrong."
      );

    }


    addMessage(
      "assistant",
      data.answer
    );


    history.push(

      {
        role: "user",
        content: message
      },

      {
        role: "assistant",
        content: data.answer
      }

    );


  } catch (error) {

    typing.remove();

    addMessage(
      "assistant",
      "⚠️ " + error.message
    );

  } finally {

    send.disabled = false;

    input.focus();

  }
}


/* =========================
   SEND BUTTON
========================= */

send.addEventListener(
  "click",
  ask
);


/* =========================
   ENTER KEY
========================= */

input.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      ask();

    }

  }
);


/* =========================
   AUTO TEXTAREA HEIGHT
========================= */

input.addEventListener(
  "input",
  () => {

    input.style.height =
      "auto";

    input.style.height =
      Math.min(
        input.scrollHeight,
        140
      ) + "px";

  }
);


/* =========================
   QUICK ACTIONS
========================= */

document
  .querySelectorAll("[data-prompt]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        input.value =
          button.dataset.prompt;

        input.focus();

      }
    );

  });


/* =========================
   VOICE INPUT
========================= */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


if (SpeechRecognition) {

  const recognition =
    new SpeechRecognition();

  recognition.continuous = false;

  recognition.interimResults = false;

  /*
   Android browsers may have
   different Hausa recognition support.
   We start with Hausa-English recognition.
  */

  recognition.lang = "ha-NG";


  recognition.onstart = () => {

    isListening = true;

    mic.classList.add(
      "listening"
    );

    mic.textContent =
      "⏹️";

    statusText.textContent =
      "LISTENING...";

  };


  recognition.onresult =
    (event) => {

      const transcript =
        event.results[0][0].transcript;

      input.value =
        transcript;

      input.dispatchEvent(
        new Event("input")
      );

      statusText.textContent =
        "AI READY";

      /*
       Automatically send the
       recognized voice message.
      */

      setTimeout(() => {

        ask();

      }, 300);

    };


  recognition.onerror =
    (event) => {

      console.error(
        "Voice recognition error:",
        event.error
      );

      statusText.textContent =
        "AI READY";

      if (
        event.error ===
        "not-allowed"
      ) {

        alert(
          "Please allow microphone permission for this website."
        );

      }

    };


  recognition.onend = () => {

    isListening = false;

    mic.classList.remove(
      "listening"
    );

    mic.textContent =
      "🎙️";

    statusText.textContent =
      "AI READY";

  };


  mic.addEventListener(
    "click",
    () => {

      if (isListening) {

        recognition.stop();

        return;

      }

      try {

        recognition.start();

      } catch (error) {

        console.error(error);

      }

    }
  );


} else {

  mic.disabled = true;

  mic.title =
    "Voice input is not supported by this browser";

}


/* =========================
   INITIAL FOCUS
========================= */

input.focus();
