from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# --- Simple placeholder tools ---
def calculate(expression: str) -> str:
    try:
        return str(eval(expression, {"__builtins__": {}}))
    except Exception as e:
        return f"error: {e}"

TOOLS = {
    "calc": calculate,
}

# --- Placeholder LangGraph chat agent ---

def run_agent(messages):
    """Very small example of using tools based on user input."""
    if not messages:
        return "Hello!"
    last = messages[-1].get("content", "")
    if last.startswith("tool:"):
        try:
            _, tool_name, arg = last.split(":", 2)
            tool = TOOLS.get(tool_name)
            if tool:
                return tool(arg)
        except ValueError:
            pass
    return f"Echo: {last}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json(force=True)
    messages = data.get('messages', [])
    reply = run_agent(messages)
    return jsonify({'reply': reply})

if __name__ == '__main__':
    app.run(debug=True)
