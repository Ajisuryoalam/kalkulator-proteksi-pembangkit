import { CURVES, CURVE_OPTIONS, tccFormulaStr, solveDial, fmt } from './curves';

const SQRT3 = Math.sqrt(3);

export const EQUIP = {
  trafo: {
    label:'Trafo Daya', dev:'87T / 51 / 51N', dot:0,
    title:'Trafo Daya (Power Transformer)',
    desc:'Setting differential (87T), overcurrent (51/50) dan ground fault (51N) untuk trafo daya dua belitan.',
    fields:[
      {id:'s_mva', label:'Daya Trafo', unit:'MVA', def:60, step:0.1},
      {id:'v_hv', label:'Tegangan Sisi HV', unit:'kV', def:150, step:0.1},
      {id:'v_lv', label:'Tegangan Sisi LV', unit:'kV', def:20, step:0.1},
      {id:'z_pct', label:'Impedansi Trafo (%Z)', unit:'%', def:12.5, step:0.1},
      {id:'ct_hv', label:'Rasio CT Sisi HV', unit:'', def:'300/5', type:'text'},
      {id:'ct_lv', label:'Rasio CT Sisi LV', unit:'', def:'2000/5', type:'text'},
      {id:'curve', label:'Standar & Kurva 51 HV', type:'select', options:CURVE_OPTIONS},
      {id:'t_downstream', label:'Waktu Trip Relay Hilir (sisi LV) pada Through-Fault', unit:'detik', def:0.4, step:0.01},
      {id:'grading', label:'Grading Time Margin (CTI)', unit:'detik', def:0.3, step:0.01},
      {id:'is87', label:'87T — Pickup Minimum (Is)', unit:'pu', def:0.30, step:0.01},
      {id:'slope1_87', label:'87T — Slope 1', unit:'%', def:25, step:1},
      {id:'bp1_87', label:'87T — Breakpoint (Slope1→Slope2)', unit:'pu', def:2.0, step:0.1},
      {id:'slope2_87', label:'87T — Slope 2', unit:'%', def:50, step:1},
    ],
    calc(v){
      const fla_hv = v.s_mva*1000/(SQRT3*v.v_hv);
      const fla_lv = v.s_mva*1000/(SQRT3*v.v_lv);
      const thru_fault = fla_hv*(100/v.z_pct);
      const g51hv = 1.3*fla_hv;
      const g51lv = 1.3*fla_lv;
      const g50hv = 12*fla_hv;
      const g51n = 0.10*fla_hv;
      const M = thru_fault/g51hv;
      const tTarget = v.t_downstream + v.grading;
      const dial = solveDial(v.curve, tTarget, M);
      const groups = [
        {group:'Arus Nominal', items:[
          {label:'FLA sisi HV', formula:'S / (√3 × V_HV)', value:fla_hv, unit:'A'},
          {label:'FLA sisi LV', formula:'S / (√3 × V_LV)', value:fla_lv, unit:'A'},
          {label:'Arus hubung singkat maks. (through-fault)', formula:'FLA_HV × 100 / %Z', value:thru_fault, unit:'A', note:'Estimasi kontribusi sistem tanpa memperhitungkan impedansi sumber di sisi HV — gunakan hasil studi hubung singkat aktual bila tersedia.'}
        ]},
        {group:'51 — Overcurrent Time Delay (sisi HV & LV)', items:[
          {label:'Pickup 51 sisi HV', formula:'1.3 × FLA_HV', value:g51hv, unit:'A'},
          {label:'Pickup 51 sisi LV', formula:'1.3 × FLA_LV', value:g51lv, unit:'A', note:'Rentang umum 125–150% FLA. Kurva: Very/Extremely Inverse (IEC) atau U1/U3 (IEEE), TDS dikoordinasikan terhadap relay feeder di hilir dengan grading time ≥0.3s.'}
        ]},
        {group:'50 — Instantaneous (opsional, sisi HV)', items:[
          {label:'Pickup 50 (bila diaktifkan)', formula:'12 × FLA_HV', value:g50hv, unit:'A', note:'Harus di atas arus inrush maksimum (umumnya 8–12× FLA saat t=0.1s) agar tidak trip saat energizing. Banyak filosofi PLN menonaktifkan 50 pada trafo dan mengandalkan 87T untuk proteksi cepat internal.'}
        ]},
        {group:'51N — Ground/Earth Fault', items:[
          {label:'Pickup 51N', formula:'10% × FLA_HV', value:g51n, unit:'A', note:'Sensitif terhadap gangguan tanah impedansi tinggi. Untuk skema Restricted Earth Fault (REF/87N), pickup dapat diturunkan hingga 5% CT rating.'}
        ]},
        {group:'87T — Differential Protection', items:[
          {label:'Pickup minimum (Is)', formula:'input pengguna', value:v.is87, unit:'pu', note:'Margin terhadap mismatch CT, tap changer (OLTC), dan arus eksitasi. Tipikal 0.20–0.30 pu.'},
          {label:'Slope 1', formula:`berlaku 0 – ${fmt(v.bp1_87,1)} pu`, value:v.slope1_87, unit:'%'},
          {label:'Slope 2', formula:`berlaku > ${fmt(v.bp1_87,1)} pu`, value:v.slope2_87, unit:'%', note:'Untuk kondisi through-fault berat / saturasi CT.'},
          {label:'Restraint harmonisa ke-2 (inrush)', formula:'—', value:15, unit:'%'},
          {label:'Restraint harmonisa ke-5 (overexcitation)', formula:'—', value:35, unit:'%'}
        ]},
        {group:`TMS/TD 51 HV — ${CURVES[v.curve].label}`, items:[
          {label:'PSM (M = I_thru-fault / Is)', formula:'through-fault / pickup 51 HV', value:M, unit:'× Is'},
          {label:'Target waktu pada titik koordinasi', formula:'t_hilir + CTI', value:tTarget, unit:'detik'},
          {label:CURVES[v.curve].type==='iec'?'TMS (Time Multiplier Setting)':'TD (Time Dial)', formula:tccFormulaStr(v.curve), value:dial, unit:''},
          {label:'', formula:'', value:null, unit:'', flag: (dial>=0.025&&dial<=1.2)?'ok':'warn', note: (dial>=0.025&&dial<=1.2)? 'Nilai TMS/TD berada dalam rentang wajar relay digital (umumnya 0.025–1.2).' : 'Nilai TMS/TD di luar rentang umum relay (0.025–1.2) — periksa kembali pickup, arus through-fault, atau pilih kurva lain.'}
        ]}
      ];
      return {
        groups,
        tcc:{
          desc:`Kurva 51 sisi HV (${CURVES[v.curve].label}). Titik cyan menandai target koordinasi terhadap relay di sisi LV pada arus through-fault maksimum.`,
          curves:[{curveKey:v.curve, dial, color:'#F0A830', label:`51 HV — ${CURVES[v.curve].name}`}],
          coord:{M, t:tTarget, label:'Koordinasi vs relay LV'}
        },
        diff:{
          desc:'Garis amber (terisi) adalah setting 87T yang Anda masukkan. Garis putus-putus adalah nilai tipikal/representatif menurut pedoman IEEE C37.91 dan praktik umum relay ber-acuan IEC 60255-187, untuk pembanding kewajaran setting.',
          xMax: Math.max(6, v.bp1_87*2, 2.5*2),
          curves:[
            {label:`Setting Anda (Is=${fmt(v.is87,2)}pu, S1=${v.slope1_87}%, BP=${fmt(v.bp1_87,1)}pu, S2=${v.slope2_87}%)`, color:'#F0A830', primary:true, is:v.is87, s1:v.slope1_87/100, bp1:v.bp1_87, s2:v.slope2_87/100},
            {label:'Tipikal IEEE C37.91 (Is=0.30pu, S1=25%, BP=2.0pu, S2=50%)', color:'#4FD4D8', primary:false, is:0.30, s1:0.25, bp1:2.0, s2:0.50},
            {label:'Tipikal IEC 60255-187 (Is=0.20pu, S1=25%, BP=2.5pu, S2=80%)', color:'#4ADE80', primary:false, is:0.20, s1:0.25, bp1:2.5, s2:0.80}
          ]
        }
      };
    }
  },

  generator:{
    label:'Generator', dev:'87G/40/32/46', dot:1,
    title:'Generator Sinkron',
    desc:'Setting proteksi utama generator: differential, loss of field, reverse power, unbalance, tegangan & frekuensi.',
    fields:[
      {id:'s_mva', label:'Daya Generator', unit:'MVA', def:50, step:0.1},
      {id:'v_kv', label:'Tegangan Terminal', unit:'kV', def:11, step:0.1},
      {id:'xd2_pct', label:"Reaktansi Subtransien Xd''", unit:'%', def:15, step:0.1},
      {id:'prime_mover', label:'Jenis Penggerak', type:'select', options:['Uap (Steam)','Gas Turbine','Diesel','Hydro']}
    ],
    calc(v){
      const fla = v.s_mva*1000/(SQRT3*v.v_kv);
      const g87g = 0.05*fla;
      const g51v = 1.5*fla;
      const rp = {'Uap (Steam)':2,'Gas Turbine':12,'Diesel':9,'Hydro':1}[v.prime_mover] ?? 2;
      const rpKw = (rp/100)*v.s_mva*1000;
      return [
        {group:'Arus Nominal', items:[
          {label:'FLA (Full Load Ampere)', formula:'S / (√3 × V)', value:fla, unit:'A'}
        ]},
        {group:'87G — Stator Differential', items:[
          {label:'Pickup', formula:'5% × FLA', value:g87g, unit:'A', note:'Sensitivitas tinggi khas proteksi generator (biased/percentage differential).'},
          {label:'Slope', formula:'—', value:10, unit:'%'}
        ]},
        {group:'51V — Voltage-Restrained/Controlled Overcurrent', items:[
          {label:'Pickup pada tegangan nominal', formula:'1.5 × FLA', value:g51v, unit:'A', note:'Pickup menurun mengikuti karakteristik tegangan (voltage-restrained) untuk tetap sensitif saat gangguan menekan tegangan terminal.'}
        ]},
        {group:'40 — Loss of Field (Mho)', items:[
          {label:'Offset (Zone 1)', formula:"−Xd'/2", value:-(v.xd2_pct/2), unit:'%Z'},
          {label:'Diameter', formula:'Xd (≈ 1.0–1.2 pu, cek data pabrikan)', value:null, unit:''}
        ]},
        {group:'32 — Reverse Power (Anti-Motoring)', items:[
          {label:`Pickup (basis: ${v.prime_mover})`, formula:`${rp}% × S_MW`, value:rpKw/1000, unit:'MW', note:'Steam turbine: 0.5–3%; Gas turbine: 10–15%; Diesel: 5–15%; Hydro: 0.2–2%. Time delay tipikal 2–30 detik untuk menghindari trip saat load rejection sesaat.'}
        ]},
        {group:'46 — Negative Sequence (Unbalance)', items:[
          {label:'I2 kontinu maksimum', formula:'—', value:8, unit:'% FLA', note:'Default rotor silindris (turbogenerator); rotor salient pole umumnya 5–10%. Cek nameplate.'},
          {label:'Konstanta K (I2²t)', formula:'—', value:20, unit:'', note:'Rentang tipikal 10–40 tergantung desain rotor.'}
        ]},
        {group:'59 / 27 — Over / Under Voltage', items:[
          {label:'59 pickup', formula:'110% Vn', value:1.10*v.v_kv, unit:'kV'},
          {label:'27 pickup', formula:'90% Vn', value:0.90*v.v_kv, unit:'kV'}
        ]},
        {group:'81 — Over/Under Frequency (sistem 50Hz)', items:[
          {label:'81U tahap 1', formula:'—', value:47.5, unit:'Hz', note:'Verifikasi terhadap Grid Code PLN yang berlaku untuk time delay tiap tahap.'},
          {label:'81O tahap 1', formula:'—', value:51.5, unit:'Hz'}
        ]},
        {group:'24 — Overexcitation (V/Hz)', items:[
          {label:'Pickup inverse time', formula:'—', value:1.05, unit:'pu V/Hz'},
          {label:'Pickup definite backup', formula:'—', value:1.10, unit:'pu V/Hz'}
        ]}
      ];
    }
  },

  motor:{
    label:'Motor', dev:'50/49/46/48', dot:2,
    title:'Motor Induksi',
    desc:'Setting proteksi motor: instantaneous, thermal overload, unbalance, stall, undercurrent.',
    fields:[
      {id:'p_kw', label:'Daya Motor', unit:'kW', def:1000, step:1},
      {id:'v_v', label:'Tegangan', unit:'V', def:6300, step:1},
      {id:'eff', label:'Efisiensi', unit:'pu', def:0.95, step:0.01},
      {id:'pf', label:'Faktor Daya', unit:'pu', def:0.88, step:0.01},
      {id:'lrc_mult', label:'Locked Rotor Current (kelipatan FLA)', unit:'×FLA', def:6, step:0.1},
      {id:'t_start', label:'Waktu Start Normal', unit:'detik', def:8, step:0.1},
      {id:'t_lock_hot', label:'Locked Rotor Withstand (hot)', unit:'detik', def:12, step:0.1},
    ],
    calc(v){
      const fla = (v.p_kw*1000)/(SQRT3*v.v_v*v.eff*v.pf);
      const lra = v.lrc_mult*fla;
      const g50 = 1.7*lra;
      const g51 = 1.15*fla;
      const g37 = 0.5*fla;
      const marginStall = v.t_lock_hot - v.t_start;
      const g48 = Math.max(v.t_lock_hot-1,0.1);
      return [
        {group:'Arus Nominal', items:[
          {label:'FLA (dihitung dari nameplate)', formula:'P / (√3 × V × η × cosφ)', value:fla, unit:'A', note:'Gunakan nilai FLA nameplate motor bila tersedia — hasil hitung ini hanya estimasi.'},
          {label:'Locked Rotor Current (LRA)', formula:`${v.lrc_mult} × FLA`, value:lra, unit:'A'}
        ]},
        {group:'50 — Instantaneous Overcurrent', items:[
          {label:'Pickup', formula:'1.7 × LRA', value:g50, unit:'A', note:'Rentang 1.7–2.0× LRA agar tidak trip akibat komponen asimetris saat starting, namun tetap sensitif terhadap fault internal.'}
        ]},
        {group:'51/49 — Thermal Overload', items:[
          {label:'Pickup', formula:'1.15 × FLA', value:g51, unit:'A', note:'Sesuaikan hingga 1.25×FLA bila motor memiliki service factor >1.0. Time constant kurva thermal mengikuti data locked-rotor withstand pabrikan.'}
        ]},
        {group:'48 — Stall/Locked Rotor (saat running)', items:[
          {label:'Waktu trip stall', formula:'t_lock(hot) − 1s', value:g48, unit:'detik'},
          {label:'Margin start vs locked-rotor withstand', formula:'t_lock(hot) − t_start', value:marginStall, unit:'detik', note: marginStall<2 ? undefined : 'Margin memadai (≥2 detik) untuk membedakan starting normal dari kondisi stall.'}
        ]},
        {group:'46 — Negative Sequence (Unbalance)', items:[
          {label:'Pickup alarm', formula:'—', value:5, unit:'% FLA'},
          {label:'Pickup trip', formula:'—', value:8, unit:'% FLA', note:'Sesuai derating NEMA MG-1 untuk unbalance tegangan suplai.'}
        ]},
        {group:'37 — Undercurrent (Jam Protection)', items:[
          {label:'Pickup', formula:'0.5 × FLA', value:g37, unit:'A', note:'Time delay 2–5 detik. Untuk pompa/kompresor guna deteksi kehilangan beban (jam pada kopling, sudu patah, dll).'}
        ]},
        {group:'66 — Starting Frequency (informatif)', items:[
          {label:'Start panas (hot) diizinkan', formula:'—', value:2, unit:'kali/jam'},
          {label:'Start dingin (cold) diizinkan', formula:'—', value:3, unit:'kali/jam', note:'Nilai default NEMA — verifikasi terhadap data thermal capability pabrikan motor.'}
        ]},
        {group:'27/59 — Under/Over Voltage', items:[
          {label:'27 pickup', formula:'80% Vn', value:0.8*v.v_v, unit:'V'},
          {label:'59 pickup', formula:'110% Vn', value:1.1*v.v_v, unit:'V'}
        ]}
      ];
    }
  },

  busbar:{
    label:'Busbar', dev:'87B (High-Z)', dot:3,
    title:'Busbar Proteksi',
    desc:'Setting skema differential impedansi tinggi (high-impedance bus differential).',
    fields:[
      {id:'v_kv', label:'Tegangan Bus', unit:'kV', def:20, step:0.1},
      {id:'if_max_ka', label:'Arus Hubung Singkat Maks. (through-fault)', unit:'kA', def:25, step:0.1},
      {id:'ctr', label:'Rasio CT (primer/sekunder, mis. 2000/5)', unit:'', def:400, step:1, note:'Masukkan sebagai angka rasio (primer÷sekunder), mis. 2000/5 → isi 400'},
      {id:'rct', label:'Resistansi CT sekunder (Rct)', unit:'Ω', def:0.5, step:0.01},
      {id:'rl', label:'Resistansi kabel pilot (Rl, satu arah)', unit:'Ω', def:1.0, step:0.01},
    ],
    calc(v){
      const if_sec = (v.if_max_ka*1000)/v.ctr;
      const vs = if_sec*(v.rct + 2*v.rl);
      const relaySetting = 1.5*vs;
      return [
        {group:'Arus Sekunder CT', items:[
          {label:'Arus gangguan sisi sekunder CT', formula:'I_fault,primer / CTR', value:if_sec, unit:'A'}
        ]},
        {group:'87B — High Impedance Bus Differential', items:[
          {label:'Tegangan stabilitas (Vs)', formula:'I_sec × (Rct + 2×Rl)', value:vs, unit:'V', note:'Tegangan minimum relay agar tetap stabil (tidak salah trip) saat terjadi through-fault eksternal dengan CT jenuh sebagian.'},
          {label:'Setting tegangan relay', formula:'1.5 × Vs', value:relaySetting, unit:'V', note:'Margin keamanan 50% di atas Vs perhitungan. Bila Vs mendekati/melebihi rating relay (umumnya ~200–300V), diperlukan metrosil / non-linear resistor untuk membatasi tegangan puncak pada CT.'},
          {label:'Pickup arus primer (referensi)', formula:'20% arus gangguan minimum', value:null, unit:'', note:'Gunakan hasil studi hubung singkat minimum (fault jauh/impedansi tinggi) untuk memastikan sensitivitas skema.'}
        ]},
        {group:'50/51 — Backup via Relay Feeder Incoming', items:[
          {label:'Catatan koordinasi', formula:'—', value:null, unit:'', note:'Proteksi backup bus umumnya memanfaatkan zone-2/zone-3 dari relay incoming trafo dengan time delay terkoordinasi, bukan relay tersendiri pada bus.'}
        ]}
      ];
    }
  },

  feeder:{
    label:'Feeder / Penyulang', dev:'51/50/51N', dot:4,
    title:'Feeder / Penyulang',
    desc:'Setting overcurrent fasa dan ground fault untuk penyulang keluar, terkoordinasi terhadap peralatan hilir.',
    fields:[
      {id:'i_load_max', label:'Arus Beban Maksimum', unit:'A', def:300, step:1},
      {id:'cable_amp', label:'Ampacity Kabel Terpasang', unit:'A', def:400, step:1},
      {id:'ctr', label:'Rasio CT (primer÷sekunder)', unit:'', def:80, step:1},
      {id:'if_far_ka', label:'Arus Gangguan Minimum di Ujung Feeder', unit:'kA', def:2.5, step:0.01},
      {id:'t_downstream', label:'Waktu Trip Relay/Recloser di Hilir', unit:'detik', def:0.2, step:0.01},
      {id:'grading', label:'Grading Time Margin (CTI)', unit:'detik', def:0.3, step:0.01},
      {id:'curve', label:'Standar & Kurva 51', type:'select', options:CURVE_OPTIONS},
    ],
    calc(v){
      const g51 = 1.2*v.i_load_max;
      const g50 = 1.3*v.if_far_ka*1000;
      const g51n = 0.2*v.ctr*5;
      const tRelay = v.t_downstream + v.grading;
      const overCable = g51 > v.cable_amp;
      const M = (v.if_far_ka*1000)/g51;
      const dial = solveDial(v.curve, tRelay, M);
      const groups = [
        {group:'51 — Overcurrent Time Delay (fasa)', items:[
          {label:'Pickup', formula:'1.2 × I_beban maks', value:g51, unit:'A', note:'Rentang umum 105–130% beban puncak. Harus tetap di bawah ampacity kabel.'},
          {label:'Waktu trip pada titik koordinasi', formula:'t_hilir + CTI', value:tRelay, unit:'detik'},
          overCable ? {label:'', formula:'', value:null, unit:'', flag:'warn', note:`Pickup (${fmt(g51)} A) melebihi ampacity kabel terpasang (${fmt(v.cable_amp,0)} A) — turunkan pickup atau tingkatkan ukuran kabel.`} : {label:'', formula:'', value:null, unit:'', flag:'ok', note:'Pickup berada dalam batas ampacity kabel.'}
        ]},
        {group:'50 — Instantaneous (fasa)', items:[
          {label:'Pickup', formula:'1.3 × I_fault(min, ujung feeder)', value:g50, unit:'A', note:'Diset di atas arus gangguan minimum pada titik jauh agar tetap grading dengan proteksi hilir (tidak overreach ke zona berikutnya).'}
        ]},
        {group:'51N/50N — Ground Fault', items:[
          {label:'Pickup 51N', formula:'20% × rating sekunder CT (5A) × CTR', value:g51n, unit:'A', note:'Rentang tipikal 10–40% CT rating tergantung skema pentanahan sistem (solid/resistance grounded).'}
        ]},
        {group:`TMS/TD 51 — ${CURVES[v.curve].label}`, items:[
          {label:'PSM (M = I_fault ujung feeder / Is)', formula:'I_fault(min,ujung) / pickup 51', value:M, unit:'× Is'},
          {label:'Target waktu pada titik koordinasi', formula:'t_hilir + CTI', value:tRelay, unit:'detik'},
          {label:CURVES[v.curve].type==='iec'?'TMS (Time Multiplier Setting)':'TD (Time Dial)', formula:tccFormulaStr(v.curve), value:dial, unit:''},
          {label:'', formula:'', value:null, unit:'', flag: (dial>=0.025&&dial<=1.2)?'ok':'warn', note: (dial>=0.025&&dial<=1.2)? 'Nilai TMS/TD berada dalam rentang wajar relay digital (umumnya 0.025–1.2).' : 'Nilai TMS/TD di luar rentang umum relay (0.025–1.2) — periksa kembali pickup, arus gangguan, atau pilih kurva lain.'}
        ]}
      ];
      return {
        groups,
        tcc:{
          desc:`Kurva 51 feeder (${CURVES[v.curve].label}). Titik cyan menandai target koordinasi terhadap relay/recloser di hilir pada arus gangguan minimum di ujung feeder.`,
          curves:[{curveKey:v.curve, dial, color:'#F0A830', label:`51 Feeder — ${CURVES[v.curve].name}`}],
          coord:{M, t:tRelay, label:'Koordinasi vs relay hilir'}
        }
      };
    }
  },

  kabel:{
    label:'Kabel', dev:'Thermal WHS', dot:5,
    title:'Kabel Daya (Ampacity & Fault Withstand)',
    desc:'Pengecekan kemampuan hantar arus hubung singkat dan estimasi drop tegangan pada kabel daya.',
    fields:[
      {id:'a_mm2', label:'Luas Penampang', unit:'mm²', def:240, step:1},
      {id:'conductor', label:'Jenis Konduktor', type:'select', options:['Tembaga (Cu)','Aluminium (Al)']},
      {id:'insulation', label:'Jenis Isolasi', type:'select', options:['XLPE','PVC']},
      {id:'if_ka', label:'Arus Gangguan Hubung Singkat', unit:'kA', def:20, step:0.1},
      {id:'t_clear', label:'Waktu Pemutusan (Fault Clearing Time)', unit:'detik', def:0.5, step:0.01},
      {id:'i_load', label:'Arus Beban', unit:'A', def:350, step:1},
      {id:'length_m', label:'Panjang Kabel', unit:'m', def:500, step:1},
    ],
    calc(v){
      const kTable = {
        'Tembaga (Cu)_XLPE':143, 'Tembaga (Cu)_PVC':115,
        'Aluminium (Al)_XLPE':94, 'Aluminium (Al)_PVC':76
      };
      const k = kTable[`${v.conductor}_${v.insulation}`];
      const aMin = (v.if_ka*1000*Math.sqrt(v.t_clear))/k;
      const iWithstand = (k*v.a_mm2)/Math.sqrt(v.t_clear)/1000;
      const undersized = v.a_mm2 < aMin;
      const rhoCu = 0.0175, rhoAl=0.0282;
      const rho = v.conductor.startsWith('Tembaga')?rhoCu:rhoAl;
      const rPerKm = (rho*1000)/v.a_mm2;
      const vdPct = (SQRT3*v.i_load*(v.length_m/1000)*rPerKm)/(20000)*100;
      return [
        {group:'Ketahanan Hubung Singkat (Thermal Withstand)', items:[
          {label:'Konstanta k (IEC 60364-5-54)', formula:`${v.conductor} + ${v.insulation}`, value:k, unit:''},
          {label:'Luas penampang minimum dibutuhkan', formula:'(I_fault × √t) / k', value:aMin, unit:'mm²'},
          {label:'Kapasitas withstand kabel terpasang', formula:'k × A / √t', value:iWithstand, unit:'kA'},
          undersized
            ? {label:'', formula:'', value:null, unit:'', flag:'warn', note:`Penampang terpasang (${fmt(v.a_mm2,0)} mm²) LEBIH KECIL dari minimum kebutuhan (${fmt(aMin,1)} mm²) untuk menahan arus gangguan pada waktu pemutusan tersebut.`}
            : {label:'', formula:'', value:null, unit:'', flag:'ok', note:'Penampang kabel mencukupi untuk menahan arus gangguan pada waktu pemutusan yang ditentukan.'}
        ]},
        {group:'Estimasi Drop Tegangan (indikatif)', items:[
          {label:'Resistansi DC per km (estimasi, 20°C)', formula:'ρ × 1000 / A', value:rPerKm, unit:'Ω/km', note:'Estimasi resistansi DC saja (reaktansi diabaikan) — hanya indikatif, gunakan data teknis kabel aktual untuk perhitungan drop tegangan final.'},
          {label:'Perkiraan drop tegangan', formula:'√3 × I × L × R / V', value:vdPct, unit:'% (basis 20kV)'}
        ]}
      ];
    }
  },

  koordinasi:{
    label:'Koordinasi', dev:'Overlay TCC', dot:6, custom:true
  },

  gardu:{
    label:'Gardu Induk (Incoming/Outgoing)', dev:'Kubikel + NGR', dot:9, custom:true
  },

  kha:{
    label:'KHA Kabel & Sheath', dev:'IEC 60287 / CIGRE 880', dot:7, embedUrl:'/alat/kha-kabel.html'
  },

  konduktor:{
    label:'KHA Konduktor & Sagging', dev:'IEEE 738 / State-Change', dot:8,
    title:'KHA Konduktor Overhead & Andongan (Sagging)',
    desc:'Kapasitas hantar arus konduktor telanjang overhead (IEEE 738 — neraca panas konveksi/radiasi/matahari) dan pengaruhnya terhadap andongan (sag) via persamaan state-change. Terpisah dari kalkulator Kabel (untuk kabel tertanam/IEC 60287).',
    fields:[
      {id:'diameter_mm', label:'Diameter Konduktor', unit:'mm', def:20, step:0.01},
      {id:'r_low_ohmkm', label:'Resistansi AC @ Suhu Rendah', unit:'Ω/km', def:0.150, step:0.001},
      {id:'t_low', label:'Suhu Referensi R Rendah', unit:'°C', def:25, step:1},
      {id:'r_high_ohmkm', label:'Resistansi AC @ Suhu Tinggi', unit:'Ω/km', def:0.180, step:0.001},
      {id:'t_high', label:'Suhu Referensi R Tinggi', unit:'°C', def:75, step:1},
      {id:'tc_max', label:'Suhu Konduktor Maksimum Diizinkan', unit:'°C', def:75, step:1},
      {id:'ta', label:'Suhu Ambient', unit:'°C', def:40, step:1},
      {id:'elevation_m', label:'Elevasi', unit:'m dpl', def:100, step:10},
      {id:'wind_speed', label:'Kecepatan Angin', unit:'m/s', def:0.6, step:0.1},
      {id:'wind_angle', label:'Sudut Angin thd Konduktor', unit:'derajat', def:90, step:1},
      {id:'emissivity', label:'Emisivitas (ε)', unit:'pu', def:0.5, step:0.01},
      {id:'absorptivity', label:'Absorptivitas Matahari (α)', unit:'pu', def:0.5, step:0.01},
      {id:'solar_flux', label:'Fluks Radiasi Matahari (Qs)', unit:'W/m²', def:1000, step:10},
      {id:'solar_angle', label:'Sudut Datang Matahari Efektif', unit:'derajat', def:90, step:1},
      {id:'span_m', label:'Panjang Gawang (Span)', unit:'m', def:300, step:1},
      {id:'unit_weight_kgpm', label:'Berat Konduktor per Satuan Panjang', unit:'kg/m', def:0.85, step:0.01},
      {id:'area_mm2', label:'Luas Penampang Konduktor', unit:'mm²', def:240, step:1},
      {id:'e_modulus_gpa', label:'Modulus Elastisitas', unit:'GPa', def:70, step:1},
      {id:'alpha_expansion_1e6', label:'Koefisien Muai Panjang', unit:'×10⁻⁶/°C', def:19.3, step:0.1},
      {id:'t_install', label:'Suhu Saat Pemasangan (Stringing)', unit:'°C', def:25, step:1},
      {id:'t1_kn', label:'Tegangan Tarik Awal Saat Pemasangan', unit:'kN', def:20, step:0.1},
      {id:'attachment_height_m', label:'Tinggi Titik Gantung di Tower', unit:'m', def:18, step:0.1},
      {id:'ground_clearance_min_m', label:'Syarat Jarak Bebas Minimum ke Tanah', unit:'m', def:7.5, step:0.1},
    ],
    calc(v){
      // ===== KHA — IEEE 738 steady-state heat balance =====
      const D = v.diameter_mm/1000; // m
      const Tc = v.tc_max, Ta = v.ta;
      const Tfilm = (Tc+Ta)/2;
      const He = v.elevation_m;
      const rho_f = (1.293 - 1.525e-4*He + 6.379e-9*He*He) / (1 + 0.00367*Tfilm);
      const mu_f = (1.458e-6*Math.pow(Tfilm+273,1.5)) / (Tfilm+383.4);
      const kf = 2.424e-2 + 7.477e-5*Tfilm - 4.407e-9*Tfilm*Tfilm;
      const Re = D*v.wind_speed*rho_f/mu_f;
      const phi = v.wind_angle*Math.PI/180;
      const Kangle = 1.194 - Math.cos(phi) + 0.194*Math.cos(2*phi) + 0.368*Math.sin(2*phi);
      const qc1 = Kangle*(1.01+1.35*Math.pow(Re,0.52))*kf*(Tc-Ta);
      const qc2 = Kangle*0.754*Math.pow(Re,0.6)*kf*(Tc-Ta);
      const qcn = 3.645*Math.pow(rho_f,0.5)*Math.pow(D,0.75)*Math.pow(Math.max(Tc-Ta,0),1.25);
      const qc = Math.max(qc1,qc2,qcn);
      const qr = 17.8*D*v.emissivity*(Math.pow((Tc+273)/100,4) - Math.pow((Ta+273)/100,4));
      const theta = v.solar_angle*Math.PI/180;
      const qs = v.absorptivity*v.solar_flux*Math.sin(theta)*D;
      const Rlow = v.r_low_ohmkm/1000, Rhigh = v.r_high_ohmkm/1000;
      const Rtc = Rlow + (Rhigh-Rlow)/(v.t_high-v.t_low)*(Tc-v.t_low);
      const heatNet = qc + qr - qs;
      const ampacity = heatNet>0 ? Math.sqrt(heatNet/Rtc) : 0;

      // ===== SAGGING — state-change equation (parabolic ruling-span) =====
      const w = v.unit_weight_kgpm*9.81; // N/m
      const A = v.area_mm2*1e-6; // m²
      const E = v.e_modulus_gpa*1e9; // Pa
      const alpha = v.alpha_expansion_1e6*1e-6; // 1/°C
      const L = v.span_m;
      const T1 = v.t1_kn*1000; // N
      const temp1 = v.t_install, temp2 = Tc;
      const K = T1 - alpha*E*A*(temp2-temp1) - (E*A*w*w*L*L)/(24*T1*T1);
      const C = (E*A*w*w*L*L)/24;
      let T2 = T1;
      for(let i=0;i<25;i++){
        const f = Math.pow(T2,3) - K*Math.pow(T2,2) - C;
        const fp = 3*Math.pow(T2,2) - 2*K*T2;
        T2 = T2 - f/fp;
      }
      const D1p = w*L*L/(8*T1), D2p = w*L*L/(8*T2);
      const D1c = T1/w*(Math.cosh(w*L/(2*T1))-1);
      const D2c = T2/w*(Math.cosh(w*L/(2*T2))-1);
      const sagInc = D2p - D1p;
      const sagIncPct = (sagInc/D1p)*100;
      const lowMax = v.attachment_height_m - D2p;
      const clearanceOk = lowMax >= v.ground_clearance_min_m;

      return [
        {group:'Neraca Panas (IEEE 738)', items:[
          {label:'Suhu film (rata-rata konduktor & ambient)', formula:'(Tc+Ta)/2', value:Tfilm, unit:'°C'},
          {label:'Bilangan Reynolds', formula:'Re = D·Vw·ρf/μf', value:Re, unit:''},
          {label:'Panas konveksi (qc)', formula:'max(qc,forced 1, qc,forced 2, qc,natural)', value:qc, unit:'W/m'},
          {label:'Panas radiasi (qr)', formula:'17.8·D·ε·[((Tc+273)/100)⁴−((Ta+273)/100)⁴]', value:qr, unit:'W/m'},
          {label:'Panas matahari (qs)', formula:'α·Qs·sin θ·D', value:qs, unit:'W/m'},
          {label:'Resistansi AC pada Tc', formula:'interpolasi linear R(T_rendah)–R(T_tinggi)', value:Rtc*1000, unit:'Ω/km'},
        ]},
        {group:'Hasil KHA (Ampacity)', items:[
          {label:'Kapasitas Hantar Arus', formula:'I = √[(qc+qr−qs)/R(Tc)]', value:ampacity, unit:'A', note:`Pada suhu konduktor maksimum ${fmt(Tc,0)}°C, ambient ${fmt(Ta,0)}°C, angin ${fmt(v.wind_speed,1)} m/s.`}
        ]},
        {group:'Andongan — Kondisi Pemasangan (Stringing)', items:[
          {label:'Sag parabolik', formula:'w·L²/(8·T1)', value:D1p, unit:'m'},
          {label:'Sag katenari (pembanding)', formula:'T1/w·[cosh(wL/2T1)−1]', value:D1c, unit:'m'},
        ]},
        {group:`Andongan — Suhu Operasi Maksimum (${fmt(Tc,0)}°C akibat KHA penuh)`, items:[
          {label:'Tegangan tarik pada suhu operasi (state-change)', formula:'Newton-Raphson: T2³ − K·T2² − C = 0', value:T2/1000, unit:'kN'},
          {label:'Sag parabolik', formula:'w·L²/(8·T2)', value:D2p, unit:'m'},
          {label:'Sag katenari (pembanding)', formula:'T2/w·[cosh(wL/2T2)−1]', value:D2c, unit:'m'},
          {label:'Kenaikan sag vs kondisi pemasangan', formula:'D2 − D1', value:sagInc, unit:'m', note:`Setara kenaikan ${fmt(sagIncPct,1)}% terhadap sag saat pemasangan — pastikan andongan pada suhu operasi maksimum masih memenuhi jarak aman (ground clearance) sesuai SPLN/PUIL.`},
          {label:'Titik terendah konduktor ke tanah', formula:'tinggi gantung − sag maks', value:lowMax, unit:'m'},
          {label:'', formula:'', value:null, unit:'', flag: clearanceOk?'ok':'warn', note: clearanceOk ? 'Jarak bebas ke tanah pada kondisi sag maksimum masih memenuhi syarat minimum.' : `Jarak bebas ke tanah pada kondisi sag maksimum (${fmt(lowMax,2)} m) TIDAK memenuhi syarat minimum (${fmt(v.ground_clearance_min_m,2)} m) — perlu evaluasi ulang tension awal, tinggi tower, atau bentang.`}
        ]},
        {group:'Catatan Metodologi', items:[
          {label:'', formula:'', value:null, unit:'', flag:'warn', note:'Fluks radiasi matahari (Qs) dan sudut datang di sini diisi langsung oleh pengguna sebagai penyederhanaan dari tabel posisi matahari lengkap IEEE 738 Annex B/C (yang bergantung tanggal, jam, lintang). Perhitungan sag memakai pendekatan parabolik/ruling-span — untuk desain akhir (terutama span panjang atau ruling span kompleks), verifikasi dengan software sag-tension penuh (mis. PLS-CADD, SAG10) dan data tarik-mulur (creep) konduktor dari pabrikan.'}
        ]}
      ];
    }
  }
};

export const ORDER = ['generator','trafo','busbar','feeder','kabel','motor','koordinasi','kha','konduktor','gardu'];
