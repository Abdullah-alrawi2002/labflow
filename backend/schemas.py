"""
Pydantic Schemas - Complete Feature Set
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date


# ==================== EXPERIMENT ====================

class ExperimentCreate(BaseModel):
    name: str
    parameters: Optional[List[Dict[str, Any]]] = []
    data: Optional[List[Dict[str, Any]]] = []
    result: Optional[str] = None
    protocol_id: Optional[int] = None
    tags: Optional[List[str]] = []

class ExperimentUpdate(BaseModel):
    name: Optional[str] = None
    parameters: Optional[List[Dict[str, Any]]] = None
    data: Optional[List[Dict[str, Any]]] = None
    result: Optional[str] = None
    status: Optional[str] = None
    success: Optional[bool] = None
    failure_reason: Optional[str] = None
    failure_category: Optional[str] = None
    tags: Optional[List[str]] = None
    change_reason: Optional[str] = None  # For version tracking

class ExperimentResponse(BaseModel):
    id: int
    project_id: int
    name: str
    parameters: List[Dict[str, Any]] = []
    data: List[Dict[str, Any]] = []
    result: Optional[str] = None
    status: str = "in_progress"
    success: Optional[bool] = None
    failure_reason: Optional[str] = None
    failure_category: Optional[str] = None
    version: int = 1
    protocol_id: Optional[int] = None
    tags: List[str] = []
    signed: bool = False
    signed_by: Optional[str] = None
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ExperimentSignRequest(BaseModel):
    signer_name: str
    signer_role: Optional[str] = None
    password: Optional[str] = None  # For authentication
    witness_name: Optional[str] = None

class ExperimentStatusUpdate(BaseModel):
    status: str
    success: Optional[bool] = None
    failure_reason: Optional[str] = None
    failure_category: Optional[str] = None


# ==================== EXPERIMENT VERSION ====================

class ExperimentVersionResponse(BaseModel):
    id: int
    experiment_id: int
    version_number: int
    name: str
    parameters: List[Dict[str, Any]] = []
    data: List[Dict[str, Any]] = []
    result: Optional[str] = None
    changed_by: Optional[str] = None
    change_reason: Optional[str] = None
    changes_summary: List[Dict[str, Any]] = []
    created_at: datetime
    class Config:
        from_attributes = True


# ==================== PROTOCOL ====================

class ProtocolStep(BaseModel):
    order: int
    title: str
    details: Optional[str] = None
    duration_minutes: Optional[int] = None
    warnings: Optional[List[str]] = []

class ProtocolMaterial(BaseModel):
    name: str
    quantity: Optional[str] = None
    notes: Optional[str] = None

class ProtocolCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = []
    required_equipment: Optional[List[str]] = []
    required_materials: Optional[List[Dict[str, Any]]] = []
    parameters_template: Optional[List[Dict[str, Any]]] = []
    safety_notes: Optional[str] = None
    hazards: Optional[List[str]] = []
    ppe_required: Optional[List[str]] = []
    estimated_duration_minutes: Optional[int] = None
    difficulty_level: Optional[str] = None
    created_by: Optional[str] = None

class ProtocolResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    steps: List[Dict[str, Any]] = []
    required_equipment: List[str] = []
    required_materials: List[Dict[str, Any]] = []
    parameters_template: List[Dict[str, Any]] = []
    safety_notes: Optional[str] = None
    hazards: List[str] = []
    ppe_required: List[str] = []
    estimated_duration_minutes: Optional[int] = None
    difficulty_level: Optional[str] = None
    version: str = "1.0"
    times_used: int = 0
    success_rate: Optional[float] = None
    created_at: datetime
    created_by: Optional[str] = None
    class Config:
        from_attributes = True


# ==================== COMMENT ====================

class CommentCreate(BaseModel):
    content: str
    author_name: str
    author_role: Optional[str] = None
    parent_id: Optional[int] = None
    comment_type: Optional[str] = "general"
    mentions: Optional[List[str]] = []

class CommentResponse(BaseModel):
    id: int
    experiment_id: int
    content: str
    author_name: str
    author_role: Optional[str] = None
    parent_id: Optional[int] = None
    is_resolved: bool = False
    comment_type: str = "general"
    mentions: List[str] = []
    created_at: datetime
    class Config:
        from_attributes = True


# ==================== AUDIT LOG ====================

class AuditLogResponse(BaseModel):
    id: int
    project_id: int
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    user_name: str
    user_role: Optional[str] = None
    change_summary: Optional[str] = None
    timestamp: datetime
    reason: Optional[str] = None
    class Config:
        from_attributes = True


# ==================== TASK ====================

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None

class TaskResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    checked: bool
    priority: str = "medium"
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ==================== SCHEDULE ====================

class ScheduleCreate(BaseModel):
    title: str
    scheduled_date: date
    time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    protocol_id: Optional[int] = None
    assigned_to: Optional[str] = None

class ScheduleResponse(BaseModel):
    id: int
    project_id: int
    title: str
    scheduled_date: date
    time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    protocol_id: Optional[int] = None
    assigned_to: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True


# ==================== INSIGHT ====================

class InsightResponse(BaseModel):
    id: int
    project_id: int
    content: str
    insight_type: Optional[str] = None
    confidence: Optional[float] = None
    related_experiments: List[int] = []
    created_at: datetime
    class Config:
        from_attributes = True


# ==================== SUGGESTION ====================

class SuggestionResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    suggestion_type: Optional[str] = None
    priority: Optional[str] = None
    implemented: bool = False
    created_at: datetime
    class Config:
        from_attributes = True


# ==================== PAPER ====================

class PaperResponse(BaseModel):
    id: int
    project_id: int
    title: str
    date: Optional[str] = None
    url: Optional[str] = None
    doi: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    authors: List[str] = []
    citations: Optional[int] = None
    match_percentage: int = 0
    match_reasons: List[str] = []
    scores: Dict[str, Any] = {}
    verified: bool = False
    extracted_methods: List[Dict[str, Any]] = []
    key_findings: List[str] = []
    created_at: datetime
    class Config:
        from_attributes = True


# ==================== MEMBER ====================

class MemberCreate(BaseModel):
    name: str
    email: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = ["read", "write"]
    avatar: Optional[str] = None

class MemberResponse(BaseModel):
    id: int
    project_id: int
    name: str
    email: Optional[str] = None
    role: Optional[str] = None
    permissions: List[str] = []
    avatar: Optional[str] = None
    joined_at: datetime
    last_active: Optional[datetime] = None
    class Config:
        from_attributes = True


# ==================== EQUIPMENT ====================

class EquipmentCreate(BaseModel):
    name: str
    status: Optional[str] = "available"
    serial_number: Optional[str] = None
    calibration_date: Optional[date] = None
    next_calibration: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class EquipmentResponse(BaseModel):
    id: int
    project_id: int
    name: str
    status: str
    serial_number: Optional[str] = None
    calibration_date: Optional[date] = None
    next_calibration: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    class Config:
        from_attributes = True


# ==================== PROJECT ====================

class ProjectCreate(BaseModel):
    name: str
    lab_name: Optional[str] = "My Lab"
    description: Optional[str] = None
    field: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    lab_name: Optional[str] = None
    description: Optional[str] = None
    field: Optional[str] = None
    stage: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    lab_name: str
    description: Optional[str] = None
    field: Optional[str] = None
    stage: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    experiments: List[ExperimentResponse] = []
    tasks: List[TaskResponse] = []
    scheduled: List[ScheduleResponse] = []
    insights: List[InsightResponse] = []
    suggestions: List[SuggestionResponse] = []
    papers: List[PaperResponse] = []
    members: List[MemberResponse] = []
    equipment: List[EquipmentResponse] = []
    protocols: List[ProtocolResponse] = []
    class Config:
        from_attributes = True


# ==================== ANALYTICS ====================

class SuccessRateAnalysis(BaseModel):
    total_experiments: int
    completed: int
    successful: int
    failed: int
    in_progress: int
    success_rate: float
    failure_by_category: Dict[str, int]
    trends: List[Dict[str, Any]]

class ParameterOptimization(BaseModel):
    parameter: str
    optimal_range: Dict[str, float]
    success_correlation: float
    recommendations: List[str]


# ==================== EXPORT ====================

class ExportRequest(BaseModel):
    format: str = "pdf"  # pdf, csv, xlsx
    include_charts: bool = True
    include_audit_trail: bool = False
    experiments: Optional[List[int]] = None  # Specific experiment IDs, or all if None
