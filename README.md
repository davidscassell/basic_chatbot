# Flask React LangGraph Example

This project demonstrates a minimal Flask backend with a React frontend that communicates with a simple LangGraph-like chat agent. The agent exposes a small set of tools (currently only a calculator). The frontend is served directly from Flask and uses React from a CDN.

## Running

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Start the server:

```bash
python app.py
```

3. Open `http://localhost:5000` in your browser to chat with the agent. Prefix messages with `tool:calc:` to evaluate a Python expression.

This code is intentionally minimal and uses placeholder logic. You can extend the agent and tools by modifying `app.py`.
