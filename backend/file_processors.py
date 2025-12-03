"""
File Processors - Excel and Image processing for experiment data
Uses OpenAI Vision API for OCR on images
"""

import os
import io
import re
import json
import base64
from typing import Dict, List, Any
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Try to import optional dependencies
PANDAS_AVAILABLE = False
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
    print("✓ pandas available for Excel processing")
except ImportError:
    print("⚠ pandas not installed. Excel processing will be limited.")

openai_client = None
try:
    from openai import OpenAI
    if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-your"):
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✓ OpenAI client available for image OCR")
    else:
        print("⚠ OpenAI API key not configured. Image OCR will be unavailable.")
except ImportError:
    print("⚠ OpenAI library not installed.")


async def process_excel_file(contents: bytes, filename: str) -> Dict[str, Any]:
    """
    Process Excel or CSV file and extract table data.
    Returns:
    {
        "parameters": [{"name": "Column1", "unit": ""}, ...],
        "data": [{"Column1": "value1", "Column2": "value2"}, ...]
    }
    """
    if not PANDAS_AVAILABLE:
        raise Exception("pandas library not installed. Run: pip install pandas openpyxl")
    
    # Determine file type and read
    ext = filename.split('.')[-1].lower() if filename else 'csv'
    
    try:
        if ext == 'csv':
            # Try different encodings
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(contents), encoding='latin-1')
        elif ext in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(contents))
        elif ext == 'tsv':
            df = pd.read_csv(io.BytesIO(contents), sep='\t')
        else:
            # Try to guess format
            try:
                df = pd.read_csv(io.BytesIO(contents))
            except:
                df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise Exception(f"Failed to read file: {str(e)}")
    
    # Check if we got any data
    if df.empty:
        raise Exception("File appears to be empty")
    
    # Clean column names
    df.columns = df.columns.astype(str).str.strip()
    
    # Extract parameters from column headers
    # Try to detect units in parentheses, e.g., "Temperature (°C)"
    parameters = []
    column_mapping = {}  # Map cleaned names back to original columns
    
    for col in df.columns:
        # Skip empty or unnamed columns
        if not col or col.startswith('Unnamed') or col.strip() == '':
            continue
            
        # Try to extract unit from column name
        unit_match = re.search(r'\(([^)]+)\)$', col)
        if unit_match:
            name = col[:unit_match.start()].strip()
            unit = unit_match.group(1)
        else:
            name = col.strip()
            unit = ""
        
        # Ensure unique names
        original_name = name
        counter = 1
        while any(p['name'] == name for p in parameters):
            name = f"{original_name}_{counter}"
            counter += 1
        
        parameters.append({"name": name, "unit": unit})
        column_mapping[name] = col
    
    if not parameters:
        raise Exception("No valid columns found in file")
    
    # Convert dataframe to list of dicts
    data = []
    for _, row in df.iterrows():
        row_data = {}
        has_value = False
        
        for param in parameters:
            original_col = column_mapping.get(param["name"], param["name"])
            
            try:
                val = row[original_col]
                # Handle NaN and convert to string
                if pd.isna(val):
                    row_data[param["name"]] = ""
                else:
                    row_data[param["name"]] = str(val).strip()
                    if row_data[param["name"]]:
                        has_value = True
            except KeyError:
                row_data[param["name"]] = ""
        
        # Only add rows with at least one value
        if has_value:
            data.append(row_data)
    
    if not data:
        raise Exception("No data rows found in file")
    
    return {
        "parameters": parameters[:50],  # Limit to 50 columns
        "data": data[:500]  # Limit to 500 rows
    }


async def process_image_file(contents: bytes, content_type: str) -> Dict[str, Any]:
    """
    Process an image of a data sheet using OpenAI Vision API.
    Extracts table structure and data using OCR.
    Returns:
    {
        "parameters": [{"name": "Column1", "unit": ""}, ...],
        "data": [{"Column1": "value1", "Column2": "value2"}, ...]
    }
    """
    if not openai_client:
        raise Exception(
            "OpenAI API key not configured. Add OPENAI_API_KEY to backend/.env file. "
            "Get a key at: https://platform.openai.com/api-keys"
        )
    
    # Convert image to base64
    base64_image = base64.b64encode(contents).decode('utf-8')
    
    # Determine media type
    if 'png' in content_type.lower():
        media_type = 'image/png'
    elif 'gif' in content_type.lower():
        media_type = 'image/gif'
    elif 'webp' in content_type.lower():
        media_type = 'image/webp'
    else:
        media_type = 'image/jpeg'
    
    prompt = """Analyze this image of a data table or spreadsheet. Extract the table structure and data.

Your task:
1. Identify all column headers (these become "parameters")
2. For each column, try to detect if there's a unit (like °C, kg, mL, pH, etc.)
3. Extract all data rows

Return a JSON object in this exact format:
{
    "parameters": [
        {"name": "Column Header 1", "unit": "unit if any or empty string"},
        {"name": "Column Header 2", "unit": ""}
    ],
    "data": [
        {"Column Header 1": "value1", "Column Header 2": "value2"},
        {"Column Header 1": "value3", "Column Header 2": "value4"}
    ]
}

Important:
- Use the exact column header names as keys in the data objects
- If you can't read a value clearly, use an empty string
- Extract ALL visible rows of data
- Return ONLY the JSON object, no other text
- Do not include markdown code blocks, just raw JSON"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{base64_image}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=4000,
            temperature=0.1
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'^```\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            result = json.loads(json_match.group())
            
            # Validate structure
            if "parameters" not in result:
                result["parameters"] = []
            if "data" not in result:
                result["data"] = []
            
            # Ensure parameters have required fields
            for param in result["parameters"]:
                if "name" not in param:
                    param["name"] = "Column"
                if "unit" not in param:
                    param["unit"] = ""
            
            if result["parameters"] or result["data"]:
                return {
                    "parameters": result["parameters"][:20],
                    "data": result["data"][:100]
                }
        
        raise Exception("Could not extract table data from image. Please try a clearer image with visible table structure.")
        
    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse extracted data: {str(e)}. Please try a clearer image.")
    except Exception as e:
        error_msg = str(e)
        if "API" in error_msg or "key" in error_msg.lower() or "auth" in error_msg.lower():
            raise Exception("OpenAI API error. Check your API key configuration in backend/.env")
        if "rate" in error_msg.lower():
            raise Exception("API rate limit reached. Please try again in a few moments.")
        raise Exception(f"Image processing failed: {error_msg}")
