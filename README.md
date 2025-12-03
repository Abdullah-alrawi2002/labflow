# Lab Research Management System

A modern lab research management application with AI-powered insights and advanced academic paper search.

## Features

### Core Features
- **Dashboard** - Overview with experiments, calendar, insights, tasks, and papers
- **Stage Tracking** - Brainstorm → Experiment → Write → Publish
- **Experiments** - Log experiments with custom parameters and data tables
- **Calendar** - Schedule experiments with time, location, and notes
- **Tasks (Next Steps)** - Todo list with progress tracking

### Data Import
- **Excel/CSV Upload** - Upload spreadsheets to auto-extract parameters and data
- **Image OCR** - Take a photo of a data sheet and AI will extract the table
- **Full Table Viewer** - Click to view complete imported data in full-screen modal

### AI Features

#### Insights & Suggestions (OpenAI GPT-4)
- Analyzes your experiment data for patterns and trends
- Provides actionable next-step recommendations
- Limited to 3 items each for clean display
- Click to expand full details

#### Advanced Paper Search Pipeline

The paper search implements a Liner-style AI-powered research system:

**Step 1: Query Understanding**
- LLM extracts keywords, concepts, and constraints from your research context
- Generates optimized search queries for academic APIs
- Creates semantic embeddings for similarity search

**Step 2: Multi-Source Retrieval**

Parallel search across 4 academic databases:

| Database | Best For |
|----------|----------|
| **Semantic Scholar** | AI/ML, general science |
| **arXiv** | Physics, math, CS, biology |
| **PubMed** | Biomedical, life sciences |
| **CrossRef** | All disciplines, DOI lookup |

**Step 3: Vector Similarity**
- Computes embeddings for papers using OpenAI
- Stores in in-memory vector database
- Finds conceptually similar papers even with different wording

**Step 4: Ranking & Deduplication**
- Combines results from all sources
- Removes duplicates based on title similarity
- Ranks by relevance score (recency + citations + keyword match + vector similarity)

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python main.py
```

Server runs at http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173

## API Keys

Add to `backend/.env`:

```env
# Required for AI features
OPENAI_API_KEY=sk-your-openai-api-key
# Get at: https://platform.openai.com/api-keys

# Optional - used as fallback for paper recommendations
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
# Get at: https://console.anthropic.com/settings/keys
```

**Note:** Paper search works without API keys using public academic APIs, but AI-powered query understanding and vector similarity require OpenAI.

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite, aiohttp
- **Frontend**: React, Vite, TailwindCSS
- **AI**: OpenAI GPT-4 & Embeddings, Anthropic Claude (fallback)
- **Data Processing**: pandas, openpyxl
- **Paper Search**: Semantic Scholar API, arXiv API, PubMed/NCBI API, CrossRef API

## Project Structure

```
lab-research-system/
├── backend/
│   ├── main.py              # FastAPI app & routes
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── database.py          # DB connection
│   ├── ai_services.py       # Insights & suggestions
│   ├── paper_search.py      # Advanced paper search pipeline
│   ├── file_processors.py   # Excel & Image processing
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Dashboard.jsx
    │   │   ├── NewExperimentModal.jsx  # With upload & table viewer
    │   │   ├── PapersSection.jsx       # Enhanced paper display
    │   │   ├── InsightsSection.jsx     # Expandable insights
    │   │   ├── SuggestionsSection.jsx  # Expandable suggestions
    │   │   └── ...
    │   └── utils/api.js
    ├── package.json
    └── vite.config.js
```

## Paper Search Details

### How It Works

1. **User clicks "Search Papers"**
2. **Query Understanding**: GPT-4 analyzes research context and extracts:
   - Keyword query for APIs
   - Semantic query for embeddings
   - Key concepts and synonyms
   - Search constraints (year range, paper types)

3. **Parallel API Search**: System queries all 4 databases simultaneously
4. **Vector Search**: Finds similar papers using embedding similarity
5. **Combine & Rank**: Results are deduplicated and scored by:
   - Recency (newer papers score higher)
   - Citations (well-cited papers score higher)
   - Keyword matches in title/abstract
   - Vector similarity score
   - Source quality (Nature, Science get bonus)

6. **Display**: Top 3 papers shown with:
   - Title, authors, year
   - Source database badge
   - Citation count
   - Relevance score
   - Click to search across all databases

### Paper Card Features
- Shows source database (Semantic Scholar, arXiv, PubMed, etc.)
- Displays citation count and relevance score
- Lists first 3 authors
- Click to open modal with:
  - Full paper details
  - Links to search all 5 academic databases
  - Direct link to original source (if available)
