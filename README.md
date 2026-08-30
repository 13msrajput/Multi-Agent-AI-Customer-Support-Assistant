<div align="center">

# TechMart AI Support

**Multi-Agent AI Customer Support Assistant powered by RAG and LLMs**

A FastAPI + Next.js customer support platform that routes customer messages to specialized AI agents, grounds every answer in a FAISS-indexed knowledge base, and tracks the full conversation lifecycle — sessions, sentiment, tickets, and escalation.

**[Live App →](https://techmart-ai-support.vercel.app)**

</div>

---

## Overview

TechMart AI Support is a customer support system built for a fictional electronics retailer, TechMart Electronics, to:

1. **Route customer messages to specialized agents** — Billing, Technical, Product, Complaint, and FAQ — each with its own system prompt, domain rules, and preferred knowledge-base sources, rather than a single monolithic chatbot prompt.
2. **Ground every answer in a knowledge base** using a local FAISS vector index built over eight `.txt` documents (FAQ, pricing, refund policy, shipping policy, warranty, user manual, installation guide, and product catalog), with source citations and automatic support-ticket escalation for complaints or frustrated customers.

Both modules, plus session history, analytics, and admin tools, are served through a FastAPI backend and a Next.js frontend. If no LLM API key is configured, the system falls back to static templated responses so the app remains functional in a "demo mode."

---

## Data Pipeline (Knowledge Base → RAG Index)

The knowledge base (eight `.txt` documents) is processed into a searchable index as follows:

| Step | Action |
|---|---|
| 1 | Loaded knowledge-base `.txt` files via `document_processor.load_knowledge_base` |
| 2 | Split each document into chunks (`CHUNK_SIZE=600` chars, `CHUNK_OVERLAP=80` chars), breaking on sentence boundaries where possible |
| 3 | Tagged each chunk with its source document and a `chunk_id` |
| 4 | Embedded chunks with `sentence-transformers/all-MiniLM-L6-v2`, batch-encoded with `normalize_embeddings=True` |
| 5 | Indexed the normalized embeddings in `faiss.IndexFlatL2` for exact nearest-neighbor search |
| 6 | Persisted the index (`faiss.index`) and chunk metadata (`chunks.pkl`) to `backend/vectorstore/faiss_index/` |

**Result: a reloadable FAISS index queried at chat time to ground every agent's response in cited knowledge-base text.**

---

## Multi-Agent Routing & RAG Response Generation

### Two-Stage Intent & Sentiment Detection

Every incoming message is classified before being routed to one of five domain agents (Billing, Technical, Product, Complaint, FAQ), each a subclass of `BaseAgent` sharing a common pipeline: retrieve context → build system prompt → detect reply language → call the LLM.

| Stage | Approach |
|---|---|
| 1. Keyword detection | Scores the message against per-intent and per-sentiment keyword lists (including multilingual refund terms); used directly if confidence ≥ 0.7 |
| 2. LLM refinement | Only triggered when keyword confidence is low; requests structured JSON intent/sentiment output, with the more severe of the two sentiments winning |
| 3. Frustration override | If sentiment is `frustrated`, the Complaint agent's empathy line is always prepended to the primary agent's response |

### Example Routing

| Customer Message | Detected Intent | Sentiment | Routed Agent |
|---|---|---|---|
| "How much does the Care Pro plan cost per month?" | `billing` | neutral | Billing Support |
| "My TabPro 11 won't connect to WiFi" | `technical` | negative | Technical Support |
| "This is ridiculous, I've asked twice and still no refund!" | `refund` | frustrated | Billing Support + empathy line from Customer Relations |
| "What are your business hours?" | `faq` | neutral | Support Assistant |

**The keyword-first, LLM-refined approach was chosen over an LLM-only classifier** — it keeps routing fast and cheap for the common case, only falling back to an LLM call for ambiguous messages, while multilingual keyword lists and Unicode-based language detection let every agent reply in the language the customer is currently using.

---

## Repository Structure

```
Multi-Agent-AI-Customer-Support-Assistant-using-RAG-and-LLMs/
├── backend/
│   ├── main.py                     # FastAPI app, lifespan startup, CORS, static frontend mount
│   ├── config.py                   # Settings — env-driven, LLM provider selection
│   ├── agents/
│   │   ├── base.py                 # BaseAgent — shared prompt building, language detection, RAG call
│   │   ├── agents.py               # BillingAgent, TechnicalAgent, ProductAgent, ComplaintAgent, FAQAgent
│   │   ├── router.py               # AgentRouter — intent/sentiment detection, agent dispatch
│   │   └── llm_client.py           # LLMClient — Groq/OpenAI/Ollama wrapper + fallback templates
│   ├── rag/
│   │   ├── document_processor.py   # .txt loading, chunking
│   │   ├── embeddings.py           # EmbeddingManager — sentence-transformers wrapper
│   │   └── retriever.py            # FAISSRetriever — index build/reload/search
│   ├── vectorstore/faiss_index/    # Persisted FAISS index (faiss.index, chunks.pkl)
│   ├── api/
│   │   ├── routes.py               # All HTTP endpoints (auth, chat, sessions, analytics, admin, tickets)
│   │   ├── auth.py                 # JWT + bcrypt auth dependencies
│   │   ├── email_service.py        # SendGrid/SMTP notifications
│   │   └── whatsapp_service.py     # Twilio WhatsApp notifications
│   ├── database/db.py              # SQLAlchemy models + session factory
│   └── models/schemas.py           # Pydantic request/response models
├── frontend/
│   ├── pages/                      # index.js, login.js, register.js, chat.js
│   ├── services/api.js             # Central fetch wrapper, JWT storage
│   └── package.json
├── knowledge_base/                 # faq.txt, pricing.txt, products.txt, refund_policy.txt, etc.
├── setup.py                        # One-time setup: .env check, DB tables, admin user, FAISS build
├── requirements.txt
├── render.yaml                     # Render.com deployment config
└── README.md
```

---

## Running Locally

```bash
git clone https://github.com/Mohit-1307/Multi-Agent-AI-Customer-Support-Assistant-using-RAG-and-LLMs.git
cd Multi-Agent-AI-Customer-Support-Assistant-using-RAG-and-LLMs
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create a .env file with at least SECRET_KEY, and optionally GROQ_API_KEY / LLM_PROVIDER
python setup.py                        # creates DB tables, admin user, and builds the FAISS index

uvicorn backend.main:app --reload      # backend at http://localhost:8000

cd frontend && npm install && npm run dev   # frontend at http://localhost:3000
```

The app runs without any LLM key configured, in a fallback "demo mode" using static templated responses. `SECRET_KEY` is required — the backend raises `ValueError` at import time if it isn't set. Verify the backend is healthy with `curl http://localhost:8000/api/health`.

---

## Tech Stack

- **Backend:** FastAPI, Uvicorn, SQLAlchemy (SQLite by default, PostgreSQL via `DATABASE_URL`)
- **Frontend:** Next.js 14 (Pages Router), React, Tailwind CSS
- **RAG:** FAISS (`IndexFlatL2`), sentence-transformers (`all-MiniLM-L6-v2`)
- **LLM Providers:** Groq, OpenAI, or local Ollama (OpenAI-compatible client)
- **Auth:** JWT (`python-jose`), bcrypt password hashing
- **Notifications:** SendGrid (primary) / SMTP (fallback) for email, Twilio for WhatsApp
- **Deployment:** Render (backend), Vercel (frontend)

---

# Author

**MOHIT SINGH RAJPUT — AI/ML Engineer**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/mohitsingh1307)
[![GitHub](https://img.shields.io/badge/GitHub-121011?style=flat-square&logo=github&logoColor=white)](https://github.com/Mohit-1307)
[![Kaggle](https://img.shields.io/badge/Kaggle-20BEFF?style=flat-square&logo=kaggle&logoColor=white)](https://www.kaggle.com/mohitsinghrajput1307)
[![LeetCode](https://img.shields.io/badge/LeetCode-181717?style=flat-square&logo=leetcode&logoColor=FFA116)](https://leetcode.com/u/MOHIT_SINGH_RAJPUT/)
[![Email](https://img.shields.io/badge/Email-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:mohitsinghrajput1307@gmail.com)

---

## Acknowledgements

* FastAPI
* Next.js
* FAISS (Meta AI)
* Sentence-Transformers
* Groq / OpenAI
* SQLAlchemy
* Twilio
* SendGrid

---

<div align="center">

*If this project was useful, a ⭐ on the repository is appreciated.*

</div>