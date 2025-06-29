const chatbox = document.getElementById('chatbox');
const form = document.getElementById('input-area');
const messageInput = document.getElementById('message');
const tabChat = document.getElementById('tab-chat');

function appendMessage(sender, text) {
    const row = document.createElement('div');
    row.className = `chat-message ${sender}`;
    let content;
    if (sender === 'user') {
        content = `<div>${text}</div>`;
        row.innerHTML = content;
    } else {
        // Use marked for markdown rendering
        content = `<div>${marked.parse(text)}</div>`;
        row.innerHTML = content;
    }
    chatbox.appendChild(row);
    chatbox.scrollTop = chatbox.scrollHeight;
    return row;
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
    let botDiv = appendMessage('bot', '');
    let fullReply = '';
    const botContentDiv = botDiv;
    const evtSource = new EventSourcePolyfill('/chat', {
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify({ message })
    });
    evtSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        fullReply += data.reply;
        botContentDiv.innerHTML = marked.parse(fullReply);
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
