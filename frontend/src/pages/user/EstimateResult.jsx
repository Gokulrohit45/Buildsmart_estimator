import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { formatINR, estimatesAPI } from '../../services/api';

const CATEGORIES = ['Civil Works', 'Labour', 'Flooring', 'Painting', 'Electrical', 'Plumbing', 'Interiors'];

const CAT_COLORS = {
  'Civil Works': 'badge-blue',
  'Labour': 'badge-gray',
  'Flooring': 'badge-teal',
  'Painting': 'badge-amber',
  'Electrical': 'badge-amber',
  'Plumbing': 'badge-blue',
  'Interiors': 'badge-green',
};

const CAT_PALETTE = {
  'Civil Works':  { bar: 'linear-gradient(90deg,#0f766e,#14b8a6)', hdr: 'linear-gradient(90deg,rgba(15,118,110,0.13),rgba(20,184,166,0.06))', accent: '#0f766e', text: '#0f766e' },
  'Labour':       { bar: 'linear-gradient(90deg,#2563eb,#60a5fa)', hdr: 'linear-gradient(90deg,rgba(37,99,235,0.13),rgba(96,165,250,0.06))', accent: '#2563eb', text: '#2563eb' },
  'Flooring':     { bar: 'linear-gradient(90deg,#d97706,#fbbf24)', hdr: 'linear-gradient(90deg,rgba(217,119,6,0.13),rgba(251,191,36,0.06))', accent: '#d97706', text: '#b45309' },
  'Painting':     { bar: 'linear-gradient(90deg,#ea580c,#fb923c)', hdr: 'linear-gradient(90deg,rgba(234,88,12,0.13),rgba(251,146,60,0.06))', accent: '#ea580c', text: '#ea580c' },
  'Electrical':   { bar: 'linear-gradient(90deg,#ca8a04,#facc15)', hdr: 'linear-gradient(90deg,rgba(202,138,4,0.13),rgba(250,204,21,0.06))', accent: '#ca8a04', text: '#92400e' },
  'Plumbing':     { bar: 'linear-gradient(90deg,#4f46e5,#818cf8)', hdr: 'linear-gradient(90deg,rgba(79,70,229,0.13),rgba(129,140,248,0.06))', accent: '#4f46e5', text: '#4f46e5' },
  'Interiors':    { bar: 'linear-gradient(90deg,#16a34a,#4ade80)', hdr: 'linear-gradient(90deg,rgba(22,163,74,0.13),rgba(74,222,128,0.06))', accent: '#16a34a', text: '#16a34a' },
};

const CAT_BAR_DATA = [
  { label: 'Civil Works (Materials)', cat: 'Civil Works',  val: (c) => c.civilSubtotal },
  { label: 'Labour',                  cat: 'Labour',       val: (c) => c.labourSubtotal },
  { label: 'Flooring',                cat: 'Flooring',     val: (c) => c.flooringSubtotal },
  { label: 'Painting',                cat: 'Painting',     val: (c) => c.paintingSubtotal },
  { label: 'Electrical',              cat: 'Electrical',   val: (c) => c.electricalSubtotal },
  { label: 'Plumbing',                cat: 'Plumbing',     val: (c) => c.plumbingSubtotal },
  { label: 'Interiors',               cat: 'Interiors',    val: (c) => c.interiorSubtotal },
];

const REC_GLOW = {
  tip:  { border: '#14b8a6', bg: 'rgba(20,184,166,0.06)',  shadow: '0 0 0 1px rgba(20,184,166,0.25), -4px 0 0 0 #14b8a6' },
  warn: { border: '#f59e0b', bg: 'rgba(245,158,11,0.06)',  shadow: '0 0 0 1px rgba(245,158,11,0.25), -4px 0 0 0 #f59e0b' },
  info: { border: '#3b82f6', bg: 'rgba(59,130,246,0.06)',  shadow: '0 0 0 1px rgba(59,130,246,0.25), -4px 0 0 0 #3b82f6' },
};

export default function EstimateResult() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // { success: boolean, text: string }

  useEffect(() => {
    const stored = sessionStorage.getItem('bs_estimate');
    if (stored) {
      const parsed = JSON.parse(stored);
      setResult((prev) => {
        if (prev && prev.estimate_id === parsed.estimate_id) return prev;
        return parsed;
      });
    } else {
      navigate('/new-estimate');
    }
  }, [navigate]);

  if (!result) return null;

  const summary = result.summary || {};
  const rawCosts = result.costs || {};
  const boqItems = (result.boqItems || result.items || []).map(item => {
    if ((item.unit || '').toLowerCase() === 'cft') {
      return { ...item, unit: 'Unit', qty: parseFloat((item.qty / 100).toFixed(2)) };
    }
    return item;
  });
  const inputData = result.input || result.input_json || {};

  const categoryCosts = CATEGORIES.reduce((acc, cat) => {
    const sum = boqItems.filter(item => item.category === cat).reduce((s, item) => s + (item.amount || 0), 0);
    acc[cat] = sum;
    return acc;
  }, {});

  const subtotalVal = result.subtotal ?? rawCosts.subtotal ?? 0;
  const grandTotalVal = result.grand_total ?? rawCosts.grandTotal ?? 0;
  const contingencyVal = result.contingency_amount ?? rawCosts.contingency ?? 0;
  const contingencyPctVal = result.contingency_pct ?? rawCosts.contingencyPct ?? 5;

  const costs = {
    civilSubtotal: rawCosts.civilSubtotal ?? categoryCosts['Civil Works'] ?? 0,
    labourSubtotal: rawCosts.labourSubtotal ?? categoryCosts['Labour'] ?? 0,
    flooringSubtotal: rawCosts.flooringSubtotal ?? categoryCosts['Flooring'] ?? 0,
    paintingSubtotal: rawCosts.paintingSubtotal ?? categoryCosts['Painting'] ?? 0,
    electricalSubtotal: rawCosts.electricalSubtotal ?? categoryCosts['Electrical'] ?? 0,
    plumbingSubtotal: rawCosts.plumbingSubtotal ?? categoryCosts['Plumbing'] ?? 0,
    interiorSubtotal: rawCosts.interiorSubtotal ?? categoryCosts['Interiors'] ?? 0,
    subtotal: subtotalVal,
    grandTotal: grandTotalVal,
    contingency: contingencyVal,
    contingencyPct: contingencyPctVal,
  };

  const quantities = result.quantities || result.output_json?.quantities || {};
  const duration = result.duration || result.output_json?.duration || {};
  const recommendations = result.recommendations || result.output_json?.recommendations || [];

  const handlePrint = async () => {
    if (!result || !result.estimate_id) {
      alert("Estimate ID not found.");
      return;
    }
    try {
      setDownloadingPdf(true);
      const token = localStorage.getItem('bs_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/estimates/${result.estimate_id}/download-pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation_${(result.project_name || 'project').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert("Error printing PDF: " + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleEmailPdf = async () => {
    if (!result || !result.estimate_id) {
      alert("Estimate ID not found. Generate the estimate first.");
      return;
    }

    try {
      setSendingEmail(true);
      setEmailStatus(null);
      
      const res = await estimatesAPI.sharePdf(result.estimate_id);
      
      if (res && res.success) {
        setEmailStatus({ success: true, text: res.message || 'Estimate emailed successfully!' });
      } else {
        throw new Error(res.error || 'Failed to send email.');
      }
    } catch (err) {
      setEmailStatus({ success: false, text: err.message || 'Error occurred while emailing estimate.' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportExcel = () => {
    if (!result || !result.estimate_id) {
      alert("Estimate ID not found. Save the estimate first.");
      return;
    }
    const token = localStorage.getItem('bs_token');
    const url = `http://localhost:5000/api/estimates/${result.estimate_id}/export/excel`;
    
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to export Excel sheet");
      return res.blob();
    })
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `BOQ_Estimate_${summary.customerName || 'Project'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    })
    .catch(err => alert(err.message));
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = boqItems.filter((item) => item.category === cat);
    return acc;
  }, {});

  // Compute Core civil construction cost (CW-001)
  const civilItem = boqItems.find(item => item.item_code === 'CW-001');
  const coreCost = civilItem ? civilItem.amount : (costs.civilSubtotal || costs.subtotal || 0);

  // Load or calculate stages breakdown dynamically
  const stages = (result.stages_breakdown || result.output_json?.stages_breakdown || []).length > 0
    ? (result.stages_breakdown || result.output_json?.stages_breakdown)
    : [
        {
          stage: "Foundation & Basement Stage",
          percentage: 20,
          amount: Math.round(coreCost * 0.20),
          desc: "Includes site cleaning, excavation, PCC foundation bed, footing reinforcement steel, brick masonry up to plinth level, and plinth beam concreting."
        },
        {
          stage: "Concrete Slab & Structure Stage",
          percentage: 30,
          amount: Math.round(coreCost * 0.30),
          desc: "Includes shuttering, reinforcement steel binding, column raising, beam layouts, and concrete casting for roof slabs."
        },
        {
          stage: "Brickwork & Plastering Stage",
          percentage: 20,
          amount: Math.round(coreCost * 0.20),
          desc: "Includes internal and external wall brickwork/blockwork and double coat plastering."
        },
        {
          stage: "MEP (Electrical & Plumbing) Stage",
          percentage: 15,
          amount: Math.round(coreCost * 0.15),
          desc: "Includes concealed wall piping, conduit laying, electrical box fixing, bathroom plumbing pipe layouts, and sanitary fittings."
        },
        {
          stage: "Finishing & Woodworks Stage",
          percentage: 15,
          amount: Math.round(coreCost * 0.15),
          desc: "Includes general flooring tiling, wall painting, and doors & windows framing and shutter installations."
        }
      ];

  const tabs = [
    { id: 'overview',        label: '📐 Key Quantities' },
    { id: 'stages',          label: '🏗️ Stage-wise Split' },
    { id: 'boq',             label: '📋 Bill of Quantities (BOQ)' },
    { id: 'config_summary',  label: '📋 Configuration Summary' },
    { id: 'recommendations', label: `🤖 AI Recommendations (${(recommendations || []).length})` },
  ];

  return (
    <Layout role="builder">
      {/* ══════════════════════════════════════════════
          CSS @media print OVERRIDES
      ══════════════════════════════════════════════ */}
      <style>{`
        /* Print layout adjustments */
        @media print {
          body, html, #root, .app-layout, .main-content, .page-body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            box-shadow: none !important;
            transform: none !important;
          }
          
          /* Hide non-printable items */
          .app-sidebar,
          .sidebar,
          .app-header,
          .header,
          .print-hide,
          .web-hero-banner,
          button {
            display: none !important;
          }

          /* Force print-only sections visible */
          .print-only-header {
            display: block !important;
          }
          
          .print-only-block {
            display: block !important;
          }

          /* Hide duplicate stage split panel in print since it is printed on page 1 */
          div.tab-panel.tab-panel-stages {
            display: none !important;
          }

          .page-break-after {
            page-break-after: always !important;
          }
          
          /* Force rendering of all tab-panels in one consolidated PDF document */
          .tab-panel {
            display: block !important;
            opacity: 1 !important;
            page-break-after: always !important;
            margin-bottom: 30px !important;
          }
          .tab-panel:last-child {
            page-break-after: avoid !important;
          }

          /* Make Grand Total Card full-width on print */
          .overview-grid {
            display: block !important;
            width: 100% !important;
            page-break-inside: avoid !important;
          }
          
          /* Remove glowing shadows from print cards */
          .card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
          }
          
          /* Table prints cleanly with borders and wrap control */
          .table-wrapper {
            overflow: visible !important;
            overflow-x: visible !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 5px 8px !important;
            font-size: 10px !important;
            color: #000 !important;
            word-break: break-word !important;
            white-space: normal !important;
          }
          tr {
            page-break-inside: avoid !important;
          }

          /* Stage-wise split must stay on one page */
          .print-stage-split-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .overview-total {
            padding-top: 10px !important;
          }

          @page {
            size: A4 portrait;
            margin: 1.2cm;
          }
        }
        
        @media screen {
          .print-only-header {
            display: none !important;
          }
          .print-only-block {
            display: none !important;
          }
          .web-hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* ══════════════════════════════════════════════
          PRINT-ONLY PROFESSIONAL HEADER
      ══════════════════════════════════════════════ */}
      <div className="print-only-header" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #0f766e', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f766e', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
              {inputData.builder_company_name || 'BuildSmart Estimator'}
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', fontWeight: 500 }}>
              Professional Construction Cost Estimate &amp; Quotation
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
            <div><strong>Quotation No:</strong> {inputData.quotation_number || 'QTN-TEMP'}</div>
            <div><strong>Date:</strong> {inputData.quotation_date || new Date().toLocaleDateString('en-IN')}</div>
            <div><strong>Validity:</strong> 30 Days from date of issue</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ border: '1px solid #cbd5e1', padding: '14px', borderRadius: '8px', background: '#f8fafc' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>CLIENT DETAILS</div>
            <div><strong>Customer Name:</strong> {inputData.customer_name || summary.customerName}</div>
            <div><strong>Mobile Number:</strong> {inputData.customer_mobile || '—'}</div>
            <div><strong>Email Address:</strong> {inputData.customer_email || '—'}</div>
            <div><strong>District:</strong> {inputData.city || inputData.location || '—'}</div>
            <div><strong>State:</strong> {inputData.state || 'Tamil Nadu'}</div>
          </div>
          <div style={{ border: '1px solid #cbd5e1', padding: '14px', borderRadius: '8px', background: '#f8fafc' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>PROJECT SPECIFICATIONS</div>
            <div><strong>Project Name:</strong> {inputData.project_name || '—'}</div>
            <div><strong>Built-up Area:</strong> {summary.totalSqft.toLocaleString()} Sqft</div>
            <div><strong>Building Type:</strong> {summary.buildingType}</div>
            <div><strong>Structure Type:</strong> {inputData.structure_type || 'RCC Frame'}</div>
            <div><strong>Soil Condition:</strong> {inputData.soil_type || 'Normal Soil'}</div>
            <div><strong>Quality Grade:</strong> {summary.quality}</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          WEB-ONLY HERO BANNER
      ══════════════════════════════════════════════ */}
      <div className="web-hero-banner" style={{
        background: 'linear-gradient(135deg, #0b1120 0%, #0f2027 50%, rgba(15,118,110,0.2) 100%)',
        borderRadius: '16px',
        padding: '28px 36px',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      }}>
        {/* decorative orbs */}
        <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'200px', height:'200px',
          borderRadius:'50%', background:'radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-30px', left:'35%', width:'160px', height:'160px',
          borderRadius:'50%', background:'radial-gradient(circle, rgba(8,145,178,0.13) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* Top row */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'24px', flexWrap:'wrap' }}>
          {/* Left: project info */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase',
              color:'#14b8a6', marginBottom:'6px' }}>Estimate Result</div>
            <div style={{ fontSize:'24px', fontWeight:700, color:'#ffffff', lineHeight:1.2, marginBottom:'14px' }}>
              {summary.customerName}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {[
                { icon: '📍', text: summary.location },
                { icon: '🏗', text: summary.buildingType },
                { icon: '📐', text: `${summary.totalSqft.toLocaleString()} sqft` },
                { icon: '⭐', text: summary.quality },
              ].map(({ icon, text }) => (
                <span key={text} style={{
                  display:'inline-flex', alignItems:'center', gap:'5px',
                  padding:'4px 12px', borderRadius:'99px',
                  background:'rgba(20,184,166,0.12)', border:'1px solid rgba(20,184,166,0.28)',
                  color:'#99f6e4', fontSize:'12px', fontWeight:500,
                }}>
                  {icon} {text}
                </span>
              ))}
            </div>
          </div>

          {/* Right: action buttons */}
          <div style={{ display:'flex', gap:'10px', alignItems:'center', flexShrink:0 }}>
            <button
              onClick={() => navigate('/new-estimate')}
              style={{
                background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)',
                color:'#e2e8f0', borderRadius:'10px', padding:'9px 18px',
                fontSize:'13px', fontWeight:600, cursor:'pointer',
                display:'inline-flex', alignItems:'center', gap:'7px',
                transition:'all 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}
              onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
            >
              ✏️ Edit Inputs
            </button>
            <button
              onClick={handlePrint}
              disabled={downloadingPdf}
              style={{
                background:'rgba(14,165,233,0.15)', border:'1px solid rgba(14,165,233,0.35)',
                color:'#7dd3fc', borderRadius:'10px', padding:'9px 18px',
                fontSize:'13px', fontWeight:600, cursor: downloadingPdf ? 'not-allowed' : 'pointer',
                display:'inline-flex', alignItems:'center', gap:'7px',
                transition:'all 0.2s',
                opacity: downloadingPdf ? 0.6 : 1,
              }}
              onMouseOver={e => !downloadingPdf && (e.currentTarget.style.background='rgba(14,165,233,0.28)')}
              onMouseOut={e => !downloadingPdf && (e.currentTarget.style.background='rgba(14,165,233,0.15)')}
            >
              {downloadingPdf ? '⏳ Generating PDF...' : '🖨️ Print / PDF'}
            </button>
            <button
              onClick={handleEmailPdf}
              disabled={sendingEmail}
              style={{
                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)',
                color: '#34d399', borderRadius: '10px', padding: '9px 18px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                transition: 'all 0.2s',
                opacity: sendingEmail ? 0.6 : 1,
              }}
              onMouseOver={e => !sendingEmail && (e.currentTarget.style.background='rgba(16,185,129,0.28)')}
              onMouseOut={e => !sendingEmail && (e.currentTarget.style.background='rgba(16,185,129,0.15)')}
            >
              {sendingEmail ? '⏳ Sending...' : '📧 Email PDF'}
            </button>
            <button
              onClick={handleExportExcel}
              style={{
                background:'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
                border:'none', color:'#ffffff', borderRadius:'10px', padding:'9px 20px',
                fontSize:'13px', fontWeight:700, cursor:'pointer',
                display:'inline-flex', alignItems:'center', gap:'7px',
                boxShadow:'0 4px 14px rgba(15,118,110,0.45)',
                transition:'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(15,118,110,0.6)'; }}
              onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 14px rgba(15,118,110,0.45)'; }}
            >
              📤 Export Excel
            </button>
          </div>
        </div>

        {emailStatus && (
          <div className={`alert ${emailStatus.success ? 'alert-green' : 'alert-red'}`} style={{ marginTop: '16px' }}>
            <span className="alert-icon">{emailStatus.success ? '✨' : '⚠️'}</span>
            <div className="alert-body">
              <div className="alert-title">{emailStatus.text}</div>
            </div>
          </div>
        )}

        {/* Bottom row: quick summary values */}
        <div style={{
          display:'flex', flexWrap:'wrap', gap:'12px',
          marginTop:'24px', paddingTop:'20px',
          borderTop:'1px solid rgba(255,255,255,0.08)',
        }}>
          {[
            { label:'Grand Total',  value: formatINR(costs.grandTotal),          icon:'💰', color:'#34d399' },
            { label:'Duration',     value: `${duration.min}–${duration.max} mo`, icon:'📅', color:'#60a5fa' },
            { label:'Cost / Sqft',  value: formatINR(Math.round(costs.grandTotal / summary.totalSqft)), icon:'📊', color:'#f472b6' },
            { label:'Quality Tier', value: summary.quality,                      icon:'⭐', color:'#fbbf24' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{
              display:'flex', alignItems:'center', gap:'10px',
              padding:'10px 18px', borderRadius:'12px',
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)',
              backdropFilter:'blur(8px)', flex:'1 1 auto', minWidth:'150px',
            }}>
              <span style={{ fontSize:'18px' }}>{icon}</span>
              <div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', fontWeight:500,
                  letterSpacing:'0.8px', textTransform:'uppercase' }}>{label}</div>
                <div style={{ fontSize:'15px', fontWeight:700, color, marginTop:'1px' }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          OVERVIEW ROW
      ══════════════════════════════════════════════ */}
      <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '24px' }}>
        {/* Grand Total Card */}
        <div className="card" style={{
          overflow:'hidden', position:'relative',
          background:'radial-gradient(ellipse at top left, rgba(15,118,110,0.10) 0%, #ffffff 60%)',
          border:'1px solid rgba(15,118,110,0.18)',
        }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px',
            background:'linear-gradient(90deg,#0f766e,#0891b2)' }} />
          <div className="overview-total" style={{ paddingTop:'22px' }}>
            <div className="overview-total-label" style={{ color:'var(--color-gray-500)', fontWeight:600,
              fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase' }}>Grand Total Estimate</div>
            <div style={{
              fontSize:'42px', fontWeight:800, lineHeight:1.1, marginTop:'6px', marginBottom:'4px',
              background:'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>
              {formatINR(costs.grandTotal)}
            </div>
            <div className="overview-total-sub" style={{ color:'var(--color-gray-500)', fontSize:'12px' }}>
              Includes {costs.contingencyPct ?? result.contingency_pct ?? 5}% contingency ({formatINR(costs.contingency ?? result.contingency_amount ?? 0)})
            </div>
          </div>
          <div className="overview-breakdown" style={{ borderTop:'1px solid var(--color-gray-100)', paddingTop:'12px' }}>
            <div className="breakdown-item">
              <div className="breakdown-label">Subtotal</div>
              <div className="breakdown-val">{formatINR(costs.subtotal)}</div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-label">Contingency</div>
              <div className="breakdown-val accent">{formatINR(costs.contingency ?? result.contingency_amount ?? 0)}</div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-label">Cost / Sqft</div>
              <div className="breakdown-val">{formatINR(Math.round(costs.grandTotal / summary.totalSqft))}</div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-val-full" style={{ gridColumn: 'span 2', fontSize: '11px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                Estimated Project Duration: {duration.min}–{duration.max} months
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card print-hide" style={{ overflow:'hidden' }}>
          <div className="card-header" style={{
            background:'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom:'1px solid var(--color-gray-100)',
          }}>
            <div className="card-title">Cost by Category</div>
          </div>
          <div className="card-body p-0" style={{ padding: 0 }}>
            {CAT_BAR_DATA.map(({ label, cat, val }) => {
              const v = val(costs);
              const pct = costs.subtotal > 0 ? Math.round((v / costs.subtotal) * 100) : 0;
              const palette = CAT_PALETTE[cat] || CAT_PALETTE['Civil Works'];
              return (
                <div key={label} style={{ padding: '10px 22px', borderBottom: '1px solid var(--color-gray-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize:'12px', fontWeight:600, color:'var(--color-gray-700)',
                      display:'flex', alignItems:'center', gap:'6px' }}>
                      <span style={{ width:'8px', height:'8px', borderRadius:'50%',
                        background: palette.accent, display:'inline-block', flexShrink:0 }} />
                      {label}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                      {formatINR(v)}{' '}
                      <span style={{ color: 'var(--color-gray-400)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: palette.bar,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Print-only Stage-wise Split on First Page */}
      <div className="print-only-block page-break-after" style={{ marginTop: '10px', marginBottom: '16px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div className="card print-stage-split-card" style={{ padding: '14px', border: '1px solid #cbd5e1', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f766e', borderBottom: '2.5px solid #0f766e', paddingBottom: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏗️</span> Stage-wise Construction Cost Split
          </div>
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'center', width: '5%', padding: '6px', whiteSpace: 'nowrap' }}>#</th>
                  <th style={{ textAlign: 'left', width: '22%', padding: '6px', whiteSpace: 'nowrap' }}>Stage</th>
                  <th style={{ textAlign: 'center', width: '10%', padding: '6px', whiteSpace: 'nowrap' }}>Percentage</th>
                  <th style={{ textAlign: 'left', width: '48%', padding: '6px' }}>Description</th>
                  <th style={{ textAlign: 'right', width: '15%', padding: '6px', whiteSpace: 'nowrap' }}>Estimated Cost</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage, idx) => (
                  <tr key={stage.stage} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 'bold', color: '#1e293b', padding: '6px', whiteSpace: 'nowrap' }}>{stage.stage}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#0f766e', padding: '6px', whiteSpace: 'nowrap' }}>{stage.percentage}%</td>
                    <td style={{ color: '#475569', fontSize: '11px', lineHeight: '1.4', padding: '6px' }}>{stage.desc}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace', padding: '6px', whiteSpace: 'nowrap' }}>{formatINR(stage.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TABS NAV (SCREEN ONLY)
      ══════════════════════════════════════════════ */}
      <div className="print-hide" style={{
        display:'flex', gap:'4px',
        borderBottom:'2px solid var(--color-gray-100)',
        marginBottom:'20px',
      }}>
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding:'11px 20px', fontSize:'13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-gray-500)',
                background: isActive ? 'rgba(15,118,110,0.06)' : 'transparent',
                border:'none', borderRadius:'8px 8px 0 0', cursor:'pointer',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom:'-2px', transition:'all 0.2s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════
          TAB PANELS (Consolidated for Print, Clickable for Web)
      ══════════════════════════════════════════════ */}

      {/* PANEL 1: Key Quantities */}
      <div className={`tab-panel ${activeTab === 'overview' ? 'web-visible' : 'web-hidden'}`}>
        <div className="card" style={{ overflow:'hidden' }}>
          <div className="card-header" style={{
            background:'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)',
            borderBottom:'1px solid var(--color-gray-100)',
          }}>
            <div className="card-title">Material Quantities Summary</div>
            <div className="card-subtitle">Calculated using standard civil engineering thumb rules</div>
          </div>
          <div className="p-0">
            <div className="table-wrapper" style={{ border: 'none', borderRadius: '0 0 12px 12px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="td-bold">Cement ({result.input?.cementBrand || 'Standard Brand'})</td><td className="td-mono">{(quantities.cementBags || 0).toLocaleString()}</td><td>Bags (50kg)</td><td className="text-muted">Quality factor applied</td></tr>
                  <tr><td className="td-bold">Steel ({result.input?.steelGrade || 'Fe500'})</td><td className="td-mono">{(quantities.steelKg || 0).toLocaleString()}</td><td>Kg</td><td className="text-muted">TMT bars, quality factor applied</td></tr>
                  <tr><td className="td-bold">Sand ({result.input?.sandType || 'M-Sand'})</td><td className="td-mono">{parseFloat(((quantities.sandCft || 0) / 100).toFixed(2)).toLocaleString()}</td><td>Units</td><td className="text-muted">For masonry &amp; plaster</td></tr>
                  {quantities.aggregate_40mm > 0 ? (
                    <tr><td className="td-bold">40 mm Coarse Aggregate (For PCC &amp; Footings)</td><td className="td-mono">{parseFloat(((quantities.aggregate_40mm || 0) / 100).toFixed(2)).toLocaleString()}</td><td>Units</td><td className="text-muted">40 mm Jelly</td></tr>
                  ) : null}
                  {quantities.aggregate_20mm > 0 ? (
                    <tr><td className="td-bold">20 mm Coarse Aggregate (For RCC Works)</td><td className="td-mono">{parseFloat(((quantities.aggregate_20mm || 0) / 100).toFixed(2)).toLocaleString()}</td><td>Units</td><td className="text-muted">20 mm Jelly</td></tr>
                  ) : null}
                  {quantities.aggregate_12mm > 0 ? (
                    <tr><td className="td-bold">12 mm Coarse Aggregate (For Sunshades &amp; Small RCC Works)</td><td className="td-mono">{parseFloat(((quantities.aggregate_12mm || 0) / 100).toFixed(2)).toLocaleString()}</td><td>Units</td><td className="text-muted">12 mm Jelly</td></tr>
                  ) : null}
                  {!quantities.aggregate_40mm && !quantities.aggregate_20mm && !quantities.aggregate_12mm ? (
                    <tr><td className="td-bold">Coarse Aggregate</td><td className="td-mono">{parseFloat(((quantities.aggregateCft || 0) / 100).toFixed(2)).toLocaleString()}</td><td>Units</td><td className="text-muted">20mm &amp; 40mm jelly</td></tr>
                  ) : null}
                  <tr><td className="td-bold">{result.input?.brickType || 'Standard Blocks'}</td><td className="td-mono">{(quantities.blocksQty || 0).toLocaleString()}</td><td>Nos</td><td className="text-muted">Walling &amp; partition</td></tr>
                  <tr><td className="td-bold">Flooring ({result.input?.flooringType || 'Vitrified'})</td><td className="td-mono">{(quantities.tilesArea || 0).toLocaleString()}</td><td>Sqft</td><td className="text-muted">Includes wastage percentage</td></tr>
                  <tr><td className="td-bold">Paint ({result.input?.paintType || 'Premium Emulsion'})</td><td className="td-mono">{(quantities.paintLitres || 0).toLocaleString()}</td><td>Litres</td><td className="text-muted">Interior &amp; exterior walls</td></tr>
                  <tr><td className="td-bold">Electrical Points</td><td className="td-mono">{quantities.electricalPoints}</td><td>Points</td><td className="text-muted">Wiring, switches &amp; boards</td></tr>
                  <tr><td className="td-bold">Plumbing Points</td><td className="td-mono">{quantities.plumbingPoints}</td><td>Points</td><td className="text-muted">CPVC/PVC piping</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ overflow:'hidden', marginTop: '24px' }}>
          <div className="card-header" style={{
            background:'linear-gradient(135deg, #f8fafc 0%, #ecfeff 100%)',
            borderBottom:'1px solid var(--color-gray-100)',
          }}>
            <div className="card-title">📐 Project Area Specifications</div>
            <div className="card-subtitle">Detailed dimensions and site area analysis</div>
          </div>
          <div className="p-0">
            <div className="table-wrapper" style={{ border: 'none', borderRadius: '0 0 12px 12px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Specification</th>
                    <th style={{ textAlign: 'right' }}>Calculated Area</th>
                    <th>Unit</th>
                    <th>Formula / Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="td-bold">Plot Area</td>
                    <td className="td-mono" style={{ textAlign: 'right' }}>{(summary.plotArea || 0).toLocaleString()}</td>
                    <td>Sqft</td>
                    <td className="text-muted">Plot Length × Plot Width</td>
                  </tr>
                  <tr>
                    <td className="td-bold">Ground Coverage Area</td>
                    <td className="td-mono" style={{ textAlign: 'right' }}>{(summary.groundCoverageArea || 0).toLocaleString()}</td>
                    <td>Sqft</td>
                    <td className="text-muted">Ground Floor Footprint</td>
                  </tr>
                  <tr>
                    <td className="td-bold">Open Area</td>
                    <td className="td-mono" style={{ textAlign: 'right' }}>{(summary.openArea || 0).toLocaleString()}</td>
                    <td>Sqft</td>
                    <td className="text-muted">Plot Area − Ground Coverage Area</td>
                  </tr>
                  <tr>
                    <td className="td-bold">Total Built-up Area</td>
                    <td className="td-mono" style={{ textAlign: 'right' }}>{(summary.totalSqft || 0).toLocaleString()}</td>
                    <td>Sqft</td>
                    <td className="text-muted">Sum of all floor-wise areas (incl. staircase/covered portico)</td>
                  </tr>
                  <tr>
                    <td className="td-bold">Staircase Area</td>
                    <td className="td-mono" style={{ textAlign: 'right' }}>{(summary.staircaseArea || 0).toLocaleString()}</td>
                    <td>Sqft</td>
                    <td className="text-muted">Staircase Length × Staircase Width</td>
                  </tr>
                  <tr>
                    <td className="td-bold">Portico Area</td>
                    <td className="td-mono" style={{ textAlign: 'right' }}>{(summary.porticoArea || 0).toLocaleString()}</td>
                    <td>Sqft</td>
                    <td className="text-muted">Portico Length × Portico Width</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Room-wise specifications */}
        {inputData.rooms_list && inputData.rooms_list.length > 0 && (
          <div className="card" style={{ overflow:'hidden', marginTop: '24px' }}>
            <div className="card-header" style={{
              background:'linear-gradient(135deg, #f8fafc 0%, rgba(254,240,138,0.1) 100%)',
              borderBottom:'1px solid var(--color-gray-100)',
            }}>
              <div className="card-title">🏠 Room-wise Specifications &amp; Fixtures</div>
              <div className="card-subtitle">Granular breakdown of rooms configured per floor</div>
            </div>
            <div className="p-0">
              <div className="table-wrapper" style={{ border: 'none', borderRadius: '0 0 12px 12px' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '12%' }}>Floor</th>
                      <th style={{ width: '20%' }}>Room Name</th>
                      <th style={{ textAlign: 'right', width: '15%' }}>Dimensions</th>
                      <th style={{ textAlign: 'right', width: '12%' }}>Area</th>
                      <th style={{ textAlign: 'center', width: '8%' }}>Doors</th>
                      <th style={{ textAlign: 'center', width: '8%' }}>Windows</th>
                      <th style={{ textAlign: 'center', width: '13%' }}>Electrical Points</th>
                      <th style={{ textAlign: 'center', width: '12%' }}>Plumbing Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inputData.rooms_list.map((r, idx) => {
                      const floorObj = (inputData.floors_list || []).find(f => f.floor_num === r.floor_num);
                      const floorName = floorObj ? (floorObj.floor_name || floorObj.name) : `Floor ${r.floor_num}`;
                      
                      const doorCount = (r.doors || []).reduce((sum, d) => sum + (parseInt(d.qty) || 0), 0);
                      const windowCount = (r.windows || []).reduce((sum, w) => sum + (parseInt(w.qty) || 0), 0);
                      
                      const elec = r.electrical || {};
                      const elecPoints = 
                        (parseInt(elec.light_points) || 0) + 
                        (parseInt(elec.fan_points) || 0) + 
                        (parseInt(elec.plug_points) || 0) + 
                        (parseInt(elec.switch_boards) || 0) + 
                        (parseInt(elec.ac_points) || 0) + 
                        (parseInt(elec.tv_points) || 0) + 
                        (parseInt(elec.geyser_points) || 0) + 
                        (parseInt(elec.exhaust_points) || 0) + 
                        (parseInt(elec.exterior_light_points) || 0);

                      const plumb = r.plumbing || {};
                      const plumbPoints = 
                        (parseInt(plumb.wc) || 0) + 
                        (parseInt(plumb.wash_basin) || 0) + 
                        (parseInt(plumb.shower) || 0) + 
                        (parseInt(plumb.faucet) || 0) + 
                        (parseInt(plumb.drain) || 0) + 
                        (parseInt(plumb.tap) || 0) + 
                        (parseInt(plumb.sink) || 0) + 
                        (parseInt(plumb.inlet) || 0) + 
                        (parseInt(plumb.drain_point) || 0) + 
                        (parseInt(plumb.washing_machine) || 0) + 
                        (parseInt(plumb.utility_sink) || 0);

                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{floorName}</td>
                          <td className="td-bold">{r.name}</td>
                          <td style={{ textAlign: 'right' }}>{r.length} × {r.width} ft</td>
                          <td className="td-mono" style={{ textAlign: 'right', color: '#0f766e', fontWeight: 600 }}>
                            {(r.length * r.width).toLocaleString()} Sqft
                          </td>
                          <td style={{ textAlign: 'center' }}>{doorCount}</td>
                          <td style={{ textAlign: 'center' }}>{windowCount}</td>
                          <td style={{ textAlign: 'center' }}>{elecPoints}</td>
                          <td style={{ textAlign: 'center' }}>{plumbPoints > 0 ? plumbPoints : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PANEL 2: Stage-wise Cost Breakdown */}
      <div className={`tab-panel tab-panel-stages ${activeTab === 'stages' ? 'web-visible' : 'web-hidden'}`}>
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 800, fontSize: '18px', color: '#1e293b', marginBottom: '8px' }}>
            🏗️ Stage-wise Construction Cost Split
          </div>
          <p className="text-muted" style={{ fontSize: '14px', marginBottom: '20px' }}>
            Below is the phase-wise distribution of your core construction cost of <strong>{formatINR(coreCost)}</strong> (calculated at turnkey rates). Note that additional works are priced separately.
          </p>

          {/* Stacked Horizontal Bar Chart */}
          <div style={{ display: 'flex', height: '32px', borderRadius: '16px', overflow: 'hidden', marginBottom: '32px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
            {[
              { label: 'Foundation', pct: 20, bg: '#0f766e' },
              { label: 'Structure', pct: 30, bg: '#6366f1' },
              { label: 'Brickwork', pct: 20, bg: '#d97706' },
              { label: 'MEP', pct: 15, bg: '#2563eb' },
              { label: 'Finishing', pct: 15, bg: '#10b981' }
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  width: `${s.pct}%`,
                  background: s.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
                title={`${s.label}: ${s.pct}%`}
              >
                {s.label} ({s.pct}%)
              </div>
            ))}
          </div>

          {/* Phase-wise Timeline Cards */}
          <div style={{ display: 'grid', gap: '20px' }}>
            {stages.map((stage, idx) => {
              const accentColor = ['#0f766e', '#6366f1', '#d97706', '#2563eb', '#10b981'][idx % 5];
              return (
                <div
                  key={stage.stage}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '20px',
                    background: '#ffffff',
                    borderLeft: `5px solid ${accentColor}`,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{
                        background: accentColor,
                        color: '#ffffff',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {idx + 1}
                      </span>
                      <h4 style={{ margin: 0, fontWeight: 750, color: '#1e293b', fontSize: '15px' }}>
                        {stage.stage}
                      </h4>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: accentColor,
                        background: `${accentColor}1A`,
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        {stage.percentage}%
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>
                      {stage.desc}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '180px', alignItems: 'flex-end', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      Estimated Stage Cost
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f766e', fontFamily: 'monospace', marginTop: '4px' }}>
                      {formatINR(stage.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PANEL 3: BOQ */}
      <div className={`tab-panel ${activeTab === 'boq' ? 'web-visible' : 'web-hidden'}`}>
        <div className="card" style={{ overflow:'hidden' }}>
          <div className="card-header" style={{
            background:'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
            borderBottom:'1px solid var(--color-gray-100)',
          }}>
            <div className="card-title">Bill of Quantities (BOQ)</div>
            <div className="card-subtitle">Detailed itemized cost breakdown</div>
          </div>
          <div className="p-0">
            <div className="table-wrapper" style={{ border: 'none', borderRadius: '0 0 12px 12px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((cat) => {
                    const items = grouped[cat];
                    if (!items || items.length === 0) return null;
                    const palette = CAT_PALETTE[cat] || CAT_PALETTE['Civil Works'];
                    return (
                      <>
                        <tr className="boq-group-header" key={`hdr-${cat}`}
                          style={{ background: palette.hdr }}>
                          <td colSpan={4} style={{
                            color: palette.text, fontWeight:700,
                            borderLeft:`4px solid ${palette.accent}`,
                            paddingLeft:'14px', letterSpacing:'0.3px',
                          }}>
                            {cat}
                          </td>
                        </tr>
                        {items.map((item) => (
                          <tr key={item.code}>
                            <td className="td-mono text-muted">{item.code}</td>
                            <td className="td-bold">{item.description}</td>
                            <td className="text-muted">{item.unit}</td>
                            <td className="td-mono" style={{ textAlign: 'right' }}>{item.qty.toLocaleString()}</td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                  
                  {/* Summary Totals */}
                  <tr className="table-total" style={{ background: 'rgba(15,118,110,0.06)', borderTop: '2px solid #0f766e' }}>
                    <td colSpan={3} style={{ textAlign: 'right', fontSize: '14px', color: 'var(--color-primary)', fontWeight: 800 }}>GRAND TOTAL ESTIMATE</td>
                    <td className="td-mono" style={{ textAlign: 'right', fontSize: '15px', color: 'var(--color-primary)', fontWeight: 800 }}>{(costs.grandTotal ?? result.grand_total ?? 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL 3: Recommendations */}
      <div className={`tab-panel ${activeTab === 'recommendations' ? 'web-visible' : 'web-hidden'}`}>
        <div>
          {/* Gradient header banner (Web only, styled simple for print) */}
          <div className="card" style={{
            background:'linear-gradient(135deg, #0b1120 0%, #0f2027 60%, rgba(15,118,110,0.27) 100%)',
            borderRadius:'14px', padding:'22px 28px', marginBottom:'20px',
            display:'flex', alignItems:'center', gap:'18px',
            boxShadow:'0 4px 24px rgba(0,0,0,0.18)',
            position:'relative', overflow:'hidden',
            border: 'none'
          }}>
            <div style={{
              width:'52px', height:'52px', borderRadius:'14px', flexShrink:0,
              background:'linear-gradient(135deg, #0f766e, #0891b2)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px',
            }}>🤖</div>
            <div>
              <div style={{ fontSize:'17px', fontWeight:700, color:'#ffffff', marginBottom:'4px' }}>
                AI-Powered Recommendations &amp; Inspected Notes
              </div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', lineHeight:1.5 }}>
                Based on your project in <span style={{ color:'#99f6e4' }}>{summary.location}</span>,
                materials, and scope.
              </div>
            </div>
          </div>

          {(recommendations || []).map((rec, i) => {
            const type = rec.type === 'tip' ? 'tip' : rec.type === 'warn' ? 'warn' : 'info';
            const glow = REC_GLOW[type];
            return (
              <div
                key={i}
                className="card rec-card"
                style={{
                  background: glow.bg,
                  borderLeft: `4px solid ${glow.border}`,
                  borderRadius:'12px',
                  marginBottom:'12px',
                  padding:'16px 20px',
                }}
              >
                <div style={{ fontWeight:700, marginBottom:'6px', color: '#1e293b' }}>
                  {rec.type === 'tip' ? '💡 Tip' : rec.type === 'warn' ? '⚠️ Warning' : 'ℹ️ Info'} · {rec.title}
                </div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{rec.text}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PANEL 4: Configuration Summary */}
      <div className={`tab-panel ${activeTab === 'config_summary' ? 'web-visible' : 'web-hidden'}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          
          {/* Section 1: Project & Package Info */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)', borderBottom: '2.5px solid #0f766e', paddingBottom: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏢</span> Project &amp; Package Details
            </div>
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <div><strong>Project Name:</strong> {inputData.project_name || '—'}</div>
              <div><strong>Customer Name:</strong> {inputData.customer_name || '—'}</div>
              <div><strong>Mobile Number:</strong> {inputData.customer_mobile || '—'}</div>
              <div><strong>Email Address:</strong> {inputData.customer_email || '—'}</div>
              <div><strong>District:</strong> {inputData.city || inputData.location || '—'}</div>
              <div><strong>State:</strong> {inputData.state || 'Tamil Nadu'}</div>
              <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(15,118,110,0.06)', borderRadius: '8px', border: '1px solid rgba(15,118,110,0.15)' }}>
                <strong>Chosen Package:</strong> <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{summary.quality} Tier</span> (₹{summary.quality === 'Base' ? 2100 : summary.quality === 'Standard' ? 2400 : summary.quality === 'Premium' ? 2600 : 2800}/sq.ft)
              </div>
            </div>
          </div>

          {/* Section 2: Property & Structure Dimensions */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)', borderBottom: '2.5px solid #0f766e', paddingBottom: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📐</span> Dimensions &amp; Structure
            </div>
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <div><strong>Plot Dimensions:</strong> {inputData.plot_length} ft × {inputData.plot_width} ft</div>
              <div><strong>Plot Area:</strong> {((inputData.plot_length || 0) * (inputData.plot_width || 0)).toLocaleString()} sq.ft</div>
              <div><strong>Number of Floors:</strong> {inputData.floors || 1}</div>
              <div><strong>Covered Portico Area:</strong> {summary.porticoArea || 0} sq.ft ({inputData.portico_length}x{inputData.portico_width} ft)</div>
              <div><strong>Staircase Area:</strong> {summary.staircaseArea || 0} sq.ft ({inputData.staircase_length}x{inputData.staircase_width} ft)</div>
              <div><strong>Structure Type:</strong> {inputData.structure_type || 'RCC Frame'}</div>
              <div><strong>Soil Condition:</strong> {inputData.soil_type || 'Normal Soil'}</div>
            </div>
          </div>

          {/* Section 3: Material Specifications */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)', borderBottom: '2.5px solid #0f766e', paddingBottom: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧱</span> Material Selection
            </div>
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <div><strong>Walling Material:</strong> {inputData.brick_type || 'AAC Blocks'}</div>
              <div><strong>Cement Brand:</strong> {inputData.cementBrand || 'UltraTech'}</div>
              <div><strong>Steel Reinforcement:</strong> {inputData.steelBrand || 'Tata Tiscon'}</div>
              <div><strong>Sand Type (RCC):</strong> {inputData.sand_type_rcc || 'M-Sand'}</div>
              <div><strong>Sand Type (Plaster):</strong> {inputData.sand_type_plaster || 'P-Sand'}</div>
              <div><strong>Tiles Brand Selected:</strong> {inputData.tilesBrand || 'Kajaria'}</div>
              <div>
                <strong>Selected Coarse Aggregates (Jelly):</strong>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {(inputData.selected_aggregates || []).map(sz => (
                    <span key={sz} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      {sz === '40mm' ? '40 mm Jelly' : sz === '20mm' ? '20 mm Jelly' : '12 mm Jelly'}
                    </span>
                  ))}
                  {(!inputData.selected_aggregates || inputData.selected_aggregates.length === 0) && <span style={{ color: '#94a3b8' }}>None</span>}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Floor-wise layout specs */}
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)', borderBottom: '2.5px solid #0f766e', paddingBottom: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Floor-wise Room Layout Details
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Floor</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Room Name</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Dimensions</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Area</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Tiles Package</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Doors</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Windows</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>MEP points</th>
                </tr>
              </thead>
              <tbody>
                {(inputData.rooms_list || []).map((r, i) => {
                  const floorObj = (inputData.floors_list || []).find(f => f.floor_num === r.floor_num);
                  const floorName = floorObj ? (floorObj.floor_name || floorObj.name) : `Floor ${r.floor_num}`;
                  
                  const doorCount = (r.doors || []).reduce((sum, d) => sum + (parseInt(d.qty) || 0), 0);
                  const windowCount = (r.windows || []).reduce((sum, w) => sum + (parseInt(w.qty) || 0), 0);
                  
                  const elec = r.electrical || {};
                  const elecPoints = 
                    (parseInt(elec.light_points) || 0) + 
                    (parseInt(elec.fan_points) || 0) + 
                    (parseInt(elec.plug_points) || 0) + 
                    (parseInt(elec.switch_boards) || 0) + 
                    (parseInt(elec.ac_points) || 0) + 
                    (parseInt(elec.tv_points) || 0) + 
                    (parseInt(elec.geyser_points) || 0) + 
                    (parseInt(elec.exhaust_points) || 0);

                  const plumb = r.plumbing || {};
                  const plumbPoints = 
                    (parseInt(plumb.wc) || 0) + 
                    (parseInt(plumb.wash_basin) || 0) + 
                    (parseInt(plumb.shower) || 0) + 
                    (parseInt(plumb.faucet) || 0) + 
                    (parseInt(plumb.tap) || 0) + 
                    (parseInt(plumb.sink) || 0);

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{floorName}</td>
                      <td style={{ padding: '10px' }}>{r.name}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>{r.length} × {r.width} ft</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{r.length * r.width} sq.ft</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          {r.tiles_package || 'Standard'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{doorCount} ({(r.doors || [])[0]?.type || '—'})</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{windowCount} ({(r.windows || [])[0]?.type || '—'})</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>⚡ {elecPoints} pts / 🚰 {plumbPoints} pts</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Add-ons Specification list */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)', borderBottom: '2.5px solid #0f766e', paddingBottom: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛠️</span> Optional Add-ons Selection
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', fontSize: '13px' }}>
            
            {/* Compound Wall */}
            <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', background: inputData.has_compound_wall ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>🧱 Compound Wall</div>
              {inputData.has_compound_wall ? (
                <>
                  <div><strong>Dimensions:</strong> {inputData.compound_wall_length} ft length, {inputData.compound_wall_height} ft height</div>
                  <div><strong>Area:</strong> {(inputData.compound_wall_length || 0) * (inputData.compound_wall_height || 0)} sq.ft</div>
                </>
              ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Toggled Off — Excluded</span>}
            </div>

            {/* Entrance Gate */}
            <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', background: inputData.has_gate ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>🚪 Entrance Gate</div>
              {inputData.has_gate ? (
                <>
                  <div><strong>Dimensions:</strong> {inputData.gate_width} ft width, {inputData.gate_height} ft height</div>
                  <div><strong>Package:</strong> {inputData.gate_package} Quality</div>
                </>
              ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Toggled Off — Excluded</span>}
            </div>

            {/* Sump Tank */}
            <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', background: inputData.has_water_tank ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>🚰 Underground Sump</div>
              {inputData.has_water_tank ? (
                <div><strong>Capacity:</strong> {inputData.water_tank_capacity} Litres</div>
              ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Toggled Off — Excluded</span>}
            </div>

            {/* Septic Tank */}
            <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', background: '#f0fdf4' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>🚽 Septic Tank (Compulsory)</div>
              <div><strong>Capacity:</strong> {inputData.septic_tank_capacity} Litres</div>
            </div>

            {/* Front Elevation */}
            <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', background: inputData.has_front_elevation ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>📐 Front Elevation Facade</div>
              {inputData.has_front_elevation ? (
                <>
                  <div><strong>Dimensions:</strong> {inputData.front_elevation_width} ft width, {inputData.front_elevation_height} ft height</div>
                  <div><strong>Package:</strong> {inputData.front_elevation_package} Quality</div>
                </>
              ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Toggled Off — Excluded</span>}
            </div>

            {/* False Ceiling */}
            <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', background: inputData.has_false_ceiling ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>📐 False Ceiling</div>
              {inputData.has_false_ceiling ? (
                <>
                  <div><strong>Covered Area:</strong> {inputData.false_ceiling_area} sq.ft</div>
                  <div><strong>Package:</strong> {inputData.false_ceiling_package} Quality</div>
                </>
              ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Toggled Off — Excluded</span>}
            </div>

            {/* Wardrobes */}
            <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', background: inputData.has_wardrobes ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>🚪 Wardrobes &amp; Loft Cover</div>
              {inputData.has_wardrobes ? (
                <>
                  <div><strong>Covered Area:</strong> {inputData.wardrobe_area} sq.ft</div>
                  <div><strong>Material Type:</strong> {inputData.wardrobe_type} ({inputData.wardrobe_quality})</div>
                </>
              ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Toggled Off — Excluded</span>}
            </div>

            {/* Modular Kitchen */}
            <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', background: inputData.has_modular_kitchen ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>🍳 Modular Kitchen</div>
              {inputData.has_modular_kitchen ? (
                <>
                  <div><strong>Kitchen Area:</strong> {inputData.modular_kitchen_area} sq.ft</div>
                  <div><strong>Package:</strong> {inputData.modular_kitchen_package} Quality</div>
                </>
              ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Toggled Off — Excluded</span>}
            </div>

            {/* Surkhi Weathering Course */}
            <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', background: inputData.has_surkhi ? '#f0fdf4' : '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>🧱 Surkhi Weathering Course</div>
              {inputData.has_surkhi ? (
                <>
                  <div><strong>Surkhi Area:</strong> {inputData.surkhi_area} sq.ft</div>
                  <div><strong>Package:</strong> {inputData.surkhi_package} Quality</div>
                </>
              ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Toggled Off — Excluded</span>}
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
