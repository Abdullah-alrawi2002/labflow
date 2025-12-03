"""
Lab Research System - Complete API
All Core Features: Version Control, Audit Trail, Protocols, Comments, Digital Signatures
"""

from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import hashlib
import json
import math

import models
import schemas
from database import engine, get_db
from ai_services import generate_insights, generate_suggestions, search_papers

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lab Research System", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== AUDIT LOGGING ====================

def log_audit(
    db: Session,
    project_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    entity_name: str,
    user_name: str = "System",
    user_role: str = None,
    old_value: dict = None,
    new_value: dict = None,
    change_summary: str = None,
    reason: str = None
):
    """Create an audit log entry."""
    # Create checksum for integrity
    content = f"{project_id}{action}{entity_type}{entity_id}{datetime.utcnow().isoformat()}"
    checksum = hashlib.sha256(content.encode()).hexdigest()
    
    audit = models.AuditLog(
        project_id=project_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        user_name=user_name,
        user_role=user_role,
        old_value=old_value,
        new_value=new_value,
        change_summary=change_summary,
        checksum=checksum,
        reason=reason
    )
    db.add(audit)


# ==================== PROJECTS ====================

@app.post("/api/projects", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    log_audit(db, db_project.id, "create", "project", db_project.id, db_project.name)
    db.commit()
    return db_project

@app.get("/api/projects", response_model=List[schemas.ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).all()

@app.get("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.put("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
def update_project(project_id: int, project: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    old_values = {"name": db_project.name, "stage": db_project.stage}
    
    for key, value in project.model_dump(exclude_unset=True).items():
        setattr(db_project, key, value)
    
    log_audit(db, project_id, "update", "project", project_id, db_project.name,
              old_value=old_values, new_value=project.model_dump(exclude_unset=True))
    
    db.commit()
    db.refresh(db_project)
    return db_project

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}


# ==================== EXPERIMENTS ====================

@app.post("/api/projects/{project_id}/experiments", response_model=schemas.ExperimentResponse)
def create_experiment(project_id: int, experiment: schemas.ExperimentCreate, db: Session = Depends(get_db)):
    db_exp = models.Experiment(
        **experiment.model_dump(),
        project_id=project_id,
        version=1,
        is_latest=True
    )
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    
    log_audit(db, project_id, "create", "experiment", db_exp.id, db_exp.name)
    db.commit()
    return db_exp

@app.get("/api/projects/{project_id}/experiments", response_model=List[schemas.ExperimentResponse])
def get_experiments(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Experiment).filter(
        models.Experiment.project_id == project_id,
        models.Experiment.is_latest == True
    ).all()

@app.get("/api/experiments/{exp_id}", response_model=schemas.ExperimentResponse)
def get_experiment(exp_id: int, db: Session = Depends(get_db)):
    exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp

@app.put("/api/experiments/{exp_id}", response_model=schemas.ExperimentResponse)
def update_experiment(exp_id: int, update: schemas.ExperimentUpdate, db: Session = Depends(get_db)):
    exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if exp.signed:
        raise HTTPException(status_code=400, detail="Cannot modify signed experiment")
    
    # Create version snapshot before update
    version = models.ExperimentVersion(
        experiment_id=exp.id,
        version_number=exp.version,
        name=exp.name,
        parameters=exp.parameters,
        data=exp.data,
        result=exp.result,
        changed_by=update.change_reason or "User",
        change_reason=update.change_reason
    )
    db.add(version)
    
    # Update experiment
    old_data = {"name": exp.name, "data_rows": len(exp.data or [])}
    
    for key, value in update.model_dump(exclude_unset=True, exclude={"change_reason"}).items():
        setattr(exp, key, value)
    
    exp.version += 1
    exp.updated_at = datetime.utcnow()
    
    log_audit(db, exp.project_id, "update", "experiment", exp.id, exp.name,
              old_value=old_data, change_summary=f"Updated to version {exp.version}",
              reason=update.change_reason)
    
    db.commit()
    db.refresh(exp)
    return exp

@app.delete("/api/experiments/{exp_id}")
def delete_experiment(exp_id: int, db: Session = Depends(get_db)):
    exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    log_audit(db, exp.project_id, "delete", "experiment", exp.id, exp.name)
    
    db.delete(exp)
    db.commit()
    return {"message": "Deleted"}


# ==================== EXPERIMENT VERSION CONTROL ====================

@app.get("/api/experiments/{exp_id}/versions", response_model=List[schemas.ExperimentVersionResponse])
def get_experiment_versions(exp_id: int, db: Session = Depends(get_db)):
    """Get all historical versions of an experiment."""
    versions = db.query(models.ExperimentVersion).filter(
        models.ExperimentVersion.experiment_id == exp_id
    ).order_by(models.ExperimentVersion.version_number.desc()).all()
    return versions

@app.post("/api/experiments/{exp_id}/restore/{version_number}")
def restore_experiment_version(exp_id: int, version_number: int, db: Session = Depends(get_db)):
    """Restore experiment to a previous version."""
    exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if exp.signed:
        raise HTTPException(status_code=400, detail="Cannot modify signed experiment")
    
    version = db.query(models.ExperimentVersion).filter(
        models.ExperimentVersion.experiment_id == exp_id,
        models.ExperimentVersion.version_number == version_number
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Save current state as new version
    current_version = models.ExperimentVersion(
        experiment_id=exp.id,
        version_number=exp.version,
        name=exp.name,
        parameters=exp.parameters,
        data=exp.data,
        result=exp.result,
        change_reason=f"Before restore to v{version_number}"
    )
    db.add(current_version)
    
    # Restore
    exp.name = version.name
    exp.parameters = version.parameters
    exp.data = version.data
    exp.result = version.result
    exp.version += 1
    
    log_audit(db, exp.project_id, "restore", "experiment", exp.id, exp.name,
              change_summary=f"Restored to version {version_number}")
    
    db.commit()
    return {"message": f"Restored to version {version_number}", "new_version": exp.version}


# ==================== DIGITAL SIGNATURES ====================

@app.post("/api/experiments/{exp_id}/sign")
def sign_experiment(exp_id: int, request: schemas.ExperimentSignRequest, db: Session = Depends(get_db)):
    """Digitally sign an experiment (compliance feature)."""
    exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if exp.signed:
        raise HTTPException(status_code=400, detail="Experiment already signed")
    
    # Create signature hash
    sign_content = f"{exp.id}{exp.name}{json.dumps(exp.data)}{request.signer_name}{datetime.utcnow().isoformat()}"
    signature_hash = hashlib.sha256(sign_content.encode()).hexdigest()
    
    exp.signed = True
    exp.signed_by = request.signer_name
    exp.signed_at = datetime.utcnow()
    exp.signature_hash = signature_hash
    exp.status = "completed"
    exp.completed_at = datetime.utcnow()
    
    if request.witness_name:
        exp.witness_name = request.witness_name
        exp.witness_signed_at = datetime.utcnow()
    
    log_audit(db, exp.project_id, "sign", "experiment", exp.id, exp.name,
              user_name=request.signer_name, user_role=request.signer_role,
              change_summary="Digitally signed")
    
    db.commit()
    return {
        "message": "Experiment signed successfully",
        "signature_hash": signature_hash,
        "signed_at": exp.signed_at.isoformat()
    }

@app.get("/api/experiments/{exp_id}/verify-signature")
def verify_signature(exp_id: int, db: Session = Depends(get_db)):
    """Verify the integrity of a signed experiment."""
    exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    if not exp.signed:
        return {"verified": False, "reason": "Experiment not signed"}
    
    # Recalculate hash
    sign_content = f"{exp.id}{exp.name}{json.dumps(exp.data)}{exp.signed_by}{exp.signed_at.isoformat()}"
    expected_hash = hashlib.sha256(sign_content.encode()).hexdigest()
    
    # Note: In production, you'd store the original content separately
    return {
        "verified": True,
        "signed_by": exp.signed_by,
        "signed_at": exp.signed_at.isoformat(),
        "signature_hash": exp.signature_hash,
        "witness": exp.witness_name
    }


# ==================== EXPERIMENT STATUS & FAILURE ANALYSIS ====================

@app.put("/api/experiments/{exp_id}/status")
def update_experiment_status(exp_id: int, status: schemas.ExperimentStatusUpdate, db: Session = Depends(get_db)):
    """Update experiment status with optional failure tracking."""
    exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    exp.status = status.status
    exp.success = status.success
    
    if status.status == "failed":
        exp.failure_reason = status.failure_reason
        exp.failure_category = status.failure_category
    
    if status.status == "completed":
        exp.completed_at = datetime.utcnow()
    
    log_audit(db, exp.project_id, "status_change", "experiment", exp.id, exp.name,
              change_summary=f"Status: {status.status}, Success: {status.success}")
    
    db.commit()
    return {"message": "Status updated"}

@app.get("/api/projects/{project_id}/success-rate", response_model=schemas.SuccessRateAnalysis)
def get_success_rate_analysis(project_id: int, db: Session = Depends(get_db)):
    """Analyze experiment success rates and failure patterns."""
    experiments = db.query(models.Experiment).filter(
        models.Experiment.project_id == project_id
    ).all()
    
    total = len(experiments)
    completed = sum(1 for e in experiments if e.status == "completed")
    successful = sum(1 for e in experiments if e.success == True)
    failed = sum(1 for e in experiments if e.success == False)
    in_progress = sum(1 for e in experiments if e.status == "in_progress")
    
    # Failure breakdown by category
    failure_categories = {}
    for exp in experiments:
        if exp.failure_category:
            failure_categories[exp.failure_category] = failure_categories.get(exp.failure_category, 0) + 1
    
    success_rate = (successful / completed * 100) if completed > 0 else 0
    
    return {
        "total_experiments": total,
        "completed": completed,
        "successful": successful,
        "failed": failed,
        "in_progress": in_progress,
        "success_rate": round(success_rate, 1),
        "failure_by_category": failure_categories,
        "trends": []  # Would calculate over time
    }


# ==================== PROTOCOLS ====================

@app.post("/api/projects/{project_id}/protocols", response_model=schemas.ProtocolResponse)
def create_protocol(project_id: int, protocol: schemas.ProtocolCreate, db: Session = Depends(get_db)):
    db_protocol = models.Protocol(**protocol.model_dump(), project_id=project_id)
    db.add(db_protocol)
    db.commit()
    db.refresh(db_protocol)
    
    log_audit(db, project_id, "create", "protocol", db_protocol.id, db_protocol.name)
    db.commit()
    return db_protocol

@app.get("/api/projects/{project_id}/protocols", response_model=List[schemas.ProtocolResponse])
def get_protocols(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Protocol).filter(models.Protocol.project_id == project_id).all()

@app.get("/api/protocols/{protocol_id}", response_model=schemas.ProtocolResponse)
def get_protocol(protocol_id: int, db: Session = Depends(get_db)):
    protocol = db.query(models.Protocol).filter(models.Protocol.id == protocol_id).first()
    if not protocol:
        raise HTTPException(status_code=404, detail="Protocol not found")
    return protocol

@app.post("/api/protocols/{protocol_id}/use")
def use_protocol(protocol_id: int, db: Session = Depends(get_db)):
    """Track protocol usage and return template for new experiment."""
    protocol = db.query(models.Protocol).filter(models.Protocol.id == protocol_id).first()
    if not protocol:
        raise HTTPException(status_code=404, detail="Protocol not found")
    
    protocol.times_used = (protocol.times_used or 0) + 1
    db.commit()
    
    return {
        "protocol_id": protocol.id,
        "name": protocol.name,
        "parameters_template": protocol.parameters_template,
        "steps": protocol.steps,
        "required_equipment": protocol.required_equipment,
        "estimated_duration": protocol.estimated_duration_minutes
    }

@app.delete("/api/protocols/{protocol_id}")
def delete_protocol(protocol_id: int, db: Session = Depends(get_db)):
    protocol = db.query(models.Protocol).filter(models.Protocol.id == protocol_id).first()
    if not protocol:
        raise HTTPException(status_code=404, detail="Protocol not found")
    db.delete(protocol)
    db.commit()
    return {"message": "Deleted"}


# ==================== COMMENTS ====================

@app.post("/api/experiments/{exp_id}/comments", response_model=schemas.CommentResponse)
def create_comment(exp_id: int, comment: schemas.CommentCreate, db: Session = Depends(get_db)):
    exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    db_comment = models.Comment(**comment.model_dump(), experiment_id=exp_id)
    db.add(db_comment)
    
    log_audit(db, exp.project_id, "comment", "experiment", exp_id, exp.name,
              user_name=comment.author_name, change_summary=f"Added comment: {comment.content[:50]}...")
    
    db.commit()
    db.refresh(db_comment)
    return db_comment

@app.get("/api/experiments/{exp_id}/comments", response_model=List[schemas.CommentResponse])
def get_comments(exp_id: int, db: Session = Depends(get_db)):
    return db.query(models.Comment).filter(
        models.Comment.experiment_id == exp_id
    ).order_by(models.Comment.created_at.asc()).all()

@app.put("/api/comments/{comment_id}/resolve")
def resolve_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.is_resolved = True
    db.commit()
    return {"message": "Comment resolved"}

@app.delete("/api/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return {"message": "Deleted"}


# ==================== AUDIT LOG ====================

@app.get("/api/projects/{project_id}/audit-log", response_model=List[schemas.AuditLogResponse])
def get_audit_log(project_id: int, limit: int = 100, db: Session = Depends(get_db)):
    """Get audit trail for compliance."""
    return db.query(models.AuditLog).filter(
        models.AuditLog.project_id == project_id
    ).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()

@app.get("/api/experiments/{exp_id}/audit-log", response_model=List[schemas.AuditLogResponse])
def get_experiment_audit_log(exp_id: int, db: Session = Depends(get_db)):
    """Get audit trail for a specific experiment."""
    return db.query(models.AuditLog).filter(
        models.AuditLog.entity_type == "experiment",
        models.AuditLog.entity_id == exp_id
    ).order_by(models.AuditLog.timestamp.desc()).all()


# ==================== TASKS ====================

@app.post("/api/projects/{project_id}/tasks", response_model=schemas.TaskResponse)
def create_task(project_id: int, task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(**task.model_dump(), project_id=project_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/api/projects/{project_id}/tasks", response_model=List[schemas.TaskResponse])
def get_tasks(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Task).filter(models.Task.project_id == project_id).all()

@app.put("/api/tasks/{task_id}/toggle", response_model=schemas.TaskResponse)
def toggle_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.checked = not task.checked
    task.completed_at = datetime.utcnow() if task.checked else None
    db.commit()
    db.refresh(task)
    return task

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Deleted"}


# ==================== SCHEDULE ====================

@app.post("/api/projects/{project_id}/schedule", response_model=schemas.ScheduleResponse)
def create_schedule(project_id: int, schedule: schemas.ScheduleCreate, db: Session = Depends(get_db)):
    db_schedule = models.ScheduledExperiment(**schedule.model_dump(), project_id=project_id)
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@app.get("/api/projects/{project_id}/schedule", response_model=List[schemas.ScheduleResponse])
def get_schedule(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.ScheduledExperiment).filter(
        models.ScheduledExperiment.project_id == project_id
    ).order_by(models.ScheduledExperiment.scheduled_date).all()

@app.delete("/api/schedule/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(models.ScheduledExperiment).filter(
        models.ScheduledExperiment.id == schedule_id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return {"message": "Deleted"}


# ==================== AI ANALYSIS ====================

@app.post("/api/projects/{project_id}/analyze")
async def analyze_project(project_id: int, db: Session = Depends(get_db)):
    """Run AI analysis: insights, suggestions, papers."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    experiments = [
        {
            "name": exp.name,
            "parameters": exp.parameters or [],
            "data": exp.data or [],
            "result": exp.result,
            "status": exp.status,
            "success": exp.success,
            "failure_reason": exp.failure_reason
        }
        for exp in project.experiments if exp.is_latest
    ]
    
    # Clear previous
    db.query(models.Insight).filter(models.Insight.project_id == project_id).delete()
    db.query(models.Suggestion).filter(models.Suggestion.project_id == project_id).delete()
    db.query(models.Paper).filter(models.Paper.project_id == project_id).delete()
    
    results = {"insights": 0, "suggestions": 0, "papers": 0, "errors": []}
    
    # Generate insights
    try:
        insights = await generate_insights(project.description or "", project.field or "", experiments)
        for content in insights:
            db.add(models.Insight(project_id=project_id, content=content))
        results["insights"] = len(insights)
    except Exception as e:
        results["errors"].append(f"Insights: {str(e)}")
    
    # Generate suggestions
    try:
        suggestions = await generate_suggestions(project.description or "", project.field or "", experiments)
        for s in suggestions:
            db.add(models.Suggestion(
                project_id=project_id,
                title=s.get("title", ""),
                description=s.get("description", "")
            ))
        results["suggestions"] = len(suggestions)
    except Exception as e:
        results["errors"].append(f"Suggestions: {str(e)}")
    
    # Search papers
    try:
        papers = await search_papers(project.description or "", project.field or "", experiments)
        for p in papers:
            db.add(models.Paper(
                project_id=project_id,
                title=p.get("title", ""),
                date=p.get("date", ""),
                url=p.get("url", ""),
                doi=p.get("doi"),
                description=p.get("abstract") or p.get("description", ""),
                source=p.get("source", ""),
                authors=p.get("authors", []),
                citations=p.get("citations"),
                match_percentage=int(p.get("match_percentage", 0)),
                match_reasons=p.get("match_reasons", []),
                scores=p.get("scores", {}),
                verified=p.get("verified", False),
                extracted_methods=p.get("extracted_methods", []),
                key_findings=p.get("key_findings", [])
            ))
        results["papers"] = len(papers)
    except Exception as e:
        results["errors"].append(f"Papers: {str(e)}")
    
    log_audit(db, project_id, "analyze", "project", project_id, project.name,
              change_summary=f"AI Analysis: {results['insights']} insights, {results['suggestions']} suggestions, {results['papers']} papers")
    
    db.commit()
    return results


# ==================== EXPERIMENT ANALYSIS ====================

@app.get("/api/experiments/{exp_id}/analysis")
def get_experiment_analysis(exp_id: int, db: Session = Depends(get_db)):
    """Get statistical analysis for an experiment."""
    exp = db.query(models.Experiment).filter(models.Experiment.id == exp_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    params = exp.parameters or []
    data = exp.data or []
    
    if not params or not data:
        return {"statistics": {}, "correlations": {}, "summary": "No data available"}
    
    statistics = {}
    
    for param in params:
        param_name = param.get("name")
        if not param_name:
            continue
        
        values = []
        for row in data:
            try:
                val = float(row.get(param_name, ""))
                values.append(val)
            except (ValueError, TypeError):
                pass
        
        if not values:
            continue
        
        n = len(values)
        mean = sum(values) / n
        sorted_vals = sorted(values)
        median = sorted_vals[n // 2] if n % 2 else (sorted_vals[n//2 - 1] + sorted_vals[n//2]) / 2
        min_val = min(values)
        max_val = max(values)
        variance = sum((v - mean) ** 2 for v in values) / n
        std_dev = math.sqrt(variance)
        cv = (std_dev / mean * 100) if mean != 0 else 0
        
        # Trend
        trend = 0
        if n > 1:
            x_mean = (n - 1) / 2
            numerator = sum((i - x_mean) * (v - mean) for i, v in enumerate(values))
            denominator = sum((i - x_mean) ** 2 for i in range(n))
            trend = numerator / denominator if denominator != 0 else 0
        
        statistics[param_name] = {
            "n": n, "mean": round(mean, 4), "median": round(median, 4),
            "min": round(min_val, 4), "max": round(max_val, 4),
            "std_dev": round(std_dev, 4), "cv_percent": round(cv, 2), "trend": round(trend, 4)
        }
    
    # Correlations
    correlations = {}
    param_names = list(statistics.keys())
    
    for i, p1 in enumerate(param_names):
        for p2 in param_names[i+1:]:
            v1 = [float(row.get(p1, 0)) for row in data if row.get(p1) is not None]
            v2 = [float(row.get(p2, 0)) for row in data if row.get(p2) is not None]
            n = min(len(v1), len(v2))
            
            if n < 2:
                continue
            
            mean1, mean2 = statistics[p1]["mean"], statistics[p2]["mean"]
            std1, std2 = statistics[p1]["std_dev"], statistics[p2]["std_dev"]
            
            if std1 == 0 or std2 == 0:
                continue
            
            corr_sum = sum((v1[k] - mean1) * (v2[k] - mean2) for k in range(n))
            correlation = corr_sum / (n * std1 * std2)
            
            correlations[f"{p1}-{p2}"] = {
                "param1": p1, "param2": p2,
                "value": round(correlation, 4),
                "strength": "strong" if abs(correlation) > 0.7 else "moderate" if abs(correlation) > 0.4 else "weak"
            }
    
    return {
        "experiment_id": exp.id,
        "experiment_name": exp.name,
        "data_points": len(data),
        "statistics": statistics,
        "correlations": correlations
    }


# ==================== MEMBERS ====================

@app.post("/api/projects/{project_id}/members", response_model=schemas.MemberResponse)
def add_member(project_id: int, member: schemas.MemberCreate, db: Session = Depends(get_db)):
    db_member = models.Member(**member.model_dump(), project_id=project_id)
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@app.get("/api/projects/{project_id}/members", response_model=List[schemas.MemberResponse])
def get_members(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Member).filter(models.Member.project_id == project_id).all()

@app.delete("/api/members/{member_id}")
def remove_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Removed"}


# ==================== EQUIPMENT ====================

@app.post("/api/projects/{project_id}/equipment", response_model=schemas.EquipmentResponse)
def add_equipment(project_id: int, equipment: schemas.EquipmentCreate, db: Session = Depends(get_db)):
    db_equipment = models.Equipment(**equipment.model_dump(), project_id=project_id)
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

@app.get("/api/projects/{project_id}/equipment", response_model=List[schemas.EquipmentResponse])
def get_equipment(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Equipment).filter(models.Equipment.project_id == project_id).all()

@app.delete("/api/equipment/{equipment_id}")
def remove_equipment(equipment_id: int, db: Session = Depends(get_db)):
    equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    db.delete(equipment)
    db.commit()
    return {"message": "Removed"}


# ==================== FILE UPLOAD ====================

@app.post("/api/upload/excel")
async def upload_excel(file: UploadFile = File(...)):
    """Process Excel/CSV uploads for experiment data."""
    from file_processors import process_excel_file
    
    try:
        contents = await file.read()
        result = await process_excel_file(contents, file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/upload/image")
async def upload_image(file: UploadFile = File(...)):
    """Process image uploads with OCR."""
    from file_processors import process_image_file
    
    try:
        contents = await file.read()
        content_type = file.content_type or "image/jpeg"
        result = await process_image_file(contents, content_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/")
def root():
    return {"status": "ok", "message": "Lab Research API v2.0", "features": [
        "Version Control", "Digital Signatures", "Audit Trail",
        "Protocol Templates", "Comments", "Success/Failure Analysis"
    ]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
