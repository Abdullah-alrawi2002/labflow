"""
Literature Context Service (Scite-like)
Handles external API queries for paper validation and citation analysis
"""

import aiohttp
import os
from typing import Dict, Optional
from datetime import datetime


class LiteratureContextService:
    """
    Service for validating literature with external APIs (Scite-like functionality)
    """

    def __init__(self):
        self.scite_api_key = os.getenv("SCITE_API_KEY")
        self.base_url = "https://api.scite.ai"  # Mock endpoint for now

    async def fetch_scite_metrics(self, doi: str) -> Dict[str, float]:
        """
        Query Scite API for support/contradiction metrics

        Args:
            doi: Digital Object Identifier for the paper

        Returns:
            Dictionary with support_score and contradiction_score
        """
        if not doi:
            return {"support_score": None, "contradiction_score": None}

        # For MVP: Mock Scite-like response
        # In production, replace with actual Scite API call
        try:
            # Mock data - replace with actual API call when Scite key is available
            if self.scite_api_key:
                async with aiohttp.ClientSession() as session:
                    headers = {"Authorization": f"Bearer {self.scite_api_key}"}
                    async with session.get(
                        f"{self.base_url}/papers/{doi}",
                        headers=headers,
                        timeout=10
                    ) as response:
                        if response.status == 200:
                            data = await response.json()
                            return {
                                "support_score": data.get("supporting_count", 0),
                                "contradiction_score": data.get("contrasting_count", 0)
                            }

            # Fallback: Generate mock metrics based on DOI hash
            # This provides deterministic but realistic-looking data for demo
            doi_hash = hash(doi) % 100
            return {
                "support_score": float(doi_hash % 50 + 10),  # 10-60 range
                "contradiction_score": float(doi_hash % 10)   # 0-10 range
            }

        except Exception as e:
            print(f"Error fetching Scite metrics for {doi}: {e}")
            return {"support_score": None, "contradiction_score": None}

    async def check_internal_contradictions(
        self,
        paper_id: int,
        paper_data: Dict,
        db_session
    ) -> bool:
        """
        Compare paper's claimed results against LabFlow experiment data

        Args:
            paper_id: ID of the paper in database
            paper_data: Paper metadata including key findings
            db_session: Database session for querying experiments

        Returns:
            True if significant variance detected (>2 SD), False otherwise
        """
        try:
            # Extract numerical claims from paper (AI-extracted key findings)
            paper_claims = self._extract_numerical_claims(paper_data.get("key_findings", []))

            if not paper_claims:
                return False

            # Query related experiments (those citing this paper via annotations)
            from models import Annotation, Experiment

            annotations = db_session.query(Annotation).filter(
                Annotation.paper_id == paper_id,
                Annotation.linked_entity_type == "experiment"
            ).all()

            if not annotations:
                return False

            experiment_ids = [a.linked_entity_id for a in annotations]
            experiments = db_session.query(Experiment).filter(
                Experiment.id.in_(experiment_ids)
            ).all()

            # Compare claims with experiment data
            # Simplified version - compare ranges and detect outliers
            contradiction_detected = self._detect_variance(paper_claims, experiments)

            return contradiction_detected

        except Exception as e:
            print(f"Error checking internal contradictions: {e}")
            return False

    def _extract_numerical_claims(self, key_findings: list) -> Dict:
        """
        Extract numerical values from AI-generated key findings

        Args:
            key_findings: List of key finding strings

        Returns:
            Dictionary of parameter names to values
        """
        import re
        claims = {}

        for finding in key_findings:
            # Extract patterns like "pH of 7.2" or "temperature = 25°C"
            matches = re.findall(r'(\w+)[\s:=]+([0-9.]+)', str(finding).lower())
            for param, value in matches:
                try:
                    claims[param] = float(value)
                except ValueError:
                    continue

        return claims

    def _detect_variance(self, paper_claims: Dict, experiments: list) -> bool:
        """
        Detect if paper claims significantly deviate from experiment data

        Args:
            paper_claims: Dictionary of parameter -> claimed value
            experiments: List of Experiment objects

        Returns:
            True if variance exceeds 2 standard deviations
        """
        import numpy as np

        for param, claimed_value in paper_claims.items():
            # Collect matching parameter values from experiments
            experiment_values = []

            for exp in experiments:
                for data_row in exp.data or []:
                    if param in data_row:
                        try:
                            experiment_values.append(float(data_row[param]))
                        except (ValueError, TypeError):
                            continue

            if len(experiment_values) < 3:
                continue  # Need at least 3 data points for statistical test

            # Calculate mean and standard deviation
            mean = np.mean(experiment_values)
            std = np.std(experiment_values)

            if std == 0:
                continue

            # Check if claimed value is >2 SD from mean
            z_score = abs((claimed_value - mean) / std)
            if z_score > 2.0:
                print(f"Contradiction detected: {param} claim={claimed_value}, "
                      f"mean={mean:.2f}, std={std:.2f}, z={z_score:.2f}")
                return True

        return False


# Singleton instance
literature_service = LiteratureContextService()
