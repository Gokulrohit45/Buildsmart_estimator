import io
import math
import base64
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Image as RLImage
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

def clean_description(desc):
    import re
    # Remove "(Included in Package, Rate: Rs. ...)"
    desc = re.sub(r'\s*\(Included in Package,\s*Rate:\s*Rs\.[^)]+\)', '', desc)
    # Remove "(Included in Package)"
    desc = desc.replace(" (Included in Package)", "")
    desc = desc.replace("(Included in Package)", "")
    # Remove "(Cost Included in Package)"
    desc = desc.replace(" (Cost Included in Package)", "")
    desc = desc.replace("(Cost Included in Package)", "")
    # Remove ", Rate: Rs. ... /Sqft" or similar if any
    desc = re.sub(r',\s*Rate:\s*Rs\.[^)]+', '', desc)
    return desc.strip()

def generate_estimate_pdf(estimate, items, builder_name=None, builder_logo=None):
    """
    Generate a beautifully formatted PDF binary byte stream of the estimate report.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=MARGIN, leftMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
        title=f"Quotation - {builder_name or 'Buildsmart 360'}",
        author=builder_name or "Buildsmart 360",
    )

    story = []
    
    # 1. Builder Logo parsing
    logo_flowable = None
    if builder_logo:
        try:
            logo_str = builder_logo.strip()
            if logo_str.startswith("http://") or logo_str.startswith("https://"):
                import requests
                resp = requests.get(logo_str, timeout=5)
                if resp.status_code == 200:
                    img_file = io.BytesIO(resp.content)
                    logo_flowable = RLImage(img_file, width=1.5*cm, height=1.5*cm)
            else:
                import base64
                if "," in logo_str:
                    header, encoded = logo_str.split(",", 1)
                else:
                    encoded = logo_str
                img_data = base64.b64decode(encoded)
                img_file = io.BytesIO(img_data)
                logo_flowable = RLImage(img_file, width=1.5*cm, height=1.5*cm)
        except Exception as e:
            print(f"Error parsing builder logo in PDF: {e}")

    # 1. Premium Header Banner
    if logo_flowable:
        logo_flowable.hAlign = 'CENTER'
        banner_data = [
            [Paragraph(builder_name or "Buildsmart 360", TITLE)],
            [Spacer(1, 0.15 * cm)],
            [logo_flowable],
            [Spacer(1, 0.15 * cm)],
            [Paragraph("DETAILED CONSTRUCTION COST ESTIMATE & BILL OF QUANTITIES (BOQ)", SUB)]
        ]
        banner_table = Table(banner_data, colWidths=[CONTENT_W])
        banner_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), C_PRIMARY),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LEFTPADDING', (0,0), (-1,-1), 20),
            ('RIGHTPADDING', (0,0), (-1,-1), 20),
        ]))
    else:
        banner_data = [
            [Paragraph(builder_name or "Buildsmart 360", TITLE)],
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
    
    builder_company = builder_name or inj.get('builder_company_name') or "Builder Account"
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
    story.append(Spacer(1, 0.4 * cm))

    # Area calculation breakdown
    plot_length = float(inj.get("plot_length") or 0.0)
    plot_width = float(inj.get("plot_width") or 0.0)
    plot_area = plot_length * plot_width
    
    floors_list = inj.get("floors_list") or []
    floor_area_sum = sum(float(f.get("floor_area_sqft") or f.get("area") or (float(f.get("length") or 0) * float(f.get("width") or 0)) or 0) for f in floors_list)
    
    ground_coverage_floor = float(floors_list[0].get("floor_area_sqft") or (float(floors_list[0].get("length") or 0) * float(floors_list[0].get("width") or 0)) or 0.0) if floors_list else 0.0
    
    staircase_length = float(inj.get("staircase_length") or 0.0)
    staircase_width = float(inj.get("staircase_width") or 0.0)
    staircase_area = staircase_length * staircase_width
    
    portico_length = float(inj.get("portico_length") or 0.0)
    portico_width = float(inj.get("portico_width") or 0.0)
    portico_area = portico_length * portico_width
    
    total_builtup_area = floor_area_sum + portico_area + staircase_area
    ground_coverage_area = ground_coverage_floor + portico_area + staircase_area
    open_area = max(0.0, plot_area - ground_coverage_area)
    
    area_headers = [
        Paragraph("Specification", TCH),
        Paragraph("Calculated Area", TCH),
        Paragraph("Unit", TCH),
        Paragraph("Details / Formula", TCH)
    ]
    area_rows = [
        area_headers,
        [Paragraph("Plot Area", TC), Paragraph(f"{plot_area:,.2f}".rstrip('0').rstrip('.'), TC), Paragraph("Sqft", TC), Paragraph("Plot Length × Plot Width", TC)],
        [Paragraph("Ground Coverage Area", TC), Paragraph(f"{ground_coverage_area:,.2f}".rstrip('0').rstrip('.'), TC), Paragraph("Sqft", TC), Paragraph("Ground Floor Area + Portico + Staircase", TC)],
        [Paragraph("Open Area", TC), Paragraph(f"{open_area:,.2f}".rstrip('0').rstrip('.'), TC), Paragraph("Sqft", TC), Paragraph("Plot Area − Ground Coverage Area", TC)],
        [Paragraph("Total Built-up Area", TC), Paragraph(f"{total_builtup_area:,.2f}".rstrip('0').rstrip('.'), TC), Paragraph("Sqft", TC), Paragraph("Sum of all floors + Portico + Staircase", TC)],
        [Paragraph("Staircase Area", TC), Paragraph(f"{staircase_area:,.2f}".rstrip('0').rstrip('.'), TC), Paragraph("Sqft", TC), Paragraph("Staircase Length × Staircase Width", TC)],
        [Paragraph("Portico Area", TC), Paragraph(f"{portico_area:,.2f}".rstrip('0').rstrip('.'), TC), Paragraph("Sqft", TC), Paragraph("Portico Length × Portico Width", TC)]
    ]
    area_table = Table(area_rows, colWidths=[CONTENT_W * 0.25, CONTENT_W * 0.20, CONTENT_W * 0.15, CONTENT_W * 0.40])
    area_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, C_GRAY200),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_GRAY50]),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    story.append(Paragraph("1.1 Project Area Specifications", H2))
    story.append(area_table)
    story.append(Spacer(1, 0.4 * cm))

    # Room-wise breakdown
    rooms_list = inj.get("rooms_list") or []
    if rooms_list:
        room_headers = [
            Paragraph("Floor", TCH),
            Paragraph("Room Name", TCH),
            Paragraph("Dimensions", TCH),
            Paragraph("Area", TCH),
            Paragraph("Doors", TCH),
            Paragraph("Windows", TCH),
            Paragraph("Elec Points", TCH),
            Paragraph("Plumb Points", TCH)
        ]
        room_rows = [room_headers]
        for r in rooms_list:
            floor_num = r.get("floor_num", 1)
            floor_obj = next((f for f in floors_list if f.get("floor_num") == floor_num), None)
            floor_name = floor_obj.get("floor_name") or floor_obj.get("name") if floor_obj else f"Floor {floor_num}"
            
            door_count = sum(int(d.get('qty', 0)) for d in r.get('doors', []))
            window_count = sum(int(w.get('qty', 0)) for w in r.get('windows', []))
            
            elec = r.get('electrical') or {}
            elec_points = sum(int(elec.get(k) or 0) for k in ['light_points', 'fan_points', 'plug_points', 'switch_boards', 'ac_points', 'tv_points', 'geyser_points', 'exhaust_points', 'exterior_light_points'])
            
            plumb = r.get('plumbing') or {}
            plumb_points = sum(int(plumb.get(k) or 0) for k in ['wc', 'wash_basin', 'shower', 'faucet', 'drain', 'tap', 'sink', 'inlet', 'drain_point'])
            
            r_len = float(r.get('length') or 0.0)
            r_wid = float(r.get('width') or 0.0)
            dim_str = f"{r_len:,.1f}x{r_wid:,.1f} ft".replace(".0", "")
            area_str = f"{r_len*r_wid:,.1f} Sqft".replace(".0", "")
            
            room_rows.append([
                Paragraph(floor_name, TC),
                Paragraph(r.get('name', ''), TC),
                Paragraph(dim_str, TC),
                Paragraph(area_str, TC),
                Paragraph(str(door_count), TC),
                Paragraph(str(window_count), TC),
                Paragraph(str(elec_points), TC),
                Paragraph(str(plumb_points), TC)
            ])
            
        room_table = Table(room_rows, colWidths=[
            CONTENT_W * 0.15,  # Floor
            CONTENT_W * 0.22,  # Room Name
            CONTENT_W * 0.15,  # Dimensions
            CONTENT_W * 0.12,  # Area
            CONTENT_W * 0.08,  # Doors
            CONTENT_W * 0.08,  # Windows
            CONTENT_W * 0.10,  # Elec
            CONTENT_W * 0.10   # Plumb
        ])
        room_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
            ('GRID', (0,0), (-1,-1), 0.5, C_GRAY200),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_GRAY50]),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (4,1), (-1,-1), 'CENTER'),
        ]))
        
        story.append(Paragraph("1.2 Room-wise Specifications & Fixtures", H2))
        story.append(room_table)
        story.append(Spacer(1, 0.6 * cm))

    # 3. Stage-wise Cost Split Table
    story.append(PageBreak()) # Push completely to second page to avoid cutoffs
    story.append(Paragraph("2. Stage-wise Construction Cost Split", H1))
    
    civil_item = next((x for x in items if x.get('item_code') == 'CW-001' or x.get('code') == 'CW-001'), None)
    core_cost = float(civil_item.get('amount') or 0.0) if civil_item else float(estimate.get('subtotal') or 0.0)
    
    stages = [
        {
            "num": 1,
            "stage": "Foundation & Basement Stage",
            "pct": 20,
            "desc": "Includes site cleaning, excavation, PCC foundation bed, footing reinforcement steel, brick masonry up to plinth level, and plinth beam concreting.",
            "cost": round(core_cost * 0.20)
        },
        {
            "num": 2,
            "stage": "Concrete Slab & Structure Stage",
            "pct": 30,
            "desc": "Includes shuttering, reinforcement steel binding, column raising, beam layouts, and concrete casting for roof slabs.",
            "cost": round(core_cost * 0.30)
        },
        {
            "num": 3,
            "stage": "Brickwork & Plastering Stage",
            "pct": 20,
            "desc": "Includes internal and external wall brickwork/blockwork and double coat plastering.",
            "cost": round(core_cost * 0.20)
        },
        {
            "num": 4,
            "stage": "MEP (Electrical & Plumbing) Stage",
            "pct": 15,
            "desc": "Includes concealed wall piping, conduit laying, electrical box fixing, bathroom plumbing pipe layouts, and sanitary fittings.",
            "cost": round(core_cost * 0.15)
        },
        {
            "num": 5,
            "stage": "Finishing & Woodworks Stage",
            "pct": 15,
            "desc": "Includes general flooring tiling, wall painting, and doors & windows framing and shutter installations.",
            "cost": round(core_cost * 0.15)
        }
    ]
    
    stage_headers = [
        Paragraph("#", TCH),
        Paragraph("Stage", TCH),
        Paragraph("Percentage", TCH),
        Paragraph("Description", TCH),
        Paragraph("Estimated Cost", TCH)
    ]
    stage_col_widths = [
        CONTENT_W * 0.05,  # #
        CONTENT_W * 0.25,  # Stage
        CONTENT_W * 0.10,  # Percentage
        CONTENT_W * 0.45,  # Description
        CONTENT_W * 0.15   # Estimated Cost
    ]
    stage_rows = [stage_headers]
    for s in stages:
        stage_rows.append([
            Paragraph(f"<b>{s['num']}</b>", TC),
            Paragraph(f"<b>{s['stage']}</b>", TC),
            Paragraph(f"<b>{s['pct']}%</b>", TC),
            Paragraph(s['desc'], TC),
            Paragraph(f"<b>{format_inr(s['cost'])}</b>", TCB)
        ])
    stage_table = Table(stage_rows, colWidths=stage_col_widths)
    stage_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, C_GRAY200),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_GRAY50]),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(stage_table)
    story.append(Spacer(1, 0.4 * cm))

    # Duration note
    min_months = estimate.get('duration_min') or 8
    max_months = estimate.get('duration_max') or 10
    duration_str = f"Estimated project duration is <b>{min_months} to {max_months} months</b> depending on site execution speeds and weather delays."
    story.append(Paragraph(duration_str, BODY))
    story.append(Spacer(1, 0.6 * cm))

    # 4. Detailed BOQ Table
    story.append(Paragraph("3. Itemized Bill of Quantities (BOQ)", H1))
    
    # Header for BOQ table (Prices removed!)
    boq_headers = [
        Paragraph("Code", TCH),
        Paragraph("Item Name / Description", TCH),
        Paragraph("Qty", TCH),
        Paragraph("Unit", TCH)
    ]
    
    boq_col_widths = [
        CONTENT_W * 0.12,  # Code
        CONTENT_W * 0.64,  # Description
        CONTENT_W * 0.12,  # Qty
        CONTENT_W * 0.12   # Unit
    ]

    # Group items by category to make it extremely readable
    categories = ['Civil Works', 'Labour', 'Flooring', 'Painting', 'Electrical', 'Plumbing', 'Interiors', 'Additional Works']
    
    for cat in categories:
        cat_items = [x for x in items if x.get('category') == cat]
        if not cat_items:
            continue
            
        if cat == 'Painting':
            story.append(PageBreak()) # Push Painting to next page completely
            
        story.append(Paragraph(f"<b>Category: {cat}</b>", H2))
        
        table_rows = [boq_headers]
        for it in cat_items:
            # Format unit mapping
            unit_display = it.get('unit', '')
            qty_display = float(it.get('quantity') or it.get('qty') or 0.0)
            
            # Map cft -> Unit as per requirement
            if unit_display.lower() == 'cft':
                unit_display = 'Unit'
                qty_display = round(qty_display / 100, 2)
            
            # Form paragraphs for description cell to enable auto-wrapping & clean descriptions on the fly
            desc_text = it.get('name') or it.get('description') or 'Item'
            cleaned_desc = clean_description(desc_text)
            
            table_rows.append([
                Paragraph(it.get('item_code') or it.get('code') or '—', TC),
                Paragraph(cleaned_desc, TC),
                Paragraph(f"{qty_display:,.2f}".rstrip('0').rstrip('.'), TC),
                Paragraph(unit_display, TC)
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
        page_num_str = f"Page {doc.page}"
        canvas.drawRightString(PAGE_W - MARGIN, 0.6 * cm, page_num_str)
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    
    # Return binary PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
