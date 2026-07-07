import os
import json
import math
from datetime import datetime
from services.db import supabase_admin
import google.generativeai as genai

# Fallback recommendations database
STATIC_RECS = {
    "Default": [
        {"type": "tip", "title": "AAC Blocks Recommended", "text": "Use AAC Blocks instead of Red Bricks to reduce structural dead load by ~30% — suitable for expansive soil conditions."},
        {"type": "info", "title": "Milestone payments structure", "text": "Structure contractor payments by stages: Excavation (10%) -> Plinth (15%) -> Columns & Slabs (35%) -> Brickwork/Plaster (20%) -> Finish & Handover (20%)."},
        {"type": "warn", "title": "Plumbing Pressure Test", "text": "Conduct a mandatory hydraulic pressure test on all concealed water lines before tiling bathrooms and kitchens to avoid post-handover leaks."},
        {"type": "tip", "title": "PVC Electrical Conduits", "text": "Use fire-retardant low-smoke (FRLS) wires and heavy-gauge PVC conduits cast inside concrete columns/slabs for safety."},
        {"type": "info", "title": "Concrete Cover Blocks", "text": "Always place 25mm to 40mm concrete cover blocks under slab reinforcement meshes to prevent steel exposure and rust."}
    ]
}

def generate_ai_recommendations(params: dict, results: dict = None) -> list:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("AQ."):
        return STATIC_RECS["Default"]

    costs = results.get("costs", {}) if results else {}
    quantities = results.get("quantities", {}) if results else {}
    duration = results.get("duration", {}) if results else {}
    
    total_cost_inr = costs.get("grandTotal", 0)
    duration_months = f"{duration.get('min', 8)}-{duration.get('max', 10)}" if duration else "8-10"

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        You are an expert Indian civil engineer and cost estimator.
        Analyze these building parameters and calculated estimation results:
        
        INPUT PARAMETERS:
        - Construction Quality Tier: {params.get('quality', 'Standard')}
        - Cement Brand: {params.get('cementBrand') or 'UltraTech'}
        - Steel Brand: {params.get('steelBrand') or 'Tata Tiscon'}
        - Wall Material Type: {params.get('brickType') or 'AAC Blocks'}
        
        CALCULATED ESTIMATION RESULTS:
        - Total Estimated Budget (INR): ₹{total_cost_inr:,}
        - Cement Quantities Required: {quantities.get('cementBags', 0)} Bags
        - Steel Quantities Required: {quantities.get('steelKg', 0)} Kg
        - Estimated Construction Duration: {duration_months} Months
        
        Provide between 6 to 8 professional construction recommendations, tips, or warning alerts.
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
        
    return STATIC_RECS["Default"]

def calculate_estimate(params: dict) -> dict:
    """
    Main estimation calculator with updated business logic:
    - Base: 2100.0, Standard: 2400.0, Premium: 2600.0, Luxury: 2800.0.
    - Area formulas:
      - Plot Area = length * width
      - Total Floor Area = sum of all floors
      - Total Built-up Area = Total Floor Area + Portico Area
      - Ground Coverage Area = Ground Floor Area + Portico Area
      - Open Area = Plot Area - Ground Coverage Area
    - Room specifications (doors, windows, MEP points) aggregated and reported.
    - No cost index, no DSR rates. All settings database-controlled.
    """
    customer_name = params.get("customer_name") or params.get("customerName", "Client")
    city = params.get("city") or params.get("location", "Erode")
    quality = params.get("quality", "Standard")

    # 1. Load settings from database
    settings = {}
    try:
        res = supabase_admin.table('system_settings').select('key, value').execute()
        if res.data:
            for row in res.data:
                settings[row['key']] = row['value']
    except Exception:
        pass

    # 1b. Load material rates (Default & City specific overrides)
    rates_by_code = {}
    try:
        # Load default fallback rates
        res_rates_default = supabase_admin.table('material_rates').select('material_code, rate').eq('city', 'Default').execute()
        if res_rates_default.data:
            for row in res_rates_default.data:
                rates_by_code[row['material_code']] = float(row['rate'])
    except Exception:
        pass

    if city and city != 'Default':
        try:
            # Overwrite with city specific rates
            res_rates_city = supabase_admin.table('material_rates').select('material_code, rate').eq('city', city).execute()
            if res_rates_city.data:
                for row in res_rates_city.data:
                    rates_by_code[row['material_code']] = float(row['rate'])
        except Exception:
            pass

    # Fallback default rates
    rate_package_base = float(settings.get("rate_package_base") or 2100.0)
    rate_package_standard = float(settings.get("rate_package_standard") or 2400.0)
    rate_package_premium = float(settings.get("rate_package_premium") or 2600.0)
    rate_package_luxury = float(settings.get("rate_package_luxury") or 2800.0)

    package_rate_map = {
        "Base": rates_by_code.get("CONSTRUCTION_BASE", rate_package_base),
        "Standard": rates_by_code.get("CONSTRUCTION_STANDARD", rate_package_standard),
        "Premium": rates_by_code.get("CONSTRUCTION_PREMIUM", rate_package_premium),
        "Luxury": rates_by_code.get("CONSTRUCTION_LUXURY", rate_package_luxury)
    }
    selected_package_rate = package_rate_map.get(quality, rates_by_code.get("CONSTRUCTION_STANDARD", 2400.0))


    # 2. Area details & Dimensions parsing
    plot_length = float(params.get("plot_length") or params.get("plotLength") or 0.0)
    plot_width = float(params.get("plot_width") or params.get("plotWidth") or 0.0)
    plot_area = plot_length * plot_width

    floors_list = params.get("floors_list") or params.get("floorsList") or []
    floor_area_sum = sum(float(f.get("floor_area_sqft") or f.get("area") or (float(f.get("length") or 0) * float(f.get("width") or 0)) or 0) for f in floors_list)

    ground_coverage_floor = 0.0
    if floors_list:
        ground_coverage_floor = float(floors_list[0].get("floor_area_sqft") or (float(floors_list[0].get("length") or 0) * float(floors_list[0].get("width") or 0)) or 0.0)

    staircase_length = float(params.get("staircase_length") or 0.0)
    staircase_width = float(params.get("staircase_width") or 0.0)
    staircase_area = staircase_length * staircase_width

    portico_length = float(params.get("portico_length") or 0.0)
    portico_width = float(params.get("portico_width") or 0.0)
    portico_area = portico_length * portico_width

    # Calculations per specifications
    total_floor_area = floor_area_sum
    total_builtup_area = total_floor_area + portico_area + staircase_area
    ground_coverage_area = ground_coverage_floor + portico_area + staircase_area
    open_area = max(0.0, plot_area - ground_coverage_area)

    # 3. Core Construction Cost
    construction_cost = total_builtup_area * selected_package_rate

    # 4. Material Quantities calculations
    cement_bags = math.ceil(total_builtup_area * 0.40)
    steel_kg = math.ceil(total_builtup_area * 4.0)
    sand_cft = math.ceil(total_builtup_area * 1.25)
    
    # Coarse Aggregate Split logic
    total_aggregate_cft = total_builtup_area * 0.90
    selected_aggregates = params.get("selected_aggregates") or []
    if not selected_aggregates:
        # Fallback default
        selected_aggregates = ['20mm']
        
    weights = {'40mm': 35.0, '20mm': 55.0, '12mm': 10.0}
    total_weight = sum(weights[sz] for sz in selected_aggregates if sz in weights)
    if total_weight == 0:
        total_weight = 55.0
        selected_aggregates = ['20mm']
        
    qty_40mm = math.ceil(total_aggregate_cft * (35.0 / total_weight)) if '40mm' in selected_aggregates else 0
    qty_20mm = math.ceil(total_aggregate_cft * (55.0 / total_weight)) if '20mm' in selected_aggregates else 0
    qty_12mm = math.ceil(total_aggregate_cft * (10.0 / total_weight)) if '12mm' in selected_aggregates else 0

    brick_type = params.get("brick_type") or params.get("brickType") or "AAC Blocks"
    if brick_type == "Red Clay Bricks":
        blocks_qty = math.ceil(total_builtup_area * 14.0)
    else:
        blocks_qty = math.ceil(total_builtup_area * 1.50)

    flooring_area_total = math.ceil(total_builtup_area * 1.10)
    paint_area_total = math.ceil(total_builtup_area * 3.0)
    paint_litres_total = math.ceil(paint_area_total / 350.0)

    # 5. Room details / Dynamic doors & windows aggregations
    rooms_list = params.get("rooms_list") or []
    door_details_list = []
    window_details_list = []
    
    total_light_points = 0
    total_fan_points = 0
    total_plug_points = 0
    total_switch_boards = 0
    total_ac_points = 0
    total_tv_points = 0
    total_geyser_points = 0
    total_exhaust_points = 0
    total_exterior_light_points = 0
    
    total_wc = 0
    total_wash_basin = 0
    total_shower = 0
    total_faucet = 0
    total_floor_drain = 0
    total_taps = 0
    total_sinks = 0
    total_inlets = 0
    total_drains = 0
    total_washing_machine = 0
    total_utility_sink = 0

    for room in rooms_list:
        # Doors
        for d in room.get("doors", []):
            d_qty = int(d.get("qty") or 1)
            door_details_list.append({
                "room": room.get("name", "Room"),
                "type": d.get("type", "Standard"),
                "width": d.get("width", 3),
                "height": d.get("height", 7),
                "qty": d_qty
            })
        
        # Windows
        for w in room.get("windows", []):
            w_qty = int(w.get("qty") or 1)
            window_details_list.append({
                "room": room.get("name", "Room"),
                "type": w.get("type", "Standard"),
                "width": w.get("width", 4),
                "height": w.get("height", 4),
                "qty": w_qty
            })
            
        # MEP point counts aggregation
        elec = room.get("electrical", {})
        total_light_points += int(elec.get("light_points") or 0)
        total_fan_points += int(elec.get("fan_points") or 0)
        total_plug_points += int(elec.get("plug_points") or 0)
        total_switch_boards += int(elec.get("switch_boards") or 0)
        total_ac_points += int(elec.get("ac_points") or 0)
        total_tv_points += int(elec.get("tv_points") or 0)
        total_geyser_points += int(elec.get("geyser_points") or 0)
        total_exhaust_points += int(elec.get("exhaust_points") or 0)
        total_exterior_light_points += int(elec.get("exterior_light_points") or 0)
        
        plumb = room.get("plumbing", {})
        total_wc += int(plumb.get("wc") or 0)
        total_wash_basin += int(plumb.get("wash_basin") or 0)
        total_shower += int(plumb.get("shower") or 0)
        total_faucet += int(plumb.get("faucet") or 0)
        total_floor_drain += int(plumb.get("drain") or 0)
        total_taps += int(plumb.get("tap") or 0)
        total_sinks += int(plumb.get("sink") or 0)
        total_inlets += int(plumb.get("inlet") or 0)
        total_drains += int(plumb.get("drain_point") or 0)
        total_washing_machine += int(plumb.get("washing_machine") or 0)
        total_utility_sink += int(plumb.get("utility_sink") or 0)

    # 6. Additional Works Calculations
    
    # Get package quality inclusions settings (true/false)
    quality_lower = quality.lower()
    is_compound_included = settings.get(f"include_compound_wall_{quality_lower}") == "true"
    is_gate_included = settings.get(f"include_gate_{quality_lower}") == "true"
    is_water_tank_included = settings.get(f"include_water_tank_{quality_lower}") == "true"
    is_septic_tank_included = settings.get(f"include_septic_tank_{quality_lower}") == "true"
    is_front_elevation_included = settings.get(f"include_front_elevation_{quality_lower}") == "true"
    is_false_ceiling_included = settings.get(f"include_false_ceiling_{quality_lower}") == "true"
    is_wardrobes_included = settings.get(f"include_wardrobes_{quality_lower}") == "true"
    is_modular_kitchen_included = settings.get(f"include_modular_kitchen_{quality_lower}") == "true"
    is_surkhi_included = settings.get(f"include_surkhi_{quality_lower}") == "true"
    is_upper_water_tank_included = settings.get(f"include_upper_water_tank_{quality_lower}") == "true"

    # Compound Wall (with toggle control)
    has_compound_wall = bool(params.get("has_compound_wall"))
    compound_wall_length = float(params.get("compound_wall_length") or 0.0)
    compound_wall_height = float(params.get("compound_wall_height") or 0.0)
    compound_wall_rate = float(settings.get("rate_compound_wall") or 50.0)
    compound_wall_area = compound_wall_length * compound_wall_height
    if is_compound_included:
        compound_wall_cost = 0.0
    else:
        compound_wall_cost = (compound_wall_area * compound_wall_rate) if has_compound_wall else 0.0

    # Gate (with toggle control)
    has_gate = bool(params.get("has_gate"))
    gate_width = float(params.get("gate_width") or 0.0)
    gate_height = float(params.get("gate_height") or 0.0)
    gate_package = params.get("gate_package", "Standard")
    gate_area = gate_width * gate_height
    gate_rate_key = f"rate_gate_{gate_package.lower()}"
    gate_rate = float(settings.get(gate_rate_key) or {"base": 50.0, "standard": 60.0, "premium": 80.0, "luxury": 90.0}.get(gate_package.lower(), 60.0))
    if is_gate_included:
        gate_cost = 0.0
    else:
        gate_cost = (gate_area * gate_rate) if has_gate else 0.0

    # Water Tank Sump (with toggle control)
    has_water_tank = bool(params.get("has_water_tank"))
    water_tank_capacity = float(params.get("water_tank_capacity") or 0.0)
    water_tank_rate = float(settings.get("rate_water_tank") or 5.0)
    if is_water_tank_included:
        water_tank_cost = 0.0
    else:
        water_tank_cost = (water_tank_capacity * water_tank_rate) if has_water_tank else 0.0

    # Septic Tank
    septic_tank_capacity = float(params.get("septic_tank_capacity") or 0.0)
    septic_tank_rate = float(settings.get("rate_septic_tank") or 8.0)
    if is_septic_tank_included:
        septic_tank_cost = 0.0
    else:
        septic_tank_cost = septic_tank_capacity * septic_tank_rate

    # Front Elevation (with toggle control)
    has_front_elevation = bool(params.get("has_front_elevation"))
    elevation_width = float(params.get("front_elevation_width") or 0.0)
    elevation_height = float(params.get("front_elevation_height") or 0.0)
    elevation_package = params.get("front_elevation_package") or params.get("elevation_package", "Standard")
    elevation_area = elevation_width * elevation_height
    elevation_rate_key = f"rate_front_elevation_{elevation_package.lower()}"
    elevation_rate = float(settings.get(elevation_rate_key) or {"base": 120.0, "standard": 200.0, "premium": 350.0, "luxury": 500.0}.get(elevation_package.lower(), 200.0))
    if is_front_elevation_included:
        elevation_cost = 0.0
    else:
        elevation_cost = (elevation_area * elevation_rate) if has_front_elevation else 0.0

    # False Ceiling (with toggle control)
    has_false_ceiling = bool(params.get("has_false_ceiling"))
    false_ceiling_area = float(params.get("false_ceiling_area") or 0.0)
    false_ceiling_package = params.get("false_ceiling_package") or params.get("ceiling_package", "Standard")
    false_ceiling_rate_key = f"rate_false_ceiling_{false_ceiling_package.lower()}"
    false_ceiling_rate = float(settings.get(false_ceiling_rate_key) or {"base": 10.0, "standard": 15.0, "premium": 20.0, "luxury": 25.0}.get(false_ceiling_package.lower(), 15.0))
    if is_false_ceiling_included:
        false_ceiling_cost = 0.0
    else:
        false_ceiling_cost = (false_ceiling_area * false_ceiling_rate) if has_false_ceiling else 0.0

    # Wardrobes (with toggle control)
    has_wardrobes = bool(params.get("has_wardrobes"))
    wardrobe_area = float(params.get("wardrobe_area") or 0.0)
    wardrobe_type = params.get("wardrobe_type") or "UPVC"
    wardrobe_quality = params.get("wardrobe_quality", "Quality 1")
    if wardrobe_type.lower() == "wood":
        wardrobe_rate_key = f"rate_wardrobe_wood_{wardrobe_quality.lower().replace(' ', '')}"
        wardrobe_rate = float(settings.get(wardrobe_rate_key) or {"quality1": 330.0, "quality2": 340.0, "quality3": 350.0, "quality4": 360.0}.get(wardrobe_quality.lower().replace(' ', ''), 340.0))
    else:
        wardrobe_rate_key = f"rate_wardrobe_{wardrobe_quality.lower().replace(' ', '')}"
        wardrobe_rate = float(settings.get(wardrobe_rate_key) or {"quality1": 260.0, "quality2": 280.0, "quality3": 300.0, "quality4": 320.0}.get(wardrobe_quality.lower().replace(' ', ''), 280.0))
    if is_wardrobes_included:
        wardrobe_cost = 0.0
    else:
        wardrobe_cost = (wardrobe_area * wardrobe_rate) if has_wardrobes else 0.0

    # Modular Kitchen (with toggle control)
    has_modular_kitchen = bool(params.get("has_modular_kitchen"))
    modular_kitchen_area = float(params.get("modular_kitchen_area") or 0.0)
    modular_kitchen_package = params.get("modular_kitchen_package") or params.get("kitchen_package", "Standard")
    modular_kitchen_rate_key = f"rate_modular_kitchen_{modular_kitchen_package.lower()}"
    modular_kitchen_rate = float(settings.get(modular_kitchen_rate_key) or {"base": 20.0, "standard": 25.0, "premium": 30.0, "luxury": 40.0}.get(modular_kitchen_package.lower(), 25.0))
    if is_modular_kitchen_included:
        modular_kitchen_cost = 0.0
    else:
        modular_kitchen_cost = (modular_kitchen_area * modular_kitchen_rate) if has_modular_kitchen else 0.0

    # Surkhi Weathering Course (with toggle control)
    has_surkhi = bool(params.get("has_surkhi"))
    surkhi_area = float(params.get("surkhi_area") or 0.0)
    surkhi_package = params.get("surkhi_package") or "Standard"
    surkhi_rate_key = f"rate_surkhi_{surkhi_package.lower()}"
    surkhi_rate = float(settings.get(surkhi_rate_key) or {"base": 60.0, "standard": 80.0, "premium": 100.0, "luxury": 120.0}.get(surkhi_package.lower(), 80.0))
    if is_surkhi_included:
        surkhi_cost = 0.0
    else:
        surkhi_cost = (surkhi_area * surkhi_rate) if has_surkhi else 0.0

    # Surkhi materials breakdown calculations
    qty_brick_dust_bags = 0.0
    qty_lime_bags = 0.0
    qty_brick_bats_cft = 0.0
    if has_surkhi:
        qty_brick_dust_bags = round(surkhi_area * 0.15, 1)
        qty_lime_bags = round(surkhi_area * 0.05, 1)
        qty_brick_bats_cft = round(surkhi_area * 0.12, 1)

    # Upper Water Tank (with toggle control)
    has_upper_water_tank = bool(params.get("has_upper_water_tank"))
    upper_water_tank_capacity = str(params.get("upper_water_tank_capacity") or "1000L")
    
    # Retrieve the rate from settings based on capacity (e.g. rate_upper_water_tank_1000l)
    capacity_lower = upper_water_tank_capacity.lower()
    upper_water_tank_rate_key = f"rate_upper_water_tank_{capacity_lower}"
    
    # Defaults: 500l: 3000, 1000l: 6000, 1500l: 8500, 2000l: 11000
    default_upper_rates = {"500l": 3000.0, "1000l": 6000.0, "1500l": 8500.0, "2000l": 11000.0}
    upper_water_tank_rate = float(settings.get(upper_water_tank_rate_key) or default_upper_rates.get(capacity_lower, 6000.0))

    if is_upper_water_tank_included:
        upper_water_tank_cost = 0.0
    else:
        upper_water_tank_cost = upper_water_tank_rate if (has_upper_water_tank and upper_water_tank_capacity) else 0.0

    # Interior Cost is removed as requested
    interior_cost = 0.0

    # Tiles brand
    tiles_brand = params.get("tilesBrand") or params.get("tiles_brand") or "Kajaria"

    # Tiles Cost and Quantities calculations
    qty_tiles_floor = 0.0
    qty_tiles_bath_floor = 0.0
    qty_tiles_bath_wall = 0.0
    qty_tiles_kitchen_wall = 0.0
    qty_tiles_portico = 0.0

    cost_tiles_floor = 0.0
    cost_tiles_bath_floor = 0.0
    cost_tiles_bath_wall = 0.0
    cost_tiles_kitchen_wall = 0.0
    cost_tiles_portico = 0.0

    for room in rooms_list:
        name = room.get("name", "Bedroom")
        length = float(room.get("length") or 0.0)
        width = float(room.get("width") or 0.0)
        tiles_pkg = room.get("tiles_package") or room.get("tilesPackage") or params.get("quality") or "Standard"
        area = length * width

        if name.lower() == 'bathroom':
            # Bathroom floor tiles
            qty_tiles_bath_floor += area
            tiles_code = f"TILES_BATH_FLOOR_{tiles_pkg.upper()}"
            rate = rates_by_code.get(tiles_code, 60.0)
            cost_tiles_bath_floor += area * rate

            # Bathroom wall tiles (7ft height)
            wall_area = 2 * (length + width) * 7.0
            qty_tiles_bath_wall += wall_area
            tiles_wall_code = f"TILES_BATH_WALL_{tiles_pkg.upper()}"
            rate_wall = rates_by_code.get(tiles_wall_code, 60.0)
            cost_tiles_bath_wall += wall_area * rate_wall

        elif name.lower() == 'kitchen':
            # Kitchen floor tiles (under general floor tiles)
            qty_tiles_floor += area
            tiles_code = f"TILES_FLOOR_{tiles_pkg.upper()}"
            rate = rates_by_code.get(tiles_code, 60.0)
            cost_tiles_floor += area * rate

            # Kitchen wall dado tiles (2ft height)
            wall_area = 2 * (length + width) * 2.0
            qty_tiles_kitchen_wall += wall_area
            tiles_kitchen_code = f"TILES_KITCHEN_WALL_{tiles_pkg.upper()}"
            rate_kitchen = rates_by_code.get(tiles_kitchen_code, 60.0)
            cost_tiles_kitchen_wall += wall_area * rate_kitchen

        else:
            # General floor tiles
            qty_tiles_floor += area
            tiles_code = f"TILES_FLOOR_{tiles_pkg.upper()}"
            rate = rates_by_code.get(tiles_code, 60.0)
            cost_tiles_floor += area * rate

    # Portico Floor Tiles
    if portico_area > 0:
        portico_pkg = params.get("quality") or "Standard"
        qty_tiles_portico = portico_area
        portico_tiles_code = f"TILES_PORTICO_{portico_pkg.upper()}"
        rate_portico = rates_by_code.get(portico_tiles_code, 60.0)
        cost_tiles_portico = portico_area * rate_portico

    # Tiles cost is included in turnkey normal square feet package construction rate as requested
    total_tiles_cost = 0.0

    # Subtotals
    additional_subtotal = (
        compound_wall_cost + gate_cost + water_tank_cost + septic_tank_cost +
        elevation_cost + false_ceiling_cost + wardrobe_cost + modular_kitchen_cost +
        surkhi_cost + upper_water_tank_cost
    )
    subtotal = construction_cost + additional_subtotal + total_tiles_cost


    # Taxes & Margins
    contingency_pct = float(params.get("contingency_percentage") or 5.0)
    contingency_amount = math.ceil(subtotal * (contingency_pct / 100.0))

    builder_margin_pct = 0.0
    builder_margin_amount = 0.0

    gst_pct = 0.0
    gst_amount = 0.0

    grand_total = subtotal + contingency_amount + builder_margin_amount

    # Duration
    base_months = total_builtup_area / 450.0
    floor_factor = max(len(floors_list), 1) * 0.6
    interior_factor = 1.5 if (false_ceiling_area > 0 or wardrobe_area > 0 or modular_kitchen_area > 0) else 0
    total_months = base_months + floor_factor + interior_factor
    duration_min = math.ceil(total_months)
    duration_max = duration_min + 2

    # Compile final BOQ
    # Resolve package material rates
    brick_code_map = {
        "AAC Blocks": "WALL_AAC_BLOCKS",
        "Red Clay Bricks": "WALL_RED_CLAY_BRICKS",
        "Concrete Solid Blocks": "WALL_CONCRETE_SOLID_BLOCKS",
        "Fly Ash Bricks": "WALL_FLY_ASH_BRICKS"
    }
    brick_code = brick_code_map.get(brick_type, "WALL_AAC_BLOCKS")
    resolved_brick_rate = rates_by_code.get(brick_code, 60.0)

    cement_code = f"CEMENT_{quality.upper()}"
    resolved_cement_rate = rates_by_code.get(cement_code, 400.0)

    sand_type = params.get("sand_type") or params.get("sandType") or "M-Sand"
    sand_code_map = {
        "M-Sand": "SAND_M_SAND",
        "P-Sand": "SAND_P_SAND",
        "River Sand": "SAND_RIVER_SAND"
    }
    sand_code = sand_code_map.get(sand_type, "SAND_M_SAND")
    resolved_sand_rate = rates_by_code.get(sand_code, 60.0)

    steel_code = f"STEEL_{quality.upper()}"
    resolved_steel_rate = rates_by_code.get(steel_code, 70.0)

    window_code = f"WINDOW_{quality.upper()}"
    resolved_window_rate = rates_by_code.get(window_code, 500.0)

    boq_items = [
        {"category": "Civil Works", "code": "CW-001", "description": f"Standard Construction Package: {quality} Tier (Floor area: {total_floor_area}sqft, Portico area: {portico_area}sqft, Staircase area: {staircase_area}sqft)", "unit": "Sqft", "qty": total_builtup_area, "rate": round(selected_package_rate), "amount": round(construction_cost)},
        
        # Materials quantities list (Included)
        {"category": "Civil Works", "code": "CW-002", "description": f"Cement ({params.get('cementBrand', 'UltraTech')}) — 50kg Bags (Included in Package, Rate: Rs.{resolved_cement_rate}/Bag)", "unit": "Bags", "qty": cement_bags, "rate": 0, "amount": 0},
        {"category": "Civil Works", "code": "CW-003", "description": f"Steel ({params.get('steelBrand', 'Tata Tiscon')}) — TMT Reinforcement (Included in Package, Rate: Rs.{resolved_steel_rate}/Kg)", "unit": "Kg", "qty": steel_kg, "rate": 0, "amount": 0},
        {"category": "Civil Works", "code": "CW-004", "description": f"Sand ({sand_type}) for RCC structural elements (Included in Package, Rate: Rs.{resolved_sand_rate * 100}/Unit)", "unit": "Unit", "qty": round(sand_cft / 100, 2), "rate": 0, "amount": 0},
        {"category": "Civil Works", "code": "CW-005", "description": f"Blocks/Bricks ({brick_type}) (Included in Package, Rate: Rs.{resolved_brick_rate}/Unit)", "unit": "Nos", "qty": blocks_qty, "rate": 0, "amount": 0},
    ]

    # Dynamic Split Coarse Aggregates BOQ
    if qty_40mm > 0:
        rate_40mm = rates_by_code.get("AGGREGATE_40MM", 50.0)
        boq_items.append({"category": "Civil Works", "code": "CW-006a", "description": f"40 mm Coarse Aggregate (For PCC & Footings) (Included in Package, Rate: Rs.{rate_40mm * 100}/Unit)", "unit": "Unit", "qty": round(qty_40mm / 100, 2), "rate": 0, "amount": 0})
    if qty_20mm > 0:
        rate_20mm = rates_by_code.get("AGGREGATE_20MM", 52.0)
        boq_items.append({"category": "Civil Works", "code": "CW-006b", "description": f"20 mm Coarse Aggregate (For RCC Works) (Included in Package, Rate: Rs.{rate_20mm * 100}/Unit)", "unit": "Unit", "qty": round(qty_20mm / 100, 2), "rate": 0, "amount": 0})
    if qty_12mm > 0:
        rate_12mm = rates_by_code.get("AGGREGATE_12MM", 55.0)
        boq_items.append({"category": "Civil Works", "code": "CW-006c", "description": f"12 mm Coarse Aggregate (For Sunshades & Small RCC Works) (Included in Package, Rate: Rs.{rate_12mm * 100}/Unit)", "unit": "Unit", "qty": round(qty_12mm / 100, 2), "rate": 0, "amount": 0})

    # itemized tiling works
    if qty_tiles_floor > 0:
        rate = round(cost_tiles_floor / qty_tiles_floor) if qty_tiles_floor > 0 else 0
        boq_items.append({"category": "Flooring", "code": "FL-002", "description": f"General Floor Tiling ({tiles_brand}) (Included in Package, Rate: Rs.{rate}/Sqft)", "unit": "Sqft", "qty": round(qty_tiles_floor), "rate": 0, "amount": 0})
    if qty_tiles_bath_floor > 0:
        rate = round(cost_tiles_bath_floor / qty_tiles_bath_floor) if qty_tiles_bath_floor > 0 else 0
        boq_items.append({"category": "Flooring", "code": "FL-003", "description": f"Bathroom Floor Tiling ({tiles_brand}) (Included in Package, Rate: Rs.{rate}/Sqft)", "unit": "Sqft", "qty": round(qty_tiles_bath_floor), "rate": 0, "amount": 0})
    if qty_tiles_bath_wall > 0:
        rate = round(cost_tiles_bath_wall / qty_tiles_bath_wall) if qty_tiles_bath_wall > 0 else 0
        boq_items.append({"category": "Flooring", "code": "FL-004", "description": f"Bathroom Wall Dado Tiling ({tiles_brand}) (Included in Package, Rate: Rs.{rate}/Sqft)", "unit": "Sqft", "qty": round(qty_tiles_bath_wall), "rate": 0, "amount": 0})
    if qty_tiles_kitchen_wall > 0:
        rate = round(cost_tiles_kitchen_wall / qty_tiles_kitchen_wall) if qty_tiles_kitchen_wall > 0 else 0
        boq_items.append({"category": "Flooring", "code": "FL-005", "description": f"Kitchen Wall Dado Tiling ({tiles_brand}) (Included in Package, Rate: Rs.{rate}/Sqft)", "unit": "Sqft", "qty": round(qty_tiles_kitchen_wall), "rate": 0, "amount": 0})
    if qty_tiles_portico > 0:
        rate = round(cost_tiles_portico / qty_tiles_portico) if qty_tiles_portico > 0 else 0
        boq_items.append({"category": "Flooring", "code": "FL-006", "description": f"Portico Floor Tiling ({tiles_brand}) (Included in Package, Rate: Rs.{rate}/Sqft)", "unit": "Sqft", "qty": round(qty_tiles_portico), "rate": 0, "amount": 0})

    boq_items.extend([
        {"category": "Painting", "code": "PT-001", "description": "Interior & Exterior Painting (Cost Included in Package)", "unit": "Litres", "qty": paint_litres_total, "rate": 0, "amount": 0},
        {"category": "Labour", "code": "LB-001", "description": "Turnkey Construction & Finishing Labour (Cost Included in Package)", "unit": "Sqft", "qty": total_builtup_area, "rate": 0, "amount": 0},
    ])

    # Dynamic doors BOQ
    for idx, d in enumerate(door_details_list):
        boq_items.append({
            "category": "Doors & Windows",
            "code": f"DR-{100+idx}",
            "description": f"Door Spec: {d['type']} door size {d['width']}x{d['height']}ft in {d['room']} (Included in Package)",
            "unit": "Nos",
            "qty": d["qty"],
            "rate": 0,
            "amount": 0
        })

    # Dynamic windows BOQ
    for idx, w in enumerate(window_details_list):
        boq_items.append({
            "category": "Doors & Windows",
            "code": f"WN-{100+idx}",
            "description": f"Window Spec: {w['type']} window size {w['width']}x{w['height']}ft in {w['room']} (Included in Package, Rate: Rs.{resolved_window_rate}/Sqft)",
            "unit": "Nos",
            "qty": w["qty"],
            "rate": 0,
            "amount": 0
        })


    # Additional Works
    if compound_wall_cost > 0 or (has_compound_wall and is_compound_included):
        desc = f"Compound Wall (Length: {compound_wall_length}ft, Height: {compound_wall_height}ft)"
        if is_compound_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-001", "description": desc, "unit": "Sqft", "qty": compound_wall_area, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-001", "description": desc, "unit": "Sqft", "qty": compound_wall_area, "rate": round(compound_wall_rate), "amount": round(compound_wall_cost)})

    if gate_cost > 0 or (has_gate and is_gate_included):
        desc = f"Entrance Gate (Size: {gate_width}x{gate_height}ft, {gate_package} Package)"
        if is_gate_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-002", "description": desc, "unit": "Sqft", "qty": gate_area, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-002", "description": desc, "unit": "Sqft", "qty": gate_area, "rate": round(gate_rate), "amount": round(gate_cost)})

    if water_tank_cost > 0 or (has_water_tank and is_water_tank_included):
        desc = "Underground Sump (Water Tank)"
        if is_water_tank_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-003", "description": desc, "unit": "Litres", "qty": water_tank_capacity, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-003", "description": desc, "unit": "Litres", "qty": water_tank_capacity, "rate": round(water_tank_rate, 2), "amount": round(water_tank_cost)})

    if septic_tank_cost > 0 or (septic_tank_capacity > 0 and is_septic_tank_included):
        desc = f"Septic Tank (Capacity: {septic_tank_capacity} Litres)"
        if is_septic_tank_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-004", "description": desc, "unit": "Litres", "qty": septic_tank_capacity, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-004", "description": desc, "unit": "Litres", "qty": septic_tank_capacity, "rate": round(septic_tank_rate, 2), "amount": round(septic_tank_cost)})

    if elevation_cost > 0 or (has_front_elevation and is_front_elevation_included):
        desc = f"Front Designer Facade Elevation ({elevation_package} Package)"
        if is_front_elevation_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-005", "description": desc, "unit": "Sqft", "qty": elevation_area, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-005", "description": desc, "unit": "Sqft", "qty": elevation_area, "rate": round(elevation_rate), "amount": round(elevation_cost)})

    if false_ceiling_cost > 0 or (has_false_ceiling and is_false_ceiling_included):
        desc = f"Designer False Ceiling ({false_ceiling_package} Package)"
        if is_false_ceiling_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-006", "description": desc, "unit": "Sqft", "qty": false_ceiling_area, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-006", "description": desc, "unit": "Sqft", "qty": false_ceiling_area, "rate": round(false_ceiling_rate), "amount": round(false_ceiling_cost)})

    if wardrobe_cost > 0 or (has_wardrobes and is_wardrobes_included):
        desc = f"UPVC Wardrobes ({wardrobe_quality})"
        if is_wardrobes_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-007", "description": desc, "unit": "Sqft", "qty": wardrobe_area, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-007", "description": desc, "unit": "Sqft", "qty": wardrobe_area, "rate": round(wardrobe_rate), "amount": round(wardrobe_cost)})

    if modular_kitchen_cost > 0 or (has_modular_kitchen and is_modular_kitchen_included):
        desc = f"Modular Kitchen Cabinets & Fittings ({modular_kitchen_package} Package)"
        if is_modular_kitchen_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-008", "description": desc, "unit": "Sqft", "qty": modular_kitchen_area, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-008", "description": desc, "unit": "Sqft", "qty": modular_kitchen_area, "rate": round(modular_kitchen_rate), "amount": round(modular_kitchen_cost)})

    if surkhi_cost > 0 or (has_surkhi and is_surkhi_included):
        qty_brick_bats_unit = round(qty_brick_bats_cft / 100, 2)
        desc = f"Surkhi Weathering Course ({surkhi_package} Quality. Materials: {qty_brick_dust_bags} Bags Brick Dust, {qty_lime_bags} Bags Lime, {qty_brick_bats_unit} Units Brick Bats)"
        if is_surkhi_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-009", "description": desc, "unit": "Sqft", "qty": surkhi_area, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-009", "description": desc, "unit": "Sqft", "qty": surkhi_area, "rate": round(surkhi_rate), "amount": round(surkhi_cost)})

    if interior_cost > 0:
        boq_items.append({"category": "Additional Works", "code": "AD-010", "description": f"Additional Interior Decoration Works ({interior_package} Package)", "unit": "Sqft", "qty": interior_area, "rate": round(interior_rate), "amount": round(interior_cost)})

    if upper_water_tank_cost > 0 or (has_upper_water_tank and is_upper_water_tank_included):
        desc = f"Upper Overhead Water Tank (Capacity: {upper_water_tank_capacity})"
        if is_upper_water_tank_included:
            desc += " (Cost Included in Package)"
            boq_items.append({"category": "Additional Works", "code": "AD-011", "description": desc, "unit": "Nos", "qty": 1, "rate": 0, "amount": 0})
        else:
            boq_items.append({"category": "Additional Works", "code": "AD-011", "description": desc, "unit": "Nos", "qty": 1, "rate": round(upper_water_tank_rate), "amount": round(upper_water_tank_cost)})

    for idx, item in enumerate(boq_items):
        item["sort_order"] = idx

    res_context = {
        "quantities": {
            "cementBags": cement_bags,
            "steelKg": steel_kg,
            "sandCft": sand_cft,
            "aggregateCft": math.ceil(total_aggregate_cft),
            "blocksQty": blocks_qty
        },
        "costs": {
            "civilSubtotal": round(construction_cost),
            "labourSubtotal": 0,
            "flooringSubtotal": 0,
            "paintingSubtotal": 0,
            "electricalSubtotal": 0,
            "plumbingSubtotal": 0,
            "interiorSubtotal": round(additional_subtotal),
            "exteriorSubtotal": 0,
            "subtotal": round(subtotal),
            "grandTotal": round(grand_total)
        },
        "duration": {
            "min": duration_min,
            "max": duration_max
        }
    }
    recs = generate_ai_recommendations(params, res_context)

    # Return structured payload
    return {
        "input": params,
        "summary": {
            "customerName": customer_name,
            "location": city,
            "buildingType": params.get("building_type") or params.get("buildingType", "Residential Villa"),
            "totalSqft": total_builtup_area,
            "floors": len(floors_list) or int(params.get("floors") or 1),
            "quality": quality,
            "plotArea": plot_area,
            "groundCoverageArea": ground_coverage_area,
            "openArea": open_area,
            "staircaseArea": staircase_area,
            "porticoArea": portico_area,
            "floorWiseArea": floors_list
        },
        "quantities": {
            "cementBags": cement_bags,
            "steelKg": steel_kg,
            "sandCft": sand_cft,
            "aggregateCft": math.ceil(total_aggregate_cft),
            "aggregate_40mm": qty_40mm,
            "aggregate_20mm": qty_20mm,
            "aggregate_12mm": qty_12mm,
            "blocksQty": blocks_qty,
            "tilesArea": flooring_area_total,
            "paintLitres": paint_litres_total,
            "electricalPoints": total_light_points + total_fan_points + total_plug_points + total_switch_boards + total_ac_points + total_tv_points + total_geyser_points + total_exhaust_points + total_exterior_light_points,
            "plumbingFixtures": total_wc + total_wash_basin + total_shower + total_faucet + total_floor_drain + total_taps + total_sinks + total_inlets + total_drains + total_washing_machine + total_utility_sink
        },
        "costs": {
            "civilSubtotal": round(construction_cost),
            "labourSubtotal": 0,
            "flooringSubtotal": 0,
            "paintingSubtotal": 0,
            "electricalSubtotal": 0,
            "plumbingSubtotal": 0,
            "interiorSubtotal": round(additional_subtotal),
            "exteriorSubtotal": 0,
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
        "stages_breakdown": [
            {
                "stage": "Foundation & Basement Stage",
                "percentage": 20,
                "amount": round(construction_cost * 0.20),
                "desc": "Includes site cleaning, excavation, PCC foundation bed, footing reinforcement steel, brick masonry up to plinth level, and plinth beam concreting."
            },
            {
                "stage": "Concrete Slab & Structure Stage",
                "percentage": 30,
                "amount": round(construction_cost * 0.30),
                "desc": "Includes shuttering, reinforcement steel binding, column raising, beam layouts, and concrete casting for roof slabs."
            },
            {
                "stage": "Brickwork & Plastering Stage",
                "percentage": 20,
                "amount": round(construction_cost * 0.20),
                "desc": "Includes internal and external wall brickwork/blockwork and double coat cement plastering."
            },
            {
                "stage": "MEP (Electrical & Plumbing) Stage",
                "percentage": 15,
                "amount": round(construction_cost * 0.15),
                "desc": "Includes concealed wall piping, conduit laying, electrical box fixing, bathroom plumbing pipe layouts, and sanitary fittings."
            },
            {
                "stage": "Finishing & Woodworks Stage",
                "percentage": 15,
                "amount": round(construction_cost * 0.15),
                "desc": "Includes general flooring tiling, wall painting, and doors & windows framing and shutter installations."
            }
        ],
        "generatedAt": datetime.utcnow().isoformat() + "Z"
    }
