import os
import json
import math
from datetime import datetime
from services.db import supabase_admin
import google.generativeai as genai

# Fallback recommendations database
STATIC_RECS = {
    "Bangalore": [
        {"type": "tip", "title": "AAC Blocks Recommended", "text": "Use AAC Blocks instead of Red Bricks to reduce structural dead load by ~30% — suitable for Bangalore's expansive soil conditions."},
        {"type": "warn", "title": "River Sand Scarcity", "text": "River sand is heavily regulated in Bangalore. Use M-Sand (Manufactured Sand) for all plastering and concrete — it is compliant and cost-effective."},
        {"type": "info", "title": "Steel Price Volatility", "text": "Steel prices in Bangalore fluctuate ±8% quarterly. Lock in rates with your vendor before pouring structural slabs."},
        {"type": "tip", "title": "Concrete Curing Period", "text": "Bangalore's moderate weather is ideal, but structural RCC elements still require 7 to 10 days of continuous water curing to reach full load capacity."},
        {"type": "warn", "title": "BBMP Plan Approval Buffer", "text": "Factor in a 45-day window for BBMP local body municipal sanction approvals before initiating excavation."}
    ],
    "Mumbai": [
        {"type": "tip", "title": "High Humidity Zone Plastering", "text": "Use waterproof cement additives (like Dr. Fixit) for all external plaster. Mumbai's coastal humidity increases structural dampness risks."},
        {"type": "warn", "title": "Monsoon Scheduling Caution", "text": "Avoid pouring slab concrete during peak monsoon months (June-September) to protect mortar integrity and prevent labor delays."},
        {"type": "info", "title": "Anti-Carbonation Exterior Paint", "text": "Applying anti-carbonation paints shields external brickwork from heavy coastal rain absorption and fungal growth."},
        {"type": "tip", "title": "High-Grade Fe550D Steel", "text": "For coastal high-humidity locations, use Fe550D grade steel with corrosion-resistant coatings to prevent internal reinforcement rust."},
        {"type": "warn", "title": "Plastering Micro-Cracks", "text": "Due to high marine moisture, curing must be carefully monitored to avoid hairline shrinkage cracks on external walls."}
    ],
    "Default": [
        {"type": "tip", "title": "Soil Testing Foundation Advice", "text": "Ensure professional soil bearing capacity (SBC) testing is done. Foundation designs on soft clay or black cotton soil require extra reinforcement."},
        {"type": "info", "title": "Milestone payments structure", "text": "Structure contractor payments by stages: Excavation (10%) -> Plinth (15%) -> Columns & Slabs (35%) -> Brickwork/Plaster (20%) -> Finish & Handover (20%)."},
        {"type": "warn", "title": "Plumbing Pressure Test", "text": "Conduct a mandatory hydraulic pressure test on all concealed water lines before tiling bathrooms and kitchens to avoid post-handover leaks."},
        {"type": "tip", "title": "PVC Electrical Conduits", "text": "Use fire-retardant low-smoke (FRLS) wires and heavy-gauge PVC conduits cast inside concrete columns/slabs for safety."},
        {"type": "info", "title": "Concrete Cover Blocks", "text": "Always place 25mm to 40mm concrete cover blocks under slab reinforcement meshes to prevent steel exposure and rust."}
    ]
}

# Location adjustment ratios relative to Bangalore = 1.08
LOCATION_RATIOS = {
    "Mumbai": 1.20,
    "Delhi": 1.15,
    "Bangalore": 1.08,
    "Hyderabad": 1.05,
    "Chennai": 1.03,
    "Pune": 1.07,
    "Ahmedabad": 0.95,
    "Kolkata": 0.92,
    "Coimbatore": 0.97,
    "Jaipur": 0.93,
    "Surat": 0.94,
    "Other": 1.00
}

def resolve_rates(city: str, state: str = None) -> dict:
    """
    Fetch baseline material rates for New Delhi from Supabase and scale them 
    using the Cost Index of the selected city.
    """
    # 1. Fetch the selected city's index from the database (baseline Delhi = 100)
    cost_index = 100.0
    try:
        query = supabase_admin.table("city_indexes").select("cost_index").eq("city", city)
        if state:
            query = query.eq("state", state)
        idx_res = query.execute()
        if idx_res.data and len(idx_res.data) > 0:
            cost_index = float(idx_res.data[0]["cost_index"])
    except Exception:
        # Fallback to hardcoded LOCATION_RATIOS if DB fails or city not found
        cost_index = LOCATION_RATIOS.get(city, 1.00) * 100.0

    multiplier = cost_index / 100.0
    rates = {}

    # 2. Fetch baseline Delhi DSR rates from database
    try:
        res_delhi = supabase_admin.table("material_rates").select("material_code, rate").eq("city", "Delhi").execute()
        if res_delhi.data and len(res_delhi.data) > 0:
            for item in res_delhi.data:
                rates[item["material_code"].lower()] = float(item["rate"]) * multiplier
            return rates
    except Exception:
        pass

    # 3. Code-level fallback baseline rates (Official Delhi DSR 2023 values)
    base_defaults = {
        "cement": 380.0, "steel": 64.0, "sand": 55.0, "aggregate": 48.0, "bricks": 45.0,
        "tiles": 68.0, "paint": 240.0, "electrical": 580.0, "plumbing": 1050.0, "labour": 220.0,
        "interior_basic": 85000.0, "interior_kitchen": 140000.0
    }
    
    for code, base_rate in base_defaults.items():
        rates[code] = base_rate * multiplier

    return rates

def generate_ai_recommendations(params: dict, results: dict = None) -> list:
    """Calls the Google Gemini API to generate 6-8 tailored tips/warnings or falls back to static recs."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("AQ."):
        location = params.get("city") or params.get("location", "Default")
        return STATIC_RECS.get(location, STATIC_RECS["Default"])

    # Extract calculated values for richer context
    costs = results.get("costs", {}) if results else {}
    quantities = results.get("quantities", {}) if results else {}
    duration = results.get("duration", {}) if results else {}
    
    total_cost_inr = costs.get("grandTotal", 0)
    civil_subtotal = costs.get("civilSubtotal", 0)
    flooring_subtotal = costs.get("flooringSubtotal", 0)
    interior_subtotal = costs.get("interiorSubtotal", 0)
    duration_months = f"{duration.get('min', 8)}-{duration.get('max', 10)}" if duration else "8-10"

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        You are an expert Indian civil engineer and cost estimator.
        Analyze these building parameters and calculated estimation results:
        
        INPUT PARAMETERS:
        - City/Location: {params.get('city') or params.get('location')}
        - Structure: {params.get('structure_type') or params.get('structureType', 'RCC Frame')}
        - Soil: {params.get('soil_type') or params.get('soilType', 'Normal Soil')}
        - Construction Quality Tier: {params.get('quality', 'Standard')}
        - Cement Brand: {params.get('cementBrand') or params.get('cement_brand', 'UltraTech')}
        - Steel Grade: {params.get('steelGrade') or params.get('steel_grade', 'Fe500')}
        - Brick Block Type: {params.get('brickType') or 'AAC Blocks'}
        - Flooring Rooms List: {params.get('flooring_rooms') or []}
        
        CALCULATED ESTIMATION RESULTS:
        - Total Estimated Budget (INR): ₹{total_cost_inr:,}
        - Civil Cost (INR): ₹{civil_subtotal:,}
        - Flooring Cost (INR): ₹{flooring_subtotal:,}
        - Interior Carpentry Cost (INR): ₹{interior_subtotal:,}
        - Cement Quantities Required: {quantities.get('cementBags', 0)} Bags
        - Steel Quantities Required: {quantities.get('steelKg', 0)} Kg
        - Estimated Construction Duration: {duration_months} Months
        
        Provide between 6 to 8 professional construction recommendations, tips, or warning alerts.
        Tailor them specifically to the values above (e.g. if flooring cost is high, suggest options; if soil is soft/black cotton, warn about foundation; if duration matches monsoons, warn about structural delays; give advice on cement/steel/brick selections).
        
        Return ONLY a raw JSON array matching this schema:
        [
          {{"type": "tip" | "warn" | "info", "title": "Short Header (5-8 words)", "text": "Detailed recommendation text tailored to this estimate."}}
        ]
        Do not include markdown tags. Return only valid raw JSON.
        """
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text.rsplit("\n", 1)[0]
            text = text.strip()
            if text.startswith("json"):
                text = text[4:].strip()

        recs = json.loads(text)
        if isinstance(recs, list) and len(recs) > 0:
            return recs
    except Exception as e:
        print(f"Gemini API failure: {str(e)}")
        
    location = params.get("city") or params.get("location", "Default")
    return STATIC_RECS.get(location, STATIC_RECS["Default"])

def calculate_estimate(params: dict) -> dict:
    """
    Main estimation calculator. Resolves factors and rates from database,
    computes BOQ items, calculates subtotals, timeline, and additional charges.
    """
    # 1. Resolve Location & Quality
    customer_name = params.get("customer_name") or params.get("customerName", "Client")
    city = params.get("city") or params.get("location", "Bangalore")
    state = params.get("state")
    quality = params.get("quality", "Standard")
    
    # Resolve structure & soil multipliers
    soil_type = params.get("soil_type") or params.get("soilType", "Normal Soil")
    soil_multiplier = {"Normal Soil": 1.0, "Soft Soil": 1.15, "Rocky Soil": 1.30, "Black Cotton Soil": 1.45}.get(soil_type, 1.0)
    
    structure_type = params.get("structure_type") or params.get("structureType", "RCC Frame")
    structure_multiplier = {"RCC Frame": 1.0, "Load Bearing": 0.85, "Steel Structure": 1.10, "Pre-Engineered Building": 1.05}.get(structure_type, 1.0)

    # 2. Area details & Dimensions parsing
    plot_length = float(params.get("plot_length") or params.get("plotLength") or 0.0)
    plot_width = float(params.get("plot_width") or params.get("plotWidth") or 0.0)
    plot_area = plot_length * plot_width

    floors_list = params.get("floors_list") or params.get("floorsList") or []
    floor_area_sum = sum(float(f.get("floor_area_sqft") or f.get("area") or 0) for f in floors_list)

    # Ground Coverage is the footprint of the Ground Floor
    ground_coverage = 0.0
    if floors_list:
        ground_coverage = float(floors_list[0].get("floor_area_sqft") or floors_list[0].get("area") or 0.0)
    else:
        building_length = float(params.get("building_length") or params.get("buildingLength") or 0.0)
        building_width = float(params.get("building_width") or params.get("buildingWidth") or 0.0)
        if building_length > 0 and building_width > 0:
            ground_coverage = building_length * building_width
        else:
            ground_coverage = floor_area_sum if floor_area_sum > 0 else 1200.0

    open_area = max(0.0, plot_area - ground_coverage)

    staircase_length = float(params.get("staircase_length") or params.get("staircaseLength") or 0.0)
    staircase_width = float(params.get("staircase_width") or params.get("staircaseWidth") or 0.0)
    staircase_area = staircase_length * staircase_width

    portico_length = float(params.get("portico_length") or params.get("porticoLength") or 0.0)
    portico_width = float(params.get("portico_width") or params.get("porticoWidth") or 0.0)
    portico_area = portico_length * portico_width

    builtup_area = float(params.get("builtup_area_sqft") or params.get("builtupAreaSqft") or 0)
    terrace_area = float(params.get("terrace_area_sqft") or params.get("terraceAreaSqft") or 0)
    balcony_area = float(params.get("balcony_area_sqft") or params.get("balconyAreaSqft") or 0)
    basement_area = float(params.get("basement_area_sqft") or params.get("basementAreaSqft") or 0)
    parking_area = float(params.get("parking_area_sqft") or params.get("parkingAreaSqft") or 0)
    
    if portico_area <= 0:
        portico_area = parking_area
    
    # The total built-up area input already includes all auxiliary areas (portico, balcony, basement, etc.).
    # We take the max of floor_area_sum and builtup_area and do not add any extra parameters.
    total_construction_area = max(floor_area_sum, builtup_area)
    if total_construction_area <= 0:
        total_construction_area = float(params.get("total_sqft") or params.get("totalSqft") or 1500)

    # Parse structural and opening parameters
    floor_height = float(params.get("floor_height") or params.get("floorHeight") or 10.0)
    front_elevation_area = float(params.get("front_elevation_area") or params.get("frontElevationArea") or 0.0)
    building_length = float(params.get("building_length") or params.get("buildingLength") or 0.0)
    building_width = float(params.get("building_width") or params.get("buildingWidth") or 0.0)

    door_win_rooms = params.get("door_win_rooms") or params.get("doorWinRooms") or []
    if not door_win_rooms:
        m_doors = int(params.get("main_doors") or params.get("mainDoors") or 1)
        i_doors = int(params.get("internal_doors") or params.get("internalDoors") or 6)
        wins = int(params.get("windows") or params.get("windowsCount") or 8)
        vents = int(params.get("ventilators") or params.get("ventilatorsCount") or 2)
        door_win_rooms = []
        if m_doors > 0:
            door_win_rooms.append({
                "room_name": "Main Entrance",
                "door_qty": m_doors,
                "door_material": "Teak Wood Door",
                "win_qty": 0,
                "win_material": "No Window",
                "vent_qty": 0,
                "vent_material": "No Ventilator"
            })
        if i_doors > 0 or wins > 0 or vents > 0:
            door_win_rooms.append({
                "room_name": "Rooms Fallback",
                "door_qty": i_doors,
                "door_material": "Laminated Flush Door",
                "win_qty": wins,
                "win_material": "UPVC Sliding Window",
                "vent_qty": vents,
                "vent_material": "Aluminium Louvered"
            })

    # Calculate deduction area for openings from the dynamic room configuration
    deduction_area = 0.0
    for r in door_win_rooms:
        d_qty = int(r.get("door_qty") or 0)
        w_qty = int(r.get("win_qty") or 0)
        v_qty = int(r.get("vent_qty") or 0)
        
        # Deduct standard dimensions
        d_mat = r.get("door_material", "Laminated Flush Door")
        d_size = 24.0 if "teak" in d_mat.lower() else 21.0
        
        deduction_area += (d_qty * d_size) + (w_qty * 16.0) + (v_qty * 4.0)

    # Calculate outer perimeter wall area
    floors = max(1, len(floors_list))
    total_height = floors * floor_height

    if building_length > 0 and building_width > 0:
        outer_perimeter = 2 * (building_length + building_width)
    else:
        # Fallback approximation based on average floor area
        avg_floor_area = floor_area_sum / floors if floors > 0 else (builtup_area if builtup_area > 0 else 1200)
        outer_perimeter = 4 * math.sqrt(avg_floor_area)
    
    outer_wall_area = outer_perimeter * total_height

    # Calculate inner partition wall area (estimate 35 Rft per room)
    bedrooms = int(params.get("bedrooms") or 3)
    bathrooms = int(params.get("bathrooms") or 2)
    living_rooms = int(params.get("living_rooms") or 1)
    dining_rooms = int(params.get("dining_rooms") or 1)
    kitchens = int(params.get("kitchens") or 1)
    pooja_rooms = int(params.get("pooja_rooms") or 0)
    study_rooms = int(params.get("study_rooms") or 0)
    store_rooms = int(params.get("store_rooms") or 0)
    porticos = int(params.get("porticos") or 0)
    
    total_rooms = bedrooms + bathrooms + living_rooms + dining_rooms + kitchens + pooja_rooms + study_rooms + store_rooms + porticos
    partition_perimeter = total_rooms * 35.0
    partition_wall_area = partition_perimeter * total_height

    net_wall_area = max(100.0, (outer_wall_area + partition_wall_area) - deduction_area)

    # 3. Load database factors
    res_factor = supabase_admin.table("estimation_factors").select("*").eq("quality_tier", quality).execute()
    if res_factor.data:
        factors = res_factor.data[0]
        qf = float(factors["factor"])
    else:
        qf_map = {"Budget": 0.90, "Standard": 1.00, "Premium": 1.15, "Luxury": 1.30, "Ultra Luxury": 1.50}
        qf = qf_map.get(quality, 1.00)
        factors = {
            "cement_factor": 0.45, "steel_factor": 4.00, "sand_factor": 1.20,
            "aggregate_factor": 0.90, "blocks_factor": 8.0, "paint_factor": 0.18, "tiles_wastage": 1.08
        }

    # 4. Resolve master rates & fallbacks
    rates = resolve_rates(city, state)
    
    # Resolve Cost Index Multiplier relative to Delhi (100.0)
    cost_index = 100.0
    try:
        query = supabase_admin.table("city_indexes").select("cost_index").eq("city", city)
        if state:
            query = query.eq("state", state)
        idx_res = query.execute()
        if idx_res.data and len(idx_res.data) > 0:
            cost_index = float(idx_res.data[0]["cost_index"])
    except Exception:
        cost_index = LOCATION_RATIOS.get(city, 1.00) * 100.0
    index_multiplier = cost_index / 100.0

    # Fetch Master tables and apply index multiplier
    # Fetch Master tables and apply index multiplier
    try:
        f_res = supabase_admin.table("flooring_master").select("*").execute()
        flooring_rates = {f["code"]: float(f["unit_rate"]) * index_multiplier for f in f_res.data} if f_res.data else {}
        flooring_wastages = {f["code"]: float(f["wastage_pct"]) for f in f_res.data} if f_res.data else {}
        
        # Merge database resolved codes with fallback text keys
        fallback_rates = {
            "vitrified_floor_tiles": 75.0,
            "ceramic_bathroom_floor_tiles": 55.0,
            "glazed_bathroom_wall_tiles": 65.0,
            "kitchen_dado_wall_tiles": 60.0,
            "portico_exterior_wall_tiles": 85.0,
            "heavy_duty_pavers_portico_floor": 90.0,
            "granite_stairs_counters": 180.0,
            "marble_flooring": 250.0,
            "wooden_laminate": 160.0,
            # Backwards compatibility
            "vitrified": 75.0,
            "ceramic": 50.0,
            "granite": 140.0,
            "marble": 220.0,
            "wooden": 180.0,
            "italian_marble": 480.0
        }
        for k, v in fallback_rates.items():
            if k not in flooring_rates:
                flooring_rates[k] = v * index_multiplier

        fallback_wastages = {
            "vitrified_floor_tiles": 8.0,
            "ceramic_bathroom_floor_tiles": 5.0,
            "glazed_bathroom_wall_tiles": 8.0,
            "kitchen_dado_wall_tiles": 6.0,
            "portico_exterior_wall_tiles": 10.0,
            "heavy_duty_pavers_portico_floor": 8.0,
            "granite_stairs_counters": 10.0,
            "marble_flooring": 12.0,
            "wooden_laminate": 8.0,
            # Backwards compatibility
            "vitrified": 8.0,
            "ceramic": 5.0,
            "granite": 10.0,
            "marble": 12.0,
            "wooden": 8.0,
            "italian_marble": 15.0
        }
        for k, v in fallback_wastages.items():
            if k not in flooring_wastages:
                flooring_wastages[k] = v
    except Exception:
        flooring_rates = {k: v * index_multiplier for k, v in {
            "vitrified_floor_tiles": 75.0,
            "ceramic_bathroom_floor_tiles": 55.0,
            "glazed_bathroom_wall_tiles": 65.0,
            "kitchen_dado_wall_tiles": 60.0,
            "portico_exterior_wall_tiles": 85.0,
            "heavy_duty_pavers_portico_floor": 90.0,
            "granite_stairs_counters": 180.0,
            "marble_flooring": 250.0,
            "wooden_laminate": 160.0,
            "vitrified": 75.0,
            "ceramic": 50.0,
            "granite": 140.0,
            "marble": 220.0,
            "wooden": 180.0,
            "italian_marble": 480.0
        }.items()}
        flooring_wastages = {
            "vitrified_floor_tiles": 8.0,
            "ceramic_bathroom_floor_tiles": 5.0,
            "glazed_bathroom_wall_tiles": 8.0,
            "kitchen_dado_wall_tiles": 6.0,
            "portico_exterior_wall_tiles": 10.0,
            "heavy_duty_pavers_portico_floor": 8.0,
            "granite_stairs_counters": 10.0,
            "marble_flooring": 12.0,
            "wooden_laminate": 8.0,
            "vitrified": 8.0,
            "ceramic": 5.0,
            "granite": 10.0,
            "marble": 12.0,
            "wooden": 8.0,
            "italian_marble": 15.0
        }

    try:
        p_res = supabase_admin.table("paint_master").select("*").execute()
        paint_rates = {p["code"]: float(p["unit_rate"]) * index_multiplier for p in p_res.data} if p_res.data else {}
        paint_coverages = {p["code"]: float(p["coverage_sqft"]) for p in p_res.data} if p_res.data else {}
    except Exception:
        paint_rates = {k: v * index_multiplier for k, v in {"interior_distemper": 80.0, "interior_emulsion": 280.0, "interior_royal": 420.0, "exterior_waterproof": 320.0, "exterior_premium": 450.0}.items()}
        paint_coverages = {"interior_distemper": 380.0, "interior_emulsion": 350.0, "interior_royal": 330.0, "exterior_waterproof": 320.0, "exterior_premium": 300.0}

    try:
        e_res = supabase_admin.table("electrical_master").select("*").execute()
        elec_rates = {e["code"]: float(e["unit_rate"]) * index_multiplier for e in e_res.data} if e_res.data else {}
    except Exception:
        elec_rates = {k: v * index_multiplier for k, v in {"light_points": 550.0, "fan_points": 600.0, "ac_points": 1800.0, "tv_points": 800.0, "geyser_points": 1500.0, "power_socket_points": 950.0, "inverter_points": 2200.0, "cctv_points": 3200.0, "internet_points": 1100.0, "doorbell_points": 600.0}.items()}

    try:
        pl_res = supabase_admin.table("plumbing_master").select("*").execute()
        plumb_rates = {p["code"]: float(p["unit_rate"]) * index_multiplier for p in pl_res.data} if pl_res.data else {}
    except Exception:
        plumb_rates = {k: v * index_multiplier for k, v in {"wash_basins": 4500.0, "western_toilets": 9500.0, "indian_toilets": 3500.0, "kitchen_sinks": 6500.0, "water_heaters": 12500.0, "taps": 1200.0, "overhead_tank_capacity": 8.0, "underground_sump_capacity": 12.0, "septic_tank_capacity": 15.0}.items()}

    try:
        i_res = supabase_admin.table("interior_master").select("*").execute()
        int_rates = {i["code"]: float(i["unit_rate"]) * index_multiplier for i in i_res.data} if i_res.data else {}
    except Exception:
        int_rates = {k: v * index_multiplier for k, v in {"modular_kitchen": 140000.0, "wardrobes": 45000.0, "tv_unit": 25000.0, "false_ceiling": 120.0, "shoe_rack": 12000.0, "study_table": 18000.0, "pooja_unit": 15000.0, "wallpaper": 4500.0, "curtains": 6500.0}.items()}

    try:
        ex_res = supabase_admin.table("exterior_master").select("*").execute()
        ext_rates = {x["code"]: float(x["unit_rate"]) * index_multiplier for x in ex_res.data} if ex_res.data else {}
    except Exception:
        ext_rates = {k: v * index_multiplier for k, v in {"compound_wall": 1500.0, "gate": 95.0}.items()}

    # 5. Civil Works Quantities & Cost (Turnkey Rate cost model)
    cement_bags = math.ceil(total_construction_area * 0.40)
    steel_kg = math.ceil(total_construction_area * 4.0)
    
    brick_type = params.get("brickType") or params.get("brick_type") or "AAC Blocks"
    if "aac" in brick_type.lower():
        brick_factor = 1.5
    elif "solid" in brick_type.lower() or "concrete" in brick_type.lower():
        brick_factor = 4.5
    else: # standard / fly ash / clay
        brick_factor = 14.0
    blocks_qty = math.ceil(total_construction_area * brick_factor)
    
    sand_cft = math.ceil(total_construction_area * 1.25)
    aggregate_cft = math.ceil(total_construction_area * 0.90)

    # Base pricing from Rate Master
    cement_cost = cement_bags * rates.get("cement", 380.0)
    steel_cost = steel_kg * rates.get("steel", 64.0)
    sand_cost = sand_cft * rates.get("sand", 55.0)
    aggregate_cost = aggregate_cft * rates.get("aggregate", 48.0)
    block_cost = blocks_qty * rates.get("bricks", 45.0)
    
    # Excavation and foundation scales by soil type multiplier on the ground floor footprint area
    foundation_qty = floors_list[0].get("floor_area_sqft") or floors_list[0].get("area") if floors_list else (builtup_area / floors if floors > 0 else 1200)
    foundation_qty = float(foundation_qty or 1200) + basement_area
    foundation_base_rate = 140.0
    foundation_cost = foundation_qty * foundation_base_rate * soil_multiplier * qf

    # Base rate and Base Turnkey House Cost calculation
    base_rate_map = {"Budget": 2200.0, "Standard": 2200.0, "Premium": 2600.0, "Luxury": 3500.0}
    base_rate = base_rate_map.get(quality, 2200.0) * index_multiplier
    base_house_cost = total_construction_area * base_rate

    # Front Elevation Cost Calculation (charged separately as extra)
    elevation_rate_map = {"Budget": 120.0, "Standard": 220.0, "Premium": 450.0, "Luxury": 850.0}
    elevation_rate = elevation_rate_map.get(quality, 220.0) * index_multiplier
    elevation_cost = front_elevation_area * elevation_rate

    # Basement Construction Cost (charged separately as extra)
    basement_cost = 0.0
    if basement_area > 0:
        basement_rate = base_rate * 0.85
        basement_cost = basement_area * basement_rate

    # 6. Flooring Calculation & Premium Upgrades (Standard vitrified is included in base rate)
    flooring_rooms = params.get("flooring_rooms") or []
    flooring_cost = 0.0
    flooring_boq = []
    
    vitrified_rate = flooring_rates.get("vitrified_floor_tiles", 75.0)

    if flooring_rooms:
        for idx, room in enumerate(flooring_rooms):
            r_name = room.get("room_name") or room.get("name") or f"Room {idx+1}"
            raw_type = (room.get("flooring_type") or room.get("type") or "vitrified").lower().strip()
            r_type = raw_type.replace(" ", "_").replace("/", "").replace("(", "").replace(")", "").replace("__", "_")
            r_brand = room.get("flooring_brand") or room.get("brand") or "Standard Brand"
            r_area = float(room.get("area_sqft") or room.get("area") or 0)
            
            rate = flooring_rates.get(r_type, 75.0)
            wastage_pct = flooring_wastages.get(r_type, 8.0)
            room_qty = math.ceil(r_area * (1.0 + wastage_pct / 100.0))
            
            # If premium is selected, charge only the rate upgrade difference
            upgrade_rate = max(0.0, rate - vitrified_rate)
            if upgrade_rate > 0.0:
                room_cost = room_qty * upgrade_rate
                flooring_cost += room_cost
                flooring_boq.append({
                    "category": "Flooring",
                    "code": f"FL-{100+idx+1}",
                    "description": f"Premium Flooring Upgrade: {r_name} ({r_brand} {room.get('flooring_type', 'Vitrified')})",
                    "unit": "Sqft",
                    "qty": room_qty,
                    "rate": round(upgrade_rate),
                    "amount": round(room_cost)
                })
            else:
                flooring_boq.append({
                    "category": "Flooring",
                    "code": f"FL-{100+idx+1}",
                    "description": f"Standard Flooring: {r_name} ({r_brand} {room.get('flooring_type', 'Vitrified')})",
                    "unit": "Sqft",
                    "qty": room_qty,
                    "rate": 0,
                    "amount": 0
                })
    else:
        flooring_boq.append({
            "category": "Flooring",
            "code": "FL-001",
            "description": "Standard Vitrified flooring",
            "unit": "Sqft",
            "qty": total_construction_area,
            "rate": 0,
            "amount": 0
        })

    # 7. Paint Calculations (Total 3.0x split: 2.4 interior, 0.6 exterior)
    int_paint_code = (params.get("paintType") or params.get("paint_type") or "interior_emulsion").lower().replace(" ", "_")
    int_rate = paint_rates.get(int_paint_code, 280.0)
    int_coverage = paint_coverages.get(int_paint_code, 350.0)
    int_paint_litres = math.ceil((total_construction_area * 2.4) / int_coverage)
    int_paint_cost = int_paint_litres * int_rate

    ext_paint_code = (params.get("exterior_paint_type") or params.get("exterior_paint_brand") or "exterior_waterproof").lower().replace(" ", "_")
    ext_rate = paint_rates.get(ext_paint_code, 320.0)
    ext_coverage = paint_coverages.get(ext_paint_code, 320.0)
    ext_paint_litres = math.ceil((total_construction_area * 0.6) / ext_coverage)
    ext_paint_cost = ext_paint_litres * ext_rate

    paint_cost = int_paint_cost + ext_paint_cost
    paint_litres = int_paint_litres + ext_paint_litres

    # 8. Electrical Details (Itemized, standard points are included in base rate)
    electrical_cost = 0.0
    electrical_boq = []
    elec_points_keys = [
        "light_points", "fan_points", "ac_points", "tv_points", "geyser_points",
        "power_socket_points", "inverter_points", "cctv_points", "internet_points", "doorbell_points"
    ]
    
    default_points = int(params.get("electricalPoints") or params.get("electrical_points") or math.ceil((total_construction_area / 120.0) * 10))
    electrical_boq.append({
        "category": "Electrical",
        "code": "EL-001",
        "description": "Standard switchboard electrical points & wiring fittings",
        "unit": "Points",
        "qty": default_points,
        "rate": 0,
        "amount": 0
    })
    
    # Premium socket upgrades (AC, Geyser, CCTV, Inverter, Internet) are charged separately
    for code in elec_points_keys:
        qty = int(params.get(code) or 0)
        if qty > 0 and code in ["ac_points", "geyser_points", "cctv_points", "inverter_points", "internet_points"]:
            rate = elec_rates.get(code, 1200.0)
            cost = qty * rate
            electrical_cost += cost
            electrical_boq.append({
                "category": "Electrical",
                "code": f"EL-{code[:4].upper()}",
                "description": f"Premium concealed socket & wiring for {code.replace('_', ' ').title()}",
                "unit": "Points",
                "qty": qty,
                "rate": round(rate),
                "amount": round(cost)
            })

    # 9. Plumbing Details (Standard bathroom fixtures included in base rate)
    plumbing_cost = 0.0
    plumbing_boq = []
    
    for code in ["wash_basins", "western_toilets", "indian_toilets", "kitchen_sinks", "taps"]:
        qty = int(params.get(code) or 0)
        if qty > 0:
            plumbing_boq.append({
                "category": "Plumbing",
                "code": f"PL-{code[:4].upper()}",
                "description": f"Standard water pipeline fittings for {code.replace('_', ' ').title()}",
                "unit": "Nos",
                "qty": qty,
                "rate": 0,
                "amount": 0
            })

    # Sump and Tanks are charged separately as extras
    oh_capacity = float(params.get("overhead_tank_capacity") or 0)
    if oh_capacity > 0:
        rate = plumb_rates.get("overhead_tank_capacity", 8.0)
        cost = oh_capacity * rate
        plumbing_cost += cost
        plumbing_boq.append({
            "category": "Plumbing",
            "code": "PL-OHTANK",
            "description": "Overhead HDPE water tank installation",
            "unit": "Litres",
            "qty": oh_capacity,
            "rate": round(rate),
            "amount": round(cost)
        })

    ug_capacity = float(params.get("underground_sump_capacity") or 0)
    if ug_capacity > 0:
        rate = plumb_rates.get("underground_sump_capacity", 12.0)
        cost = ug_capacity * rate
        plumbing_cost += cost
        plumbing_boq.append({
            "category": "Plumbing",
            "code": "PL-UGSUMP",
            "description": "Underground brick masonry water sump tank",
            "unit": "Litres",
            "qty": ug_capacity,
            "rate": round(rate),
            "amount": round(cost)
        })

    septic_capacity = float(params.get("septic_tank_capacity") or params.get("septicTankCapacity") or 2000.0)
    septic_rate = plumb_rates.get("septic_tank_capacity", 15.0)
    septic_cost = septic_capacity * septic_rate
    plumbing_cost += septic_cost
    plumbing_boq.append({
        "category": "Plumbing",
        "code": "PL-SEPTIC",
        "description": f"Mandatory Septic Tank installation ({septic_capacity:.0f} Litres)",
        "unit": "Litres",
        "qty": septic_capacity,
        "rate": round(septic_rate),
        "amount": round(septic_cost)
    })

    # 10. Interior Requirements (Priced separately)
    interior_cost = 0.0
    interior_boq = []
    interior_keys = ["modular_kitchen", "tv_unit", "shoe_rack", "study_table", "pooja_unit"]
    
    interior_quality = params.get("interiorQuality") or params.get("interior_quality") or "Standard"
    iqf = 0.90 if interior_quality == 'Budget' else (1.15 if interior_quality == 'Premium' else (1.30 if interior_quality == 'Luxury' else 1.00))

    for code in interior_keys:
        if params.get(code):
            rate = int_rates.get(code, 25000.0) * iqf
            interior_cost += rate
            interior_boq.append({
                "category": "Interiors",
                "code": f"IN-{code[:4].upper()}",
                "description": f"Custom laminated wooden modular {code.replace('_', ' ').title()}",
                "unit": "Job",
                "qty": 1,
                "rate": round(rate),
                "amount": round(rate)
            })

    wardrobes = int(params.get("wardrobes") or 0)
    if wardrobes > 0:
        rate = int_rates.get("wardrobes", 45000.0) * iqf
        cost = wardrobes * rate
        interior_cost += cost
        interior_boq.append({
            "category": "Interiors",
            "code": "IN-WARD",
            "description": "Custom built-in modular wardrobes",
            "unit": "Nos",
            "qty": wardrobes,
            "rate": round(rate),
            "amount": round(cost)
        })

    if params.get("false_ceiling"):
        rate = int_rates.get("false_ceiling", 120.0) * iqf
        area = math.ceil(total_construction_area * 0.40)
        cost = area * rate
        interior_cost += cost
        interior_boq.append({
            "category": "Interiors",
            "code": "IN-CEIL",
            "description": "Designer Gypsum False Ceiling layout",
            "unit": "Sqft",
            "qty": area,
            "rate": round(rate),
            "amount": round(cost)
        })

    wallpaper = int(params.get("wallpaper") or 0)
    if wallpaper > 0:
        rate = int_rates.get("wallpaper", 4500.0)
        cost = wallpaper * rate
        interior_cost += cost
        interior_boq.append({
            "category": "Interiors",
            "code": "IN-WALL",
            "description": "Imported texture designer wallpaper roll installation",
            "unit": "Rolls",
            "qty": wallpaper,
            "rate": round(rate),
            "amount": round(cost)
        })

    curtains = int(params.get("curtains") or 0)
    if curtains > 0:
        rate = int_rates.get("curtains", 6500.0)
        cost = curtains * rate
        interior_cost += cost
        interior_boq.append({
            "category": "Interiors",
            "code": "IN-CURT",
            "description": "Double track window drapes/curtain installations",
            "unit": "Windows",
            "qty": curtains,
            "rate": round(rate),
            "amount": round(cost)
        })

    # 11. Exterior Requirements (Priced separately)
    exterior_cost = 0.0
    exterior_boq = []
    
    compound_wall_rft = float(params.get("compound_wall") or params.get("compound_wall_rft") or 0)
    if compound_wall_rft > 0:
        rate = ext_rates.get("compound_wall", 1500.0)
        cost = compound_wall_rft * rate
        exterior_cost += cost
        exterior_boq.append({
            "category": "Exteriors",
            "code": "EX-WALL",
            "description": "Compound wall brickwork construction with plaster & gate pillars",
            "unit": "Rft",
            "qty": compound_wall_rft,
            "rate": round(rate),
            "amount": round(cost)
        })
        
    gate_weight = float(params.get("gate") or params.get("gate_weight_kg") or 0)
    if gate_weight > 0:
        rate = ext_rates.get("gate", 95.0)
        cost = gate_weight * rate
        exterior_cost += cost
        exterior_boq.append({
            "category": "Exteriors",
            "code": "EX-GATE",
            "description": "Main MS designer gate fabrication & installation",
            "unit": "Kg",
            "qty": gate_weight,
            "rate": round(rate),
            "amount": round(cost)
        })

    # 11.5. Doors & Windows Calculations (Upgrade rate difference only)
    door_win_subtotal = 0.0
    door_win_boq = []
    
    door_rates_map = {
        "Teak Wood Door": 22000.0,
        "Laminated Flush Door": 6500.0,
        "Waterproof PVC Door": 4500.0,
        "WPC Premium Door": 8500.0
    }
    win_rates_map = {
        "UPVC Sliding Window": 5000.0,
        "Aluminium Sliding Window": 3500.0,
        "Teak Wood Window & Shutter": 12000.0
    }
    vent_rates_map = {
        "Aluminium Louvered": 1800.0,
        "UPVC Glass Louvered": 2500.0
    }

    dw_idx = 1
    for r in door_win_rooms:
        room_name = r.get("room_name") or r.get("name") or "Room"
        
        d_qty = int(r.get("door_qty") or 0)
        d_mat = r.get("door_material") or "Laminated Flush Door"
        
        w_qty = int(r.get("win_qty") or 0)
        w_mat = r.get("win_material") or "UPVC Sliding Window"
        
        v_qty = int(r.get("vent_qty") or 0)
        v_mat = r.get("vent_material") or "Aluminium Louvered"
        
        # 1. Door Upgrade
        if d_qty > 0 and d_mat != "No Door / Open Arch":
            raw_door_rate = door_rates_map.get(d_mat, 6500.0)
            door_upgrade_rate = max(0.0, raw_door_rate - 6500.0) * index_multiplier
            if door_upgrade_rate > 0.0:
                cost = d_qty * door_upgrade_rate
                door_win_subtotal += cost
                door_win_boq.append({
                    "category": "Doors & Windows",
                    "code": f"DW-{100+dw_idx}",
                    "description": f"Premium Door Upgrade: {room_name} ({d_mat})",
                    "unit": "Nos",
                    "qty": d_qty,
                    "rate": round(door_upgrade_rate),
                    "amount": round(cost)
                })
            else:
                door_win_boq.append({
                    "category": "Doors & Windows",
                    "code": f"DW-{100+dw_idx}",
                    "description": f"Standard Door: {room_name} ({d_mat})",
                    "unit": "Nos",
                    "qty": d_qty,
                    "rate": 0,
                    "amount": 0
                })
            dw_idx += 1
            
        # 2. Window Upgrade
        if w_qty > 0 and w_mat != "No Window":
            raw_win_rate = win_rates_map.get(w_mat, 5000.0)
            win_upgrade_rate = max(0.0, raw_win_rate - 5000.0) * index_multiplier
            if win_upgrade_rate > 0.0:
                cost = w_qty * win_upgrade_rate
                door_win_subtotal += cost
                door_win_boq.append({
                    "category": "Doors & Windows",
                    "code": f"DW-{100+dw_idx}",
                    "description": f"Premium Window Upgrade: {room_name} ({w_mat})",
                    "unit": "Nos",
                    "qty": w_qty,
                    "rate": round(win_upgrade_rate),
                    "amount": round(cost)
                })
            else:
                door_win_boq.append({
                    "category": "Doors & Windows",
                    "code": f"DW-{100+dw_idx}",
                    "description": f"Standard Window: {room_name} ({w_mat})",
                    "unit": "Nos",
                    "qty": w_qty,
                    "rate": 0,
                    "amount": 0
                })
            dw_idx += 1
            
        # 3. Ventilator Upgrade
        if v_qty > 0 and v_mat != "No Ventilator":
            raw_vent_rate = vent_rates_map.get(v_mat, 1800.0)
            vent_upgrade_rate = max(0.0, raw_vent_rate - 1800.0) * index_multiplier
            if vent_upgrade_rate > 0.0:
                cost = v_qty * vent_upgrade_rate
                door_win_subtotal += cost
                door_win_boq.append({
                    "category": "Doors & Windows",
                    "code": f"DW-{100+dw_idx}",
                    "description": f"Premium Ventilator Upgrade: {room_name} ({v_mat})",
                    "unit": "Nos",
                    "qty": v_qty,
                    "rate": round(vent_upgrade_rate),
                    "amount": round(cost)
                })
            else:
                door_win_boq.append({
                    "category": "Doors & Windows",
                    "code": f"DW-{100+dw_idx}",
                    "description": f"Standard Ventilator: {room_name} ({v_mat})",
                    "unit": "Nos",
                    "qty": v_qty,
                    "rate": 0,
                    "amount": 0
                })
            dw_idx += 1

    # 12. Turnkey House Base Cost Scoping & Labor Balancing
    base_rate_map = {"Budget": 2200.0, "Standard": 2200.0, "Premium": 2600.0, "Luxury": 3500.0}
    base_rate = base_rate_map.get(quality, 2200.0) * index_multiplier
    base_house_cost = total_construction_area * base_rate

    # Standard materials cost referenced in BOQ
    standard_materials_cost = cement_cost + steel_cost + sand_cost + aggregate_cost + block_cost
    standard_foundation_cost = foundation_cost
    standard_paint_cost = paint_cost

    # General turnkey structural casting & labor contract cost balances the base cost
    balancing_civil_labor = base_house_cost - (standard_materials_cost + standard_foundation_cost + standard_paint_cost)
    if balancing_civil_labor < 0.0:
        balancing_civil_labor = 0.0

    # Allocate a realistic labour budget (28% of base house cost)
    labour_subtotal = base_house_cost * 0.28
    if labour_subtotal > balancing_civil_labor:
        labour_subtotal = balancing_civil_labor

    labour_civil_cost = labour_subtotal * 0.70
    labour_finishing_cost = labour_subtotal * 0.30
    
    # Extract remaining balance as turnkey overheads and standard fittings
    overhead_cost = balancing_civil_labor - labour_subtotal
    if overhead_cost < 0.0:
        overhead_cost = 0.0

    civil_subtotal = standard_materials_cost + standard_foundation_cost + overhead_cost

    # Turnkey Summation: Base Turnkey House Cost + Extras (Basement, Elevation, Compound wall, sumps, gates, interior, upgrades)
    subtotal = base_house_cost + flooring_cost + electrical_cost + plumbing_cost + interior_cost + exterior_cost + door_win_subtotal + elevation_cost + basement_cost

    contingency_pct = float(params.get("contingency_percentage") or 5.0)
    contingency_amount = math.ceil(subtotal * (contingency_pct / 100.0))

    builder_margin_pct = float(params.get("builder_margin_percentage") or 10.0)
    builder_margin_amount = math.ceil((subtotal + contingency_amount) * (builder_margin_pct / 100.0))

    gst_pct = float(params.get("gst_percentage") or 18.0)
    gst_amount = math.ceil((subtotal + contingency_amount + builder_margin_amount) * (gst_pct / 100.0))

    grand_total = subtotal + contingency_amount + builder_margin_amount + gst_amount

    # Duration
    base_months = total_construction_area / 450.0
    floor_factor = max(len(floors_list), 1) * 0.6
    interior_factor = 1.5 if interior_cost > 0 else 0
    total_months = base_months + floor_factor + interior_factor
    duration_min = math.ceil(total_months)
    duration_max = duration_min + 2

    # Compile final BOQ
    boq_items = [
        {"category": "Civil Works", "code": "CW-001", "description": f"Cement ({params.get('cementBrand', 'UltraTech')}) — 50kg Bags", "unit": "Bags", "qty": cement_bags, "rate": round(rates.get("cement", 380.0)), "amount": round(cement_cost)},
        {"category": "Civil Works", "code": "CW-002", "description": f"Steel ({params.get('steelGrade', 'Fe500D')}) — TMT Reinforcement", "unit": "Kg", "qty": steel_kg, "rate": round(rates.get("steel", 64.0)), "amount": round(steel_cost)},
        {"category": "Civil Works", "code": "CW-003", "description": f"Sand ({params.get('sandType', 'M-Sand')}) for masonry/plaster", "unit": "Cft", "qty": sand_cft, "rate": round(rates.get("sand", 55.0)), "amount": round(sand_cost)},
        {"category": "Civil Works", "code": "CW-004", "description": f"Coarse Aggregate ({params.get('aggregateType', '20mm jelly')})", "unit": "Cft", "qty": aggregate_cft, "rate": round(rates.get("aggregate", 48.0)), "amount": round(aggregate_cost)},
        {"category": "Civil Works", "code": "CW-005", "description": f"Bricks / Block Type: {params.get('brickType', 'AAC Blocks')}", "unit": "Nos", "qty": blocks_qty, "rate": round(rates.get("bricks", 45.0)), "amount": round(block_cost)},
        {"category": "Civil Works", "code": "CW-006", "description": f"Excavation & Foundation works ({soil_type})", "unit": "Sqft", "qty": foundation_qty, "rate": round(foundation_base_rate * soil_multiplier * qf), "amount": round(foundation_cost)},
    ]

    if front_elevation_area > 0:
        boq_items.append({
            "category": "Civil Works", 
            "code": "CW-007", 
            "description": f"Front Elevation designer facade finishes ({quality} tier)", 
            "unit": "Sqft", 
            "qty": front_elevation_area, 
            "rate": round(elevation_rate), 
            "amount": round(elevation_cost)
        })

    if overhead_cost > 0:
        boq_items.append({
            "category": "Civil Works",
            "code": "CW-008",
            "description": "Integrated Turnkey Contractor Overheads, Supervision, Scaffoldings & Standard Fittings (Plumbing, Electrical, Tiles & Doors)",
            "unit": "Sqft",
            "qty": total_construction_area,
            "rate": round(overhead_cost / total_construction_area if total_construction_area > 0 else 0),
            "amount": round(overhead_cost)
        })

    boq_items.extend([
        {"category": "Labour", "code": "LB-001", "description": "Civil Concrete & Structural Labour", "unit": "Sqft", "qty": total_construction_area, "rate": round(labour_civil_cost / total_construction_area if total_construction_area > 0 else 0), "amount": round(labour_civil_cost)},
        {"category": "Labour", "code": "LB-002", "description": "Finishing, Tiling & Plastering Labour", "unit": "Sqft", "qty": total_construction_area, "rate": round(labour_finishing_cost / total_construction_area if total_construction_area > 0 else 0), "amount": round(labour_finishing_cost)}
    ])

    boq_items.extend(door_win_boq)
    
    # Append dynamically generated lists
    boq_items.extend(flooring_boq)
    
    # Paint lines
    boq_items.append({"category": "Painting", "code": "PT-001", "description": f"Interior wall painting ({params.get('paintBrand', 'Asian Paints')} {params.get('paintType', 'Premium Emulsion')})", "unit": "Litres", "qty": int_paint_litres, "rate": round(int_rate), "amount": round(int_paint_cost)})
    boq_items.append({"category": "Painting", "code": "PT-002", "description": f"Exterior weathercoat wall painting ({params.get('exterior_paint_brand', 'Asian Paints')} {params.get('exterior_paint_type', 'Waterproof')})", "unit": "Litres", "qty": ext_paint_litres, "rate": round(ext_rate), "amount": round(ext_paint_cost)})
    
    boq_items.extend(electrical_boq)
    boq_items.extend(plumbing_boq)
    boq_items.extend(interior_boq)
    boq_items.extend(exterior_boq)

    # Sort
    for idx, item in enumerate(boq_items):
        item["sort_order"] = idx

    res_context = {
        "quantities": {
            "cementBags": cement_bags,
            "steelKg": steel_kg,
            "sandCft": sand_cft,
            "aggregateCft": aggregate_cft,
            "blocksQty": blocks_qty
        },
        "costs": {
            "civilSubtotal": round(civil_subtotal),
            "labourSubtotal": round(labour_subtotal),
            "flooringSubtotal": round(flooring_cost),
            "paintingSubtotal": round(paint_cost),
            "electricalSubtotal": round(electrical_cost),
            "plumbingSubtotal": round(plumbing_cost),
            "interiorSubtotal": round(interior_cost),
            "exteriorSubtotal": round(exterior_cost),
            "subtotal": round(subtotal),
            "grandTotal": round(grand_total)
        },
        "duration": {
            "min": duration_min,
            "max": duration_max
        }
    }
    recs = generate_ai_recommendations(params, res_context)

    return {
        "input": params,
        "summary": {
            "customerName": customer_name,
            "location": city,
            "buildingType": params.get("building_type") or params.get("buildingType", "Residential Villa"),
            "totalSqft": total_construction_area,
            "floors": len(floors_list) or int(params.get("floors") or 1),
            "quality": quality,
            "plotArea": plot_area,
            "groundCoverageArea": ground_coverage,
            "openArea": open_area,
            "staircaseArea": staircase_area,
            "porticoArea": portico_area,
            "floorWiseArea": floors_list
        },
        "quantities": {
            "cementBags": cement_bags,
            "steelKg": steel_kg,
            "sandCft": sand_cft,
            "aggregateCft": aggregate_cft,
            "blocksQty": blocks_qty,
            "tilesArea": math.ceil(total_construction_area * 1.10),
            "paintLitres": paint_litres,
            "electricalPoints": len(electrical_boq),
            "plumbingPoints": len(plumbing_boq)
        },
        "costs": {
            "civilSubtotal": round(civil_subtotal),
            "labourSubtotal": round(labour_subtotal),
            "flooringSubtotal": round(flooring_cost),
            "paintingSubtotal": round(paint_cost),
            "electricalSubtotal": round(electrical_cost),
            "plumbingSubtotal": round(plumbing_cost),
            "interiorSubtotal": round(interior_cost),
            "exteriorSubtotal": round(exterior_cost),
            "subtotal": round(subtotal),
            "contingencyPct": contingency_pct,
            "contingency": round(contingency_amount),
            "builderMarginPct": builder_margin_pct,
            "builderMargin": round(builder_margin_amount),
            "gstPct": gst_pct,
            "gst": round(gst_amount),
            "grandTotal": round(grand_total)
        },
        "duration": {
            "min": duration_min,
            "max": duration_max
        },
        "recommendations": recs,
        "boqItems": boq_items,
        "generatedAt": datetime.utcnow().isoformat() + "Z"
    }
