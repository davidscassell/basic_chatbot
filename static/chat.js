const chatbox = document.getElementById('chatbox');
const form = document.getElementById('input-area');
const messageInput = document.getElementById('message');
const tabChat = document.getElementById('tab-chat');

function appendMessage(sender, text) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;
    let avatar, content;
    if (sender === 'user') {
        avatar = `<div class="avatar user-avatar">You</div>`;
        content = `<div class="message-content">${text}</div>`;
        row.innerHTML = `${content}${avatar}`;
    } else {
        avatar = `<div class="avatar">🤖</div>`;
        content = `<div class="message-content">${text}</div>`;
        row.innerHTML = `${avatar}${content}`;
    }
    chatbox.appendChild(row);
    chatbox.scrollTop = chatbox.scrollHeight;
}

form.addEventListener('submit', function(e) {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;
    appendMessage('user', message);
    messageInput.value = '';
    streamChat(message);
});

function streamChat(message) {
    const evtSource = new EventSourcePolyfill('/chat', {
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify({ message })
    });
    let botMsg = '';
    appendMessage('bot', '');
    const botDiv = chatbox.lastChild.querySelector('.message-content');
    evtSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        botMsg = data.content;
        botDiv.textContent = botMsg;
        chatbox.scrollTop = chatbox.scrollHeight;
    };
    evtSource.onerror = function() {
        evtSource.close();
    };
}

// Sidebar tab click (future extensibility)
tabChat.addEventListener('click', function() {
    document.querySelectorAll('.sidebar-tab').forEach(tab => tab.classList.remove('active'));
    tabChat.classList.add('active');
    // In the future, switch panes here
});

// Polyfill for POST with SSE (EventSource doesn't support POST natively)
// https://github.com/Azure/fetch-event-source
class EventSourcePolyfill {
    constructor(url, options) {
        this.url = url;
        this.options = options;
        this.onmessage = null;
        this.onerror = null;
        this.controller = new AbortController();
        this.start();
    }
    async start() {
        try {
            const response = await fetch(this.url, {
                method: 'POST',
                headers: this.options.headers,
                body: this.options.payload,
                signal: this.controller.signal
            });
            const reader = response.body.getReader();
            let buffer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += new TextDecoder().decode(value);
                let parts = buffer.split('\n\n');
                buffer = parts.pop();
                for (const part of parts) {
                    if (part.startsWith('data: ')) {
                        const data = part.slice(6);
                        if (this.onmessage) this.onmessage({ data });
                    }
                }
            }
        } catch (err) {
            if (this.onerror) this.onerror(err);
        }
    }
    close() {
        this.controller.abort();
    }
}
