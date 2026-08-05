# Verifikasi Implementasi Grading SEL-749M

## Acuan

- *SEL-749M Motor Protection Relay Instruction Manual*, Date Code 20080918.
- Section 4: Basic Motor Protection.
- Appendix F: Motor Thermal Element, Equation F.10–F.17.

## Persamaan yang diterapkan

### Rating Method — starting

Untuk `2,5 ≤ I ≤ 12`, dengan `I` dalam per-unit FLA:

```text
t = TD × LRTHOT × LRA² / I²
```

### Curve Method — starting

Cold rotor:

```text
t = 90 × CURVE / I²
```

Hot rotor:

```text
t = 75 × CURVE / I²
```

### Running element

Untuk `SF < I < 2,5`:

```text
t = 60 × RTC × ln[(I² − I0²)/(I² − SF²)]
```

Dengan:

- `I0 = 0,9 × SF` untuk hot stator;
- `I0 = 0` untuk cold stator/testing;
- RTC dapat diinput manual pada Rating Method atau dihitung otomatis sesuai Equation F.13/F.17.

## Uji numerik yang telah dilakukan

1. **Rating Method Example 4.3**
   - LRA = 6 × FLA, LRTHOT = 15 s, TD = 1.
   - Hasil pada `I = 6 × FLA`: 15 s.
   - RTC Auto hasil implementasi: 38,04 menit; manual menunjukkan sekitar 39 menit.

2. **Curve Method Table 4.5**
   - Curve 10, cold rotor, `I = 6 × FLA`.
   - Hasil: 25 s.

3. **Curve Method hot rotor**
   - Curve 10, `I = 6 × FLA`.
   - Hasil: 20,833 s.

4. **Curve 1 pada 2,5 × FLA**
   - Hasil: 14,4 s, sesuai Table 4.5.

5. **Curve Method Example 4.5**
   - Curve 14, SF = 1,15.
   - RTC Auto hasil implementasi: 80,79 menit; manual menunjukkan 81 menit.

## Pemeriksaan perangkat lunak

- Seluruh 26 file JavaScript/JSX telah diperiksa sintaksnya menggunakan TypeScript transpiler.
- Fungsi persamaan SEL-749M telah diuji secara numerik dengan Node.js.
- `npm install`/`next build` belum berhasil dijalankan di lingkungan pemeriksaan karena registry paket tidak menyediakan dependency `@supabase/supabase-js` dan akses registry publik mengalami timeout. Build produksi perlu dijalankan kembali pada komputer pengembang dengan akses npm normal.
