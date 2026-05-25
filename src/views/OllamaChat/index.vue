<template>
  <div class="ollama-chat">
    <div id="chat-container" class="messages">
      <div v-for="(msg, index) in messages" :key="index" class="message">
        <div :class="[msg.role]">
          <strong>{{ msg.role }}</strong>
          <div v-html="renderMarkdown(msg.content)"></div>
        </div>
      </div>
    </div>

    <footer>
      <textarea type="text" v-model="inputText" @keyup.enter="sendMessage" :disabled="isGenerating" />
    </footer>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";
import { marked } from "marked";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const inputText = ref("");
const isGenerating = ref(false);
const isTyping = ref(false);
const messages = ref([{ role: "system", content: "You are a helpful assistant." }]);
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderMarkdown = (text) => {
  if (!text) return "";
  return marked.parse(text);
};

const sendMessage = async () => {
  if (!inputText.value.trim() || isGenerating.value) return;

  const userMessage = inputText.value.trim();
  inputText.value = "";

  messages.value.push({ role: "user", content: userMessage });
  messages.value.push({ role: "assistant", content: "" });

  const aiMessageIndex = messages.value.length;
  isGenerating.value = true;

  try {
    const ctrl = new AbortController();

    await fetchEventSource("http://localhost:3001/api/chat", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3.5:9b",
        messages: messages.value.slice(0, -1),
      }),
      signal: ctrl.signal,

      onopen(response) {
        if (response.ok && response.headers.get("content-type") === "text/event-stream") {
          console.log("Connection opened and ready for streaming.");
        } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          console.error("Client error:", response.statusText);
          ctrl.abort();
        }
      },

      onmessage(msg) {
        try {
          const payload = JSON.parse(msg.data);

          if (payload.content && payload.content.length) {
            messages.value[aiMessageIndex - 1].content += payload.content;

            console.log(messages.value);
            // nextTick(() => {
            //   scrollToBottom();
            // });
          }

          if (payload.done) {
            isGenerating.value = false;

            nextTick(() => {
              scrollToBottom();
            });
            return;
          }
        } catch (error) {
          console.error(error);
        }
      },

      onclose() {
        isTyping.value = false;
        console.log("Connection closed.");
      },

      onerror(error) {
        isTyping.value = false;
        console.error(error);
        throw error;
      },
    });
  } catch (error) {
    console.error(error);
  }
};

function scrollToBottom() {
  const container = document.getElementById("chat-container");

  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}
</script>

<style scoped lang="scss">
.ollama-chat {
  height: 100%;
  width: 80%;
  margin: 0 auto;
  padding: 20px 10px;

  .messages {
    width: 100%;
    height: calc(100% - 300px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;

    .message {
      width: 100%;
      font-size: 16px;
      margin-bottom: 10px;

      strong {
        font-size: 18px;
        color: #555;
        margin-bottom: 5px;
      }
    }

    .system,
    .assistant {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .user {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      div {
        background-color: #007bff;
        color: white;
        padding: 10px;
        border-radius: 10px;
      }
    }
  }

  footer {
    width: 100%;
    textarea {
      width: 100%;
      height: 80px;
      padding: 10px;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
      resize: none;
    }
  }
}
</style>
