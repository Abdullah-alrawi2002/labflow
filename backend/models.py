"""
Database Models - Complete Feature Set
Includes: Version Control, Audit Trail, Comments, Protocols, Digital Signatures
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, Date, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    lab_name = Column(String(255), default="My Lab")
    description = Column(Text)
    field = Column(String(100))
    stage = Column(String(50), default="brainstorm")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    experiments = relationship("Experiment", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    scheduled = relationship("ScheduledExperiment", back_populates="project", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="project", cascade="all, delete-orphan")
    suggestions = relationship("Suggestion", back_populates="project", cascade="all, delete-orphan")
    papers = relationship("Paper", back_populates="project", cascade="all, delete-orphan")
    members = relationship("Member", back_populates="project", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="project", cascade="all, delete-orphan")
    protocols = relationship("Protocol", back_populates="project", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="project", cascade="all, delete-orphan")


class Experiment(Base):
    """
    Experiment with version control, signatures, and status tracking
    """
    __tablename__ = "experiments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    
    # Data
    parameters = Column(JSON, default=list)  # [{name: "Temperature", unit: "°C"}, ...]
    data = Column(JSON, default=list)  # [{Temperature: 25, pH: 7.0}, ...]
    result = Column(Text)
    
    # Status & Classification
    status = Column(String(50), default="in_progress")  # in_progress, completed, failed, abandoned
    success = Column(Boolean, default=None)  # null = pending, True = success, False = failure
    failure_reason = Column(Text)  # If failed, why?
    failure_category = Column(String(100))  # equipment, protocol, contamination, human_error, unknown
    
    # Version Control
    version = Column(Integer, default=1)
    parent_version_id = Column(Integer, ForeignKey("experiments.id"), nullable=True)
    is_latest = Column(Boolean, default=True)
    
    # Protocol Reference
    protocol_id = Column(Integer, ForeignKey("protocols.id"), nullable=True)
    protocol_deviations = Column(JSON, default=list)  # [{step: 3, deviation: "Used 5ml instead of 10ml"}]
    
    # Metadata (AI-extracted)
    extracted_metadata = Column(JSON, default=dict)  # AI-extracted info from uploads
    tags = Column(JSON, default=list)  # ["PCR", "DNA", "optimization"]
    
    # Compliance
    signed = Column(Boolean, default=False)
    signed_by = Column(String(255))
    signed_at = Column(DateTime)
    signature_hash = Column(String(256))  # SHA-256 hash for integrity
    witness_name = Column(String(255))
    witness_signed_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    project = relationship("Project", back_populates="experiments")
    protocol = relationship("Protocol", back_populates="experiments")
    comments = relationship("Comment", back_populates="experiment", cascade="all, delete-orphan")
    versions = relationship("ExperimentVersion", back_populates="experiment", cascade="all, delete-orphan")


class ExperimentVersion(Base):
    """
    Stores historical versions of experiments for version control
    """
    __tablename__ = "experiment_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id", ondelete="CASCADE"))
    version_number = Column(Integer, nullable=False)
    
    # Snapshot of data at this version
    name = Column(String(255))
    parameters = Column(JSON, default=list)
    data = Column(JSON, default=list)
    result = Column(Text)
    
    # Change tracking
    changed_by = Column(String(255))
    change_reason = Column(Text)
    changes_summary = Column(JSON, default=list)  # [{field: "data", action: "added_row", details: "..."}]
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    experiment = relationship("Experiment", back_populates="versions")


class Protocol(Base):
    """
    Reusable experiment protocols/templates
    """
    __tablename__ = "protocols"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # sample_prep, analysis, synthesis, etc.
    
    # Template structure
    steps = Column(JSON, default=list)  # [{order: 1, title: "Prepare buffer", details: "...", duration_minutes: 30}]
    required_equipment = Column(JSON, default=list)  # ["Centrifuge", "Pipettes"]
    required_materials = Column(JSON, default=list)  # [{name: "Buffer A", quantity: "500ml"}]
    parameters_template = Column(JSON, default=list)  # Default parameters for experiments
    
    # Safety & Compliance
    safety_notes = Column(Text)
    hazards = Column(JSON, default=list)  # ["Chemical", "Biological"]
    ppe_required = Column(JSON, default=list)  # ["Gloves", "Lab coat", "Goggles"]
    
    # Metadata
    estimated_duration_minutes = Column(Integer)
    difficulty_level = Column(String(50))  # beginner, intermediate, advanced
    version = Column(String(50), default="1.0")
    
    # Source
    source_paper_id = Column(Integer, ForeignKey("papers.id"), nullable=True)
    extracted_from_paper = Column(Boolean, default=False)
    
    # Usage stats
    times_used = Column(Integer, default=0)
    success_rate = Column(Float)  # Calculated from linked experiments
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(255))
    
    # Relationships
    project = relationship("Project", back_populates="protocols")
    experiments = relationship("Experiment", back_populates="protocol")
    source_paper = relationship("Paper", back_populates="extracted_protocols")


class Comment(Base):
    """
    Comments/discussion threads on experiments
    """
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id", ondelete="CASCADE"))
    
    # Content
    content = Column(Text, nullable=False)
    author_name = Column(String(255), nullable=False)
    author_role = Column(String(100))  # PI, researcher, technician
    
    # Threading
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)  # For replies
    is_resolved = Column(Boolean, default=False)
    
    # Type
    comment_type = Column(String(50), default="general")  # general, question, suggestion, issue, approval
    
    # Mentions and references
    mentions = Column(JSON, default=list)  # ["@John", "@Sarah"]
    references = Column(JSON, default=list)  # [{type: "experiment", id: 5}, {type: "paper", id: 3}]
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    experiment = relationship("Experiment", back_populates="comments")
    replies = relationship("Comment", backref="parent", remote_side=[id])


class AuditLog(Base):
    """
    Comprehensive audit trail for compliance (FDA 21 CFR Part 11, GLP)
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))

    # What happened
    action = Column(String(100), nullable=False)  # create, update, delete, sign, export, view
    entity_type = Column(String(100), nullable=False)  # experiment, protocol, paper, etc.
    entity_id = Column(Integer)
    entity_name = Column(String(255))

    # Who did it
    user_name = Column(String(255), nullable=False)
    user_role = Column(String(100))
    user_ip = Column(String(50))

    # Details
    old_value = Column(JSON)  # Previous state (for updates)
    new_value = Column(JSON)  # New state (for updates)
    change_summary = Column(Text)  # Human-readable summary
    field_changed = Column(Text)  # Name of the field being modified (e.g., 'pH', 'concentration')

    # Integrity
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    checksum = Column(String(256))  # SHA-256 for tamper detection

    # Compliance metadata (21 CFR Part 11)
    reason = Column(Text)  # Why the change was made - MANDATORY for UPDATE/DELETE
    electronic_signature = Column(String(256))

    project = relationship("Project", back_populates="audit_logs")


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String(500), nullable=False)
    description = Column(Text)
    checked = Column(Boolean, default=False)
    priority = Column(String(50), default="medium")  # low, medium, high, urgent
    assigned_to = Column(String(255))
    due_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    project = relationship("Project", back_populates="tasks")


class ScheduledExperiment(Base):
    __tablename__ = "scheduled_experiments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    time = Column(String(10))
    location = Column(String(255))
    description = Column(Text)
    protocol_id = Column(Integer, ForeignKey("protocols.id"), nullable=True)
    assigned_to = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="scheduled")


class Insight(Base):
    __tablename__ = "insights"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    insight_type = Column(String(100))  # pattern, optimization, correlation, anomaly
    confidence = Column(Float)  # 0-1 confidence score
    related_experiments = Column(JSON, default=list)  # IDs of related experiments
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="insights")


class Suggestion(Base):
    __tablename__ = "suggestions"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    suggestion_type = Column(String(100))  # optimization, troubleshooting, next_step
    priority = Column(String(50))  # low, medium, high
    implemented = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="suggestions")


class Paper(Base):
    """
    Literature/Paper tracking with knowledge integrity features (Scite-like validation)
    """
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String(500), nullable=False)
    date = Column(String(50))
    url = Column(String(500))
    doi = Column(String(100), unique=True, index=True)  # Unique identifier for Scite lookups
    description = Column(Text)
    source = Column(String(100))
    authors = Column(JSON, default=list)
    citations = Column(Integer)
    match_percentage = Column(Integer, default=0)
    match_reasons = Column(JSON, default=list)
    scores = Column(JSON, default=dict)
    verified = Column(Boolean, default=False)

    # Methods extraction
    extracted_methods = Column(JSON, default=list)  # [{title: "PCR Protocol", steps: [...], extracted_at: "..."}]
    key_findings = Column(JSON, default=list)  # AI-extracted key findings

    # Citation network
    cites = Column(JSON, default=list)  # Papers this paper cites
    cited_by = Column(JSON, default=list)  # Papers that cite this paper

    # V2.0: Knowledge Integrity (Scite-like validation)
    scite_support_score = Column(Float, nullable=True)  # Supporting claims count/metric from Scite API
    scite_contradiction_score = Column(Float, nullable=True)  # Contrasting claims count/metric from Scite API
    contradiction_alert = Column(Boolean, default=False)  # Internal flag for variance with LabFlow experiments
    full_text_pdf_path = Column(String(500), nullable=True)  # Local/S3 path to stored PDF for in-platform viewing

    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="papers")
    extracted_protocols = relationship("Protocol", back_populates="source_paper")
    annotations = relationship("Annotation", back_populates="paper", cascade="all, delete-orphan")


class Annotation(Base):
    """
    Literature annotations linking paper snippets to internal experiments/protocols (Liner-like)
    """
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # Future: link to user authentication
    user_name = Column(String(255))  # For now, store username directly
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"))

    # Highlighted snippet
    snippet_text = Column(Text, nullable=False)  # The highlighted text from the PDF

    # Link to internal entities
    linked_entity_type = Column(String(100), nullable=True)  # 'experiment', 'protocol', 'project'
    linked_entity_id = Column(Integer, nullable=True)  # The ID of the linked object

    created_at = Column(DateTime, default=datetime.utcnow)

    paper = relationship("Paper", back_populates="annotations")


class Member(Base):
    __tablename__ = "members"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    role = Column(String(100))  # PI, researcher, technician, student
    permissions = Column(JSON, default=list)  # ["read", "write", "sign", "admin"]
    avatar = Column(String(500))
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime)
    
    project = relationship("Project", back_populates="members")


class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="available")  # available, in_use, maintenance, broken
    serial_number = Column(String(100))
    calibration_date = Column(Date)
    next_calibration = Column(Date)
    location = Column(String(255))
    notes = Column(Text)
    
    project = relationship("Project", back_populates="equipment")
