import pdfplumber
import json
import sys

pdf_path = "Lista Perfumes Árabes COMPLETA Distribuidor 17 03 2026.xlsx -.pdf"
products = []
try:
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Clean up rows where all columns might be None or empty strings
                    clean_row = [str(x).strip() if x is not None else "" for x in row]
                    if any(clean_row):
                        products.append(clean_row)

    with open("pdf_extracted.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print("Extraction successful")
except Exception as e:
    print("Error:", e)
