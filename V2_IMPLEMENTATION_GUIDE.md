# LabFlow v2.0 Implementation Guide

## Overview

LabFlow v2.0 implements three major feature areas:

1. **Knowledge Integrity & Compliance (21 CFR Part 11)**
   - Mandatory change reasons for data modifications
   - Enhanced audit trail with field-level tracking
   - Compliance-focused UX with non-dismissible modals

2. **Literature Validation (Scite-like)**
   - External API integration for citation metrics
   - Internal contradiction detection
   - Support/contradiction scoring

3. **Knowledge Graph & Annotations (Liner-like)**
   - PDF highlighting and annotation
   - Link literature snippets to experiments
   - Bidirectional knowledge tracking widgets

## Database Migration

### Prerequisites
```bash
cd backend
pip install -r requirements.txt
```

### Run Migration
```bash
python migrate_v2.py
```

This will:
- Add `field_changed` column to `audit_logs`
- Add Scite metric columns to `papers` table
- Create `annotations` table
- Create necessary indices

### Rollback (if needed)
```bash
python migrate_v2.py rollback
```

## Backend Changes

### New Models (models.py)

1. **AuditLog** - Enhanced with `field_changed` field
2. **Paper** - Augmented with:
   - `scite_support_score` (Float)
   - `scite_contradiction_score` (Float)
   - `contradiction_alert` (Boolean)
   - `full_text_pdf_path` (String)
3. **Annotation** - New model for literature snippets

### New Services

1. **literature_service.py** - Scite-like validation
   - `fetch_scite_metrics()` - Query external APIs
   - `check_internal_contradictions()` - Compare with experiment data
   - Mock implementation included for demo/testing

2. **writing_service.py** - AI manuscript generation
   - `generate_methods_section()` - From protocols and experiments
   - `generate_results_section()` - From data and analyses
   - Uses GPT-4 with structured prompts

### New API Endpoints (main.py)

**Literature Management:**
- `POST /api/projects/{id}/literature` - Create paper
- `GET /api/projects/{id}/literature` - List papers
- `GET /api/literature/{id}` - Get single paper
- `PUT /api/literature/{id}` - Update paper
- `POST /api/literature/{id}/refresh-metrics` - Refresh Scite metrics

**Annotations:**
- `POST /api/literature/{id}/annotations` - Create annotation
- `GET /api/literature/{id}/annotations` - List paper annotations
- `GET /api/experiments/{id}/annotations` - List experiment annotations
- `DELETE /api/annotations/{id}` - Delete annotation

**AI Writing:**
- `POST /api/generate-manuscript` - Generate Methods/Results sections

### Modified Endpoints

**Experiment Update** (`PUT /api/experiments/{id}`):
- Now requires `change_reason` parameter (mandatory)
- Returns 400 Bad Request if missing
- Creates detailed audit trail with field tracking

## Frontend Changes

### New Components

1. **ChangeReasonModal.jsx** - 21 CFR Part 11 compliance modal
   - Non-dismissible until reason provided
   - Minimum 10 character validation
   - Clear compliance messaging

2. **LiteratureInfluenceWidget.jsx** - Shows literature citations for experiments
   - Displays snippets from linked papers
   - Links to full paper view
   - Shows knowledge lineage

3. **InternalUsageWidget.jsx** - Shows experiment usage for papers
   - Statistics on experiments/protocols using this paper
   - Quick navigation to linked entities
   - Visual usage metrics

4. **PDFAnnotationViewer.jsx** - PDF viewer with annotations
   - Text selection and highlighting
   - Link snippets to experiments/protocols
   - Simplified implementation (PDF.js integration guide included)

5. **LiteraturePage.jsx** - Complete literature management
   - Card-based paper listing
   - Scite metrics visualization
   - PDF viewer integration
   - Internal usage tracking

### Updated Files

**utils/api.js** - Added 10+ new API functions:
- Literature CRUD operations
- Annotation management
- Manuscript generation
- All properly exported

## Usage Guide

### 1. Mandatory Change Reasons (Compliance)

When updating experiments in the frontend:

```javascript
import ChangeReasonModal from './components/ChangeReasonModal';

// Show modal before update
<ChangeReasonModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSubmit={(reason) => {
    updateExperiment(expId, {
      ...updates,
      change_reason: reason
    });
  }}
  entityName="experiment"
/>
```

The backend will reject updates without `change_reason`:
```json
{
  "detail": "Change reason is mandatory for data integrity (21 CFR Part 11 compliance)"
}
```

### 2. Literature with Scite Metrics

**Add a paper:**
```javascript
await createLiterature(projectId, {
  title: "Paper Title",
  doi: "10.1000/example",
  url: "https://...",
  authors: ["Smith J", "Johnson A"]
});
```

**Refresh metrics:**
```javascript
await refreshLiteratureMetrics(paperId);
```

This queries Scite API (or mock) and checks internal contradictions.

### 3. PDF Annotations

**Create annotation:**
```javascript
await createAnnotation(paperId, {
  snippet_text: "Selected text from PDF",
  user_name: currentUser,
  linked_entity_type: "experiment",
  linked_entity_id: 123
});
```

**Get annotations for experiment:**
```javascript
const annotations = await getExperimentAnnotations(expId);
```

### 4. AI Manuscript Generation

```javascript
const manuscript = await generateManuscript({
  project_id: 1,
  experiment_ids: [1, 2, 3],
  section: "both", // "methods", "results", or "both"
  tone: "academic"
});

console.log(manuscript.content);
console.log(manuscript.word_count);
```

## Configuration

### Environment Variables

Add to `backend/.env`:

```bash
# Existing
DATABASE_URL=sqlite:///./lab_research.db
OPENAI_API_KEY=sk-...

# V2.0 New (optional)
SCITE_API_KEY=your_scite_api_key  # For production Scite integration
```

### Frontend Integration

Add Literature page to routing in `App.jsx`:

```javascript
import LiteraturePage from './components/LiteraturePage';

// Add route
{path: '/literature', component: LiteraturePage}
```

## Production Deployment Notes

### PDF.js Integration

The included PDFAnnotationViewer is simplified. For production:

1. Install dependencies:
   ```bash
   npm install react-pdf pdfjs-dist
   ```

2. Import components:
   ```javascript
   import { Document, Page } from 'react-pdf';
   ```

3. Enable text layer for selection:
   ```javascript
   <Page
     pageNumber={1}
     renderTextLayer={true}
     onGetTextSuccess={(textContent) => {
       // Enable selection and highlighting
     }}
   />
   ```

4. Store highlight coordinates in annotation metadata
5. Render highlights as overlays on canvas

### Scite API Integration

Replace mock in `literature_service.py`:

```python
async with aiohttp.ClientSession() as session:
    headers = {"Authorization": f"Bearer {self.scite_api_key}"}
    async with session.get(
        f"https://api.scite.ai/papers/{doi}",
        headers=headers
    ) as response:
        data = await response.json()
        return {
            "support_score": data["supporting_count"],
            "contradiction_score": data["contrasting_count"]
        }
```

### Security Considerations

1. **Authentication**: Current implementation uses simple user_name strings
   - Production: Integrate proper user authentication
   - Add JWT tokens or session-based auth
   - Link annotations/changes to authenticated user IDs

2. **Authorization**: No permission checks yet
   - Implement role-based access control
   - Restrict who can modify experiments
   - Control who can generate manuscripts

3. **Rate Limiting**: External API calls are unthrottled
   - Add rate limiting for Scite API
   - Cache metrics for frequently accessed papers
   - Implement background job queue for bulk refreshes

## Testing

### Manual Testing Checklist

- [ ] Create experiment, update with change reason
- [ ] Try updating without change reason (should fail)
- [ ] Check audit trail includes field_changed
- [ ] Add paper with DOI
- [ ] Refresh Scite metrics
- [ ] Create annotation on paper
- [ ] Link annotation to experiment
- [ ] View experiment, see literature influence widget
- [ ] View paper, see internal usage widget
- [ ] Generate manuscript from experiments

### API Testing

```bash
# Test mandatory change reason
curl -X PUT http://localhost:8000/api/experiments/1 \
  -H "Content-Type: application/json" \
  -d '{
    "result": "Updated result",
    "change_reason": "Correcting measurement error"
  }'

# Test literature creation
curl -X POST http://localhost:8000/api/projects/1/literature \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Paper",
    "doi": "10.1000/test"
  }'

# Test manuscript generation
curl -X POST http://localhost:8000/api/generate-manuscript \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "experiment_ids": [1],
    "section": "methods"
  }'
```

## Feature Summary

### Phase 1: Database & Backend ✓
- [x] AuditLog model enhanced
- [x] Paper model with Scite metrics
- [x] Annotation model created
- [x] Mandatory change reason validation
- [x] Field-level audit tracking

### Phase 2: Intelligence Services ✓
- [x] Literature Context Service (Scite-like)
- [x] AI Writing Service (Scribbr-like)
- [x] Asynchronous metric fetching
- [x] Internal contradiction detection

### Phase 3: Frontend & UX ✓
- [x] Mandatory edit modal (compliance)
- [x] PDF annotation viewer (simplified)
- [x] Literature influence widget
- [x] Internal usage widget
- [x] Literature management page
- [x] API client updated

## Future Enhancements

1. **Real-time Collaboration**
   - WebSocket support for live annotations
   - Collaborative highlighting
   - Real-time metric updates

2. **Advanced Analytics**
   - Citation network visualization
   - Knowledge graph rendering
   - Impact factor tracking

3. **Export Features**
   - Export manuscript to DOCX
   - Generate PDF with formatting
   - LaTeX template support

4. **Integration Extensions**
   - PubMed direct import
   - Mendeley/Zotero sync
   - DOI metadata auto-fill

## Support & Documentation

- Implementation questions: Check code comments
- API documentation: Visit `http://localhost:8000/docs` (FastAPI auto-docs)
- Database schema: See `models.py`
- Frontend components: See component-level JSDoc

## Version Info

- **Version**: 2.0.0
- **Release Date**: 2025-12-03
- **Python**: 3.8+
- **Node**: 18+
- **Key Dependencies**:
  - FastAPI 0.109+
  - SQLAlchemy 2.0+
  - OpenAI 1.0+
  - React 18+
