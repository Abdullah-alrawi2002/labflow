"""
AI Writing Service (Scribbr-like)
Generates manuscript drafts from structured experiment data
"""

import os
from typing import List, Dict
from datetime import datetime
from openai import AsyncOpenAI


class AIWritingService:
    """
    Service for generating academic manuscript sections from experiment data
    """

    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if self.openai_api_key:
            self.client = AsyncOpenAI(api_key=self.openai_api_key)
        else:
            self.client = None

    async def generate_methods_section(
        self,
        experiments: List[Dict],
        protocols: List[Dict],
        tone: str = "academic"
    ) -> str:
        """
        Generate Methods section from experiment and protocol data

        Args:
            experiments: List of experiment data dictionaries
            protocols: List of protocol data dictionaries
            tone: Writing style (academic, concise, detailed)

        Returns:
            Formatted methods section text
        """
        if not self.client:
            return "OpenAI API key not configured. Cannot generate methods section."

        # Construct structured prompt
        prompt = self._build_methods_prompt(experiments, protocols, tone)

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a scientific writing assistant. Generate clear, "
                            "objective Methods sections for academic papers. Use past tense, "
                            "passive voice, and include all relevant parameters and procedures."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Lower temperature for consistent, factual writing
                max_tokens=2000
            )

            content = response.choices[0].message.content
            return content

        except Exception as e:
            print(f"Error generating methods section: {e}")
            return f"Error generating methods: {str(e)}"

    async def generate_results_section(
        self,
        experiments: List[Dict],
        analyses: List[Dict],
        tone: str = "academic"
    ) -> str:
        """
        Generate Results section from experiment data and statistical analyses

        Args:
            experiments: List of experiment data dictionaries
            analyses: List of statistical analysis results
            tone: Writing style (academic, concise, detailed)

        Returns:
            Formatted results section text
        """
        if not self.client:
            return "OpenAI API key not configured. Cannot generate results section."

        # Construct structured prompt
        prompt = self._build_results_prompt(experiments, analyses, tone)

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a scientific writing assistant. Generate clear, "
                            "objective Results sections for academic papers. Present data "
                            "with statistical measures, use past tense, and avoid interpretation."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=2000
            )

            content = response.choices[0].message.content
            return content

        except Exception as e:
            print(f"Error generating results section: {e}")
            return f"Error generating results: {str(e)}"

    def _build_methods_prompt(
        self,
        experiments: List[Dict],
        protocols: List[Dict],
        tone: str
    ) -> str:
        """
        Construct detailed prompt for Methods section generation

        Args:
            experiments: Experiment data
            protocols: Protocol data
            tone: Writing style

        Returns:
            Formatted prompt string
        """
        prompt_parts = [
            f"Generate a {tone} Methods section based on the following experimental data:\n",
            "\n## PROTOCOLS USED:\n"
        ]

        # Add protocol information
        for i, protocol in enumerate(protocols, 1):
            prompt_parts.append(f"\n### Protocol {i}: {protocol.get('name', 'Unnamed')}\n")
            prompt_parts.append(f"Description: {protocol.get('description', 'N/A')}\n")
            prompt_parts.append(f"Category: {protocol.get('category', 'N/A')}\n")

            steps = protocol.get('steps', [])
            if steps:
                prompt_parts.append("\nSteps:\n")
                for step in steps:
                    step_num = step.get('order', '?')
                    step_title = step.get('title', 'N/A')
                    step_details = step.get('details', '')
                    duration = step.get('duration_minutes', '')
                    duration_str = f" ({duration} minutes)" if duration else ""
                    prompt_parts.append(f"{step_num}. {step_title}{duration_str}\n   {step_details}\n")

            # Materials
            materials = protocol.get('required_materials', [])
            if materials:
                prompt_parts.append("\nMaterials:\n")
                for mat in materials:
                    mat_name = mat.get('name', 'Unknown')
                    mat_qty = mat.get('quantity', '')
                    qty_str = f" ({mat_qty})" if mat_qty else ""
                    prompt_parts.append(f"- {mat_name}{qty_str}\n")

            # Equipment
            equipment = protocol.get('required_equipment', [])
            if equipment:
                prompt_parts.append(f"\nEquipment: {', '.join(equipment)}\n")

        # Add experiment-specific parameters
        prompt_parts.append("\n## EXPERIMENT PARAMETERS:\n")
        for i, exp in enumerate(experiments, 1):
            prompt_parts.append(f"\n### Experiment {i}: {exp.get('name', 'Unnamed')}\n")

            parameters = exp.get('parameters', [])
            if parameters:
                prompt_parts.append("Parameters measured:\n")
                for param in parameters:
                    param_name = param.get('name', 'Unknown')
                    param_unit = param.get('unit', '')
                    unit_str = f" ({param_unit})" if param_unit else ""
                    prompt_parts.append(f"- {param_name}{unit_str}\n")

            # Sample data point for context
            data = exp.get('data', [])
            if data:
                prompt_parts.append(f"\nSample data: {data[0]}\n")
                prompt_parts.append(f"Total measurements: {len(data)}\n")

        prompt_parts.append(
            "\n## INSTRUCTIONS:\n"
            "1. Write in past tense, passive voice\n"
            "2. Include all protocols, materials, and equipment\n"
            "3. Describe parameters measured\n"
            "4. Be concise but comprehensive\n"
            "5. Use standard academic formatting\n"
            "6. Do not include results or interpretation\n"
        )

        return "".join(prompt_parts)

    def _build_results_prompt(
        self,
        experiments: List[Dict],
        analyses: List[Dict],
        tone: str
    ) -> str:
        """
        Construct detailed prompt for Results section generation

        Args:
            experiments: Experiment data
            analyses: Statistical analysis results
            tone: Writing style

        Returns:
            Formatted prompt string
        """
        prompt_parts = [
            f"Generate a {tone} Results section based on the following experimental data:\n",
            "\n## EXPERIMENTAL DATA:\n"
        ]

        for i, exp in enumerate(experiments, 1):
            prompt_parts.append(f"\n### Experiment {i}: {exp.get('name', 'Unnamed')}\n")
            prompt_parts.append(f"Status: {exp.get('status', 'N/A')}\n")
            prompt_parts.append(f"Success: {exp.get('success', 'N/A')}\n")

            result_text = exp.get('result', '')
            if result_text:
                prompt_parts.append(f"\nObserved Result: {result_text}\n")

            data = exp.get('data', [])
            if data:
                prompt_parts.append(f"\nData points collected: {len(data)}\n")
                # Show first and last data points for context
                if len(data) > 1:
                    prompt_parts.append(f"First measurement: {data[0]}\n")
                    prompt_parts.append(f"Last measurement: {data[-1]}\n")
                else:
                    prompt_parts.append(f"Measurement: {data[0]}\n")

        # Add statistical analyses
        prompt_parts.append("\n## STATISTICAL ANALYSES:\n")
        for i, analysis in enumerate(analyses, 1):
            prompt_parts.append(f"\n### Analysis {i}:\n")
            for key, value in analysis.items():
                prompt_parts.append(f"{key}: {value}\n")

        prompt_parts.append(
            "\n## INSTRUCTIONS:\n"
            "1. Write in past tense\n"
            "2. Present data objectively without interpretation\n"
            "3. Include statistical measures (means, SDs, p-values)\n"
            "4. Reference figures/tables (e.g., 'Figure 1', 'Table 1')\n"
            "5. Be concise and precise\n"
            "6. Use standard scientific notation\n"
            "7. Do not include discussion or conclusions\n"
        )

        return "".join(prompt_parts)


# Singleton instance
writing_service = AIWritingService()
