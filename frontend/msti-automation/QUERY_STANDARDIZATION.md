# Query Standardization & Validation Guide
## MSTI Automation - Grafana Clone

### Overview
Dokumen ini menjelaskan standarisasi query dan sistem validasi yang telah diimplementasikan dalam MSTI Automation untuk memastikan konsistensi dengan standar Grafana dan kualitas visualisasi yang optimal.

## 🎯 **Fitur Utama**

### 1. **Query Validation System**
- **Validasi Real-time**: Query divalidasi sebelum panel disimpan
- **Preview Data**: Menampilkan hasil query untuk memastikan output sesuai
- **Error Handling**: Pesan error yang jelas dan actionable
- **Konsistensi**: Validasi tersedia di semua form (NewDashboard, PanelForm)

### 2. **Query Template Generator**
- **Template Siap Pakai**: Koleksi query template untuk berbagai use case
- **Kategori Tersusun**: Network, System, Basic, Custom
- **Variable Support**: Template dengan placeholder variabel
- **Panel Type Specific**: Template disesuaikan dengan tipe visualisasi

### 3. **Standardisasi Sesuai Grafana**
- **Flux Query Support**: Menggunakan InfluxDB Flux sebagai query language
- **Panel Types**: Timeseries, Gauge, Table, Interface Status
- **Data Source Integration**: Konsisten dengan standar Grafana
- **Visualization Patterns**: Mengikuti best practices Grafana

---

## 🔧 **Komponen Teknis**

### QueryValidator Component
```typescript
interface QueryValidatorProps {
  dataSourceId: string;
  query: string;
  onValidationResult?: (result: QueryValidationResult) => void;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
  panelType?: string;
}
```

**Fitur:**
- ✅ Validasi sintaks Flux query
- ✅ Koneksi ke data source
- ✅ Preview data berdasarkan tipe panel
- ✅ Error handling yang informatif

### QueryTemplateGenerator Component
```typescript
interface QueryTemplateGeneratorProps {
  panelType: string;
  onTemplateSelect: (template: string) => void;
  className?: string;
}
```

**Fitur:**
- ✅ Template tersusun berdasarkan kategori
- ✅ Filter template berdasarkan panel type
- ✅ Variable substitution guide
- ✅ One-click template application

---

## 📊 **Query Templates**

### 1. **TimeSeries Templates**

#### CPU Usage
```flux
from(bucket: "${bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "cpu")
  |> filter(fn: (r) => r["_field"] == "usage_idle")
  |> map(fn: (r) => ({ r with _value: 100.0 - r._value }))
  |> aggregateWindow(every: 10s, fn: mean)
  |> yield(name: "cpu_usage")
```

#### Network Traffic
```flux
from(bucket: "${bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "net")
  |> filter(fn: (r) => r["_field"] == "bytes_recv" or r["_field"] == "bytes_sent")
  |> derivative(unit: 1s, nonNegative: true)
  |> aggregateWindow(every: 10s, fn: mean)
  |> yield(name: "network_traffic")
```

### 2. **Interface Status Templates**

#### Interface Status Monitoring
```flux
from(bucket: "${bucket}")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "sys/intf")
  |> filter(fn: (r) => r["dn"] == "${interface_dn}")
  |> filter(fn: (r) => r["_field"] == "operSt")
  |> filter(fn: (r) => r["source"] == "${source}")
  |> last()
  |> yield(name: "interface_status")
```

### 3. **Gauge Templates**

#### Current CPU Usage
```flux
from(bucket: "${bucket}")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "cpu")
  |> filter(fn: (r) => r["_field"] == "usage_idle")
  |> map(fn: (r) => ({ r with _value: 100.0 - r._value }))
  |> last()
  |> yield(name: "current_cpu")
```

### 4. **Table Templates**

#### Interface Statistics
```flux
from(bucket: "${bucket}")
  |> range(start: -5m)
  |> filter(fn: (r) => r["_measurement"] == "interface")
  |> filter(fn: (r) => r["_field"] == "bytes_recv" or r["_field"] == "bytes_sent")
  |> last()
  |> pivot(rowKey: ["interface"], columnKey: ["_field"], valueColumn: "_value")
  |> yield(name: "interface_stats")
```

---

## 🎯 **Template Variables**

### Variabel Standar:
- **`${bucket}`**: Nama bucket InfluxDB (contoh: telegraf)
- **`${interface_dn}`**: Distinguished name interface (contoh: sys/intf/phys-[eth1/7]/phys)
- **`${interface_name}`**: Nama interface (contoh: eth0)
- **`${source}`**: Nama source device (contoh: LEAF-1)
- **`${sensor_name}`**: Nama sensor (contoh: cpu_temp)

### Penggunaan:
1. Pilih template yang sesuai
2. Replace variabel dengan nilai aktual
3. Validasi query sebelum save
4. Preview data untuk memastikan hasil

---

## 🚀 **Cara Penggunaan**

### 1. **Create Panel Baru**
1. Buka **Dashboard** → **Add Panel**
2. Pilih **tipe visualisasi** yang sesuai
3. Pilih **data source**
4. Klik **"Gunakan Template"** untuk memilih template siap pakai
5. Sesuaikan variabel dalam query
6. Klik **"Validasi Query"** untuk test query
7. Lihat **preview data** untuk memastikan hasil
8. **Save panel** jika validasi berhasil

### 2. **Edit Panel Existing**
1. Buka panel yang ingin diedit
2. Klik **Edit**
3. Modifikasi query atau gunakan template baru
4. **Validasi ulang** query setelah perubahan
5. **Update panel** setelah validasi berhasil

### 3. **Troubleshooting Query**
- **Query Error**: Periksa sintaks Flux dan koneksi data source
- **No Data**: Pastikan filter dan time range sudah benar
- **Wrong Format**: Sesuaikan query dengan tipe panel yang dipilih

---

## ✅ **Best Practices**

### 1. **Query Optimization**
- Gunakan **time range** yang sesuai kebutuhan
- Tambahkan **filter** untuk mempercepat query
- Gunakan **aggregateWindow** untuk data yang padat
- Selalu tambahkan **yield()** di akhir query

### 2. **Naming Convention**
- Gunakan nama yang deskriptif untuk **yield(name: "...")**
- Konsisten dengan **measurement** dan **field** names
- Ikuti konvensi **snake_case** untuk identifiers

### 3. **Performance**
- Hindari **range** yang terlalu lebar tanpa aggregation
- Gunakan **last()** untuk data real-time
- Implementasikan **appropriate aggregation** functions

### 4. **Error Handling**
- Selalu **validasi query** sebelum save
- Gunakan **preview** untuk test output format
- Handle **missing data** dengan graceful fallbacks

---

## 🔄 **Integration dengan Grafana Standards**

### 1. **Query Language**
- **Flux**: Primary query language (InfluxDB 2.x standard)
- **Kompatibilitas**: Sesuai dengan Grafana InfluxDB datasource
- **Functions**: Menggunakan Flux functions yang standar

### 2. **Panel Types**
- **Time Series**: Line charts untuk time-based data
- **Gauge**: Single value displays dengan thresholds
- **Table**: Tabular data dengan sorting/filtering
- **Interface Status**: Custom visualization untuk network monitoring

### 3. **Data Format**
- **Time-based**: Timestamp + values format
- **Labels**: Consistent tag/field labeling
- **Units**: Proper unit specifications
- **Thresholds**: Configurable alert thresholds

---

## 📈 **Monitoring & Validation**

### 1. **Query Performance**
- Monitor **query execution time**
- Track **data volume** yang diprocess
- Optimize **slow queries**

### 2. **Data Quality**
- **Validation rules** untuk data integrity
- **Error tracking** untuk failed queries
- **Data freshness** monitoring

### 3. **User Experience**
- **Real-time feedback** pada query validation
- **Helpful error messages**
- **Progressive enhancement** dengan templates

---

Standarisasi ini memastikan bahwa MSTI Automation Platform memiliki kualitas dan konsistensi yang setara dengan Grafana, sambil tetap mempertahankan simplicity dan customizability yang menjadi keunggulan platform ini. 