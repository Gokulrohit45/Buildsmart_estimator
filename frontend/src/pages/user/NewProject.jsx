import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { estimatesAPI, getCurrentUser } from '../../services/api';
import { INDIA_STATES, STATE_DISTRICTS } from '../../utils/indiaData';

const STEPS = [
  { num: 1, label: 'Customer Details' },
  { num: 2, label: 'Project Location' },
  { num: 3, label: 'Construction Package' },
  { num: 4, label: 'Floor Details' },
  { num: 5, label: 'Plot & Area Details' },
  { num: 6, label: 'Material Selection' },
  { num: 7, label: 'Building & Soil Info' },
  { num: 8, label: 'Room Details' },
  { num: 9, label: 'Flooring Details' },
  { num: 10, label: 'Doors & Windows' },
  { num: 11, label: 'Paint Details' },
  { num: 12, label: 'Electrical Details' },
  { num: 13, label: 'Plumbing Details' },
  { num: 14, label: 'Interior Add-ons' },
  { num: 15, label: 'Exterior Add-ons' },
  { num: 16, label: 'Additional Charges' },
  { num: 17, label: 'Summary & Generate' }
];

const QUALITY_OPTIONS = ['Standard', 'Premium', 'Luxury'];
const BUILDING_TYPES = ['Residential Villa', 'Row House', 'Apartment', 'Commercial'];
const STRUCTURE_TYPES = ['RCC Frame', 'Load Bearing', 'Steel Structure', 'Pre-Engineered Building'];
const SOIL_TYPES = ['Normal Soil', 'Soft Soil', 'Rocky Soil', 'Black Cotton Soil'];

const CEMENT_BRANDS = ['UltraTech', 'ACC', 'Ambuja', 'Shree', 'Ramco', 'Zuari'];
const STEEL_BRANDS = ['Tata Tiscon', 'JSW Neo', 'Sail', 'Vizag Steel'];
const STEEL_GRADES = ['Fe500', 'Fe500D', 'Fe550', 'Fe550D'];
const BRICK_TYPES = ['AAC Blocks', 'Red Clay Bricks', 'Solid Concrete Blocks', 'Fly Ash Bricks'];
const SAND_TYPES = ['M-Sand (Manufactured)', 'River Sand', 'P-Sand (Plastering)'];
const CONCRETE_GRADES = ['M15', 'M20', 'M25', 'M30'];

const FLOORING_TYPES = [
  'Vitrified Floor Tiles',
  'Ceramic Bathroom Floor Tiles',
  'Glazed Bathroom Wall Tiles',
  'Kitchen Dado Wall Tiles',
  'Portico / Exterior Wall Tiles',
  'Heavy Duty Pavers (Portico Floor)',
  'Granite (Stairs / Counters)',
  'Marble (Flooring)',
  'Wooden Laminate'
];
const FLOORING_BRANDS = ['Kajaria', 'Somany', 'Cera', 'Nitco', 'Orientbell', 'Johnson', 'Simpolo', 'Local / Unbranded'];
const FLOORING_QUALITIES = ['Standard', 'Premium', 'Luxury'];

const DOOR_MATERIALS = [
  'Teak Wood Door',
  'Laminated Flush Door',
  'Waterproof PVC Door',
  'WPC Premium Door',
  'No Door / Open Arch'
];
const WINDOW_MATERIALS = [
  'UPVC Sliding Window',
  'Aluminium Sliding Window',
  'Teak Wood Window & Shutter',
  'No Window'
];
const VENTILATOR_MATERIALS = [
  'Aluminium Louvered',
  'UPVC Glass Louvered',
  'No Ventilator'
];

const PAINT_TYPES = ['Distemper', 'Premium Emulsion', 'Royale Luxury'];
const PAINT_BRANDS = ['Asian Paints', 'Nippon', 'Dulux', 'Berger'];

const MEP_BRANDS = {
  wire: ['Finolex', 'Polycab', 'Havells', 'Kei'],
  pipe: ['Astral', 'Supreme', 'Ashirvad', 'Finolex'],
  switch: ['Anchor Roma', 'Legrand', 'Schneider', 'Panasonic']
};

const DEFAULT_FORM = {
  // Step 1
  customer_name: '',
  customer_mobile: '',
  customer_email: '',
  project_name: '',
  quotation_number: 'QTN-' + Math.floor(1000 + Math.random() * 9000),
  quotation_date: new Date().toISOString().split('T')[0],
  builder_company_name: '',

  // Step 2
  country: 'India',
  state: 'Karnataka',
  city: 'Bangalore',
  locality: '',
  pincode: '',
  project_address: '',

  // Step 3
  building_type: 'Residential Villa',
  structure_type: 'RCC Frame',
  floor_height: '10',
  front_elevation_area: '300',

  // Step 4
  plot_length: '60',
  plot_width: '40',
  plot_area_sqft: '2400',
  builtup_area_per_floor: '1200',
  builtup_area_sqft: '2400',
  building_length: '50',
  building_width: '30',
  basement_area_sqft: '0',
  parking_area_sqft: '0',
  terrace_area_sqft: '0',
  balcony_area_sqft: '0',

  // Step 5: floors_list managed separately
  
  // Step 6
  bedrooms: '3',
  bathrooms: '2',
  living_rooms: '1',
  dining_rooms: '1',
  kitchens: '1',
  pooja_rooms: '0',
  study_rooms: '0',
  store_rooms: '0',
  balconies: '1',
  porticos: '1',

  // Step 7
  soil_type: 'Normal Soil',

  // Step 8
  quality: 'Standard',

  // Step 9
  cementBrand: 'UltraTech',
  steelBrand: 'Tata Tiscon',
  steelGrade: 'Fe500D',
  brickType: 'AAC Blocks',
  sandType: 'M-Sand (Manufactured)',
  concreteGrade: 'M25',
  pipeBrand: 'Astral',
  wireBrand: 'Finolex',
  switchBrand: 'Anchor Roma',

  // Step 10: flooring_rooms managed separately

  // Step 11
  paintType: 'Premium Emulsion',
  paintBrand: 'Asian Paints',
  paintQuality: 'Standard',
  exterior_paint_type: 'Apex Weatherproof',
  exterior_paint_brand: 'Asian Paints',

  // Step 12
  light_points: '12',
  fan_points: '4',
  ac_points: '2',
  tv_points: '2',
  geyser_points: '2',
  power_socket_points: '6',
  inverter_points: '1',
  cctv_points: '0',
  internet_points: '1',
  doorbell_points: '1',

  // Step 13
  wash_basins: '2',
  western_toilets: '2',
  indian_toilets: '0',
  kitchen_sinks: '1',
  water_heaters: '2',
  taps: '8',
  overhead_tank_capacity: '1000',
  underground_sump_capacity: '3000',
  septic_tank_required: false,
  stp_required: false,

  // Step 14
  modular_kitchen: false,
  wardrobes: '0',
  tv_unit: false,
  false_ceiling: false,
  shoe_rack: false,
  crockery_unit: false,
  study_table: false,
  pooja_unit: false,
  bar_unit: false,
  partitions: false,
  wallpaper: '0',
  curtains: '0',
  interiorQuality: 'Standard',

  // Step 15
  compound_wall: '0', // Rft
  gate: '0', // Kg
  compound_wall_required: false,
  compound_wall_sides: '4 Sides',

  // Step 16
  contingency_percentage: '5',
  builder_margin_percentage: '10',
  gst_percentage: '18'
};

function SelectCard({ options, value, onChange, emojis }) {
  return (
    <div className="option-grid">
      {options.map((opt, idx) => (
        <div
          key={opt}
          className={`option-card ${value === opt ? 'selected' : ''}`}
          onClick={() => onChange(opt)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '14px 10px', cursor: 'pointer', transition: 'all 0.2s ease',
            ...(value === opt ? {
              background: 'linear-gradient(135deg, rgba(15,118,110,0.1) 0%, rgba(8,145,178,0.1) 100%)',
              boxShadow: '0 0 0 2px var(--color-primary)',
            } : {}),
          }}
        >
          {emojis && emojis[idx] && (
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{emojis[idx]}</span>
          )}
          <div className="option-card-label" style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>{opt}</div>
        </div>
      ))}
    </div>
  );
}

function Toggle({ label, sublabel, checked, onChange }) {
  return (
    <div className="toggle-group" style={{ background: 'rgba(15,118,110,0.03)', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <div>
        <div className="toggle-label" style={{ fontSize: '14px', fontWeight: 600 }}>{label}</div>
        {sublabel && <div className="toggle-sub" style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>{sublabel}</div>}
      </div>
      <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span className="toggle-slider" style={{
          position: 'absolute', cursor: 'pointer', inset: 0, background: checked ? 'var(--color-primary)' : '#ccc',
          borderRadius: '24px', transition: '0.3s',
        }} />
      </label>
    </div>
  );
}

function CardAccentStrip({ gradient }) {
  return (
    <div style={{ height: '4px', width: '100%', background: gradient, borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0' }} />
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{ borderLeft: '4px solid var(--color-primary-light)', paddingLeft: '12px', background: 'rgba(15,118,110,0.04)', borderRadius: '6px', marginBottom: '16px', padding: '8px 12px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-gray-700)', letterSpacing: '0.01em' }}>
        {children}
      </div>
    </div>
  );
}

export default function NewProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => {
    const user = getCurrentUser() || {};
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const qtn = `QTN-${dateStr}-${rand}`;
    return {
      ...DEFAULT_FORM,
      quotation_number: qtn,
      builder_company_name: user.company_name || user.companyName || '',
    };
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Floors List (Step 5)
  const [floorsList, setFloorsList] = useState([
    { floor_name: 'Ground Floor', floor_area_sqft: '1200' },
    { floor_name: 'First Floor', floor_area_sqft: '1200' }
  ]);

  // Flooring Rooms List (Step 10)
  const [flooringRooms, setFlooringRooms] = useState([
    { room_name: 'Living Room', flooring_type: 'Marble (Flooring)', flooring_brand: 'Kajaria', flooring_quality: 'Premium', area_sqft: '300' },
    { room_name: 'Master Bedroom', flooring_type: 'Wooden Laminate', flooring_brand: 'Somany', flooring_quality: 'Premium', area_sqft: '200' }
  ]);

  // Doors & Windows List (Step 11)
  const [doorWinRooms, setDoorWinRooms] = useState([
    { room_name: 'Living Room', door_qty: '1', door_material: 'Teak Wood Door', win_qty: '2', win_material: 'UPVC Sliding Window', vent_qty: '0', vent_material: 'No Ventilator' },
    { room_name: 'Master Bedroom', door_qty: '1', door_material: 'Laminated Flush Door', win_qty: '2', win_material: 'UPVC Sliding Window', vent_qty: '0', vent_material: 'No Ventilator' }
  ]);

  // Dynamic Floor Area Synchronization Observer
  useEffect(() => {
    const total = floorsList.reduce((sum, f) => sum + (parseFloat(f.floor_area_sqft) || 0), 0);
    const floorsVal = floorsList.length.toString();
    const perFloorVal = floorsList[0]?.floor_area_sqft || '';
    
    setForm((prev) => {
      if (
        prev.builtup_area_sqft === total.toString() &&
        prev.floors === floorsVal &&
        prev.builtup_area_per_floor === perFloorVal
      ) {
        return prev;
      }
      return {
        ...prev,
        builtup_area_sqft: total.toString(),
        floors: floorsVal,
        builtup_area_per_floor: perFloorVal
      };
    });
  }, [floorsList]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleQualityChange = (v) => {
    setForm((prev) => {
      const updated = { ...prev, quality: v };
      if (v === 'Standard') {
        updated.cementBrand = 'UltraTech';
        updated.steelBrand = 'Tata Tiscon';
        updated.steelGrade = 'Fe500D';
        updated.brickType = 'AAC Blocks';
        updated.sandType = 'M-Sand (Manufactured)';
        updated.concreteGrade = 'M25';
        updated.paintType = 'Premium Emulsion';
        updated.paintBrand = 'Asian Paints';
        updated.paintQuality = 'Standard';
        updated.exterior_paint_type = 'Apex Weatherproof';
        updated.exterior_paint_brand = 'Asian Paints';
        updated.interiorQuality = 'Standard';
      } else if (v === 'Premium') {
        updated.cementBrand = 'UltraTech';
        updated.steelBrand = 'Tata Tiscon';
        updated.steelGrade = 'Fe500D';
        updated.brickType = 'AAC Blocks';
        updated.sandType = 'M-Sand (Manufactured)';
        updated.concreteGrade = 'M25';
        updated.paintType = 'Premium Emulsion';
        updated.paintBrand = 'Asian Paints';
        updated.paintQuality = 'Premium';
        updated.exterior_paint_type = 'Apex Weatherproof';
        updated.exterior_paint_brand = 'Asian Paints';
        updated.interiorQuality = 'Premium';
      } else if (v === 'Luxury') {
        updated.cementBrand = 'UltraTech';
        updated.steelBrand = 'Tata Tiscon';
        updated.steelGrade = 'Fe550D';
        updated.brickType = 'AAC Blocks';
        updated.sandType = 'River Sand';
        updated.concreteGrade = 'M30';
        updated.paintType = 'Royale Luxury';
        updated.paintBrand = 'Asian Paints';
        updated.paintQuality = 'Luxury';
        updated.exterior_paint_type = 'Apex Weatherproof';
        updated.exterior_paint_brand = 'Asian Paints';
        updated.interiorQuality = 'Luxury';
      }
      return updated;
    });
    // Propagate the quality choice to any active rooms in flooringRooms
    setFlooringRooms((prev) => prev.map((room) => ({ ...room, flooring_quality: v })));
  };

  const getCalculatedCompoundWallVal = (sides, plotL, plotW) => {
    const len = parseFloat(plotL) || 0;
    const wid = parseFloat(plotW) || 0;
    if (sides === '4 Sides') {
      return Math.max(0, 2 * (len + wid) - 10).toString();
    } else if (sides === '3 Sides') {
      return (2 * len + wid).toString();
    } else if (sides === '2 Sides') {
      return (len + wid).toString();
    }
    return '0';
  };

  const validateCurrentStep = () => {
    const e = {};
    if (step === 1) {
      if (!form.customer_name.trim()) e.customer_name = 'Customer name is required';
      if (!form.project_name.trim()) e.project_name = 'Project name is required';
      
      // Mobile validation if provided
      if (form.customer_mobile && form.customer_mobile.trim()) {
        const cleaned = form.customer_mobile.trim();
        if (!/^[6-9]\d{9}$/.test(cleaned)) {
          e.customer_mobile = 'Please enter a valid 10-digit mobile number starting with 6-9';
        }
      }
      
      // Email validation if provided
      if (form.customer_email && form.customer_email.trim()) {
        const cleaned = form.customer_email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
          e.customer_email = 'Please enter a valid email address';
        }
      }
    }
    if (step === 2) {
      if (!form.state) e.state = 'State is required';
      if (!form.city) e.city = 'City is required';
      if (!form.pincode.trim()) e.pincode = 'Pincode is required';
    }
    if (step === 5) {
      if (!form.builtup_area_sqft || isNaN(form.builtup_area_sqft)) e.builtup_area_sqft = 'Enter built-up area';
      
      const plotArea = parseFloat(form.plot_area_sqft) || 0;
      const builtupFloor = parseFloat(form.builtup_area_per_floor) || 0;
      if (plotArea > 0) {
        if (builtupFloor > plotArea) {
          e.builtup_area_sqft = `Built-up area per floor (${builtupFloor} sqft) cannot exceed Plot Area (${plotArea} sqft)`;
        }
        const tooLarge = floorsList.find(f => (parseFloat(f.floor_area_sqft) || 0) > plotArea);
        if (tooLarge) {
          e.floors = `Floor area for ${tooLarge.floor_name} (${tooLarge.floor_area_sqft} sqft) cannot exceed Plot Area (${plotArea} sqft)`;
        }
      }
    }
    if (step === 7) {
      if (!form.floor_height || isNaN(form.floor_height) || parseFloat(form.floor_height) < 8 || parseFloat(form.floor_height) > 16) {
        e.floor_height = 'Floor height is mandatory (must be between 8 and 16 ft)';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const syncFlooringRooms = () => {
    // 1. Sync Flooring
    const rooms = [];
    const q = form.quality || 'Standard';
    const addRooms = (count, baseName, defaultArea = '150') => {
      const num = parseInt(count) || 0;
      
      let defaultType = 'Vitrified Floor Tiles';
      if (baseName === 'Bathroom') {
        defaultType = 'Ceramic Bathroom Floor Tiles';
      } else if (baseName === 'Balcony') {
        defaultType = 'Anti-Skid Tiles (Balcony/Utility)';
      } else if (baseName === 'Portico') {
        defaultType = 'Heavy Duty Pavers (Portico Floor)';
        defaultArea = form.parking_area_sqft || '150';
      }
      
      if (num === 1) {
        if (baseName === 'Bathroom') {
          rooms.push({ room_name: 'Bathroom (Floor)', flooring_type: 'Ceramic Bathroom Floor Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: defaultArea });
          rooms.push({ room_name: 'Bathroom (Wall Dado)', flooring_type: 'Glazed Bathroom Wall Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: '240' });
        } else if (baseName === 'Kitchen') {
          rooms.push({ room_name: 'Kitchen (Floor)', flooring_type: 'Vitrified Floor Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: defaultArea });
          rooms.push({ room_name: 'Kitchen (Wall Dado)', flooring_type: 'Kitchen Dado Wall Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: '40' });
        } else if (baseName === 'Portico') {
          rooms.push({ room_name: 'Portico (Floor)', flooring_type: 'Heavy Duty Pavers (Portico Floor)', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: defaultArea });
          rooms.push({ room_name: 'Portico (Wall Cladding)', flooring_type: 'Portico / Exterior Wall Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: '100' });
        } else {
          rooms.push({ room_name: baseName, flooring_type: defaultType, flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: defaultArea });
        }
      } else {
        for (let i = 1; i <= num; i++) {
          if (baseName === 'Bathroom') {
            rooms.push({ room_name: `Bathroom ${i} (Floor)`, flooring_type: 'Ceramic Bathroom Floor Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: defaultArea });
            rooms.push({ room_name: `Bathroom ${i} (Wall Dado)`, flooring_type: 'Glazed Bathroom Wall Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: '240' });
          } else if (baseName === 'Kitchen') {
            rooms.push({ room_name: `Kitchen ${i} (Floor)`, flooring_type: 'Vitrified Floor Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: defaultArea });
            rooms.push({ room_name: `Kitchen ${i} (Wall Dado)`, flooring_type: 'Kitchen Dado Wall Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: '40' });
          } else if (baseName === 'Portico') {
            rooms.push({ room_name: `Portico ${i} (Floor)`, flooring_type: 'Heavy Duty Pavers (Portico Floor)', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: defaultArea });
            rooms.push({ room_name: `Portico ${i} (Wall Cladding)`, flooring_type: 'Portico / Exterior Wall Tiles', flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: '100' });
          } else {
            rooms.push({ room_name: `${baseName} ${i}`, flooring_type: defaultType, flooring_brand: 'Kajaria', flooring_quality: q, area_sqft: defaultArea });
          }
        }
      }
    };

    addRooms(form.living_rooms, 'Living Room', '250');
    addRooms(form.dining_rooms, 'Dining Room', '200');
    addRooms(form.bedrooms, 'Bedroom', '150');
    addRooms(form.bathrooms, 'Bathroom', '80');
    addRooms(form.kitchens, 'Kitchen', '120');
    addRooms(form.pooja_rooms, 'Pooja Room', '50');
    addRooms(form.study_rooms, 'Study Room', '120');
    addRooms(form.store_rooms, 'Store Room', '80');
    addRooms(form.balconies, 'Balcony', '80');
    addRooms(form.porticos, 'Portico', '150');

    setFlooringRooms(rooms);

    // 2. Sync Doors & Windows details
    const dwRooms = [];
    const addDWRooms = (count, baseName, defaultDQty, defaultDMat, defaultWQty, defaultWMat, defaultVQty, defaultVMat) => {
      const num = parseInt(count) || 0;
      if (num === 1) {
        dwRooms.push({ room_name: baseName, door_qty: defaultDQty, door_material: defaultDMat, win_qty: defaultWQty, win_material: defaultWMat, vent_qty: defaultVQty, vent_material: defaultVMat });
      } else {
        for (let i = 1; i <= num; i++) {
          dwRooms.push({ room_name: `${baseName} ${i}`, door_qty: defaultDQty, door_material: defaultDMat, win_qty: defaultWQty, win_material: defaultWMat, vent_qty: defaultVQty, vent_material: defaultVMat });
        }
      }
    };

    addDWRooms(form.living_rooms, 'Living Room', '1', 'Teak Wood Door', '2', 'UPVC Sliding Window', '0', 'No Ventilator');
    addDWRooms(form.dining_rooms, 'Dining Room', '0', 'No Door / Open Arch', '1', 'UPVC Sliding Window', '0', 'No Ventilator');
    addDWRooms(form.bedrooms, 'Bedroom', '1', 'Laminated Flush Door', '2', 'UPVC Sliding Window', '0', 'No Ventilator');
    addDWRooms(form.bathrooms, 'Bathroom', '1', 'Waterproof PVC Door', '0', 'No Window', '1', 'Aluminium Louvered');
    addDWRooms(form.kitchens, 'Kitchen', '0', 'No Door / Open Arch', '1', 'UPVC Sliding Window', '0', 'No Ventilator');
    addDWRooms(form.pooja_rooms, 'Pooja Room', '1', 'Teak Wood Door', '0', 'No Window', '0', 'No Ventilator');
    addDWRooms(form.study_rooms, 'Study Room', '1', 'Laminated Flush Door', '2', 'UPVC Sliding Window', '0', 'No Ventilator');
    addDWRooms(form.store_rooms, 'Store Room', '1', 'Laminated Flush Door', '0', 'No Window', '0', 'No Ventilator');
    addDWRooms(form.balconies, 'Balcony', '1', 'WPC Premium Door', '0', 'No Window', '0', 'No Ventilator');
    addDWRooms(form.porticos, 'Portico', '0', 'No Door / Open Arch', '0', 'No Window', '0', 'No Ventilator');

    setDoorWinRooms(dwRooms);
  };

  const nextStep = () => {
    if (!validateCurrentStep()) return;
    const next = step + 1;
    if (next === 9) {
      syncFlooringRooms();
    }
    setStep(next);
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        floors_list: floorsList.map(f => ({ ...f, floor_area_sqft: Number(f.floor_area_sqft) })),
        flooring_rooms: flooringRooms.map(r => ({ ...r, area_sqft: Number(r.area_sqft) })),
        door_win_rooms: doorWinRooms.map(r => ({
          ...r,
          door_qty: Number(r.door_qty || 0),
          win_qty: Number(r.win_qty || 0),
          vent_qty: Number(r.vent_qty || 0)
        })),
        location: form.city,
        name: form.project_name
      };

      const result = await estimatesAPI.generate(payload);

      const normalized = {
        ...result,
        input: payload,
        summary: {
          customerName: form.customer_name,
          location: form.city,
          buildingType: form.building_type,
          totalSqft: result.summary?.totalSqft || 1500,
          quality: form.quality
        },
        boqItems: (result.boqItems || result.boq || []).map((item) => ({
          ...item,
          qty: item.qty ?? item.quantity ?? 0,
          code: item.item_code ?? item.material_code ?? item.code ?? ''
        }))
      };

      sessionStorage.setItem('bs_estimate', JSON.stringify(normalized));
      navigate('/estimate-result');
    } catch (err) {
      setErrors({ _global: err.message || 'Failed to generate estimate. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout role="builder">
      {/* Page Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1120 0%, #0f2027 50%, #0f766e 100%)',
        borderRadius: 'var(--border-radius-xl)',
        padding: '24px 32px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏗️</div>
          <div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 700 }}>New Estimate Wizard</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '2px' }}>Complete the 17 steps to configure full project dimensions and specifications.</div>
          </div>
        </div>
      </div>

      {/* Main wizard wrapper */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Sidebar wizard list */}
        <div className="card" style={{ padding: '16px', position: 'sticky', top: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.05em' }}>Steps Progress</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {STEPS.map((s) => (
              <div
                key={s.num}
                onClick={() => {
                  if (s.num < step || validateCurrentStep()) {
                    if (s.num === 9) {
                      syncFlooringRooms();
                    }
                    setStep(s.num);
                  }
                }}
                style={{
                  padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s',
                  background: step === s.num ? 'rgba(15,118,110,0.1)' : 'transparent',
                  color: step === s.num ? 'var(--color-primary)' : step > s.num ? 'var(--color-gray-700)' : 'var(--color-gray-400)',
                  fontWeight: step === s.num ? 700 : 500
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step === s.num ? 'var(--color-primary)' : step > s.num ? 'var(--color-primary-light)' : 'var(--color-gray-200)',
                  color: step >= s.num ? '#fff' : 'var(--color-gray-500)', fontSize: '11px', fontWeight: 700
                }}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Form Area */}
        <div style={{ minWidth: 0 }}>
          
          {/* STEP 1: Customer Details */}
          {step === 1 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #0891b2', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #0891b2, #0f766e)" />
              <div className="card-header"><div className="card-title">👤 Customer Details</div></div>
              <div className="card-body">
                <SectionHeader>Contact Information</SectionHeader>
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input className={`form-control ${errors.customer_name ? 'border-danger' : ''}`} value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
                  {errors.customer_name && <div className="form-error">{errors.customer_name}</div>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input className={`form-control ${errors.customer_mobile ? 'border-danger' : ''}`} type="tel" value={form.customer_mobile} onChange={(e) => set('customer_mobile', e.target.value)} />
                    {errors.customer_mobile && <div className="form-error">{errors.customer_mobile}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className={`form-control ${errors.customer_email ? 'border-danger' : ''}`} type="email" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} />
                    {errors.customer_email && <div className="form-error">{errors.customer_email}</div>}
                  </div>
                </div>
                <SectionHeader>Quotation Info</SectionHeader>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Project / Build Name *</label>
                    <input className={`form-control ${errors.project_name ? 'border-danger' : ''}`} placeholder="e.g. Dream House 3BHK" value={form.project_name} onChange={(e) => set('project_name', e.target.value)} />
                    {errors.project_name && <div className="form-error">{errors.project_name}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Builder Company Name</label>
                    <input className="form-control" value={form.builder_company_name} readOnly style={{ background: 'rgba(15,118,110,0.04)', cursor: 'not-allowed', color: 'var(--color-gray-600)' }} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Quotation Number</label>
                    <input className="form-control" value={form.quotation_number} readOnly style={{ background: 'rgba(15,118,110,0.04)', cursor: 'not-allowed', color: 'var(--color-gray-600)', fontWeight: 'bold' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quotation Date</label>
                    <input className="form-control" type="date" value={form.quotation_date} onChange={(e) => set('quotation_date', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Project Location */}
          {step === 2 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #0f766e', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #0f766e, #0891b2)" />
              <div className="card-header"><div className="card-title">📍 Project Location</div></div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-control" value="India" readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed', color: 'var(--color-gray-600)' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <select
                      className={`form-control ${errors.state ? 'border-danger' : ''}`}
                      value={form.state}
                      onChange={(e) => {
                        const selectedState = e.target.value;
                        set('state', selectedState);
                        set('city', ''); // Reset city on state change
                      }}
                    >
                      <option value="">Select State</option>
                      {INDIA_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {errors.state && <div className="form-error">{errors.state}</div>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City / District *</label>
                    <select
                      className={`form-control ${errors.city ? 'border-danger' : ''}`}
                      value={form.city}
                      onChange={(e) => set('city', e.target.value)}
                      disabled={!form.state}
                    >
                      <option value="">{form.state ? 'Select City / District' : 'Select State First'}</option>
                      {(STATE_DISTRICTS[form.state] || []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {errors.city && <div className="form-error">{errors.city}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Locality</label>
                    <input className="form-control" value={form.locality} onChange={(e) => set('locality', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input className={`form-control ${errors.pincode ? 'border-danger' : ''}`} value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
                    {errors.pincode && <div className="form-error">{errors.pincode}</div>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Detailed Site Address</label>
                  <textarea className="form-control" style={{ height: '80px' }} value={form.project_address} onChange={(e) => set('project_address', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Building & Soil Info */}
          {step === 7 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #7c3aed', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #7c3aed, #0f766e)" />
              <div className="card-header"><div className="card-title">🏢 Building & Soil Info</div></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Building Category Type</label>
                  <SelectCard options={BUILDING_TYPES} value={form.building_type} onChange={(v) => set('building_type', v)} emojis={['🏠', '🏘️', '🏢', '🏬']} />
                </div>
                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label className="form-label">Structural Frame Design</label>
                  <SelectCard options={STRUCTURE_TYPES} value={form.structure_type} onChange={(v) => set('structure_type', v)} emojis={['🏗️', '🧱', '🔩', '⛺']} />
                </div>

                <SectionHeader style={{ marginTop: '24px' }}>Building Height & Facade</SectionHeader>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Floor Height (ft) *</label>
                    <input className={`form-control ${errors.floor_height ? 'border-danger' : ''}`} type="number" value={form.floor_height} onChange={(e) => set('floor_height', e.target.value)} min="8" max="16" />
                    {errors.floor_height && <div className="form-error">{errors.floor_height}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Front Elevation Area (sqft)</label>
                    <input className="form-control" type="number" value={form.front_elevation_area} onChange={(e) => set('front_elevation_area', e.target.value)} />
                  </div>
                </div>

                <SectionHeader style={{ marginTop: '20px' }}>🌍 Site Conditions & Soil Type</SectionHeader>
                <div className="form-hint" style={{ marginBottom: '14px', color: 'var(--color-gray-500)', fontSize: '12px' }}>
                  Soil profile affects foundation cost scaling index (Soft Soil: 1.15×, Rocky Soil: 1.30×, Black Cotton: 1.45×)
                </div>
                <SelectCard options={SOIL_TYPES} value={form.soil_type} onChange={(v) => set('soil_type', v)} emojis={['🪨', '🪵', '🗿', '🌾']} />
              </div>
            </div>
          )}

          {/* STEP 5: Plot & Area Details */}
          {step === 5 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #059669', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #059669, #0f766e)" />
              <div className="card-header"><div className="card-title">📐 Area Details</div></div>
              <div className="card-body">
                
                <SectionHeader>Plot Dimensions & Area</SectionHeader>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Plot Length (ft)</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.plot_length}
                      onChange={(e) => {
                        const val = e.target.value;
                        set('plot_length', val);
                        if (val && form.plot_width) {
                          set('plot_area_sqft', (parseFloat(val) * parseFloat(form.plot_width)).toString());
                        }
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Plot Width (ft)</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.plot_width}
                      onChange={(e) => {
                        const val = e.target.value;
                        set('plot_width', val);
                        if (val && form.plot_length) {
                          set('plot_area_sqft', (parseFloat(form.plot_length) * parseFloat(val)).toString());
                          
                          // Also pre-fill Front Elevation Area (Plot Width * Height)
                          const floorsCount = parseInt(form.floors) || 1;
                          const flHeight = parseFloat(form.floor_height) || 10;
                          const height = floorsCount * flHeight;
                          set('front_elevation_area', (parseFloat(val) * height).toString());
                        }
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Calculated Plot Area (sqft)</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.plot_area_sqft}
                      onChange={(e) => set('plot_area_sqft', e.target.value)}
                      style={{ background: 'rgba(15,118,110,0.04)', fontWeight: 'bold' }}
                    />
                  </div>
                </div>

                <SectionHeader style={{ marginTop: '20px' }}>Building footprint & Floor Areas</SectionHeader>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Building Outer Length (ft)</label>
                    <input className="form-control" type="number" value={form.building_length} onChange={(e) => set('building_length', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Building Outer Width (ft)</label>
                    <input className="form-control" type="number" value={form.building_width} onChange={(e) => set('building_width', e.target.value)} />
                  </div>
                </div>

                <div style={{ marginTop: '16px', background: 'rgba(15,118,110,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-gray-200)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.05em' }}>Floor-wise Built-up Areas</div>
                  <div style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
                    {floorsList.map((fl, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-gray-700)' }}>{fl.floor_name}:</span>
                        <input
                          className="form-control"
                          type="number"
                          value={fl.floor_area_sqft}
                          onChange={(e) => {
                            const updated = [...floorsList];
                            updated[idx].floor_area_sqft = e.target.value;
                            setFloorsList(updated);
                          }}
                          style={{ height: '36px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ maxWidth: '400px' }}>
                  <label className="form-label">Total Built-up Area (sqft) *</label>
                  <input
                    className={`form-control ${errors.builtup_area_sqft ? 'border-danger' : ''}`}
                    type="number"
                    value={form.builtup_area_sqft}
                    readOnly
                    style={{ background: 'rgba(15,118,110,0.04)', fontWeight: 'bold' }}
                  />
                  {errors.builtup_area_sqft && <div className="form-error">{errors.builtup_area_sqft}</div>}
                  <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                    Automatically calculated from individual floor areas.
                  </div>
                </div>

                <SectionHeader style={{ marginTop: '20px' }}>Auxiliary Areas</SectionHeader>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Basement Area (sqft)</label>
                    <input className="form-control" type="number" value={form.basement_area_sqft} onChange={(e) => set('basement_area_sqft', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Portico Area (sqft)</label>
                    <input className="form-control" type="number" value={form.parking_area_sqft} onChange={(e) => set('parking_area_sqft', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Terrace Area (sqft)</label>
                    <input className="form-control" type="number" value={form.terrace_area_sqft} onChange={(e) => set('terrace_area_sqft', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Balcony Area (sqft)</label>
                    <input className="form-control" type="number" value={form.balcony_area_sqft} onChange={(e) => set('balcony_area_sqft', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Floor Details */}
          {step === 4 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #d97706', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #d97706, #0f766e)" />
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">🪜 Dynamic Floor Areas</div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFloorsList([...floorsList, { floor_name: `Floor ${floorsList.length + 1}`, floor_area_sqft: '1200' }])}
                >
                  ＋ Add Floor
                </button>
              </div>
              <div className="card-body">
                {errors.floors && <div className="form-error" style={{ marginBottom: '16px', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>⚠️ {errors.floors}</div>}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Number of Floors</label>
                  <select
                    className="form-control"
                    value={floorsList.length}
                    onChange={(e) => {
                      const num = parseInt(e.target.value) || 1;
                      const updated = [];
                      for (let i = 0; i < num; i++) {
                        let name = 'Ground Floor';
                        if (i === 1) name = 'First Floor';
                        else if (i === 2) name = 'Second Floor';
                        else if (i === 3) name = 'Third Floor';
                        else if (i > 3) name = `Floor ${i}`;
                        
                        const existingArea = floorsList[i]?.floor_area_sqft || '1200';
                        updated.push({ floor_name: name, floor_area_sqft: existingArea });
                      }
                      setFloorsList(updated);
                      set('floors', num.toString());
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? '1 Floor (Ground Floor)' : `${n} Floors (G + ${n-1})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {floorsList.map((f, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px', gap: '12px', alignItems: 'center' }}>
                      <input
                        className="form-control"
                        placeholder="Floor Name"
                        value={f.floor_name}
                        onChange={(e) => {
                          const updated = [...floorsList];
                          updated[idx].floor_name = e.target.value;
                          setFloorsList(updated);
                        }}
                      />
                      <input
                        className="form-control"
                        type="number"
                        placeholder="Floor Area (sqft)"
                        value={f.floor_area_sqft}
                        onChange={(e) => {
                          const updated = [...floorsList];
                          updated[idx].floor_area_sqft = e.target.value;
                          setFloorsList(updated);
                        }}
                      />
                      <button
                        className="btn btn-ghost"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => setFloorsList(floorsList.filter((_, i) => i !== idx))}
                        disabled={floorsList.length <= 1}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Room Details */}
          {step === 8 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #ca8a04', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #ca8a04, #0f766e)" />
              <div className="card-header"><div className="card-title">🛏️ Room Details</div></div>
              <div className="card-body">
                <div className="form-row-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Bedrooms', name: 'bedrooms' },
                    { label: 'Bathrooms', name: 'bathrooms' },
                    { label: 'Living Rooms', name: 'living_rooms' },
                    { label: 'Dining Rooms', name: 'dining_rooms' },
                    { label: 'Kitchens', name: 'kitchens' },
                    { label: 'Pooja Rooms', name: 'pooja_rooms' },
                    { label: 'Study Rooms', name: 'study_rooms' },
                    { label: 'Store Rooms', name: 'store_rooms' },
                    { label: 'Balconies', name: 'balconies' },
                    { label: 'Porticos', name: 'porticos' }
                  ].map((room) => (
                    <div className="form-group" key={room.name} style={{ marginBottom: 0 }}>
                      <label className="form-label">{room.label}</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={form[room.name]}
                        onChange={(e) => set(room.name, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Soil Type (Merged in Step 6) */}
          {step === 1000 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #b45309', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #b45309, #0f766e)" />
              <div className="card-header"><div className="card-title">🌍 Site Conditions & Soil Type</div></div>
              <div className="card-body">
                <div className="form-hint" style={{ marginBottom: '14px', color: 'var(--color-gray-500)' }}>
                  Soil profile affects foundation cost scaling index (Soft Soil: 1.15×, Rocky Soil: 1.30×, Black Cotton: 1.45×)
                </div>
                <SelectCard options={SOIL_TYPES} value={form.soil_type} onChange={(v) => set('soil_type', v)} emojis={['🪨', '🪵', '🗿', '🌾']} />
              </div>
            </div>
          )}

          {/* STEP 3: Construction Package */}
          {step === 3 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #ea580c', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #ea580c, #0f766e)" />
              <div className="card-header"><div className="card-title">🏅 Construction Package</div></div>
              <div className="card-body">
                <SelectCard options={QUALITY_OPTIONS} value={form.quality} onChange={handleQualityChange} emojis={['🏗️', '⭐', '👑']} />
              </div>
            </div>
          )}

          {/* STEP 6: Material Selection */}
          {step === 6 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #dc2626', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #dc2626, #0f766e)" />
              <div className="card-header"><div className="card-title">🧱 Material Preferences</div></div>
              <div className="card-body">
                <SectionHeader>Structural Elements</SectionHeader>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cement Brand</label>
                    <select className="form-control" value={form.cementBrand} onChange={(e) => set('cementBrand', e.target.value)}>
                      {CEMENT_BRANDS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Steel Brand</label>
                    <select className="form-control" value={form.steelBrand} onChange={(e) => set('steelBrand', e.target.value)}>
                      {STEEL_BRANDS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Steel Grade</label>
                    <select className="form-control" value={form.steelGrade} onChange={(e) => set('steelGrade', e.target.value)}>
                      {STEEL_GRADES.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Brick / Block Type</label>
                    <select className="form-control" value={form.brickType} onChange={(e) => set('brickType', e.target.value)}>
                      {BRICK_TYPES.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sand Type</label>
                    <select className="form-control" value={form.sandType} onChange={(e) => set('sandType', e.target.value)}>
                      {SAND_TYPES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Concrete Grade</label>
                    <select className="form-control" value={form.concreteGrade} onChange={(e) => set('concreteGrade', e.target.value)}>
                      {CONCRETE_GRADES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <SectionHeader>MEP Fitting Brands</SectionHeader>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Electrical Wire Brand</label>
                    <select className="form-control" value={form.wireBrand} onChange={(e) => set('wireBrand', e.target.value)}>
                      {MEP_BRANDS.wire.map((w) => <option key={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Plumbing Pipe Brand</label>
                    <select className="form-control" value={form.pipeBrand} onChange={(e) => set('pipeBrand', e.target.value)}>
                      {MEP_BRANDS.pipe.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Switch / Fitting Brand</label>
                    <select className="form-control" value={form.switchBrand} onChange={(e) => set('switchBrand', e.target.value)}>
                      {MEP_BRANDS.switch.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 9: Flooring Details */}
          {step === 9 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #db2777', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #db2777, #0f766e)" />
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">🟫 Room-wise Flooring details</div>
                <button
                   className="btn btn-secondary btn-sm"
                   onClick={() => setFlooringRooms([...flooringRooms, { room_name: `Room ${flooringRooms.length+1}`, flooring_type: 'Vitrified Floor Tiles', flooring_brand: 'Kajaria', flooring_quality: 'Premium', area_sqft: '150' }])}
                >
                  ＋ Add Room
                </button>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {flooringRooms.map((r, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) 40px', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.01)', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-gray-200)' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '10px' }}>Room Name</label>
                        <input className="form-control" value={r.room_name} onChange={(e) => {
                          const u = [...flooringRooms]; u[idx].room_name = e.target.value; setFlooringRooms(u);
                        }} />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10px' }}>Flooring Type</label>
                        <select className="form-control" value={r.flooring_type} onChange={(e) => {
                          const u = [...flooringRooms]; u[idx].flooring_type = e.target.value; setFlooringRooms(u);
                        }}>
                          {FLOORING_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10px' }}>Brand</label>
                        <select className="form-control" value={r.flooring_brand} onChange={(e) => {
                          const u = [...flooringRooms]; u[idx].flooring_brand = e.target.value; setFlooringRooms(u);
                        }}>
                          {FLOORING_BRANDS.map((b) => <option key={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10px' }}>Quality</label>
                        <select className="form-control" value={r.flooring_quality} onChange={(e) => {
                          const u = [...flooringRooms]; u[idx].flooring_quality = e.target.value; setFlooringRooms(u);
                        }}>
                          {FLOORING_QUALITIES.map((q) => <option key={q}>{q}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '10px' }}>Area (sqft)</label>
                        <input className="form-control" type="number" value={r.area_sqft} onChange={(e) => {
                          const u = [...flooringRooms]; u[idx].area_sqft = e.target.value; setFlooringRooms(u);
                        }} />
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{ color: 'var(--color-danger)', marginTop: '16px' }}
                        onClick={() => setFlooringRooms(flooringRooms.filter((_, i) => i !== idx))}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 10: Doors & Windows Details */}
          {step === 10 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #0891b2', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #0891b2, #0f766e)" />
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">🚪 Room-wise Doors & Windows Specs</div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDoorWinRooms([...doorWinRooms, { room_name: `Custom Area ${doorWinRooms.length+1}`, door_qty: '1', door_material: 'Laminated Flush Door', win_qty: '1', win_material: 'UPVC Sliding Window', vent_qty: '0', vent_material: 'No Ventilator' }])}
                >
                  ＋ Add Custom Room
                </button>
              </div>
              <div className="card-body">
                <div className="form-hint" style={{ marginBottom: '14px', color: 'var(--color-gray-500)' }}>
                  Configure specific materials and quantities of doors, windows, and ventilators for each section.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {doorWinRooms.map((r, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(3, 1.5fr) 40px', gap: '12px', alignItems: 'start', background: 'rgba(0,0,0,0.01)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}>
                      
                      {/* Room label */}
                      <div style={{ alignSelf: 'center' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-gray-400)', fontWeight: 600 }}>Room Name</div>
                        <input className="form-control" value={r.room_name} onChange={(e) => {
                          const u = [...doorWinRooms]; u[idx].room_name = e.target.value; setDoorWinRooms(u);
                        }} style={{ fontWeight: 600, background: 'transparent', border: 'none', paddingLeft: 0 }} />
                      </div>

                      {/* Door details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: '6px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Door Qty</label>
                          <input className="form-control" type="number" min="0" value={r.door_qty} onChange={(e) => {
                            const u = [...doorWinRooms]; u[idx].door_qty = e.target.value; setDoorWinRooms(u);
                          }} />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Door Material</label>
                          <select className="form-control" value={r.door_material} onChange={(e) => {
                            const u = [...doorWinRooms]; u[idx].door_material = e.target.value; setDoorWinRooms(u);
                          }} disabled={Number(r.door_qty) === 0}>
                            {DOOR_MATERIALS.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Window details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: '6px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Win Qty</label>
                          <input className="form-control" type="number" min="0" value={r.win_qty} onChange={(e) => {
                            const u = [...doorWinRooms]; u[idx].win_qty = e.target.value; setDoorWinRooms(u);
                          }} />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Window Type</label>
                          <select className="form-control" value={r.win_material} onChange={(e) => {
                            const u = [...doorWinRooms]; u[idx].win_material = e.target.value; setDoorWinRooms(u);
                          }} disabled={Number(r.win_qty) === 0}>
                            {WINDOW_MATERIALS.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Ventilator details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: '6px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Vent Qty</label>
                          <input className="form-control" type="number" min="0" value={r.vent_qty} onChange={(e) => {
                            const u = [...doorWinRooms]; u[idx].vent_qty = e.target.value; setDoorWinRooms(u);
                          }} />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '10px' }}>Ventilator</label>
                          <select className="form-control" value={r.vent_material} onChange={(e) => {
                            const u = [...doorWinRooms]; u[idx].vent_material = e.target.value; setDoorWinRooms(u);
                          }} disabled={Number(r.vent_qty) === 0}>
                            {VENTILATOR_MATERIALS.map((m) => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        className="btn btn-ghost"
                        style={{ color: 'var(--color-danger)', marginTop: '22px' }}
                        onClick={() => setDoorWinRooms(doorWinRooms.filter((_, i) => i !== idx))}
                      >
                        🗑️
                      </button>

                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 11: Paint Details */}
          {step === 11 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #9333ea', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #9333ea, #0f766e)" />
              <div className="card-header"><div className="card-title">🎨 Paint Specifications</div></div>
              <div className="card-body">
                <SectionHeader>Interior Paint</SectionHeader>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Interior Paint Type</label>
                    <select className="form-control" value={form.paintType} onChange={(e) => set('paintType', e.target.value)}>
                      {PAINT_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Paint Brand</label>
                    <select className="form-control" value={form.paintBrand} onChange={(e) => set('paintBrand', e.target.value)}>
                      {PAINT_BRANDS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Paint Quality Tier</label>
                    <input className="form-control" placeholder="e.g. Royal Luxury" value={form.paintQuality} onChange={(e) => set('paintQuality', e.target.value)} />
                  </div>
                </div>
                <SectionHeader>Exterior Paint</SectionHeader>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Exterior Paint Type</label>
                    <input className="form-control" placeholder="e.g. Apex Weatherproof" value={form.exterior_paint_type} onChange={(e) => set('exterior_paint_type', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Exterior Paint Brand</label>
                    <select className="form-control" value={form.exterior_paint_brand} onChange={(e) => set('exterior_paint_brand', e.target.value)}>
                      {PAINT_BRANDS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 12: Electrical Details */}
          {step === 12 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #2563eb', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #2563eb, #0f766e)" />
              <div className="card-header"><div className="card-title">🔌 Electrical Layout (Points)</div></div>
              <div className="card-body">
                <div className="form-row-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Light Points', name: 'light_points' },
                    { label: 'Fan Points', name: 'fan_points' },
                    { label: 'AC Points', name: 'ac_points' },
                    { label: 'TV Points', name: 'tv_points' },
                    { label: 'Geyser Points', name: 'geyser_points' },
                    { label: 'Power Sockets', name: 'power_socket_points' },
                    { label: 'Inverter Points', name: 'inverter_points' },
                    { label: 'CCTV Points', name: 'cctv_points' },
                    { label: 'Internet Points', name: 'internet_points' },
                    { label: 'Doorbell Points', name: 'doorbell_points' }
                  ].map((p) => (
                    <div className="form-group" key={p.name} style={{ marginBottom: 0 }}>
                      <label className="form-label">{p.label}</label>
                      <input className="form-control" type="number" min="0" value={form[p.name]} onChange={(e) => set(p.name, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 13: Plumbing Details */}
          {step === 13 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #06b6d4', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #06b6d4, #0f766e)" />
              <div className="card-header"><div className="card-title">🚰 Plumbing Fixtures & Tanks</div></div>
              <div className="card-body">
                <SectionHeader>Fixtures & Taps</SectionHeader>
                <div className="form-row-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Wash Basins', name: 'wash_basins' },
                    { label: 'Western Toilets', name: 'western_toilets' },
                    { label: 'Indian Toilets', name: 'indian_toilets' },
                    { label: 'Kitchen Sinks', name: 'kitchen_sinks' },
                    { label: 'Water Heaters', name: 'water_heaters' },
                    { label: 'Water Taps / Faucets', name: 'taps' }
                  ].map((p) => (
                    <div className="form-group" key={p.name} style={{ marginBottom: 0 }}>
                      <label className="form-label">{p.label}</label>
                      <input className="form-control" type="number" min="0" value={form[p.name]} onChange={(e) => set(p.name, e.target.value)} />
                    </div>
                  ))}
                </div>
                
                <SectionHeader style={{ marginTop: '20px' }}>Water Storage & Treatment</SectionHeader>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Overhead Tank Capacity (Litres)</label>
                    <input className="form-control" type="number" value={form.overhead_tank_capacity} onChange={(e) => set('overhead_tank_capacity', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Underground Sump Capacity (Litres)</label>
                    <input className="form-control" type="number" value={form.underground_sump_capacity} onChange={(e) => set('underground_sump_capacity', e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label className="form-label">Septic Tank Capacity (Litres) *</label>
                  <input
                    className="form-control"
                    type="number"
                    value={form.septic_tank_capacity}
                    onChange={(e) => set('septic_tank_capacity', e.target.value)}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                    Septic tank installation is mandatory. Enter desired capacity.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 14: Interior Requirements */}
          {step === 14 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #059669', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #059669, #0f766e)" />
              <div className="card-header"><div className="card-title">🛋️ Interior Requirements</div></div>
              <div className="card-body">
                <div className="form-hint" style={{ marginBottom: '14px', color: 'var(--color-gray-500)' }}>
                  Interiors are estimated separately from civil construction, giving you split cost totals.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Toggle label="Modular Kitchen" sublabel="L-shape postform plywood kitchen cabinets" checked={form.modular_kitchen} onChange={(v) => set('modular_kitchen', v)} />
                  <Toggle label="False Ceiling" sublabel="Gypsum layout (40% total area)" checked={form.false_ceiling} onChange={(v) => set('false_ceiling', v)} />
                  <Toggle label="TV Unit Backdrop" sublabel="Custom laminated TV stand carpentry" checked={form.tv_unit} onChange={(v) => set('tv_unit', v)} />
                  <Toggle label="Shoe Rack" sublabel="Entryway custom shoe cabinet" checked={form.shoe_rack} onChange={(v) => set('shoe_rack', v)} />
                  <Toggle label="Study Table" sublabel="Integrated study desk & bookshelves" checked={form.study_table} onChange={(v) => set('study_table', v)} />
                  <Toggle label="Pooja Mandir Unit" sublabel="Teakwood finished mandir niche" checked={form.pooja_unit} onChange={(v) => set('pooja_unit', v)} />
                </div>
                
                <SectionHeader style={{ marginTop: '20px' }}>Quantities & Quality Grade</SectionHeader>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Number of Wardrobes</label>
                    <input className="form-control" type="number" min="0" value={form.wardrobes} onChange={(e) => set('wardrobes', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designer Wallpaper Rolls</label>
                    <input className="form-control" type="number" min="0" value={form.wallpaper} onChange={(e) => set('wallpaper', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Curtains (Windows count)</label>
                    <input className="form-control" type="number" min="0" value={form.curtains} onChange={(e) => set('curtains', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Interior Quality Grade</label>
                  <SelectCard options={['Standard', 'Premium', 'Luxury']} value={form.interiorQuality} onChange={(v) => set('interiorQuality', v)} emojis={['🏗️', '⭐', '👑']} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 15: Exterior Requirements */}
          {step === 15 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #0f766e', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #0f766e, #0891b2)" />
              <div className="card-header"><div className="card-title">🧱 Exterior Requirements</div></div>
              <div className="card-body">
                <Toggle
                  label="Compound Wall Construction"
                  sublabel="Add compound wall estimate around the plot perimeter"
                  checked={form.compound_wall_required}
                  onChange={(checked) => {
                    set('compound_wall_required', checked);
                    if (checked) {
                      const calculatedRft = getCalculatedCompoundWallVal(form.compound_wall_sides, form.plot_length, form.plot_width);
                      set('compound_wall', calculatedRft);
                    } else {
                      set('compound_wall', '0');
                    }
                  }}
                />

                {form.compound_wall_required && (
                  <div className="form-row" style={{ marginTop: '16px', background: 'rgba(15,118,110,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-gray-200)' }}>
                    <div className="form-group">
                      <label className="form-label">Compound Wall Layout</label>
                      <select
                        className="form-control"
                        value={form.compound_wall_sides}
                        onChange={(e) => {
                          const sides = e.target.value;
                          set('compound_wall_sides', sides);
                          const calculatedRft = getCalculatedCompoundWallVal(sides, form.plot_length, form.plot_width);
                          set('compound_wall', calculatedRft);
                        }}
                      >
                        <option value="4 Sides">4 Sides (Full Perimeter)</option>
                        <option value="3 Sides">3 Sides (Front Open)</option>
                        <option value="2 Sides">2 Sides (Shared Borders)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Calculated Wall Length (Rft)</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={form.compound_wall}
                        onChange={(e) => set('compound_wall', e.target.value)}
                        style={{ fontWeight: 'bold' }}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label className="form-label">Gate Weight (Kg)</label>
                  <input className="form-control" type="number" min="0" placeholder="e.g. 250" value={form.gate} onChange={(e) => set('gate', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 16: Additional Charges */}
          {step === 16 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #6d28d9', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #6d28d9, #0f766e)" />
              <div className="card-header"><div className="card-title">📈 Margins & Taxes</div></div>
              <div className="card-body">
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Contingency Buffer (%)</label>
                    <input className="form-control" type="number" min="0" max="30" value={form.contingency_percentage} onChange={(e) => set('contingency_percentage', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Builder Profit Margin (%)</label>
                    <input className="form-control" type="number" min="0" max="50" value={form.builder_margin_percentage} onChange={(e) => set('builder_margin_percentage', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST / Tax Rate (%)</label>
                    <input className="form-control" type="number" min="0" max="30" value={form.gst_percentage} onChange={(e) => set('gst_percentage', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 17: Summary & Generate */}
          {step === 17 && (
            <div className="card fade-in" style={{ borderTop: '3px solid #0f766e', overflow: 'hidden' }}>
              <CardAccentStrip gradient="linear-gradient(90deg, #0f766e, #059669)" />
              <div className="card-header"><div className="card-title">📋 Summary Preview</div></div>
              <div className="card-body" style={{ padding: '24px' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px' }}>
                  Please review all your configured settings and specifications below before generating the final construction estimate and quotation.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  
                  {/* Card 1: Client & Project details */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                      📋 Project & Client Info
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-gray-400)', fontWeight: 600 }}>Customer Name</span>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{form.customer_name || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-gray-400)', fontWeight: 600 }}>Phone / Email</span>
                        <div style={{ fontSize: '13px', color: '#334155' }}>{form.customer_mobile || '—'} / {form.customer_email || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-gray-400)', fontWeight: 600 }}>Project / Build Name</span>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{form.project_name || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-gray-400)', fontWeight: 600 }}>Target Location</span>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>{form.city}, {form.state}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Dimensions & Height */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                      📏 Dimensions & Height
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Plot Area:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.plot_area_sqft} sqft ({form.plot_length}x{form.plot_width})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Building Footprint:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.building_length || '—'} ft x {form.building_width || '—'} ft</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Number of Floors:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.floors} Floor(s)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Floor / Total Height:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.floor_height} ft / {(parseInt(form.floors) || 1) * (parseFloat(form.floor_height) || 10)} ft</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Total Built-up Area:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>{form.builtup_area_sqft} sqft</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Materials & Structural */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                      🧱 Material & Structural
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Quality / Structure:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.quality} / {form.structure_type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Soil Type / Profile:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.soil_type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Cement / Steel Brands:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.cementBrand} / {form.steelBrand} ({form.steelGrade})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Doors / Windows:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                          {doorWinRooms.reduce((s, r) => s + (parseInt(r.door_qty) || 0), 0)} Doors,{' '}
                          {doorWinRooms.reduce((s, r) => s + (parseInt(r.win_qty) || 0), 0)} Win,{' '}
                          {doorWinRooms.reduce((s, r) => s + (parseInt(r.vent_qty) || 0), 0)} Vent
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Front Elevation Facade:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.front_elevation_area} sqft</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Services & Add-ons */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                      ⚡ Services & Add-ons
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Electrical Points:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{parseInt(form.light_points || 0) + parseInt(form.fan_points || 0) + parseInt(form.ac_points || 0) + parseInt(form.power_socket_points || 0)} Total Points</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Sump / Tank / Septic:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.underground_sump_capacity}L / {form.overhead_tank_capacity}L / {form.septic_tank_capacity}L</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Modular Kitchen / False Ceiling:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.modular_kitchen ? 'Yes' : 'No'} / {form.false_ceiling ? 'Yes' : 'No'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Compound Wall Construction:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.compound_wall_required ? `${form.compound_wall} Rft (${form.compound_wall_sides})` : 'Not Required'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Gate Weight:</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{form.gate ? `${form.gate} Kg` : 'None'}</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(15,118,110,0.05)', borderRadius: '10px', fontSize: '13px', color: '#0f766e', fontWeight: 600 }}>
                  💡 Make sure all inputs are correct. Clicking "Generate Estimate" below will compute the Bill of Quantities (BOQ), pricing breakdown, structural timeline, and AI tips.
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Navigation Footer (Frosted Glass) */}
      <style>{`
        @keyframes shimmer-slide {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .generate-btn {
          background: linear-gradient(135deg, #0f766e 0%, #0891b2 100%);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15,118,110,0.38);
        }
        .generate-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%);
          background-size: 200% 100%;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .generate-btn:hover:not(:disabled)::after {
          opacity: 1;
          animation: shimmer-slide 0.85s linear infinite;
        }
      `}</style>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px',
        padding: '16px 24px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--border-radius-lg)',
        boxShadow: '0 -2px 16px rgba(15,118,110,0.06), var(--shadow-card)', position: 'sticky', bottom: '16px', zIndex: 10,
      }}>
        <div>
          {step > 1 && (
            <button className="btn btn-secondary" onClick={prevStep} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>← Back</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Cancel</button>
          {errors._global && (
            <div style={{ color: '#dc2626', fontSize: '13px', padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.18)' }}>
              ⚠ {errors._global}
            </div>
          )}
          {step < 17 ? (
            <button className="btn btn-primary" onClick={nextStep} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Next Step: Step {step + 1} →
            </button>
          ) : (
            <button
              className="btn btn-primary btn-lg generate-btn"
              onClick={handleGenerate}
              disabled={loading}
              style={{ fontSize: '15px', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, minWidth: '210px', justifyContent: 'center' }}
            >
              {loading ? '⏳ Generating…' : '✨ Generate Estimate'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
