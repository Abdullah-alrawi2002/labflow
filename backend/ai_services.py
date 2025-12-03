"""
AI Services - OpenAI for Insights/Suggestions, Advanced Paper Search
"""

import os
import json
import re
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-your-openai-api-key-here")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "sk-ant-your-anthropic-api-key-here")

# Initialize OpenAI client
openai_client = None
try:
    if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-your"):
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✓ OpenAI client initialized")
except Exception as e:
    print(f"OpenAI init error: {e}")


def format_experiment_data(experiments: List[Dict]) -> str:
    """Format experiment data for AI prompts."""
    if not experiments:
        return "No experiments recorded."
    
    lines = []
    for i, exp in enumerate(experiments, 1):
        lines.append(f"\n=== Experiment {i}: {exp.get('name', 'Unnamed')} ===")
        
        params = exp.get('parameters', [])
        if params:
            param_str = ', '.join([f"{p.get('name')} ({p.get('unit', '')})" for p in params])
            lines.append(f"Parameters: {param_str}")
        
        data = exp.get('data', [])
        if data and params:
            lines.append(f"Data points: {len(data)}")
            
            # Calculate stats for each parameter
            for param in params:
                name = param.get('name')
                if not name:
                    continue
                
                values = []
                for row in data:
                    val = row.get(name)
                    if val not in (None, ''):
                        try:
                            values.append(float(val))
                        except:
                            pass
                
                if values:
                    lines.append(f"  {name}: min={min(values):.2f}, max={max(values):.2f}, avg={sum(values)/len(values):.2f}")
    
    return '\n'.join(lines)


async def generate_insights(
    description: str, 
    field: str, 
    experiments: List[Dict]
) -> List[str]:
    """Generate 3 data-driven insights using OpenAI GPT-4."""
    if not openai_client:
        return ["Add OpenAI API key to enable AI insights."]
    
    if not experiments:
        return ["Add experiments with data to generate insights."]
    
    experiment_data = format_experiment_data(experiments)
    
    prompt = f"""Analyze these lab experiments and provide exactly 3 key insights.

## Context
Field: {field or 'General Science'}
Description: {description or 'Laboratory research'}

## Data
{experiment_data}

## Requirements
Return 3 specific, data-driven insights. Each should:
1. Reference specific numbers from the data
2. Explain the significance (2-3 sentences)
3. Be actionable

Return as JSON array: ["Insight 1...", "Insight 2...", "Insight 3..."]
Return ONLY JSON."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a research scientist. Return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        content = response.choices[0].message.content.strip()
        match = re.search(r'\[[\s\S]*\]', content)
        if match:
            insights = json.loads(match.group())
            return [str(i) for i in insights[:3]]
        return [content]
    except Exception as e:
        return [f"Error: {str(e)}"]


async def generate_suggestions(
    description: str, 
    field: str, 
    experiments: List[Dict]
) -> List[Dict[str, str]]:
    """Generate 3 actionable research suggestions."""
    if not openai_client:
        return [{"title": "API Key Required", "description": "Add OpenAI API key."}]
    
    if not experiments:
        return [{"title": "Add Experiments", "description": "Log experiments first."}]
    
    experiment_data = format_experiment_data(experiments)
    
    prompt = f"""Based on these experiments, suggest 3 next steps.

## Context
Field: {field or 'General Science'}
Description: {description}

## Data
{experiment_data}

Return as JSON:
[
  {{"title": "Short Title", "description": "Detailed explanation..."}},
  {{"title": "Title 2", "description": "Explanation..."}},
  {{"title": "Title 3", "description": "Explanation..."}}
]
Return ONLY JSON."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Research advisor. Return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=800
        )
        
        content = response.choices[0].message.content.strip()
        match = re.search(r'\[[\s\S]*\]', content)
        if match:
            return json.loads(match.group())[:3]
        return [{"title": "Suggestion", "description": content}]
    except Exception as e:
        return [{"title": "Error", "description": str(e)}]


async def search_papers(
    description: str, 
    field: str, 
    experiments: List[Dict]
) -> List[Dict[str, Any]]:
    """
    Advanced paper search with match percentage calculation.
    
    Uses multi-model architecture:
    1. Query understanding (GPT-4)
    2. Multi-source retrieval (Semantic Scholar, arXiv, PubMed, CrossRef)
    3. Semantic similarity matching (embeddings)
    4. Multi-factor relevance scoring
    5. Source verification (DOI lookup)
    6. Match percentage calculation
    """
    try:
        from paper_search import search_papers_advanced, search_papers_llm_fallback
        
        print("\n" + "="*50)
        print("INITIATING ADVANCED PAPER SEARCH")
        print("="*50)
        
        # Try advanced search pipeline
        papers = await search_papers_advanced(description, field, experiments, limit=3)
        
        if papers and len(papers) > 0:
            # Check if we got real results
            first_paper = papers[0]
            if first_paper.get("title") and not first_paper.get("title", "").startswith("Configure"):
                print(f"Found {len(papers)} papers with match percentages")
                return papers
        
        # Fallback to LLM-based search
        print("Using LLM fallback for paper recommendations")
        return await search_papers_llm_fallback(description, field, experiments)
        
    except ImportError as e:
        print(f"Import error: {e}")
        return await _basic_fallback(description, field)
    except Exception as e:
        print(f"Paper search error: {e}")
        import traceback
        traceback.print_exc()
        return await _basic_fallback(description, field)


async def _basic_fallback(description: str, field: str) -> List[Dict]:
    """Ultimate fallback when all else fails."""
    try:
        import anthropic
        if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY.startswith("sk-ant-your"):
            raise Exception("No API key")
        
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        prompt = f"""Recommend 3 real academic papers for: {field} - {description}

Return JSON:
[
  {{
    "title": "Real Paper Title",
    "date": "2023",
    "source": "arXiv",
    "abstract": "Brief description",
    "authors": ["Author 1"],
    "match_percentage": 85,
    "match_reasons": ["Reason 1", "Reason 2"],
    "verified": false,
    "scores": {{"semantic": 80, "topic": 85, "methodology": 70, "citations": 60, "recency": 90}}
  }}
]"""

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = message.content[0].text.strip()
        match = re.search(r'\[[\s\S]*\]', content)
        if match:
            return json.loads(match.group())[:3]
    except Exception as e:
        print(f"Fallback error: {e}")
    
    return [{
        "title": "Configure API keys for paper search",
        "date": "",
        "source": "",
        "abstract": "Add OpenAI and/or Anthropic API keys to enable AI-powered paper search with match percentages.",
        "match_percentage": 0,
        "match_reasons": [],
        "scores": {}
    }]
