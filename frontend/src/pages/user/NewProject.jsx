import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { estimatesAPI, getCurrentUser } from '../../services/api';
import { INDIA_STATES, STATE_DISTRICTS } from '../../utils/indiaData';

const STEPS = [
  { num: 1, label: 'Select Package' },
  { num: 2, label: 'Building Details' },
  { num: 3, label: 'Material Selection' },
  { num: 4, label: 'Room details' },
  { num: 5, label: 'Add-ons' },
  { num: 6, label: 'Preview & Generate' }
];

const QUALITY_OPTIONS = [
  { key: 'Base', label: 'Base Package', rate: 2100, emoji: '💰', desc: 'Standard materials & budget finishes (₹2,100/sq.ft)' },
  { key: 'Standard', label: 'Standard Package', rate: 2400, emoji: '🏗', desc: 'Robust materials & mid-range finishes (₹2,400/sq.ft)' },
  { key: 'Premium', label: 'Premium Package', rate: 2600, emoji: '⭐', desc: 'Premium grade materials & luxury finishes (₹2,600/sq.ft)' },
  { key: 'Luxury', label: 'Luxury Package', rate: 2800, emoji: '👑', desc: 'Exclusive luxury fittings & superior workmanship (₹2,800/sq.ft)' }
];

const WALL_MATERIALS = ['AAC Blocks', 'Red Clay Bricks', 'Concrete Solid Blocks', 'Fly Ash Bricks'];
const SAND_RCC = ['M-Sand', 'River Sand'];
const SAND_PLASTER = ['P-Sand', 'River Sand'];
const CEMENT_BRANDS = ['UltraTech', 'ACC', 'Ambuja', 'Ramco'];
const STEEL_BRANDS = ['Tata Tiscon', 'JSW Neo', 'Sail'];

const DEFAULT_FORM = {
  // Step 1: Customer Details & Package
  customer_name: '',
  customer_mobile: '',
  customer_email: '',
  project_name: '',
  state: 'Tamil Nadu',
  city: 'Erode',
  quality: 'Standard',
  total_sqft: 1500, // target baseline built-up area

  // Step 2: Property & Building Details
  plot_length: 50,
  plot_width: 30,
  num_floors: 1,
  floors_list: [
    { floor_num: 1, floor_name: 'Ground Floor', length: 40, width: 25, height: 10 }
  ],
  portico_length: 0,
  portico_width: 0,
  staircase_length: 0,
  staircase_width: 0,

  // Step 3: Material Options
  brick_type: 'AAC Blocks',
  sand_type_rcc: 'M-Sand',
  sand_type_plaster: 'P-Sand',
  cementBrand: 'UltraTech',
  steelBrand: 'Tata Tiscon',
  steelGrade: 'Fe550D',
  selected_aggregates: ['20mm'], // '40mm', '20mm', '12mm'

  // Step 4: Room Details
  rooms_list: [],

  // Step 5: Add-ons Toggles & Details
  has_compound_wall: false,
  compound_wall_length: 0,
  compound_wall_height: 0,
  
  has_gate: false,
  gate_width: 0,
  gate_height: 0,
  gate_package: 'Standard',
  
  has_water_tank: false,
  water_tank_capacity: 0,
  
  septic_tank_capacity: 3000, // compulsory tank capacity
  
  has_front_elevation: false,
  front_elevation_width: 0,
  front_elevation_height: 0,
  front_elevation_package: 'Standard',
  
  has_false_ceiling: false,
  false_ceiling_area: 0,
  false_ceiling_package: 'Standard',
  
  has_wardrobes: false,
  wardrobe_type: 'UPVC', // 'UPVC' or 'Wood'
  wardrobe_area: 0,
  wardrobe_quality: 'Quality 1',
  
  tilesBrand: 'Kajaria',
  
  has_modular_kitchen: false,
  modular_kitchen_area: 0,
  modular_kitchen_package: 'Standard',
  
  contingency_percentage: 5,
  builder_margin_percentage: 10,
  gst_percentage: 18
};

export default function NewProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeFloorTab, setActiveFloorTab] = useState(1);
  const [expandedRoomIdx, setExpandedRoomIdx] = useState(null);

  const user = getCurrentUser();

  useEffect(() => {
    if (user && user.company_name && !form.customer_name) {
      setForm((prev) => ({
        ...prev,
        builder_company_name: user.company_name
      }));
    }
  }, [user]);

  const set = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  // Sync Floors list length when num_floors input changes
  const handleFloorsCountChange = (count) => {
    const num = Math.max(1, parseInt(count) || 1);
    setForm((prev) => {
      const list = [...prev.floors_list];
      if (list.length < num) {
        for (let i = list.length; i < num; i++) {
          const names = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'];
          const name = names[i] || `Floor ${i}`;
          const base = list[0] || { length: 40, width: 25, height: 10 };
          list.push({ floor_num: i + 1, floor_name: name, length: base.length, width: base.width, height: base.height });
        }
      } else if (list.length > num) {
        list.splice(num);
      }
      return { ...prev, num_floors: num, floors_list: list };
    });
  };

  const updateFloor = (idx, field, value) => {
    const list = form.floors_list.map((f, i) => {
      if (i === idx) {
        return { ...f, [field]: value };
      }
      return f;
    });
    setForm((prev) => ({ ...prev, floors_list: list }));
  };

  // Toggle checklist for aggregates selection
  const handleToggleAggregate = (size) => {
    const arr = [...form.selected_aggregates];
    if (arr.includes(size)) {
      if (arr.length > 1) {
        set('selected_aggregates', arr.filter(item => item !== size));
      }
    } else {
      set('selected_aggregates', [...arr, size]);
    }
  };

  // Live Area Calculations
  const plotArea = form.plot_length * form.plot_width;
  const totalFloorArea = form.floors_list.reduce((sum, f) => sum + (parseFloat(f.length || 0) * parseFloat(f.width || 0)), 0);
  const porticoArea = form.portico_length * form.portico_width;
  const staircaseArea = form.staircase_length * form.staircase_width;
  const totalBuiltupArea = totalFloorArea + porticoArea + staircaseArea;

  const groundFloorArea = form.floors_list[0] ? (parseFloat(form.floors_list[0].length || 0) * parseFloat(form.floors_list[0].width || 0)) : 0;
  const groundCoverageArea = groundFloorArea + porticoArea + staircaseArea;
  const openArea = Math.max(0, plotArea - groundCoverageArea);

  // Auto-populate default rooms list when entering step 4
  const initializeDefaultRooms = () => {
    if (form.rooms_list.length > 0) return;
    const list = [];
    form.floors_list.forEach((f) => {
      if (f.floor_num === 1) {
        list.push(
          createDefaultRoom(1, 'Living Room', 16, 12, f.height),
          createDefaultRoom(1, 'Kitchen', 10, 8, f.height),
          createDefaultRoom(1, 'Bedroom', 12, 10, f.height),
          createDefaultRoom(1, 'Bathroom', 8, 5, f.height)
        );
      } else {
        list.push(
          createDefaultRoom(f.floor_num, 'Bedroom', 12, 10, f.height),
          createDefaultRoom(f.floor_num, 'Bedroom', 12, 10, f.height),
          createDefaultRoom(f.floor_num, 'Bathroom', 8, 5, f.height),
          createDefaultRoom(f.floor_num, 'Balcony', 10, 4, f.height)
        );
      }
    });
    setForm((prev) => ({ ...prev, rooms_list: list }));
  };

  const createDefaultRoom = (floorNum, name, l, w, height) => {
    const isBath = name === 'Bathroom';
    const isKitchen = name === 'Kitchen';
    const isBalcony = name === 'Balcony';

    return {
      floor_num: floorNum,
      name,
      length: l,
      width: w,
      height,
      tiles_package: 'Standard',
      doors: isBalcony ? [] : [{ type: 'Standard', width: 3, height: 7, qty: 1 }],
      windows: [{ type: 'Standard', width: 4, height: 4, qty: isBath ? 0 : 1 }],
      electrical: {
        light_points: isBath ? 2 : 4,
        fan_points: isBath ? 0 : 1,
        plug_points: isBath ? 1 : 3,
        switch_boards: 1,
        ac_points: (name === 'Bedroom') ? 1 : 0,
        tv_points: (name === 'Living Room') ? 1 : 0,
        geyser_points: isBath ? 1 : 0,
        exhaust_points: (isBath || isKitchen) ? 1 : 0,
        exterior_light_points: 0,
        package: 'Standard'
      },
      plumbing: {
        wc: isBath ? 1 : 0,
        wash_basin: isBath ? 1 : 0,
        shower: isBath ? 1 : 0,
        faucet: isBath ? 1 : 0,
        drain: isBath ? 1 : 0,
        tap: isBath ? 2 : isKitchen ? 1 : 0,
        sink: isKitchen ? 1 : 0,
        inlet: isKitchen ? 1 : 0,
        drain_point: isKitchen ? 1 : 0,
        washing_machine: 0,
        utility_sink: 0,
        package: 'Standard'
      }
    };
  };

  const handleAddRoom = (floorNum) => {
    const floor = form.floors_list.find(f => f.floor_num === floorNum);
    const h = floor ? floor.height : 10;
    const newRoom = createDefaultRoom(floorNum, 'Bedroom', 12, 10, h);
    setForm((prev) => ({
      ...prev,
      rooms_list: [...prev.rooms_list, newRoom]
    }));
    setExpandedRoomIdx(form.rooms_list.length);
  };

  const handleRemoveRoom = (idx) => {
    const list = form.rooms_list.filter((_, i) => i !== idx);
    setForm((prev) => ({ ...prev, rooms_list: list }));
    setExpandedRoomIdx(null);
  };

  const handleAdjustRoomCount = (type, targetCount) => {
    const floorRooms = form.rooms_list.filter(r => r.floor_num === activeFloorTab && r.name === type);
    const currentCount = floorRooms.length;

    if (targetCount > currentCount) {
      const addedRooms = [];
      const floor = form.floors_list.find(f => f.floor_num === activeFloorTab);
      const h = floor ? floor.height : 10;
      
      const defaultDims = {
        'Bedroom': { l: 12, w: 10 },
        'Kitchen': { l: 10, w: 8 },
        'Living Room': { l: 16, w: 12 },
        'Bathroom': { l: 8, w: 5 },
        'Dining Room': { l: 12, w: 10 },
        'Store Room': { l: 8, w: 6 },
        'Balcony': { l: 10, w: 4 }
      };
      const dims = defaultDims[type] || { l: 10, w: 10 };

      for (let i = 0; i < (targetCount - currentCount); i++) {
        addedRooms.push(createDefaultRoom(activeFloorTab, type, dims.l, dims.w, h));
      }
      setForm(prev => ({
        ...prev,
        rooms_list: [...prev.rooms_list, ...addedRooms]
      }));
    } else if (targetCount < currentCount) {
      const diff = currentCount - targetCount;
      let roomsRemoved = 0;
      const updatedRooms = [];
      
      for (let i = form.rooms_list.length - 1; i >= 0; i--) {
        const room = form.rooms_list[i];
        if (room.floor_num === activeFloorTab && room.name === type && roomsRemoved < diff) {
          roomsRemoved++;
        } else {
          updatedRooms.unshift(room);
        }
      }
      setForm(prev => ({
        ...prev,
        rooms_list: updatedRooms
      }));
    }
  };

  const handleQualityChange = (newQuality) => {
    const wardrobeQualityMap = {
      'Base': 'Quality 1',
      'Standard': 'Quality 2',
      'Premium': 'Quality 3',
      'Luxury': 'Quality 4'
    };
    const targetWardrobeQual = wardrobeQualityMap[newQuality] || 'Quality 2';

    setForm((prev) => {
      const updatedRooms = (prev.rooms_list || []).map((room) => {
        const updatedWindows = (room.windows || []).map(win => ({
          ...win,
          type: newQuality
        }));
        return {
          ...room,
          tiles_package: newQuality,
          electrical: {
            ...room.electrical,
            package: newQuality
          },
          plumbing: {
            ...room.plumbing,
            package: newQuality
          },
          windows: updatedWindows
        };
      });

      return {
        ...prev,
        quality: newQuality,
        gate_package: newQuality,
        front_elevation_package: newQuality,
        false_ceiling_package: newQuality,
        modular_kitchen_package: newQuality,
        wardrobe_quality: targetWardrobeQual,
        rooms_list: updatedRooms
      };
    });

    if (errors['quality']) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy['quality'];
        return copy;
      });
    }
  };



  const updateRoomField = (idx, field, value) => {
    const list = form.rooms_list.map((r, i) => {
      if (i === idx) {
        return { ...r, [field]: value };
      }
      return r;
    });
    setForm((prev) => ({ ...prev, rooms_list: list }));
  };

  const updateRoomSubField = (idx, sub, field, value) => {
    const list = form.rooms_list.map((r, i) => {
      if (i === idx) {
        return {
          ...r,
          [sub]: { ...r[sub], [field]: value }
        };
      }
      return r;
    });
    setForm((prev) => ({ ...prev, rooms_list: list }));
  };

  const handleStepClick = (targetStep) => {
    const err = {};
    if (step === 1 && targetStep > 1) {
      if (!form.customer_name.trim()) err.customer_name = 'Customer Name is required.';
      if (!form.project_name.trim()) err.project_name = 'Project Name is required.';
      if (!form.customer_mobile || !form.customer_mobile.trim()) {
        err.customer_mobile = 'Phone Number is required.';
      } else if (!/^[6-9]\d{9}$/.test(form.customer_mobile.trim())) {
        err.customer_mobile = 'Please enter a valid 10-digit phone number starting with 6-9.';
      }
      if (form.customer_email && form.customer_email.trim()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email.trim())) {
          err.customer_email = 'Please enter a valid email address.';
        }
      }
    }
    if (step === 2 && targetStep > 2) {
      if (form.plot_length <= 0) err.plot_length = 'Length must be greater than 0.';
      if (form.plot_width <= 0) err.plot_width = 'Width must be greater than 0.';
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    if (targetStep >= 4 && form.rooms_list.length === 0) {
      initializeDefaultRooms();
    }

    setStep(targetStep);
  };

  const handleNext = () => {
    const err = {};
    if (step === 1) {
      if (!form.customer_name.trim()) err.customer_name = 'Customer Name is required.';
      if (!form.project_name.trim()) err.project_name = 'Project Name is required.';
      if (!form.customer_mobile || !form.customer_mobile.trim()) {
        err.customer_mobile = 'Phone Number is required.';
      } else if (!/^[6-9]\d{9}$/.test(form.customer_mobile.trim())) {
        err.customer_mobile = 'Please enter a valid 10-digit phone number starting with 6-9.';
      }
      if (form.customer_email && form.customer_email.trim()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email.trim())) {
          err.customer_email = 'Please enter a valid email address.';
        }
      }
    }
    if (step === 2) {
      if (form.plot_length <= 0) err.plot_length = 'Length must be greater than 0.';
      if (form.plot_width <= 0) err.plot_width = 'Width must be greater than 0.';
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    if (step === 3) {
      initializeDefaultRooms();
    }

    setStep(s => s + 1);
  };

  const handleBack = () => {
    setStep(s => Math.max(1, s - 1));
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setErrors({});

      const payload = {
        ...form,
        total_sqft: totalBuiltupArea,
        plot_length: parseFloat(form.plot_length),
        plot_width: parseFloat(form.plot_width),
        portico_length: parseFloat(form.portico_length),
        portico_width: parseFloat(form.portico_width),
        staircase_length: parseFloat(form.staircase_length),
        staircase_width: parseFloat(form.staircase_width),
        compound_wall_length: form.has_compound_wall ? parseFloat(form.compound_wall_length) : 0,
        compound_wall_height: form.has_compound_wall ? parseFloat(form.compound_wall_height) : 0,
        gate_width: form.has_gate ? parseFloat(form.gate_width) : 0,
        gate_height: form.has_gate ? parseFloat(form.gate_height) : 0,
        water_tank_capacity: form.has_water_tank ? parseFloat(form.water_tank_capacity) : 0,
        septic_tank_capacity: parseFloat(form.septic_tank_capacity),
        front_elevation_width: form.has_front_elevation ? parseFloat(form.front_elevation_width) : 0,
        front_elevation_height: form.has_front_elevation ? parseFloat(form.front_elevation_height) : 0,
        false_ceiling_area: form.has_false_ceiling ? parseFloat(form.false_ceiling_area) : 0,
        wardrobe_area: form.has_wardrobes ? parseFloat(form.wardrobe_area) : 0,
        modular_kitchen_area: form.has_modular_kitchen ? parseFloat(form.modular_kitchen_area) : 0,
        interior_area: 0,
        contingency_percentage: parseFloat(form.contingency_percentage),
        builder_margin_percentage: parseFloat(form.builder_margin_percentage),
        gst_percentage: 0
      };

      const res = await estimatesAPI.generate(payload);
      if (res && res.estimate_id) {
        sessionStorage.setItem('bs_estimate', JSON.stringify(res));
        navigate('/estimate-result');
      } else {
        throw new Error('Failed to generate estimate.');
      }
    } catch (err) {
      setErrors({ _global: err.message || 'Error occurred during generation.' });
    } finally {
      setLoading(false);
    }
  };

  // Districts for current state selection
  const districts = STATE_DISTRICTS[form.state] || [];

  return (
    <Layout role="builder">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)' }}>✨ Create New Estimate</h1>
        <p style={{ color: 'var(--color-gray-500)', fontSize: '13px' }}>Configure project inputs and generate package-based pricing report.</p>
      </div>

      {/* Steps Indicator */}
      <div className="card" style={{ marginBottom: '28px', padding: '20px 24px', borderTop: '4px solid #0f766e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto', gap: '16px' }}>
          {STEPS.map((s) => (
            <div
              key={s.num}
              onClick={() => handleStepClick(s.num)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: '90px', flex: 1, cursor: 'pointer', transition: 'transform 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: step === s.num ? '#0f766e' : step > s.num ? '#059669' : '#e2e8f0',
                color: step >= s.num ? '#ffffff' : '#475569',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '13px', marginBottom: '8px',
                boxShadow: step === s.num ? '0 0 0 6px rgba(15,118,110,0.15)' : 'none'
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: '11px', fontWeight: step === s.num ? 700 : 500, color: step === s.num ? '#0f766e' : '#64748b', textAlign: 'center' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ minHeight: '400px' }}>
        
        {/* Step 1: Selection Package & Customer details */}
        {step === 1 && (
          <div className="card fade-in" style={{ borderTop: '3px solid #0891b2' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #0891b2, #0f766e)', borderRadius: '4px 4px 0 0' }} />
            <div className="card-header"><div className="card-title">👥 Project & Package Details</div></div>
            <div className="card-body">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input className="form-control" placeholder="John Doe" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
                  {errors.customer_name && <span className="error-text">{errors.customer_name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Project Name / Site Name</label>
                  <input className="form-control" placeholder="Villa Estimate" value={form.project_name} onChange={(e) => set('project_name', e.target.value)} />
                  {errors.project_name && <span className="error-text">{errors.project_name}</span>}
                </div>
              </div>
              <div className="form-row-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-control" placeholder="9876543210" value={form.customer_mobile} onChange={(e) => set('customer_mobile', e.target.value)} />
                  {errors.customer_mobile && <span className="error-text">{errors.customer_mobile}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-control" type="email" placeholder="customer@gmail.com" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} />
                  {errors.customer_email && <span className="error-text">{errors.customer_email}</span>}
                </div>
              </div>

              {/* State & District select */}
              <div className="form-row-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <select className="form-control" value={form.state} onChange={(e) => { set('state', e.target.value); set('city', STATE_DISTRICTS[e.target.value]?.[0] || ''); }}>
                    {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">District / City</label>
                  <select className="form-control" value={form.city} onChange={(e) => set('city', e.target.value)}>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>Select Construction Package</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {QUALITY_OPTIONS.map((opt) => {
                    const isSel = form.quality === opt.key;
                    return (
                      <div
                        key={opt.key}
                        onClick={() => handleQualityChange(opt.key)}
                        style={{
                          border: isSel ? '2px solid #0f766e' : '1px solid #cbd5e1',
                          borderRadius: '12px', padding: '16px', cursor: 'pointer',
                          background: isSel ? 'rgba(15,118,110,0.04)' : '#ffffff',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{opt.emoji}</div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{opt.label}</div>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>{opt.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Property & Building Details */}
        {step === 2 && (
          <div className="card fade-in" style={{ borderTop: '3px solid #0891b2' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #0891b2, #0f766e)', borderRadius: '4px 4px 0 0' }} />
            <div className="card-header"><div className="card-title">📏 Property & Building Specifications</div></div>
            <div className="card-body">
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div>
                  <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>📐 Plot dimensions</div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Plot Length (feet)</label>
                      <input className="form-control" type="number" min="1" value={form.plot_length} onChange={(e) => set('plot_length', parseFloat(e.target.value) || 0)} />
                      {errors.plot_length && <span className="error-text">{errors.plot_length}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Plot Width (feet)</label>
                      <input className="form-control" type="number" min="1" value={form.plot_width} onChange={(e) => set('plot_width', parseFloat(e.target.value) || 0)} />
                      {errors.plot_width && <span className="error-text">{errors.plot_width}</span>}
                    </div>
                  </div>

                  <div style={{ margin: '20px 0 16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>🏢 Building floors</div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Number of Floors</label>
                    <input className="form-control" type="number" min="1" max="4" value={form.num_floors} onChange={(e) => handleFloorsCountChange(e.target.value)} style={{ width: '120px' }} />
                  </div>

                  {form.floors_list.map((f, idx) => (
                    <div key={f.floor_num} style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '10px' }}>{f.floor_name}</div>
                      <div className="form-row-3">
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>Floor Length (ft)</label>
                          <input className="form-control" type="number" value={f.length} onChange={(e) => updateFloor(idx, 'length', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>Floor Width (ft)</label>
                          <input className="form-control" type="number" value={f.width} onChange={(e) => updateFloor(idx, 'width', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>Ceiling Height (ft)</label>
                          <input className="form-control" type="number" value={f.height} onChange={(e) => updateFloor(idx, 'height', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ margin: '20px 0 16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>🚗 Covered Portico & Staircase</div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Portico Length / Width (ft)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input className="form-control" type="number" placeholder="L" value={form.portico_length} onChange={(e) => set('portico_length', parseFloat(e.target.value) || 0)} />
                        <input className="form-control" type="number" placeholder="W" value={form.portico_width} onChange={(e) => set('portico_width', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Staircase Length / Width (ft)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input className="form-control" type="number" placeholder="L" value={form.staircase_length} onChange={(e) => set('staircase_length', parseFloat(e.target.value) || 0)} />
                        <input className="form-control" type="number" placeholder="W" value={form.staircase_width} onChange={(e) => set('staircase_width', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Live calculations */}
                <div style={{ background: 'rgba(15,118,110,0.03)', border: '1px solid rgba(15,118,110,0.14)', borderRadius: '12px', padding: '20px', height: 'fit-content' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f766e', borderBottom: '1px solid rgba(15,118,110,0.12)', paddingBottom: '8px', marginBottom: '12px' }}>
                    🧮 Live Area calculations
                  </div>
                  <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Plot Area:</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{plotArea.toLocaleString()} sq.ft</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Ground Coverage Area:</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{groundCoverageArea.toLocaleString()} sq.ft</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Open Area:</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{openArea.toLocaleString()} sq.ft</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                      <span style={{ color: '#64748b' }}>Portico Area:</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{porticoArea.toLocaleString()} sq.ft</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Staircase Area:</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{staircaseArea.toLocaleString()} sq.ft</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                      <span style={{ color: '#0f766e', fontWeight: 700 }}>Total Floor Area:</span>
                      <span style={{ fontWeight: 700, color: '#0f766e' }}>{totalFloorArea.toLocaleString()} sq.ft</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(15,118,110,0.06)', padding: '8px 10px', borderRadius: '6px' }}>
                      <span style={{ color: '#0f766e', fontWeight: 700 }}>Total Built-up Area:</span>
                      <span style={{ fontWeight: 800, color: '#0f766e' }}>{totalBuiltupArea.toLocaleString()} sq.ft</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Step 3: Material Options */}
        {step === 3 && (
          <div className="card fade-in" style={{ borderTop: '3px solid #d97706' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #d97706, #0f766e)', borderRadius: '4px 4px 0 0' }} />
            <div className="card-header"><div className="card-title">🧱 Material Selection Options</div></div>
            <div className="card-body">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Wall Material</label>
                  <select className="form-control" value={form.brick_type} onChange={(e) => set('brick_type', e.target.value)}>
                    {WALL_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cement Brand</label>
                  <select className="form-control" value={form.cementBrand} onChange={(e) => set('cementBrand', e.target.value)}>
                    {CEMENT_BRANDS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="form-row-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Sand Type for RCC (Concrete)</label>
                  <select className="form-control" value={form.sand_type_rcc} onChange={(e) => set('sand_type_rcc', e.target.value)}>
                    {SAND_RCC.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sand Type for Plastering</label>
                  <select className="form-control" value={form.sand_type_plaster} onChange={(e) => set('sand_type_plaster', e.target.value)}>
                    {SAND_PLASTER.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row-2" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Steel Brand</label>
                  <select className="form-control" value={form.steelBrand} onChange={(e) => set('steelBrand', e.target.value)}>
                    {STEEL_BRANDS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tiles Brand</label>
                  <select className="form-control" value={form.tilesBrand} onChange={(e) => set('tilesBrand', e.target.value)}>
                    {['Kajaria', 'Somany', 'Nitco', 'Johnson', 'Varmora'].map(tb => <option key={tb} value={tb}>{tb}</option>)}
                  </select>
                </div>
              </div>
                
                {/* Aggregate Jelly Checkboxes Selection */}
                <div className="form-group">
                  <label className="form-label">Aggregate (Jelly) Selection</label>
                  <div style={{ display: 'grid', gap: '8px', marginTop: '6px' }}>
                    {[
                      { key: '40mm', label: '40 mm Aggregate (For PCC & Footings)' },
                      { key: '20mm', label: '20 mm Aggregate (For RCC Works)' },
                      { key: '12mm', label: '12 mm Aggregate (For Sunshades & Small RCC)' }
                    ].map(sz => (
                      <label key={sz.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                        <input
                          type="checkbox"
                          checked={form.selected_aggregates.includes(sz.key)}
                          onChange={() => handleToggleAggregate(sz.key)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        {sz.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Step 4: Room Details */}
        {step === 4 && (
          <div className="card fade-in" style={{ borderTop: '3px solid #059669' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #059669, #0f766e)', borderRadius: '4px 4px 0 0' }} />
            
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">🛏 Room & Openings Specifications</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {form.floors_list.map(f => (
                  <button
                    key={f.floor_num}
                    className={`btn ${activeFloorTab === f.floor_num ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setActiveFloorTab(f.floor_num); setExpandedRoomIdx(null); }}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {f.floor_name}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-body">
              {/* Room Inventory Selection Grid */}
              <div style={{
                background: 'rgba(5, 150, 105, 0.03)',
                border: '1px solid rgba(5, 150, 105, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f766e', marginBottom: '12px' }}>
                  🏢 Room Inventory Quick Selector
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px'
                }}>
                  {[
                    { type: 'Bedroom', emoji: '🛏️' },
                    { type: 'Kitchen', emoji: '🍳' },
                    { type: 'Living Room', emoji: '🛋️' },
                    { type: 'Bathroom', emoji: '🛁' },
                    { type: 'Dining Room', emoji: '🍽️' },
                    { type: 'Store Room', emoji: '📦' },
                    { type: 'Balcony', emoji: '🌅' }
                  ].map(({ type, emoji }) => {
                    const count = form.rooms_list.filter(r => r.floor_num === activeFloorTab && r.name === type).length;
                    return (
                      <div key={type} style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ fontSize: '18px' }}>{emoji}</span>
                        <span style={{ fontWeight: 600, fontSize: '11px', color: '#475569', textAlign: 'center' }}>{type}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', minWidth: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleAdjustRoomCount(type, Math.max(0, count - 1))}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 700, fontSize: '13px', minWidth: '16px', textAlign: 'center' }}>{count}</span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', minWidth: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleAdjustRoomCount(type, count + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                  Rooms on this floor: {form.rooms_list.filter(r => r.floor_num === activeFloorTab).length}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => handleAddRoom(activeFloorTab)}>＋ Add Custom Room</button>
              </div>

              {form.rooms_list.filter(r => r.floor_num === activeFloorTab).map((room, roomIdx) => {
                const origIdx = form.rooms_list.indexOf(room);
                const isExpanded = expandedRoomIdx === origIdx;

                return (
                  <div key={origIdx} style={{ border: '1px solid #cbd5e1', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' }}>
                    <div
                      onClick={() => setExpandedRoomIdx(isExpanded ? null : origIdx)}
                      style={{
                        padding: '12px 16px', background: isExpanded ? 'rgba(5,150,105,0.04)' : '#f8fafc',
                        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>{room.name}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>({room.length}x{room.width} ft)</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#dc2626', fontSize: '12px', padding: '2px 8px' }}
                          onClick={(e) => { e.stopPropagation(); handleRemoveRoom(origIdx); }}
                        >
                          Delete
                        </button>
                        <span style={{ fontSize: '14px' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                        <div className="form-row-3">
                          <div className="form-group">
                            <label className="form-label">Room Type</label>
                            <select className="form-control" value={room.name} onChange={(e) => updateRoomField(origIdx, 'name', e.target.value)}>
                              {['Bedroom', 'Bathroom', 'Living Room', 'Kitchen', 'Dining Room', 'Utility Room', 'Pooja Room', 'Store Room', 'Balcony'].map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Room Length (feet)</label>
                            <input className="form-control" type="number" value={room.length} onChange={(e) => updateRoomField(origIdx, 'length', parseFloat(e.target.value) || 0)} />
                          </div>
                           <div className="form-group">
                            <label className="form-label">Room Width (feet)</label>
                            <input className="form-control" type="number" value={room.width} onChange={(e) => updateRoomField(origIdx, 'width', parseFloat(e.target.value) || 0)} />
                          </div>
                        </div>

                        <div className="form-row-2" style={{ marginTop: '14px' }}>
                          <div className="form-group">
                            <label className="form-label">Calculated Room Area</label>
                            <div className="form-control" style={{ fontWeight: 700, background: '#f1f5f9', color: '#0f766e', display: 'flex', alignItems: 'center' }}>
                              {(room.length * room.width).toLocaleString()} sq.ft
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Tiles Selection Package</label>
                            <select className="form-control" value={room.tiles_package || 'Standard'} onChange={(e) => updateRoomField(origIdx, 'tiles_package', e.target.value)}>
                              {['Base', 'Standard', 'Premium', 'Luxury'].map(t => (
                                <option key={t} value={t}>{t} (₹{t === 'Base' ? 50 : t === 'Standard' ? 60 : t === 'Premium' ? 80 : 100}/sqft)</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Doors & Windows Sizing */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          
                          {/* Doors */}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#475569', marginBottom: '8px' }}>🚪 Doors count</div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <input
                                className="form-control"
                                type="number"
                                style={{ width: '80px' }}
                                value={room.doors[0]?.qty || 0}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || 0;
                                  const doors = qty > 0 ? [{ type: room.doors[0]?.type || 'Standard', width: 3, height: 7, qty }] : [];
                                  updateRoomField(origIdx, 'doors', doors);
                                }}
                              />
                              {room.doors.length > 0 && (
                                <select
                                  className="form-control"
                                  value={room.doors[0].type}
                                  onChange={(e) => {
                                    const doors = [{ ...room.doors[0], type: e.target.value }];
                                    updateRoomField(origIdx, 'doors', doors);
                                  }}
                                >
                                  {['Base', 'Standard', 'Premium', 'Luxury'].map(t => <option key={t} value={t}>{t} Door</option>)}
                                </select>
                              )}
                            </div>
                          </div>

                          {/* Windows */}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#475569', marginBottom: '8px' }}>🪟 Windows count</div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <input
                                className="form-control"
                                type="number"
                                style={{ width: '80px' }}
                                value={room.windows[0]?.qty || 0}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || 0;
                                  const windows = qty > 0 ? [{ type: room.windows[0]?.type || 'Standard', width: 4, height: 4, qty }] : [];
                                  updateRoomField(origIdx, 'windows', windows);
                                }}
                              />
                              {room.windows.length > 0 && (
                                <select
                                  className="form-control"
                                  value={room.windows[0].type}
                                  onChange={(e) => {
                                    const windows = [{ ...room.windows[0], type: e.target.value }];
                                    updateRoomField(origIdx, 'windows', windows);
                                  }}
                                >
                                  {['Base', 'Standard', 'Premium', 'Luxury'].map(t => <option key={t} value={t}>{t} Window</option>)}
                                </select>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Electrical Details */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#475569' }}>⚡ Electrical Points count</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>Package:</span>
                              <select
                                className="form-control"
                                style={{ fontSize: '11px', padding: '2px 8px', height: '24px', width: '100px' }}
                                value={room.electrical.package || 'Standard'}
                                onChange={(e) => updateRoomSubField(origIdx, 'electrical', 'package', e.target.value)}
                              >
                                {['Base', 'Standard', 'Premium', 'Luxury'].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '11px' }}>Light Points</label>
                              <input className="form-control" type="number" value={room.electrical.light_points} onChange={(e) => updateRoomSubField(origIdx, 'electrical', 'light_points', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '11px' }}>Fan Points</label>
                              <input className="form-control" type="number" value={room.electrical.fan_points} onChange={(e) => updateRoomSubField(origIdx, 'electrical', 'fan_points', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '11px' }}>Plug Points</label>
                              <input className="form-control" type="number" value={room.electrical.plug_points} onChange={(e) => updateRoomSubField(origIdx, 'electrical', 'plug_points', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '11px' }}>Switch Boards</label>
                              <input className="form-control" type="number" value={room.electrical.switch_boards} onChange={(e) => updateRoomSubField(origIdx, 'electrical', 'switch_boards', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '11px' }}>AC Points</label>
                              <input className="form-control" type="number" value={room.electrical.ac_points} onChange={(e) => updateRoomSubField(origIdx, 'electrical', 'ac_points', parseInt(e.target.value) || 0)} />
                            </div>
                          </div>
                        </div>

                        {/* Plumbing details */}
                        {['Bathroom', 'Kitchen', 'Utility Room'].includes(room.name) && (
                          <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: '#475569' }}>🚿 Plumbing Point count</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Package:</span>
                                <select
                                  className="form-control"
                                  style={{ fontSize: '11px', padding: '2px 8px', height: '24px', width: '100px' }}
                                  value={room.plumbing.package || 'Standard'}
                                  onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'package', e.target.value)}
                                >
                                  {['Base', 'Standard', 'Premium', 'Luxury'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                              {room.name === 'Bathroom' && (
                                <>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }}>Toilets (WC)</label>
                                    <input className="form-control" type="number" value={room.plumbing.wc} onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'wc', parseInt(e.target.value) || 0)} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }}>Wash Basin</label>
                                    <input className="form-control" type="number" value={room.plumbing.wash_basin} onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'wash_basin', parseInt(e.target.value) || 0)} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }}>Showers</label>
                                    <input className="form-control" type="number" value={room.plumbing.shower} onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'shower', parseInt(e.target.value) || 0)} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }}>Faucets</label>
                                    <input className="form-control" type="number" value={room.plumbing.faucet} onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'faucet', parseInt(e.target.value) || 0)} />
                                  </div>
                                </>
                              )}
                              {room.name === 'Kitchen' && (
                                <>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }}>Kitchen Sink</label>
                                    <input className="form-control" type="number" value={room.plumbing.sink} onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'sink', parseInt(e.target.value) || 0)} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }}>Water Inlet</label>
                                    <input className="form-control" type="number" value={room.plumbing.inlet} onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'inlet', parseInt(e.target.value) || 0)} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }}>Wash Basin</label>
                                    <input className="form-control" type="number" value={room.plumbing.wash_basin || 0} onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'wash_basin', parseInt(e.target.value) || 0)} />
                                  </div>
                                </>
                              )}
                              {room.name === 'Utility Room' && (
                                <>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }}>Machine Inlet</label>
                                    <input className="form-control" type="number" value={room.plumbing.washing_machine} onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'washing_machine', parseInt(e.target.value) || 0)} />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '11px' }}>Utility Sink</label>
                                    <input className="form-control" type="number" value={room.plumbing.utility_sink} onChange={(e) => updateRoomSubField(origIdx, 'plumbing', 'utility_sink', parseInt(e.target.value) || 0)} />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}

            </div>
          </div>
        )}

        {/* Step 5: Add-ons & Generate */}
        {step === 5 && (
          <div className="card fade-in" style={{ borderTop: '3px solid #6d28d9' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #6d28d9, #0f766e)', borderRadius: '4px 4px 0 0' }} />
            <div className="card-header"><div className="card-title">⚒ Additional Add-on Works</div></div>
            <div className="card-body">
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                
                {/* Compound Wall (Optional with Toggle Switch) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>🧱 Compound Wall</span>
                    <input
                      type="checkbox"
                      checked={form.has_compound_wall}
                      onChange={(e) => set('has_compound_wall', e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                  {form.has_compound_wall ? (
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>Compound Wall Length (ft)</label>
                        <input className="form-control" type="number" value={form.compound_wall_length} onChange={(e) => set('compound_wall_length', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>Compound Wall Height (ft)</label>
                        <input className="form-control" type="number" value={form.compound_wall_height} onChange={(e) => set('compound_wall_height', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Toggled Off — Cost excluded.</div>
                  )}
                </div>

                {/* Entrance Gate (Optional with Toggle Switch) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>🚪 Entrance Gate</span>
                    <input
                      type="checkbox"
                      checked={form.has_gate}
                      onChange={(e) => set('has_gate', e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                  {form.has_gate ? (
                    <>
                      <div className="form-row-2">
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>Gate Width (ft)</label>
                          <input className="form-control" type="number" value={form.gate_width} onChange={(e) => set('gate_width', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>Gate Height (ft)</label>
                          <input className="form-control" type="number" value={form.gate_height} onChange={(e) => set('gate_height', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">Gate Package Type</label>
                        <select className="form-control" value={form.gate_package} onChange={(e) => set('gate_package', e.target.value)}>
                          {['Base', 'Standard', 'Premium', 'Luxury'].map(t => <option key={t} value={t}>{t} Quality</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Toggled Off — Cost excluded.</div>
                  )}
                </div>

                {/* Sump Tank (Optional with Toggle Switch) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>🚰 Underground Water Sump</span>
                    <input
                      type="checkbox"
                      checked={form.has_water_tank}
                      onChange={(e) => set('has_water_tank', e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                  {form.has_water_tank ? (
                    <div className="form-group">
                      <label className="form-label">Sump Capacity (Litres)</label>
                      <input className="form-control" type="number" placeholder="e.g. 12000" value={form.water_tank_capacity} onChange={(e) => set('water_tank_capacity', parseFloat(e.target.value) || 0)} />
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Toggled Off — Cost excluded.</div>
                  )}
                </div>

                {/* Septic Tank (Compulsory! No Toggle Switch) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>🚽 Septic Tank (Compulsory)</span>
                    <span style={{ color: '#0f766e', fontSize: '11px', fontWeight: 700 }}>ALWAYS ON</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Septic Tank Capacity (Litres)</label>
                    <input className="form-control" type="number" placeholder="e.g. 6000" value={form.septic_tank_capacity} onChange={(e) => set('septic_tank_capacity', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                {/* Front Elevation (Optional with Toggle Switch) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>📐 Front Elevation Facade</span>
                    <input
                      type="checkbox"
                      checked={form.has_front_elevation}
                      onChange={(e) => set('has_front_elevation', e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                  {form.has_front_elevation ? (
                    <>
                      <div className="form-row-2">
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>Elevation Width (ft)</label>
                          <input className="form-control" type="number" value={form.front_elevation_width} onChange={(e) => set('front_elevation_width', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>Elevation Height (ft)</label>
                          <input className="form-control" type="number" value={form.front_elevation_height} onChange={(e) => set('front_elevation_height', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">Elevation Design Package</label>
                        <select className="form-control" value={form.front_elevation_package} onChange={(e) => set('front_elevation_package', e.target.value)}>
                          {['Base', 'Standard', 'Premium', 'Luxury'].map(t => <option key={t} value={t}>{t} elevation</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Toggled Off — Cost excluded.</div>
                  )}
                </div>

                {/* False Ceiling (Optional with Toggle Switch) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>🎨 False Ceiling</span>
                    <input
                      type="checkbox"
                      checked={form.has_false_ceiling}
                      onChange={(e) => set('has_false_ceiling', e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                  {form.has_false_ceiling ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">False Ceiling Area (Sq.ft)</label>
                        <input className="form-control" type="number" value={form.false_ceiling_area} onChange={(e) => set('false_ceiling_area', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">False Ceiling Package</label>
                        <select className="form-control" value={form.false_ceiling_package} onChange={(e) => set('false_ceiling_package', e.target.value)}>
                          {['Base', 'Standard', 'Premium', 'Luxury'].map(t => <option key={t} value={t}>{t} ceiling</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Toggled Off — Cost excluded.</div>
                  )}
                </div>

                {/* Wardrobes (Optional with Toggle Switch) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>🚪 Wardrobes Carpentry</span>
                    <input
                      type="checkbox"
                      checked={form.has_wardrobes}
                      onChange={(e) => set('has_wardrobes', e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                  {form.has_wardrobes ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div className="form-row-2">
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>Material Type</label>
                          <select className="form-control" value={form.wardrobe_type} onChange={(e) => set('wardrobe_type', e.target.value)}>
                            <option value="UPVC">UPVC (₹260–₹320/sqft)</option>
                            <option value="Wood">Wood (₹330–₹360/sqft)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '11px' }}>Wardrobes Area (sqft)</label>
                          <input className="form-control" type="number" value={form.wardrobe_area} onChange={(e) => set('wardrobe_area', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>Wardrobes Quality</label>
                        <select className="form-control" value={form.wardrobe_quality} onChange={(e) => set('wardrobe_quality', e.target.value)}>
                          {form.wardrobe_type === 'Wood' ? (
                            <>
                              <option value="Quality 1">Quality 1 (₹330/sqft)</option>
                              <option value="Quality 2">Quality 2 (₹340/sqft)</option>
                              <option value="Quality 3">Quality 3 (₹350/sqft)</option>
                              <option value="Quality 4">Quality 4 (₹360/sqft)</option>
                            </>
                          ) : (
                            <>
                              <option value="Quality 1">Quality 1 (₹260/sqft)</option>
                              <option value="Quality 2">Quality 2 (₹280/sqft)</option>
                              <option value="Quality 3">Quality 3 (₹300/sqft)</option>
                              <option value="Quality 4">Quality 4 (₹320/sqft)</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Toggled Off — Cost excluded.</div>
                  )}
                </div>

                {/* Modular Kitchen (Optional with Toggle Switch) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>🍳 Modular Kitchen</span>
                    <input
                      type="checkbox"
                      checked={form.has_modular_kitchen}
                      onChange={(e) => set('has_modular_kitchen', e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                  {form.has_modular_kitchen ? (
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>Kitchen Area (sqft)</label>
                        <input className="form-control" type="number" value={form.modular_kitchen_area} onChange={(e) => set('modular_kitchen_area', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '11px' }}>Kitchen Package</label>
                        <select className="form-control" value={form.modular_kitchen_package} onChange={(e) => set('modular_kitchen_package', e.target.value)}>
                          {['Base', 'Standard', 'Premium', 'Luxury'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Toggled Off — Cost excluded.</div>
                  )}
                </div>


              </div>
            </div>
          </div>
        )}

        {/* Step 6: Detailed Preview */}
        {step === 6 && (
          <div className="card fade-in" style={{ borderTop: '3px solid #0f766e' }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #0f766e, #0891b2)', borderRadius: '4px 4px 0 0' }} />
            <div className="card-header"><div className="card-title">📋 Detailed Project Preview</div></div>
            <div className="card-body">
              <p style={{ color: 'var(--color-gray-500)', fontSize: '13px', marginBottom: '20px' }}>
                Please review all project configuration choices below before generating the final cost estimate report.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                
                {/* 1. Client & Package */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    🏢 Project &amp; Client Details
                  </div>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                    <div><strong>Customer Name:</strong> {form.customer_name || '—'}</div>
                    <div><strong>Project / Site Name:</strong> {form.project_name || '—'}</div>
                    <div><strong>Phone Number:</strong> {form.customer_mobile || '—'}</div>
                    <div><strong>Email Address:</strong> {form.customer_email || '—'}</div>
                    <div><strong>Location:</strong> {form.city}, {form.state}</div>
                    <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(15,118,110,0.06)', borderRadius: '6px', border: '1px solid rgba(15,118,110,0.12)', fontWeight: 600 }}>
                      Package Selected: <span style={{ color: '#0f766e' }}>{form.quality} Package</span> (₹{form.quality === 'Base' ? 2100 : form.quality === 'Standard' ? 2400 : form.quality === 'Premium' ? 2600 : 2800}/sqft)
                    </div>
                  </div>
                </div>

                {/* 2. Dimensions & Structure */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    📐 Dimensions &amp; Area Specifications
                  </div>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                    <div><strong>Plot Size:</strong> {form.plot_length} ft × {form.plot_width} ft ({(form.plot_length * form.plot_width).toLocaleString()} sqft)</div>
                    <div><strong>Number of Floors:</strong> {form.num_floors} Floor(s)</div>
                    <div><strong>Covered Portico Area:</strong> {porticoArea} sqft ({form.portico_length}x{form.portico_width} ft)</div>
                    <div><strong>Staircase Area:</strong> {staircaseArea} sqft ({form.staircase_length}x{form.staircase_width} ft)</div>
                    <div style={{ color: '#0f766e', fontWeight: 700 }}>
                      Total Built-up Area: {totalBuiltupArea.toLocaleString()} sqft
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      (Floor Area: {totalFloorArea.toLocaleString()} sqft + Portico: {porticoArea} sqft + Staircase: {staircaseArea} sqft)
                    </div>
                  </div>
                </div>

                {/* 3. Material Specifications */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                    🧱 Chosen Material Brands
                  </div>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                    <div><strong>Wall Material:</strong> {form.brick_type}</div>
                    <div><strong>Cement Brand:</strong> {form.cementBrand}</div>
                    <div><strong>Steel Reinforcement:</strong> {form.steelBrand}</div>
                    <div><strong>Sand (RCC Concrete):</strong> {form.sand_type_rcc}</div>
                    <div><strong>Sand (Plastering):</strong> {form.sand_type_plaster}</div>
                    <div><strong>Tiles Brand:</strong> {form.tilesBrand}</div>
                    <div>
                      <strong>Aggregates:</strong>{' '}
                      {(form.selected_aggregates || []).map(a => a === '40mm' ? '40mm' : a === '20mm' ? '20mm' : '12mm').join(', ') || 'None'}
                    </div>
                  </div>
                </div>

              </div>

              {/* 4. Floor Layout Rooms details */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', background: '#ffffff', marginBottom: '24px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                  📋 Floor-wise Room Configuration Details
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Floor Name</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Room Name</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Dimensions</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Area (sqft)</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Tiles Quality</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Electrical</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Plumbing</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Doors / Windows</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.rooms_list.map((r, i) => {
                        const floorObj = form.floors_list.find(f => f.floor_num === r.floor_num);
                        const floorName = floorObj ? floorObj.floor_name : `Floor ${r.floor_num}`;
                        const doorCount = (r.doors || []).reduce((sum, d) => sum + (parseInt(d.qty) || 0), 0);
                        const windowCount = (r.windows || []).reduce((sum, w) => sum + (parseInt(w.qty) || 0), 0);
                        const isMEPPlumbing = ['Bathroom', 'Kitchen', 'Utility Room'].includes(r.name);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{floorName}</td>
                            <td style={{ padding: '8px' }}>{r.name}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{r.length} × {r.width} ft</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{r.length * r.width}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{r.tiles_package || 'Standard'}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <div>{r.electrical?.package || 'Standard'}</div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                L:{r.electrical?.light_points || 0} F:{r.electrical?.fan_points || 0} P:{r.electrical?.plug_points || 0}
                              </div>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              {isMEPPlumbing ? (
                                <>
                                  <div>{r.plumbing?.package || 'Standard'}</div>
                                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                                    {r.name === 'Kitchen' ? `Sink: ${r.plumbing?.sink || 0} Basin: ${r.plumbing?.wash_basin || 0}` : `Basin: ${r.plumbing?.wash_basin || 0} WC: ${r.plumbing?.wc || 0}`}
                                  </div>
                                </>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              D: {doorCount > 0 ? `${doorCount} (${r.doors[0].type})` : '0'} / W: {windowCount > 0 ? `${windowCount} (${r.windows[0].type})` : '0'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Add-on Works details */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', background: '#f8fafc' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>
                  🛠️ Selected Add-on Works Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '13px' }}>
                  
                  <div>
                    <strong>Compound Wall:</strong>{' '}
                    {form.has_compound_wall ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        ON ({form.compound_wall_length}x{form.compound_wall_height} ft)
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>OFF (Excluded)</span>
                    )}
                  </div>

                  <div>
                    <strong>Entrance Gate:</strong>{' '}
                    {form.has_gate ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        ON ({form.gate_width}x{form.gate_height} ft, {form.gate_package})
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>OFF (Excluded)</span>
                    )}
                  </div>

                  <div>
                    <strong>Water Sump Sump:</strong>{' '}
                    {form.has_water_tank ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>ON ({form.water_tank_capacity} Litres)</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>OFF (Excluded)</span>
                    )}
                  </div>

                  <div>
                    <strong>Septic Tank:</strong>{' '}
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Compulsory ({form.septic_tank_capacity} Litres)</span>
                  </div>

                  <div>
                    <strong>Front elevation:</strong>{' '}
                    {form.has_front_elevation ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        ON ({form.front_elevation_width}x{form.front_elevation_height} ft, {form.front_elevation_package})
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>OFF (Excluded)</span>
                    )}
                  </div>

                  <div>
                    <strong>False Ceiling:</strong>{' '}
                    {form.has_false_ceiling ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>ON ({form.false_ceiling_area} sqft, {form.false_ceiling_package})</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>OFF (Excluded)</span>
                    )}
                  </div>

                  <div>
                    <strong>Wardrobes Carpentry:</strong>{' '}
                    {form.has_wardrobes ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        ON ({form.wardrobe_area} sqft, {form.wardrobe_type} - {form.wardrobe_quality})
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>OFF (Excluded)</span>
                    )}
                  </div>

                  <div>
                    <strong>Modular Kitchen:</strong>{' '}
                    {form.has_modular_kitchen ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>ON ({form.modular_kitchen_area} sqft, {form.modular_kitchen_package})</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>OFF (Excluded)</span>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Navigation Footer Controls */}
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
            <button className="btn btn-secondary" onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>← Back</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Cancel</button>
          {errors._global && (
            <div style={{ color: '#dc2626', fontSize: '13px', padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.18)' }}>
              ⚠ {errors._global}
            </div>
          )}
          {step < 6 ? (
            <button className="btn btn-primary" onClick={handleNext} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {step === 5 ? 'Next Step: Preview & Generate →' : `Next Step: Step ${step + 1} →`}
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
