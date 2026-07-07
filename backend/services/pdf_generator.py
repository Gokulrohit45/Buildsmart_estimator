import io
import math
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Page layout setup
PAGE_W, PAGE_H = A4
MARGIN = 1.5 * cm
CONTENT_W = PAGE_W - 2 * MARGIN

# Colors - Curated Teal / Slate color scheme matching frontend aesthetics
C_DARK = colors.HexColor("#0f172a")
C_PRIMARY = colors.HexColor("#0f766e")
C_WHITE = colors.white
C_GRAY50 = colors.HexColor("#f9fafb")
C_GRAY100 = colors.HexColor("#f3f4f6")
C_GRAY200 = colors.HexColor("#e5e7eb")
C_GRAY600 = colors.HexColor("#4b5563")
C_GRAY800 = colors.HexColor("#1f2937")

# Typography helper
def S(name, **kw):
    return ParagraphStyle(name, **kw)

# Standard Paragraph Styles
TITLE = S('title', fontName='Helvetica-Bold', fontSize=22, leading=26, textColor=C_WHITE, alignment=TA_CENTER)
SUB = S('sub', fontName='Helvetica', fontSize=10, leading=14, textColor=C_GRAY200, alignment=TA_CENTER)
H1 = S('h1', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=C_DARK, spaceBefore=14, spaceAfter=6)
H2 = S('h2', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=C_PRIMARY, spaceBefore=10, spaceAfter=4)
BODY = S('body', fontName='Helvetica', fontSize=8.5, leading=12, textColor=C_GRAY600)
BODYB = S('bodyb', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=C_GRAY800)

# Table cell styles
TC = S('tc', fontName='Helvetica', fontSize=8, leading=11, textColor=C_GRAY600)
TCB = S('tcb', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=C_GRAY800)
TCH = S('tch', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=C_WHITE, alignment=TA_CENTER)
TCPRI = S('tcpri', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=C_PRIMARY)

def format_inr(value):
    try:
        val = float(value)
        return f"Rs. {val:,.2f}".replace(".00", "")
    except Exception:
        return f"Rs. {value}"

def generate_estimate_pdf(estimate, items):
    """
    Generate a beautifully formatted PDF binary byte stream of the estimate report.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=MARGIN, leftMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
        title="Cost Estimate Report - Buildsmart 360",
        author="Buildsmart 360",
    )

    story = []
    
    # 1. Premium Header Banner
    banner_data = [
        [Paragraph("Buildsmart 360", TITLE)],
        [Spacer(1, 0.1 * cm)],
        [Paragraph("DETAILED CONSTRUCTION COST ESTIMATE & BILL OF QUANTITIES (BOQ)", SUB)]
    ]
    banner_table = Table(banner_data, colWidths=[CONTENT_W])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 16),
        ('BOTTOMPADDING', (0,0), (-1,-1), 16),
        ('LEFTPADDING', (0,0), (-1,-1), 20),
        ('RIGHTPADDING', (0,0), (-1,-1), 20),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 0.6 * cm))

    # Parse JSON properties safely
    inj = estimate.get('input_json') or {}
    outj = estimate.get('output_json') or {}
    
    builder_company = inj.get('builder_company_name') or "Builder Account"
    customer_name = inj.get('customer_name') or "Valued Client"
    project_name = inj.get('project_name') or "Residential Villa"
    location = f"{inj.get('city', '')}, {inj.get('state', '')}"
    quality_tier = inj.get('quality') or "Standard"
    total_area = inj.get('total_sqft') or estimate.get('total_sqft') or "1500"
    date_str = estimate.get('generated_at', '').split('T')[0] if estimate.get('generated_at') else "Recent"
    
    # 2. Project Specifications Summary Table (2-Column Grid Layout)
    story.append(Paragraph("1. Project & Builder Specification", H1))
    spec_data = [
        [Paragraph("<b>Project/Site Name:</b>", BODY), Paragraph(project_name, BODY),
         Paragraph("<b>Builder Company:</b>", BODY), Paragraph(builder_company, BODY)],
        [Paragraph("<b>Customer Name:</b>", BODY), Paragraph(customer_name, BODY),
         Paragraph("<b>Location/Address:</b>", BODY), Paragraph(location, BODY)],
        [Paragraph("<b>Quality Tier:</b>", BODY), Paragraph(quality_tier, BODY),
         Paragraph("<b>Total Built-up Area:</b>", BODY), Paragraph(f"{total_area} Sqft", BODY)],
        [Paragraph("<b>Quotation Date:</b>", BODY), Paragraph(date_str, BODY),
         Paragraph("<b>Contingency Margins:</b>", BODY), Paragraph(f"{estimate.get('contingency_pct', 5)}%", BODY)]
    ]
    spec_table = Table(spec_data, colWidths=[CONTENT_W*0.18, CONTENT_W*0.32, CONTENT_W*0.18, CONTENT_W*0.32])
    spec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_GRAY50),
        ('GRID', (0,0), (-1,-1), 0.5, C_GRAY200),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(spec_table)
    story.append(Spacer(1, 0.6 * cm))

    # 3. Cost Summary Grid
    story.append(Paragraph("2. Financial Cost Summary", H1))
    grand_total = estimate.get('grand_total') or 0
    subtotal = estimate.get('subtotal') or 0
    contingency = estimate.get('contingency_amount') or 0
    gst = estimate.get('gst_amount') or 0
    
    cost_summary_data = [
        [Paragraph("Estimate Description", TCH), Paragraph("Amount (INR)", TCH)],
        [Paragraph("Base Construction Subtotal (Material & Labour)", TC), Paragraph(format_inr(subtotal), TCB)],
        [Paragraph(f"Contingency Buffer ({estimate.get('contingency_pct', 5)}%)", TC), Paragraph(format_inr(contingency), TCB)],
        [Paragraph(f"Estimated Taxes / GST ({estimate.get('gst_pct', 18)}%)", TC), Paragraph(format_inr(gst), TCB)],
        [Paragraph("<b>Grand Total Estimate (Turnkey Pricing)</b>", TCPRI), Paragraph(f"<b>{format_inr(grand_total)}</b>", TCPRI)]
    ]
    cost_summary_table = Table(cost_summary_data, colWidths=[CONTENT_W*0.7, CONTENT_W*0.3])
    cost_summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, C_GRAY200),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [C_WHITE, C_GRAY50]),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(cost_summary_table)
    story.append(Spacer(1, 0.4 * cm))

    # Duration note
    min_months = estimate.get('duration_min') or 8
    max_months = estimate.get('duration_max') or 10
    duration_str = f"Estimated project duration is <b>{min_months} to {max_months} months</b> depending on site execution speeds and weather delays."
    story.append(Paragraph(duration_str, BODY))
    story.append(Spacer(1, 0.6 * cm))

    # 4. Detailed BOQ Table
    story.append(Paragraph("3. Itemized Bill of Quantities (BOQ)", H1))
    
    # Header for BOQ table
    boq_headers = [
        Paragraph("Code", TCH),
        Paragraph("Item Name / Description", TCH),
        Paragraph("Qty", TCH),
        Paragraph("Unit", TCH),
        Paragraph("Rate", TCH),
        Paragraph("Amount", TCH)
    ]
    
    boq_col_widths = [
        CONTENT_W * 0.12,  # Code
        CONTENT_W * 0.48,  # Description
        CONTENT_W * 0.08,  # Qty
        CONTENT_W * 0.08,  # Unit
        CONTENT_W * 0.11,  # Rate
        CONTENT_W * 0.13   # Amount
    ]

    # Group items by category to make it extremely readable
    categories = ['Civil Works', 'Labour', 'Flooring', 'Painting', 'Electrical', 'Plumbing', 'Interiors', 'Additional Works']
    
    for cat in categories:
        cat_items = [x for x in items if x.get('category') == cat]
        if not cat_items:
            continue
            
        story.append(Paragraph(f"<b>Category: {cat}</b>", H2))
        
        table_rows = [boq_headers]
        for it in cat_items:
            # Format unit mapping
            unit_display = it.get('unit', '')
            qty_display = float(it.get('quantity') or it.get('qty') or 0.0)
            rate_display = float(it.get('rate') or 0.0)
            amount_display = float(it.get('amount') or 0.0)
            
            # Map cft -> Unit as per requirement if needed
            if unit_display.lower() == 'cft':
                unit_display = 'Unit'
                qty_display = round(qty_display / 100, 2)
            
            # Form paragraphs for description cell to enable auto-wrapping
            desc_text = it.get('name') or it.get('description') or 'Item'
            
            table_rows.append([
                Paragraph(it.get('item_code') or it.get('code') or '—', TC),
                Paragraph(desc_text, TC),
                Paragraph(f"{qty_display:,.2f}".rstrip('0').rstrip('.'), TC),
                Paragraph(unit_display, TC),
                Paragraph(format_inr(rate_display).replace("Rs. ", ""), TC),
                Paragraph(format_inr(amount_display).replace("Rs. ", ""), TCB)
            ])
            
        cat_table = Table(table_rows, colWidths=boq_col_widths)
        cat_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
            ('GRID', (0,0), (-1,-1), 0.5, C_GRAY200),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_GRAY50]),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(cat_table)
        story.append(Spacer(1, 0.4 * cm))

    # Page Header/Footer Callback function for clean PDF page layout numbers
    def add_page_number(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(C_GRAY600)
        canvas.drawString(MARGIN, 0.6 * cm, "Buildsmart 360 - Generated via Cloud")
        page_num_str = f"Page {doc.page}"
        canvas.drawRightString(PAGE_W - MARGIN, 0.6 * cm, page_num_str)
        
        # Add subtle top header text (except first page)
        if doc.page > 1:
            canvas.drawString(MARGIN, PAGE_H - 1.0 * cm, f"Cost Estimate: {project_name} for {customer_name}")
            canvas.setStrokeColor(C_GRAY200)
            canvas.setLineWidth(0.5)
            canvas.line(MARGIN, PAGE_H - 1.1 * cm, PAGE_W - MARGIN, PAGE_H - 1.1 * cm)
            
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    
    # Return binary PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
