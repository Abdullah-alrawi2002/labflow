# AI Insights Features - Enhanced Research Data Scientist

This document describes the enhanced AI insights features for LabFlow, including three advanced analysis capabilities powered by the Lead Research Data Scientist AI persona.

## Overview

The AI insights system now includes:
1. **System Instruction Persona** - Lead Research Data Scientist
2. **Feature A: Pattern Detection** - Python-Heavy Analysis
3. **Feature B: Optimization Suggestions** - Reasoning-Heavy Recommendations
4. **Feature C: Failure Analysis** - Root Cause Diagnosis

## System Instruction - The AI Persona

The AI assistant operates as a **Lead Research Data Scientist** with the following mission:

### Mission
Accelerate scientific discovery by analyzing experimental data, optimizing parameters, and diagnosing failures.

### Core Capabilities
1. **Code Interpreter (Python):** Used for ALL quantitative analysis, statistical tests, and data visualization
2. **File Search (RAG):** Retrieves historical context, safety constraints, and Standard Operating Procedures

### Operational Constraints
- **Safety First:** Never suggests parameters exceeding safety limits defined in `safety_config.json`
- **Data-Driven:** All claims cited with specific run IDs
- **Scientific Rigor:** Strict differentiation between causation and correlation using Pearson/Spearman coefficients

### Output Formatting
- **JSON Mode:** Strictly valid JSON for downstream platform integration
- **Visuals:** Python-based charts for trend visualization

## Data Schema

All experiments are formatted using a standardized JSON schema:

```json
{
  "experiment_id": "EXP-2024-991",
  "status": "completed|failed|in_progress",
  "meta": {
    "name": "Experiment Name",
    "created_at": "2024-10-24T09:00:00Z",
    "success": true|false|null,
    "failure_reason": "..."
  },
  "parameters": {
    "temperature_c": 450,
    "pressure_psi": 1200,
    "ph": 7.0
  },
  "results": {
    "yield_percent": 12.4,
    "purity_score": 0.85
  },
  "data_points": 25
}
```

## Safety Configuration

Safety limits are defined in `backend/safety_config.json`:

```json
{
  "temperature_c": {"min": -273, "max": 1200},
  "pressure_psi": {"min": 0, "max": 3000},
  "ph": {"min": 0, "max": 14},
  "voltage_v": {"min": 0, "max": 1000},
  "concentration_m": {"min": 0, "max": 10}
}
```

All AI-generated parameter suggestions are validated against these limits.

## Feature A: Pattern Detection (Python-Heavy)

### Purpose
Analyzes experimental data to identify non-obvious patterns and correlations using multivariate analysis.

### API Endpoint
```
POST /api/projects/{project_id}/analyze-patterns
```

### Response Format
```json
{
  "heatmap_description": "Correlation heatmap showing...",
  "patterns": [
    {
      "pattern": "Yield drops when Pressure > 50 bar AND Catalyst = Type B",
      "experiments": ["EXP-1", "EXP-2"],
      "confidence": 0.85,
      "statistical_basis": "Pearson correlation = 0.76, p < 0.05"
    }
  ],
  "summary": "Overall analysis summary..."
}
```

### Features
- Multivariate correlation analysis
- Identification of 3 non-obvious patterns
- Statistical validation with Pearson/Spearman coefficients
- Specific experiment references
- Confidence scores for each pattern

### Example Use Case
```bash
curl -X POST http://localhost:8000/api/projects/1/analyze-patterns
```

## Feature B: Optimization Suggestions (Reasoning-Heavy)

### Purpose
Suggests new parameter configurations to optimize specific metrics using Gaussian Process regression or similar heuristics.

### API Endpoint
```
POST /api/projects/{project_id}/optimize?goal_metric=efficiency&constraints={"max_energy": 500}
```

### Request Parameters
- `goal_metric`: Target metric to optimize (default: "efficiency")
- `constraints`: Optional constraints dictionary

### Response Format
```json
{
  "pareto_frontier": "Description of current best performers...",
  "suggestions": [
    {
      "params": {
        "temperature_c": 110,
        "pressure_psi": 450
      },
      "predicted_efficiency": 0.88,
      "confidence": 0.75,
      "reasoning": "Based on Gaussian Process regression...",
      "safety_violations": [],
      "approved": true
    }
  ]
}
```

### Features
- Pareto frontier identification
- 3 new parameter configurations
- Statistical basis (Gaussian Process regression)
- Safety constraint validation
- Approval flags for safe suggestions
- Confidence scores and reasoning

### Example Use Cases
```bash
# Basic optimization
curl -X POST http://localhost:8000/api/projects/1/optimize?goal_metric=yield_percent

# With constraints
curl -X POST http://localhost:8000/api/projects/1/optimize \
  -H "Content-Type: application/json" \
  -d '{"goal_metric": "efficiency", "constraints": {"energy_input": 500}}'
```

## Feature C: Failure Analysis (Root Cause Diagnosis)

### Purpose
Diagnoses why an experiment failed using the 5 Whys framework, comparing against successful baselines.

### API Endpoint
```
POST /api/experiments/{exp_id}/analyze-failure?baseline_exp_id={baseline_id}
```

### Request Parameters
- `exp_id`: ID of the failed experiment
- `baseline_exp_id`: Optional ID of a successful experiment for comparison

### Response Format
```json
{
  "root_cause": "Primary root cause identified",
  "five_whys": [
    {
      "why": "Why did it fail?",
      "answer": "Because the temperature exceeded optimal range"
    },
    {
      "why": "Why did that happen?",
      "answer": "Because the heating control was miscalibrated"
    }
  ],
  "divergence_point": "Temperature spiked at 15:32, 5 minutes into the reaction",
  "contributing_factors": [
    "Equipment calibration overdue",
    "Ambient temperature higher than usual"
  ],
  "recommended_fix": "1. Recalibrate heating controller\n2. Implement temperature monitoring alerts",
  "incident_report": "Full narrative incident report..."
}
```

### Features
- 5 Whys root cause analysis framework
- Comparison with baseline experiments
- Divergence point identification
- Equipment maintenance log integration (optional)
- Contributing factors analysis
- Actionable recommended fixes
- Full incident report generation

### Example Use Cases
```bash
# Analyze failed experiment
curl -X POST http://localhost:8000/api/experiments/42/analyze-failure

# Compare with baseline
curl -X POST "http://localhost:8000/api/experiments/42/analyze-failure?baseline_exp_id=35"
```

## Integration with Existing Features

### Insights Storage
- Pattern detection results are stored as `Insight` objects with type `"pattern"`
- Optimization suggestions are stored as `Suggestion` objects with type `"optimization"`
- Failure analyses are stored as `Insight` objects with type `"failure_analysis"`

### Audit Trail
All AI analysis operations are logged in the audit trail:
- `analyze_patterns` - Pattern detection analysis
- `optimize` - Optimization analysis
- `analyze_failure` - Failure root cause analysis

### Database Models
The enhanced features use existing database models with additional fields:

#### Insight Model
- `insight_type`: "pattern", "optimization", "correlation", "anomaly", "failure_analysis"
- `confidence`: 0-1 confidence score
- `related_experiments`: List of related experiment IDs

#### Suggestion Model
- `suggestion_type`: "optimization", "troubleshooting", "next_step"
- `priority`: "low", "medium", "high"
- `implemented`: Boolean flag

## Backend Implementation

### File Structure
```
backend/
├── ai_services.py           # Enhanced AI services with 3 new features
├── safety_config.json       # Safety constraints configuration
├── main.py                  # API endpoints
├── models.py                # Database models
└── schemas.py               # Pydantic schemas
```

### Key Functions

#### ai_services.py
- `analyze_pattern_detection()` - Pattern detection analysis
- `generate_optimization_suggestions()` - Parameter optimization
- `analyze_failure_root_cause()` - Failure diagnosis
- `format_experiment_as_json_schema()` - Data formatting
- `check_safety_constraints()` - Safety validation

## Usage Guidelines

### Pattern Detection
Best used when:
- You have multiple experiments with varying parameters
- You want to discover non-obvious correlations
- You need statistical validation of trends

### Optimization
Best used when:
- You want to improve a specific metric
- You need data-driven parameter suggestions
- Safety constraints must be enforced

### Failure Analysis
Best used when:
- An experiment has failed
- You need root cause diagnosis
- You want actionable recommendations
- You have a successful baseline for comparison

## Safety Features

1. **Constraint Validation**: All suggestions validated against `safety_config.json`
2. **Approval Flags**: Suggestions marked as approved/rejected based on safety
3. **Violation Reporting**: Clear reporting of any safety violations
4. **Refusal to Recommend Unsafe Parameters**: AI refuses to suggest dangerous configurations

## Example Workflow

### 1. Run Experiments
```python
# Create and run experiments in LabFlow
```

### 2. Detect Patterns
```bash
POST /api/projects/1/analyze-patterns
```

### 3. Optimize Parameters
```bash
POST /api/projects/1/optimize?goal_metric=yield_percent
```

### 4. Analyze Failures (if any)
```bash
POST /api/experiments/42/analyze-failure?baseline_exp_id=35
```

### 5. Review Insights
```bash
GET /api/projects/1
# Returns project with insights, suggestions, and analysis results
```

## Future Enhancements

Potential future additions:
- Real-time telemetry analysis
- Multi-project pattern detection
- Automated experiment design
- Predictive failure prevention
- Integration with lab equipment IoT sensors
- Advanced visualization generation
- Collaborative insight annotation

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects/{id}/analyze` | POST | Original analysis (insights + suggestions + papers) |
| `/api/projects/{id}/analyze-patterns` | POST | Pattern detection analysis |
| `/api/projects/{id}/optimize` | POST | Parameter optimization suggestions |
| `/api/experiments/{id}/analyze-failure` | POST | Failure root cause analysis |

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Required for AI features
- `ANTHROPIC_API_KEY`: Fallback AI provider (optional)

### Safety Configuration
Edit `backend/safety_config.json` to customize safety limits for your lab.

## Troubleshooting

### Error: "Add OpenAI API key"
- Ensure `OPENAI_API_KEY` is set in your `.env` file
- Restart the backend server

### Error: "No experiments found"
- Ensure experiments have data before running analysis
- Check that experiments are marked with `is_latest = True`

### Error: "This experiment is not marked as failed"
- Only failed experiments can use failure analysis
- Mark experiment status as "failed" or set `success = False`

### Safety Violations
- Review `safety_config.json` limits
- Adjust constraints in optimization requests
- Check parameter units match configuration

## Support

For issues or questions:
- GitHub Issues: [LabFlow Issues](https://github.com/your-repo/labflow/issues)
- Documentation: [LabFlow Docs](https://docs.labflow.example.com)

---

**Version**: 2.0
**Last Updated**: 2025-12-03
**Author**: LabFlow Development Team
