from flask import Flask, render_template, request, Response, session
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import MemorySaver
from typing import Annotated
from typing_extensions import TypedDict
import os
import json
from uuid import uuid4

app = Flask(__name__)

# Set your OpenAI API key here or via environment variable
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY not set")

# LangGraph chatbot setup


class State(TypedDict):
    messages: Annotated[list, add_messages]

graph_builder = StateGraph(State)
llm = init_chat_model("openai:gpt-4.1")
memory = MemorySaver()

def chatbot(state: State):
    return {"messages": [llm.invoke(state["messages"])]}

graph_builder.add_node("chatbot", chatbot)
graph_builder.add_edge(START, "chatbot")
graph_builder.add_edge("chatbot", END)
graph = graph_builder.compile(checkpointer=memory)

app.secret_key = os.getenv("FLASK_SECRET_KEY", str(uuid4()))

@app.route("/")
def index():
    return render_template("chat.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json.get("message", "")
    # Assign a unique thread_id per user session
    if "thread_id" not in session:
        session["thread_id"] = str(uuid4())
    thread_id = session["thread_id"]
    def generate():
        config = {"configurable": {"thread_id": thread_id}}
        for event in graph.stream({"messages": [{"role": "user", "content": user_input}]}, config=config):
            for value in event.values():
                content = value["messages"][-1].content
                yield f"data: {json.dumps({'reply': content})}\n\n"
    return Response(generate(), mimetype="text/event-stream")

if __name__ == "__main__":
    app.run(debug=True)
