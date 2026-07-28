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

  kha:{
    label:'KHA Kabel & Sheath', dev:'IEC 60287 / CIGRE 880', dot:7, embedUrl:'/alat/kha-kabel.html'
  }
};

export const ORDER = ['generator','trafo','busbar','feeder','kabel','motor','koordinasi','kha'];
