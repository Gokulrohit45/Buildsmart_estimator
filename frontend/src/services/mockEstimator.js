// ============================================
// MOCK ESTIMATOR SERVICE
// Implements the blueprint formulas from the PDF
// ============================================

const QUALITY_FACTORS = {
  Budget: 0.90,
  Standard: 1.00,
  Premium: 1.15,
  Luxury: 1.30,
};

const BASE_RATES = {
  cement: 420,        // ₹ per bag (50kg)
  steel: 65,          // ₹ per kg
  sand: 55,           // ₹ per cft
  aggregate: 48,      // ₹ per cft
  aac_block: 48,      // ₹ per block
  red_brick: 8,       // ₹ per brick
  tiles: 65,          // ₹ per sqft (vitrified)
  marble: 180,        // ₹ per sqft
  granite: 150,       // ₹ per sqft
  paint_premium: 80,  // ₹ per litre
  paint_standard: 45, // ₹ per litre
  electrical_point: 1500, // ₹ per point
  plumbing_point: 2200,   // ₹ per point
  labour_civil: 210,      // ₹ per sqft
  labour_finishing: 95,   // ₹ per sqft
  // Interior
  modular_kitchen: 180000,  // ₹ per kitchen (standard)
  wardrobe_per_unit: 35000, // ₹ per wardrobe
  false_ceiling_sqft: 120,  // ₹ per sqft
  tv_unit: 28000,           // ₹ flat
};

const LOCATION_ADJUSTMENTS = {
  Bangalore: 1.08,
  Mumbai: 1.20,
  Delhi: 1.15,
  Hyderabad: 1.05,
  Chennai: 1.03,
  Pune: 1.07,
  Ahmedabad: 0.95,
  Kolkata: 0.92,
  Coimbatore: 0.97,
  Jaipur: 0.93,
  Surat: 0.94,
  Other: 1.00,
};

const RECOMMENDATIONS_DB = {
  Bangalore: [
    { type: 'tip', title: 'AAC Blocks Recommended', text: 'Use AAC Blocks instead of Red Bricks to reduce structural dead load by ~30% — suitable for Bangalore\'s expansive soil conditions.' },
    { type: 'warn', title: 'River Sand Scarcity', text: 'River sand is heavily regulated in Bangalore. Use M-Sand (Manufactured Sand) for all plastering and concrete — it is compliant and cost-effective.' },
    { type: 'info', title: 'Steel Price Volatility', text: 'Steel prices in Bangalore fluctuate ±8% quarterly. Lock in rates with your vendor before pouring the slab.' },
  ],
  Mumbai: [
    { type: 'tip', title: 'High Humidity Zone', text: 'Use waterproof cement additives for all external plaster. Mumbai\'s coastal humidity increases structure moisture content by 15%.' },
    { type: 'warn', title: 'Premium Rates Apply', text: 'Mumbai rates are 20% above national average. Schedule works outside monsoon season (June–Sept) to avoid 10–15% labour premium.' },
  ],
  Hyderabad: [
    { type: 'tip', title: 'Granite Flooring Advantage', text: 'Hyderabad is one of India\'s top granite producers. Opting for granite flooring here can save 15–20% vs other cities.' },
    { type: 'info', title: 'GHMC Regulations', text: 'Ensure setback compliance with GHMC norms before starting construction — common reason for project delays.' },
  ],
  Default: [
    { type: 'tip', title: 'Add Contingency Buffer', text: 'Always include a 5–10% contingency on total estimate to cover price escalation, design changes, and unforeseen site conditions.' },
    { type: 'info', title: 'Phased Payments', text: 'Structure your contractor payments milestone-wise: Foundation (20%) → Slab (30%) → Brickwork (20%) → Finishes (25%) → Handover (5%).' },
    { type: 'warn', title: 'M-Sand vs River Sand', text: 'Prefer M-Sand for plastering works — it has more consistent quality and is environmentally compliant in most Indian states.' },
  ],
};

// ============================================
// MAIN ESTIMATOR FUNCTION
// ============================================
export function generateEstimate(params) {
  const {
    customerName = 'Builder',
    location = 'Other',
    buildingType = 'Residential Villa',
    totalSqft = 1500,
    floors = 1,
    bedrooms = 3,
    bathrooms = 2,
    structureType = 'RCC Frame',
    soilCondition = 'Normal',
    quality = 'Standard',
    cementBrand = 'UltraTech',
    steelGrade = 'Fe500',
    brickType = 'AAC Blocks',
    sandType = 'M-Sand',
    flooringType = 'Vitrified Tiles',
    paintType = 'Premium Emulsion',
    // Interior
    modularKitchen = false,
    wardrobes = 0,
    falseCeiling = false,
    tvUnit = false,
    interiorQuality = 'Standard',
  } = params;

  const qf = QUALITY_FACTORS[quality] || 1.00;
  const locFactor = LOCATION_ADJUSTMENTS[location] || 1.00;
  const iqf = QUALITY_FACTORS[interiorQuality] || 1.00;
  const interiorSelected = modularKitchen || wardrobes > 0 || falseCeiling || tvUnit;

  // ──── CIVIL QUANTITIES ────
  const cementBags = Math.ceil(totalSqft * 0.45 * qf);
  const steelKg = Math.ceil(totalSqft * 4.0 * qf);
  const sandCft = Math.ceil(totalSqft * 1.20 * qf);
  const aggregateCft = Math.ceil(totalSqft * 0.90 * qf);
  const blocksQty = Math.ceil(totalSqft * 8.0);
  const tilesArea = Math.ceil(totalSqft * 1.08);  // +8% wastage
  const paintLitres = Math.ceil(totalSqft * 0.18);

  // Electrical & Plumbing (approx per sqft benchmarks)
  const electricalPoints = Math.ceil((totalSqft / 120) * 10);
  const plumbingPoints = Math.ceil(bathrooms * 6 + 4);

  // ──── COST CALCULATIONS ────
  const rateMultiplier = locFactor;

  const cementCost = cementBags * BASE_RATES.cement * rateMultiplier;
  const steelCost = steelKg * BASE_RATES.steel * rateMultiplier;
  const sandCost = sandCft * BASE_RATES.sand * rateMultiplier;
  const aggregateCost = aggregateCft * BASE_RATES.aggregate * rateMultiplier;
  const blockCost = brickType === 'AAC Blocks'
    ? blocksQty * BASE_RATES.aac_block * rateMultiplier
    : blocksQty * BASE_RATES.red_brick * rateMultiplier;

  const flooringRate = flooringType === 'Marble' ? BASE_RATES.marble
    : flooringType === 'Granite' ? BASE_RATES.granite
    : BASE_RATES.tiles;
  const flooringCost = tilesArea * flooringRate * rateMultiplier;

  const paintRate = paintType === 'Premium Emulsion' ? BASE_RATES.paint_premium : BASE_RATES.paint_standard;
  const paintCost = paintLitres * paintRate * rateMultiplier;

  const electricalCost = electricalPoints * BASE_RATES.electrical_point * rateMultiplier;
  const plumbingCost = plumbingPoints * BASE_RATES.plumbing_point * rateMultiplier;

  const labourCivilCost = totalSqft * BASE_RATES.labour_civil * qf * rateMultiplier;
  const labourFinishingCost = totalSqft * BASE_RATES.labour_finishing * qf * rateMultiplier;

  // ──── INTERIOR COSTS ────
  const kitchenCost = modularKitchen ? BASE_RATES.modular_kitchen * iqf : 0;
  const wardrobeCost = wardrobes > 0 ? wardrobes * BASE_RATES.wardrobe_per_unit * iqf : 0;
  const falseCeilingCost = falseCeiling ? (totalSqft * 0.4) * BASE_RATES.false_ceiling_sqft * iqf : 0;
  const tvUnitCost = tvUnit ? BASE_RATES.tv_unit * iqf : 0;

  // ──── SUBTOTALS ────
  const civilSubtotal = cementCost + steelCost + sandCost + aggregateCost + blockCost;
  const labourSubtotal = labourCivilCost + labourFinishingCost;
  const flooringSubtotal = flooringCost;
  const paintingSubtotal = paintCost;
  const electricalSubtotal = electricalCost;
  const plumbingSubtotal = plumbingCost;
  const interiorSubtotal = kitchenCost + wardrobeCost + falseCeilingCost + tvUnitCost;

  const subtotal = civilSubtotal + labourSubtotal + flooringSubtotal + paintingSubtotal + electricalSubtotal + plumbingSubtotal + interiorSubtotal;
  const contingency = Math.ceil(subtotal * 0.05);
  const grandTotal = subtotal + contingency;

  // ──── DURATION ────
  const baseMonths = totalSqft / 450;
  const floorFactor = Math.max(floors, 1) * 0.6;
  const interiorFactor = interiorSelected ? 1.5 : 0;
  const totalMonths = baseMonths + floorFactor + interiorFactor;
  const durationMin = Math.ceil(totalMonths);
  const durationMax = durationMin + 2;

  // ──── RECOMMENDATIONS ────
  const recs = [
    ...(RECOMMENDATIONS_DB[location] || []),
    ...RECOMMENDATIONS_DB.Default,
  ];

  // ──── BOQ ITEMS ────
  const boqItems = [
    // Civil
    { category: 'Civil Works', code: 'CW-001', description: `Cement (${cementBrand}) — 50kg Bags`, unit: 'Bags', qty: cementBags, rate: Math.round(BASE_RATES.cement * rateMultiplier), amount: Math.round(cementCost) },
    { category: 'Civil Works', code: 'CW-002', description: `Steel (${steelGrade}) — TMT Bars`, unit: 'Kg', qty: steelKg, rate: Math.round(BASE_RATES.steel * rateMultiplier), amount: Math.round(steelCost) },
    { category: 'Civil Works', code: 'CW-003', description: `Sand (${sandType})`, unit: 'Cft', qty: sandCft, rate: Math.round(BASE_RATES.sand * rateMultiplier), amount: Math.round(sandCost) },
    { category: 'Civil Works', code: 'CW-004', description: 'Coarse Aggregate / Jelly', unit: 'Cft', qty: aggregateCft, rate: Math.round(BASE_RATES.aggregate * rateMultiplier), amount: Math.round(aggregateCost) },
    { category: 'Civil Works', code: 'CW-005', description: `${brickType}`, unit: 'Nos', qty: blocksQty, rate: Math.round((brickType === 'AAC Blocks' ? BASE_RATES.aac_block : BASE_RATES.red_brick) * rateMultiplier), amount: Math.round(blockCost) },
    { category: 'Labour', code: 'LB-001', description: 'Civil & Structural Labour', unit: 'Sqft', qty: totalSqft, rate: Math.round(BASE_RATES.labour_civil * qf * rateMultiplier), amount: Math.round(labourCivilCost) },
    { category: 'Labour', code: 'LB-002', description: 'Plastering, Tiling & Finishing Labour', unit: 'Sqft', qty: totalSqft, rate: Math.round(BASE_RATES.labour_finishing * qf * rateMultiplier), amount: Math.round(labourFinishingCost) },
    // Flooring
    { category: 'Flooring', code: 'FL-001', description: `${flooringType} (incl. 8% wastage)`, unit: 'Sqft', qty: tilesArea, rate: Math.round(flooringRate * rateMultiplier), amount: Math.round(flooringCost) },
    // Painting
    { category: 'Painting', code: 'PT-001', description: `${paintType} — Interior & Exterior`, unit: 'Litres', qty: paintLitres, rate: Math.round(paintRate * rateMultiplier), amount: Math.round(paintCost) },
    // Electrical
    { category: 'Electrical', code: 'EL-001', description: 'Internal Wiring, Switches & Points', unit: 'Points', qty: electricalPoints, rate: Math.round(BASE_RATES.electrical_point * rateMultiplier), amount: Math.round(electricalCost) },
    // Plumbing
    { category: 'Plumbing', code: 'PL-001', description: 'CPVC/PVC Piping & Plumbing Points', unit: 'Points', qty: plumbingPoints, rate: Math.round(BASE_RATES.plumbing_point * rateMultiplier), amount: Math.round(plumbingCost) },
  ];

  if (modularKitchen) boqItems.push({ category: 'Interiors', code: 'IN-001', description: 'Modular Kitchen (Full Setup)', unit: 'Nos', qty: 1, rate: Math.round(BASE_RATES.modular_kitchen * iqf), amount: Math.round(kitchenCost) });
  if (wardrobes > 0) boqItems.push({ category: 'Interiors', code: 'IN-002', description: 'Wardrobes (Sliding/Swing)', unit: 'Nos', qty: wardrobes, rate: Math.round(BASE_RATES.wardrobe_per_unit * iqf), amount: Math.round(wardrobeCost) });
  if (falseCeiling) boqItems.push({ category: 'Interiors', code: 'IN-003', description: 'False Ceiling (Gypsum/POP)', unit: 'Sqft', qty: Math.ceil(totalSqft * 0.4), rate: Math.round(BASE_RATES.false_ceiling_sqft * iqf), amount: Math.round(falseCeilingCost) });
  if (tvUnit) boqItems.push({ category: 'Interiors', code: 'IN-004', description: 'TV Unit (Custom Carpentry)', unit: 'Nos', qty: 1, rate: Math.round(BASE_RATES.tv_unit * iqf), amount: Math.round(tvUnitCost) });

  return {
    input: params,
    summary: {
      customerName,
      location,
      buildingType,
      totalSqft,
      floors,
      quality,
      structureType,
    },
    quantities: { cementBags, steelKg, sandCft, aggregateCft, blocksQty, tilesArea, paintLitres, electricalPoints, plumbingPoints },
    costs: {
      civilSubtotal: Math.round(civilSubtotal),
      labourSubtotal: Math.round(labourSubtotal),
      flooringSubtotal: Math.round(flooringSubtotal),
      paintingSubtotal: Math.round(paintingSubtotal),
      electricalSubtotal: Math.round(electricalSubtotal),
      plumbingSubtotal: Math.round(plumbingSubtotal),
      interiorSubtotal: Math.round(interiorSubtotal),
      subtotal: Math.round(subtotal),
      contingency: Math.round(contingency),
      grandTotal: Math.round(grandTotal),
    },
    duration: { min: durationMin, max: durationMax },
    recommendations: recs,
    boqItems,
    generatedAt: new Date().toISOString(),
  };
}

// Helper: Indian currency formatter
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const LOCATIONS = Object.keys(LOCATION_ADJUSTMENTS);
export { BASE_RATES, QUALITY_FACTORS };
