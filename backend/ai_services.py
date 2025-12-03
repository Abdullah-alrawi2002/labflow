"""
AI Services - Enhanced Research Data Scientist Assistant
Includes: Pattern Detection, Optimization, Failure Analysis, Advanced Paper Search
"""

import os
import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-your-openai-api-key-here")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "sk-ant-your-anthropic-api-key-here")

# System Instruction - The AI Persona
SYSTEM_INSTRUCTION = """# MISSION
You are the **Lead Research Data Scientist** for an advanced R&D platform. Your goal is to accelerate scientific discovery by analyzing experimental data, optimizing parameters, and diagnosing failures.

# CORE CAPABILITIES & TOOLS
1. **Code Interpreter (Python):** MUST be used for ALL quantitative analysis, statistical tests, and data visualization. Never "guess" numbers; calculate them.
2. **File Search (RAG):** Used to retrieve historical context, "safety_config.json" constraints, and internal "Standard Operating Procedures (SOPs)."

# OPERATIONAL CONSTRAINTS
* **Safety First:** NEVER suggest parameters that exceed the limits defined in `safety_config.json` (e.g., Temperature > 1200°C). If a user requests this, refuse and explain why.
* **Data-Driven:** All claims must be cited with specific run IDs (e.g., "Run #402 showed...").
* **Scientific Rigor:** When analyzing correlations, strictly differentiate between *causation* and *correlation*. Use Pearson/Spearman coefficients where applicable.

# OUTPUT FORMATTING
* **JSON Mode:** When requested, output strictly valid JSON for downstream platform integration.
* **Visuals:** Always generate a Python-based chart (PNG) when discussing trends (describe what chart would be generated).
"""

# Safety Configuration - Default limits
DEFAULT_SAFETY_LIMITS = {
    "temperature_c": {"min": -273, "max": 1200},
    "pressure_psi": {"min": 0, "max": 3000},
    "ph": {"min": 0, "max": 14},
    "voltage_v": {"min": 0, "max": 1000},
    "concentration_m": {"min": 0, "max": 10}
}

def load_safety_config() -> Dict[str, Any]:
    """Load safety configuration from file or return defaults."""
    config_path = os.path.join(os.path.dirname(__file__), "safety_config.json")
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load safety_config.json: {e}")
    return DEFAULT_SAFETY_LIMITS

SAFETY_LIMITS = load_safety_config()

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


def format_experiment_as_json_schema(experiment: Dict) -> Dict[str, Any]:
    """Format experiment data as structured JSON schema for AI analysis."""
    exp_id = experiment.get('id', 'unknown')

    # Extract parameters
    params = experiment.get('parameters', [])
    param_dict = {}
    data_rows = experiment.get('data', [])

    if params and data_rows:
        # Calculate aggregate values for each parameter
        for param in params:
            name = param.get('name', '')
            if not name:
                continue

            values = []
            for row in data_rows:
                val = row.get(name)
                if val not in (None, ''):
                    try:
                        values.append(float(val))
                    except:
                        pass

            if values:
                # Use average as representative value
                param_dict[name.lower().replace(' ', '_')] = sum(values) / len(values)

    # Extract results/metrics
    results = {}
    if 'result' in experiment and experiment['result']:
        results['notes'] = experiment['result']

    # Check for common result metrics in data
    if data_rows:
        for key in ['yield', 'yield_percent', 'yield_percentage', 'efficiency', 'purity', 'purity_score']:
            for row in data_rows:
                if key in row and row[key] not in (None, ''):
                    try:
                        results[key] = float(row[key])
                        break
                    except:
                        pass

    return {
        "experiment_id": f"EXP-{exp_id}",
        "status": experiment.get('status', 'completed'),
        "meta": {
            "name": experiment.get('name', 'Unnamed'),
            "created_at": experiment.get('created_at', datetime.utcnow().isoformat()),
            "success": experiment.get('success'),
            "failure_reason": experiment.get('failure_reason')
        },
        "parameters": param_dict,
        "results": results,
        "data_points": len(data_rows)
    }


def check_safety_constraints(params: Dict[str, float]) -> List[str]:
    """Check if parameters violate safety constraints."""
    violations = []

    for param_name, value in params.items():
        if param_name in SAFETY_LIMITS:
            limits = SAFETY_LIMITS[param_name]
            if value < limits["min"]:
                violations.append(
                    f"{param_name} = {value} is below minimum safe value ({limits['min']})"
                )
            if value > limits["max"]:
                violations.append(
                    f"{param_name} = {value} exceeds maximum safe value ({limits['max']})"
                )

    return violations


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
                {"role": "system", "content": SYSTEM_INSTRUCTION + "\n\nYou are a research scientist. Return valid JSON."},
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
                {"role": "system", "content": SYSTEM_INSTRUCTION + "\n\nResearch advisor. Return valid JSON."},
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


async def analyze_pattern_detection(
    experiments: List[Dict],
    csv_data: Optional[str] = None
) -> Dict[str, Any]:
    """
    Feature A: Pattern Detection (Python-Heavy)
    Analyzes experiment data to identify non-obvious patterns and correlations.
    """
    if not openai_client:
        return {
            "error": "Add OpenAI API key to enable pattern detection.",
            "patterns": [],
            "heatmap_description": "",
            "summary": ""
        }

    if not experiments and not csv_data:
        return {
            "error": "No experiment data provided.",
            "patterns": [],
            "heatmap_description": "",
            "summary": ""
        }

    # Format experiments as JSON schema
    experiment_contexts = [format_experiment_as_json_schema(exp) for exp in experiments]

    prompt = f"""I have uploaded experiment data with the following experiments:

{json.dumps(experiment_contexts, indent=2)}

Tasks:
1. Load and analyze this dataset
2. Clean the data (handle missing values using interpolation if needed)
3. Perform a multivariate analysis to identify which input parameters have the strongest correlation with target metrics
4. Identify 3 non-obvious patterns (e.g., 'Yield drops when Pressure > 50 bar AND Catalyst = Type B')

Deliverable:
1. A description of what a correlation heatmap would show
2. A text summary identifying 3 non-obvious patterns with specific data references (experiment IDs, parameter values)

Return as JSON:
{{
  "heatmap_description": "Description of correlation heatmap...",
  "patterns": [
    {{
      "pattern": "Pattern description with specific values",
      "experiments": ["EXP-1", "EXP-2"],
      "confidence": 0.85,
      "statistical_basis": "Pearson correlation = 0.76, p < 0.05"
    }}
  ],
  "summary": "Overall analysis summary..."
}}

Return ONLY JSON."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=1500
        )

        content = response.choices[0].message.content.strip()
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            return json.loads(match.group())
        return {"error": "Failed to parse response", "patterns": [], "summary": content}
    except Exception as e:
        return {"error": str(e), "patterns": [], "summary": ""}


async def generate_optimization_suggestions(
    experiments: List[Dict],
    goal_metric: str = "Output_Efficiency",
    constraints: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Feature B: Optimization Suggestions (Reasoning-Heavy)
    Suggests new parameter configurations to optimize a specific metric.
    """
    if not openai_client:
        return {
            "error": "Add OpenAI API key to enable optimization.",
            "suggestions": [],
            "pareto_frontier": ""
        }

    if not experiments:
        return {
            "error": "No experiment data provided.",
            "suggestions": [],
            "pareto_frontier": ""
        }

    # Format experiments as JSON schema
    experiment_contexts = [format_experiment_as_json_schema(exp) for exp in experiments]

    # Check safety constraints
    constraint_text = ""
    if constraints:
        constraint_text = f"\nConstraints: {json.dumps(constraints)}"
        constraint_text += f"\nSafety Limits: {json.dumps(SAFETY_LIMITS)}"

    prompt = f"""Review the results from these experiments:

{json.dumps(experiment_contexts, indent=2)}

Goal: Maximize '{goal_metric}'
{constraint_text}

Tasks:
1. Identify the 'Pareto Frontier' of current performance
2. Suggest 3 NEW parameter configurations that have not been tested yet but have high probability of success
3. Base suggestions on statistical analysis (e.g., Gaussian Process regression or similar heuristics)
4. Ensure all suggested parameters are within safety limits

Output the suggestions in this JSON format:
{{
  "pareto_frontier": "Description of current best performers...",
  "suggestions": [
    {{
      "params": {{"temperature_c": 110, "pressure_psi": 450}},
      "predicted_efficiency": 0.88,
      "confidence": 0.75,
      "reasoning": "Detailed explanation with statistical basis..."
    }}
  ]
}}

IMPORTANT: Do NOT suggest parameters that violate safety constraints.

Return ONLY JSON."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=1500
        )

        content = response.choices[0].message.content.strip()
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            result = json.loads(match.group())

            # Validate safety constraints for each suggestion
            validated_suggestions = []
            for suggestion in result.get("suggestions", []):
                params = suggestion.get("params", {})
                violations = check_safety_constraints(params)

                if violations:
                    suggestion["safety_violations"] = violations
                    suggestion["approved"] = False
                else:
                    suggestion["safety_violations"] = []
                    suggestion["approved"] = True

                validated_suggestions.append(suggestion)

            result["suggestions"] = validated_suggestions
            return result

        return {"error": "Failed to parse response", "suggestions": [], "pareto_frontier": content}
    except Exception as e:
        return {"error": str(e), "suggestions": [], "pareto_frontier": ""}


async def analyze_failure_root_cause(
    failed_experiment: Dict,
    baseline_experiment: Optional[Dict] = None,
    maintenance_logs: Optional[str] = None
) -> Dict[str, Any]:
    """
    Feature C: Failure Analysis (Root Cause Diagnosis)
    Diagnoses why an experiment failed using the 5 Whys framework.
    """
    if not openai_client:
        return {
            "error": "Add OpenAI API key to enable failure analysis.",
            "root_cause": "",
            "five_whys": [],
            "recommended_fix": "",
            "incident_report": ""
        }

    if not failed_experiment:
        return {
            "error": "No failed experiment provided.",
            "root_cause": "",
            "five_whys": [],
            "recommended_fix": "",
            "incident_report": ""
        }

    # Format experiments as JSON schema
    failed_context = format_experiment_as_json_schema(failed_experiment)

    baseline_context = ""
    if baseline_experiment:
        baseline_context = f"\n\nBaseline (Success) Run:\n{json.dumps(format_experiment_as_json_schema(baseline_experiment), indent=2)}"

    maintenance_context = ""
    if maintenance_logs:
        maintenance_context = f"\n\nMaintenance Logs:\n{maintenance_logs}"

    prompt = f"""Run {failed_context['experiment_id']} has FAILED.

Failed Run Details:
{json.dumps(failed_context, indent=2)}
{baseline_context}
{maintenance_context}

Tasks:
1. Compare the failed run against the baseline (if provided)
2. Use the '5 Whys' framework to diagnose the root cause
3. Identify the exact point where things diverged from expected behavior
4. Check if any equipment maintenance issues could have contributed (if logs provided)
5. Provide a recommended fix

Output: A concise 'Incident Report' outlining:
{{
  "root_cause": "Primary root cause identified",
  "five_whys": [
    {{"why": "Why did it fail?", "answer": "Because..."}},
    {{"why": "Why did that happen?", "answer": "Because..."}},
    {{"why": "Why did that happen?", "answer": "Because..."}},
    {{"why": "Why did that happen?", "answer": "Because..."}},
    {{"why": "Why did that happen?", "answer": "Root cause: ..."}}
  ],
  "divergence_point": "Where the failed run diverged from baseline...",
  "contributing_factors": ["Factor 1", "Factor 2"],
  "recommended_fix": "Specific actionable steps to prevent recurrence",
  "incident_report": "Full narrative incident report"
}}

Return ONLY JSON."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=1500
        )

        content = response.choices[0].message.content.strip()
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            return json.loads(match.group())
        return {
            "error": "Failed to parse response",
            "root_cause": content,
            "five_whys": [],
            "recommended_fix": "",
            "incident_report": content
        }
    except Exception as e:
        return {
            "error": str(e),
            "root_cause": "",
            "five_whys": [],
            "recommended_fix": "",
            "incident_report": ""
        }


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
