"""
Advanced Paper Search System - Liner AI Style
Multi-Model Architecture with Semantic Matching & Source Verification

Architecture:
1. Multi-Model Query Understanding (OpenAI GPT + embeddings)
2. Multi-Source Retrieval (Semantic Scholar, arXiv, PubMed, CrossRef)
3. Semantic Similarity Matching (embeddings + cosine similarity)
4. Relevance Scoring (topic overlap, methodology, citations, recency)
5. Source Verification (validate paper existence, check citations)
6. Final Ranking with Match Percentage
"""

import os
import json
import re
import asyncio
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from dotenv import load_dotenv
import aiohttp

load_dotenv()

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Initialize OpenAI client
openai_client = None
try:
    if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-your"):
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✓ OpenAI client initialized for paper search")
except Exception as e:
    print(f"OpenAI init error: {e}")

# Vector store for paper embeddings
paper_embedding_cache: Dict[str, List[float]] = {}
paper_data_cache: Dict[str, Dict] = {}


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class PaperCandidate:
    """Represents a paper candidate with all metadata."""
    title: str
    abstract: str
    authors: List[str]
    year: Optional[int]
    url: str
    doi: Optional[str]
    citations: Optional[int]
    source: str
    source_icon: str
    
    # Computed scores
    semantic_score: float = 0.0
    topic_score: float = 0.0
    methodology_score: float = 0.0
    citation_score: float = 0.0
    recency_score: float = 0.0
    verification_score: float = 0.0
    
    # Final match percentage
    match_percentage: float = 0.0
    match_reasons: List[str] = None
    
    # Verification status
    verified: bool = False
    verification_source: str = ""
    
    def __post_init__(self):
        if self.match_reasons is None:
            self.match_reasons = []


# =============================================================================
# STEP 1: MULTI-MODEL QUERY UNDERSTANDING
# =============================================================================

async def understand_research_context(
    description: str,
    field: str,
    experiments: List[Dict]
) -> Dict[str, Any]:
    """
    Use LLM to deeply understand the research context.
    Extracts: keywords, concepts, methodology, expected paper types, synonyms.
    """
    if not openai_client:
        return _fallback_query_understanding(description, field, experiments)
    
    # Build rich context from experiments
    experiment_context = _build_experiment_context(experiments)
    
    prompt = f"""You are an academic research assistant. Analyze this research context and extract detailed search parameters.

## Research Context
Field: {field or 'General Science'}
Description: {description or 'Laboratory research project'}

## Experiment Details
{experiment_context}

## Task
Extract comprehensive search parameters for finding related academic papers:

1. **primary_query**: Main search query (5-10 words)
2. **semantic_query**: Natural language description for embedding search
3. **keywords**: List of 8-10 specific technical keywords
4. **concepts**: List of 5-7 broader scientific concepts
5. **methodology_terms**: Research methods likely used (e.g., "machine learning", "spectroscopy", "RCT")
6. **synonyms**: Alternative terms for key concepts (helps find papers using different terminology)
7. **paper_types**: Expected paper types ["research", "review", "meta-analysis", "case-study"]
8. **year_preference**: Ideal publication year range
9. **expected_fields**: Related scientific fields

Return as JSON:
{{
    "primary_query": "optimized academic search query",
    "semantic_query": "detailed natural language description of the research",
    "keywords": ["keyword1", "keyword2", ...],
    "concepts": ["concept1", "concept2", ...],
    "methodology_terms": ["method1", "method2", ...],
    "synonyms": {{"term1": ["syn1", "syn2"], "term2": ["syn3"]}},
    "paper_types": ["research", "review"],
    "year_preference": {{"min": 2019, "max": 2024}},
    "expected_fields": ["field1", "field2"]
}}

Return ONLY valid JSON."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert academic research assistant. Extract precise search parameters."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=800
        )
        
        content = response.choices[0].message.content.strip()
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            result = json.loads(json_match.group())
            # Generate embedding for semantic query
            result["query_embedding"] = get_embedding(result.get("semantic_query", description))
            return result
    except Exception as e:
        print(f"Query understanding error: {e}")
    
    return _fallback_query_understanding(description, field, experiments)


def _build_experiment_context(experiments: List[Dict]) -> str:
    """Build detailed context from experiments."""
    if not experiments:
        return "No experiments recorded yet."
    
    lines = []
    all_params = set()
    all_methods = []
    
    for exp in experiments:
        lines.append(f"- Experiment: {exp.get('name', 'Unnamed')}")
        params = exp.get('parameters', [])
        for p in params:
            if p.get('name'):
                all_params.add(f"{p['name']} ({p.get('unit', 'no unit')})")
        
        data = exp.get('data', [])
        if data:
            lines.append(f"  Data points: {len(data)}")
    
    if all_params:
        lines.append(f"\nParameters studied: {', '.join(list(all_params)[:15])}")
    
    return '\n'.join(lines)


def _fallback_query_understanding(description: str, field: str, experiments: List[Dict]) -> Dict:
    """Fallback when LLM is unavailable."""
    keywords = []
    if field:
        keywords.extend(field.lower().split())
    if description:
        # Extract potential keywords (simple approach)
        words = re.findall(r'\b[a-zA-Z]{4,}\b', description.lower())
        keywords.extend(words[:10])
    
    return {
        "primary_query": f"{field} {description}"[:100],
        "semantic_query": description,
        "keywords": list(set(keywords))[:10],
        "concepts": [field] if field else [],
        "methodology_terms": [],
        "synonyms": {},
        "paper_types": ["research"],
        "year_preference": {"min": 2019, "max": 2024},
        "expected_fields": [field] if field else [],
        "query_embedding": get_embedding(description) if description else None
    }


# =============================================================================
# STEP 2: MULTI-SOURCE RETRIEVAL
# =============================================================================

async def retrieve_from_all_sources(
    query_info: Dict,
    limit_per_source: int = 15
) -> List[PaperCandidate]:
    """
    Retrieve papers from multiple academic sources in parallel.
    Uses both primary query and expanded synonyms.
    """
    primary_query = query_info.get("primary_query", "")
    keywords = query_info.get("keywords", [])
    
    # Build expanded queries using synonyms
    expanded_queries = [primary_query]
    synonyms = query_info.get("synonyms", {})
    for term, syns in synonyms.items():
        for syn in syns[:2]:  # Limit synonym expansion
            expanded_queries.append(f"{primary_query.replace(term, syn)}")
    
    # Run all searches in parallel
    all_tasks = []
    
    # Primary query searches
    all_tasks.append(search_semantic_scholar(primary_query, limit_per_source))
    all_tasks.append(search_arxiv(primary_query, limit_per_source))
    all_tasks.append(search_pubmed(primary_query, limit_per_source))
    all_tasks.append(search_crossref(primary_query, limit_per_source))
    
    # Additional searches with keyword combinations
    if len(keywords) >= 3:
        keyword_query = " ".join(keywords[:5])
        all_tasks.append(search_semantic_scholar(keyword_query, 5))
        all_tasks.append(search_arxiv(keyword_query, 5))
    
    # Execute all searches
    results = await asyncio.gather(*all_tasks, return_exceptions=True)
    
    # Collect all papers
    all_papers = []
    for result in results:
        if isinstance(result, list):
            all_papers.extend(result)
    
    print(f"  Retrieved {len(all_papers)} total candidates from all sources")
    return all_papers


async def search_semantic_scholar(query: str, limit: int = 15) -> List[PaperCandidate]:
    """Search Semantic Scholar API."""
    papers = []
    try:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": query,
            "limit": limit,
            "fields": "title,abstract,year,authors,url,citationCount,fieldsOfStudy,publicationTypes,externalIds"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=15) as response:
                if response.status == 200:
                    data = await response.json()
                    for paper in data.get("data", []):
                        # Extract DOI if available
                        doi = None
                        external_ids = paper.get("externalIds", {})
                        if external_ids:
                            doi = external_ids.get("DOI")
                        
                        papers.append(PaperCandidate(
                            title=paper.get("title", ""),
                            abstract=paper.get("abstract", "") or "",
                            year=paper.get("year"),
                            authors=[a.get("name", "") for a in paper.get("authors", [])[:5]],
                            url=paper.get("url", ""),
                            doi=doi,
                            citations=paper.get("citationCount", 0),
                            source="Semantic Scholar",
                            source_icon="🔬"
                        ))
    except Exception as e:
        print(f"Semantic Scholar error: {e}")
    return papers


async def search_arxiv(query: str, limit: int = 15) -> List[PaperCandidate]:
    """Search arXiv API."""
    papers = []
    try:
        search_query = "+AND+".join(query.split()[:6])
        url = f"http://export.arxiv.org/api/query?search_query=all:{search_query}&start=0&max_results={limit}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=15) as response:
                if response.status == 200:
                    text = await response.text()
                    entries = re.findall(r'<entry>(.*?)</entry>', text, re.DOTALL)
                    
                    for entry in entries:
                        title_match = re.search(r'<title>(.*?)</title>', entry, re.DOTALL)
                        abstract_match = re.search(r'<summary>(.*?)</summary>', entry, re.DOTALL)
                        link_match = re.search(r'<id>(.*?)</id>', entry)
                        published_match = re.search(r'<published>(.*?)</published>', entry)
                        authors = re.findall(r'<name>(.*?)</name>', entry)
                        doi_match = re.search(r'doi.org/(.*?)[<"\s]', entry)
                        
                        if title_match:
                            year = None
                            if published_match:
                                try:
                                    year = int(published_match.group(1)[:4])
                                except:
                                    pass
                            
                            papers.append(PaperCandidate(
                                title=title_match.group(1).strip().replace('\n', ' '),
                                abstract=abstract_match.group(1).strip().replace('\n', ' ')[:1000] if abstract_match else "",
                                year=year,
                                authors=authors[:5],
                                url=link_match.group(1) if link_match else "",
                                doi=doi_match.group(1) if doi_match else None,
                                citations=None,
                                source="arXiv",
                                source_icon="📄"
                            ))
    except Exception as e:
        print(f"arXiv error: {e}")
    return papers


async def search_pubmed(query: str, limit: int = 15) -> List[PaperCandidate]:
    """Search PubMed/NCBI API."""
    papers = []
    try:
        # Step 1: Search for IDs
        search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        search_params = {
            "db": "pubmed",
            "term": query,
            "retmax": limit,
            "retmode": "json"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(search_url, params=search_params, timeout=15) as response:
                if response.status == 200:
                    data = await response.json()
                    ids = data.get("esearchresult", {}).get("idlist", [])
                    
                    if ids:
                        # Step 2: Fetch details
                        fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
                        fetch_params = {
                            "db": "pubmed",
                            "id": ",".join(ids),
                            "retmode": "json"
                        }
                        
                        async with session.get(fetch_url, params=fetch_params, timeout=15) as detail_response:
                            if detail_response.status == 200:
                                detail_data = await detail_response.json()
                                results = detail_data.get("result", {})
                                
                                for pmid in ids:
                                    if pmid in results and isinstance(results[pmid], dict):
                                        paper = results[pmid]
                                        authors = paper.get("authors", [])
                                        author_names = [a.get("name", "") for a in authors[:5]] if isinstance(authors, list) else []
                                        
                                        year = None
                                        pubdate = paper.get("pubdate", "")
                                        if pubdate:
                                            try:
                                                year = int(pubdate[:4])
                                            except:
                                                pass
                                        
                                        # Get DOI from article ids
                                        doi = None
                                        article_ids = paper.get("articleids", [])
                                        for aid in article_ids:
                                            if aid.get("idtype") == "doi":
                                                doi = aid.get("value")
                                                break
                                        
                                        papers.append(PaperCandidate(
                                            title=paper.get("title", ""),
                                            abstract="",  # Summary doesn't include abstract
                                            year=year,
                                            authors=author_names,
                                            url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                                            doi=doi,
                                            citations=None,
                                            source="PubMed",
                                            source_icon="🧬"
                                        ))
    except Exception as e:
        print(f"PubMed error: {e}")
    return papers


async def search_crossref(query: str, limit: int = 15) -> List[PaperCandidate]:
    """Search CrossRef API."""
    papers = []
    try:
        url = "https://api.crossref.org/works"
        params = {
            "query": query,
            "rows": limit,
            "select": "title,abstract,author,published-print,published-online,URL,is-referenced-by-count,DOI,type"
        }
        headers = {
            "User-Agent": "LabResearchSystem/1.0 (mailto:research@example.edu)"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers, timeout=20) as response:
                if response.status == 200:
                    data = await response.json()
                    items = data.get("message", {}).get("items", [])
                    
                    for item in items:
                        title = item.get("title", [""])[0] if item.get("title") else ""
                        abstract = item.get("abstract", "")
                        if abstract:
                            abstract = re.sub(r'<[^>]+>', '', abstract)[:1000]
                        
                        authors = []
                        for author in item.get("author", [])[:5]:
                            name = f"{author.get('given', '')} {author.get('family', '')}".strip()
                            if name:
                                authors.append(name)
                        
                        year = None
                        for date_field in ["published-print", "published-online"]:
                            pub_date = item.get(date_field, {}).get("date-parts", [[]])
                            if pub_date and pub_date[0]:
                                year = pub_date[0][0]
                                break
                        
                        papers.append(PaperCandidate(
                            title=title,
                            abstract=abstract,
                            year=year,
                            authors=authors,
                            url=item.get("URL", ""),
                            doi=item.get("DOI"),
                            citations=item.get("is-referenced-by-count", 0),
                            source="CrossRef",
                            source_icon="📚"
                        ))
    except Exception as e:
        print(f"CrossRef error: {e}")
    return papers


# =============================================================================
# STEP 3: SEMANTIC SIMILARITY MATCHING
# =============================================================================

def get_embedding(text: str) -> Optional[List[float]]:
    """Get embedding vector using OpenAI."""
    if not openai_client or not text:
        return None
    
    # Check cache
    cache_key = hashlib.md5(text[:500].encode()).hexdigest()
    if cache_key in paper_embedding_cache:
        return paper_embedding_cache[cache_key]
    
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:8000]
        )
        embedding = response.data[0].embedding
        paper_embedding_cache[cache_key] = embedding
        return embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return None


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = sum(a * a for a in vec1) ** 0.5
    norm2 = sum(b * b for b in vec2) ** 0.5
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2)


def compute_semantic_scores(
    papers: List[PaperCandidate],
    query_embedding: Optional[List[float]]
) -> List[PaperCandidate]:
    """Compute semantic similarity scores for all papers."""
    if not query_embedding:
        return papers
    
    for paper in papers:
        # Combine title and abstract for embedding
        paper_text = f"{paper.title} {paper.abstract}"
        paper_embedding = get_embedding(paper_text)
        
        if paper_embedding:
            paper.semantic_score = cosine_similarity(query_embedding, paper_embedding)
    
    return papers


# =============================================================================
# STEP 4: MULTI-FACTOR RELEVANCE SCORING
# =============================================================================

def compute_relevance_scores(
    papers: List[PaperCandidate],
    query_info: Dict
) -> List[PaperCandidate]:
    """
    Compute multi-factor relevance scores:
    - Topic overlap (keyword matching)
    - Methodology similarity
    - Citation impact
    - Recency
    """
    current_year = datetime.now().year
    keywords = [k.lower() for k in query_info.get("keywords", [])]
    concepts = [c.lower() for c in query_info.get("concepts", [])]
    methodology_terms = [m.lower() for m in query_info.get("methodology_terms", [])]
    year_pref = query_info.get("year_preference", {"min": 2019, "max": current_year})
    
    for paper in papers:
        title_lower = paper.title.lower()
        abstract_lower = paper.abstract.lower()
        combined_text = f"{title_lower} {abstract_lower}"
        
        # Topic Score (0-100): keyword and concept matching
        topic_matches = 0
        total_terms = len(keywords) + len(concepts)
        
        for kw in keywords:
            if kw in title_lower:
                topic_matches += 2  # Title match worth more
            elif kw in abstract_lower:
                topic_matches += 1
        
        for concept in concepts:
            if concept in combined_text:
                topic_matches += 1.5
        
        if total_terms > 0:
            paper.topic_score = min(100, (topic_matches / total_terms) * 100)
        
        # Methodology Score (0-100)
        if methodology_terms:
            method_matches = sum(1 for m in methodology_terms if m in combined_text)
            paper.methodology_score = min(100, (method_matches / len(methodology_terms)) * 100)
        
        # Citation Score (0-100): logarithmic scale
        if paper.citations is not None and paper.citations > 0:
            import math
            paper.citation_score = min(100, math.log10(paper.citations + 1) * 33)
        
        # Recency Score (0-100): prefer papers within year preference
        if paper.year:
            if year_pref["min"] <= paper.year <= year_pref["max"]:
                # Within preferred range - high score
                paper.recency_score = 100 - ((year_pref["max"] - paper.year) * 10)
            elif paper.year > year_pref["max"]:
                paper.recency_score = 90  # Very recent
            else:
                # Older than preferred
                years_old = year_pref["min"] - paper.year
                paper.recency_score = max(0, 70 - (years_old * 10))
        
        paper.recency_score = max(0, min(100, paper.recency_score))
    
    return papers


# =============================================================================
# STEP 5: SOURCE VERIFICATION
# =============================================================================

async def verify_papers(papers: List[PaperCandidate]) -> List[PaperCandidate]:
    """
    Verify paper existence and citation accuracy.
    Uses DOI lookup and cross-reference checking.
    """
    verification_tasks = []
    
    for paper in papers:
        if paper.doi:
            verification_tasks.append(verify_doi(paper))
        else:
            # Mark as unverified but don't penalize too much
            paper.verified = False
            paper.verification_score = 50  # Partial score for existing in academic DB
            paper.verification_source = paper.source
    
    if verification_tasks:
        await asyncio.gather(*verification_tasks, return_exceptions=True)
    
    return papers


async def verify_doi(paper: PaperCandidate) -> None:
    """Verify paper exists via DOI lookup."""
    try:
        url = f"https://api.crossref.org/works/{paper.doi}"
        headers = {"User-Agent": "LabResearchSystem/1.0"}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("status") == "ok":
                        paper.verified = True
                        paper.verification_score = 100
                        paper.verification_source = "DOI verified via CrossRef"
                        
                        # Update citation count if available
                        work = data.get("message", {})
                        if work.get("is-referenced-by-count"):
                            paper.citations = work["is-referenced-by-count"]
                else:
                    paper.verified = False
                    paper.verification_score = 60
                    paper.verification_source = "DOI lookup failed"
    except Exception as e:
        paper.verified = False
        paper.verification_score = 50
        paper.verification_source = f"Verification error: {str(e)[:50]}"


# =============================================================================
# STEP 6: FINAL RANKING WITH MATCH PERCENTAGE
# =============================================================================

def calculate_match_percentage(papers: List[PaperCandidate]) -> List[PaperCandidate]:
    """
    Calculate final match percentage using weighted scoring.
    
    Weights:
    - Semantic Similarity: 35%
    - Topic Overlap: 25%
    - Methodology: 15%
    - Citations: 10%
    - Recency: 10%
    - Verification: 5%
    """
    WEIGHTS = {
        "semantic": 0.35,
        "topic": 0.25,
        "methodology": 0.15,
        "citation": 0.10,
        "recency": 0.10,
        "verification": 0.05
    }
    
    for paper in papers:
        # Calculate weighted score
        weighted_score = (
            paper.semantic_score * 100 * WEIGHTS["semantic"] +
            paper.topic_score * WEIGHTS["topic"] +
            paper.methodology_score * WEIGHTS["methodology"] +
            paper.citation_score * WEIGHTS["citation"] +
            paper.recency_score * WEIGHTS["recency"] +
            paper.verification_score * WEIGHTS["verification"]
        )
        
        paper.match_percentage = round(min(99, max(0, weighted_score)), 1)
        
        # Generate match reasons
        paper.match_reasons = []
        
        if paper.semantic_score > 0.7:
            paper.match_reasons.append("High semantic similarity to your research")
        elif paper.semantic_score > 0.5:
            paper.match_reasons.append("Moderate semantic overlap with your work")
        
        if paper.topic_score > 70:
            paper.match_reasons.append("Strong keyword and topic alignment")
        
        if paper.methodology_score > 60:
            paper.match_reasons.append("Similar research methodology")
        
        if paper.citations and paper.citations > 50:
            paper.match_reasons.append(f"Well-cited paper ({paper.citations} citations)")
        
        if paper.verified:
            paper.match_reasons.append("Source verified via DOI")
        
        if paper.year and paper.year >= datetime.now().year - 2:
            paper.match_reasons.append("Recent publication")
    
    return papers


def deduplicate_papers(papers: List[PaperCandidate]) -> List[PaperCandidate]:
    """Remove duplicate papers based on title similarity."""
    seen_titles = set()
    unique_papers = []
    
    for paper in papers:
        # Normalize title
        title_key = re.sub(r'[^a-z0-9]', '', paper.title.lower())[:60]
        
        if title_key and title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_papers.append(paper)
    
    return unique_papers


def rank_and_select(papers: List[PaperCandidate], limit: int = 3) -> List[PaperCandidate]:
    """Rank papers by match percentage and select top results."""
    # Sort by match percentage descending
    papers.sort(key=lambda p: p.match_percentage, reverse=True)
    return papers[:limit]


# =============================================================================
# MAIN SEARCH PIPELINE
# =============================================================================

async def search_papers_advanced(
    description: str,
    field: str,
    experiments: List[Dict],
    limit: int = 3
) -> List[Dict]:
    """
    Advanced paper search pipeline with match percentage calculation.
    
    Pipeline:
    1. Query Understanding (LLM)
    2. Multi-Source Retrieval
    3. Semantic Similarity Matching
    4. Multi-Factor Relevance Scoring
    5. Source Verification
    6. Final Ranking with Match Percentage
    """
    print("\n" + "="*60)
    print("ADVANCED PAPER SEARCH PIPELINE")
    print("="*60)
    
    # Step 1: Understand the query
    print("\n[Step 1] Understanding research context...")
    query_info = await understand_research_context(description, field, experiments)
    print(f"  Primary query: {query_info.get('primary_query', 'N/A')}")
    print(f"  Keywords: {query_info.get('keywords', [])[:5]}")
    print(f"  Concepts: {query_info.get('concepts', [])[:3]}")
    
    # Step 2: Retrieve from all sources
    print("\n[Step 2] Retrieving from academic databases...")
    candidates = await retrieve_from_all_sources(query_info, limit_per_source=15)
    
    if not candidates:
        print("  No candidates found, using LLM fallback")
        return await search_papers_llm_fallback(description, field, experiments)
    
    # Deduplicate early
    candidates = deduplicate_papers(candidates)
    print(f"  Unique candidates: {len(candidates)}")
    
    # Step 3: Compute semantic similarity
    print("\n[Step 3] Computing semantic similarity...")
    query_embedding = query_info.get("query_embedding")
    candidates = compute_semantic_scores(candidates, query_embedding)
    
    # Step 4: Compute relevance scores
    print("\n[Step 4] Computing relevance scores...")
    candidates = compute_relevance_scores(candidates, query_info)
    
    # Step 5: Verify sources
    print("\n[Step 5] Verifying sources...")
    candidates = await verify_papers(candidates)
    verified_count = sum(1 for p in candidates if p.verified)
    print(f"  Verified: {verified_count}/{len(candidates)}")
    
    # Step 6: Calculate match percentage and rank
    print("\n[Step 6] Calculating match percentages...")
    candidates = calculate_match_percentage(candidates)
    top_papers = rank_and_select(candidates, limit)
    
    # Format results
    results = []
    for paper in top_papers:
        results.append({
            "title": paper.title,
            "abstract": paper.abstract[:300] + "..." if len(paper.abstract) > 300 else paper.abstract,
            "date": str(paper.year) if paper.year else "",
            "authors": paper.authors,
            "url": paper.url,
            "doi": paper.doi,
            "citations": paper.citations,
            "source": paper.source,
            "source_icon": paper.source_icon,
            "match_percentage": paper.match_percentage,
            "match_reasons": paper.match_reasons,
            "verified": paper.verified,
            "scores": {
                "semantic": round(paper.semantic_score * 100, 1),
                "topic": round(paper.topic_score, 1),
                "methodology": round(paper.methodology_score, 1),
                "citations": round(paper.citation_score, 1),
                "recency": round(paper.recency_score, 1)
            }
        })
    
    print("\n" + "="*60)
    print(f"TOP {len(results)} RESULTS:")
    for i, r in enumerate(results, 1):
        print(f"  {i}. [{r['match_percentage']}%] {r['title'][:50]}...")
    print("="*60 + "\n")
    
    return results


async def search_papers_llm_fallback(
    description: str,
    field: str,
    experiments: List[Dict]
) -> List[Dict]:
    """Fallback to LLM-based recommendations when APIs fail."""
    try:
        import anthropic
        if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY.startswith("sk-ant-your"):
            raise Exception("No Anthropic API key")
        
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        prompt = f"""Recommend 3 real academic papers for this research context.

Field: {field or 'General Science'}  
Description: {description}

For each paper provide:
- Real paper title (must be a real published paper)
- Year
- Source (arXiv, PubMed, Nature, etc.)
- Why it's relevant (2 sentences)
- Estimated match percentage (0-99%)

Return as JSON array:
[
  {{
    "title": "Real Paper Title",
    "date": "2023",
    "source": "arXiv",
    "description": "Why this paper is relevant...",
    "match_percentage": 85,
    "match_reasons": ["Reason 1", "Reason 2"]
  }}
]"""

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = message.content[0].text.strip()
        json_match = re.search(r'\[[\s\S]*\]', content)
        if json_match:
            papers = json.loads(json_match.group())
            for p in papers:
                if "match_reasons" not in p:
                    p["match_reasons"] = [p.get("description", "")]
            return papers[:3]
    except Exception as e:
        print(f"LLM fallback error: {e}")
    
    return [{
        "title": "Configure API keys for paper search",
        "date": "",
        "source": "",
        "description": "Add OpenAI API key to enable advanced paper search.",
        "match_percentage": 0,
        "match_reasons": []
    }]
