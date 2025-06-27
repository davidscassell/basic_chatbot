from flask import Flask, render_template, request, Response
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import MemorySaver
from typing import Annotated
from typing_extensions import TypedDict
import os
import json

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

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json.get("message", "")
    def generate():
        config = {"configurable": {"thread_id": "1"}}
        for event in graph.stream({"messages": [{"role": "user", "content": user_input}]}, config=config):
            for value in event.values():
                content = value["messages"][-1].content
                # SSE format: data: ...\n\n
                yield f"data: {json.dumps({'content': content})}\n\n"
    return Response(generate(), mimetype="text/event-stream")

if __name__ == "__main__":
    app.run(debug=True)
