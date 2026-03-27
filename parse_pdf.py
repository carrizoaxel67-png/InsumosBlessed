import pdfplumber
import sys

pdf_path = "Lista Perfumes Árabes COMPLETA Distribuidor 17 03 2026.xlsx -.pdf"
try:
    with pdfplumber.open(pdf_path) as pdf:
        for i in range(min(3, len(pdf.pages))):
            page = pdf.pages[i]
            text = page.extract_text()
            print(f"--- Page {i+1} Text ---")
            print(text[:1000] if text else "No text")
            
            tables = page.extract_tables()
            if tables:
                print(f"--- Page {i+1} Tables ---")
                for table in tables:
                    for row in table[:10]:
                        print(row)
except Exception as e:
    print("Error:", e)
