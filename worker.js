// SINYAL — Zonautara.com | Endpoint AI untuk rekomendasi investigasi.
// Jangan membuat titik koordinat atau mengklaim perhitungan Sentinel telah dijalankan.
const REPORTS = [
  {id:"PIS-2026-BD9D93",place:"Pinonobatuan, Dumoga",title:"Sawah mengering",date:"2026-08-13",description:"Laporan warga mengenai sawah mengering pada musim kemarau 2026.",lat:0.5803222,lon:124.1052808},
  {id:"PIS-2026-CC38D3",place:"Werdhi Agung Timur, Dumoga",title:"Petani melaporkan gagal panen",date:"2026-08-13",description:"Pelapor menyebut kerugian sekitar Rp15 juta; angka dan penyebab belum dikonfirmasi independen.",lat:0.5470584,lon:124.039329},
  {id:"PIS-2026-884EFB",place:"Werdhi Agung Timur, Dumoga",title:"Hasil panen berkurang",date:"2026-08-13",description:"Laporan mengenai hasil panen berkurang dibandingkan biaya produksi.",lat:0.5468291,lon:124.0397924}
];
const SYSTEM = `Anda adalah SINYAL, copilot investigasi untuk redaksi kecil Zonautara.com. Jawab PERTANYAAN reporter secara spesifik dan susun rekomendasi editorial yang bisa langsung ditindaklanjuti.

SUMBER DAN BATAS:
- Satu-satunya bukti kasus adalah laporan yang diberikan di prompt. Pilih hanya ID laporan itu; jangan membuat koordinat, titik/petak sawah baru, data NDVI, hasil Sentinel-2, lokasi pintu air, hubungan hulu-hilir, dugaan pelanggaran, atau sebab gagal panen.
- Tiga titik adalah KOORDINAT LAPORAN, belum batas petak. Dua titik Werdhi Agung Timur sangat berdekatan; jangan menyatakannya sebagai dua petak pembanding independen.
- Laporan berstatus terverifikasi tidak otomatis membuktikan klaim kausal di dalamnya.
- Sentinel-2 / Google Earth Engine BELUM dijalankan. Tuliskan RENCANA analisis, bukan hasilnya.

KELUARAN WAJIB: satu objek JSON murni, tanpa markdown, dengan:
"headline": satu kalimat keputusan/editorial tentang apa yang perlu diperiksa dulu,
"reason": 2-3 kalimat yang menyebut laporan mana memberi indikasi apa dan apa yang belum terkonfirmasi,
"satellite": 3-4 kalimat perintah kerja teknis spesifik: gunakan Sentinel-2 SR Harmonized di Google Earth Engine; ambil citra beberapa tanggal Juli-September 2026 dan periode musim sebanding; masking awan/bayangan; hitung atau bandingkan NDVI serta NDWI yang relevan; identifikasi apakah sinyal persisten atau terkait kalender tanam; hasil hanyalah petunjuk untuk pemilihan petak lapangan. Jangan mengklaim sudah dieksekusi,
"caution": risiko interpretasi NDVI rendah (panen/bera/awan/penyakit/jenis tanaman), kesulitan memverifikasi air irigasi dari citra, apa yang harus dibandingkan dan siapa berhak menjawab,
"priorities": maksimal 3 objek dengan "id" (ID laporan sah), "why" (alasan PERBEDAAN nilai jurnalistik dibanding titik lain, bukan mengulang judul laporan), dan "check" (aksi terukur di lokasi dan narasumber/dokumen spesifik),
"tasks": 4-5 perintah reporter, mulai dari mengontak petani, mencatat tahap tanam/tanggal panen, meminta jadwal air pintu irigasi dan peta jaringan, sampai hak jawab pengelola. Jangan menulis pertanyaan umum atau topik saja.
Bahasa Indonesia, ringkas, jelas, tidak mengada-ada, tidak memberi vonis. Prioritaskan titik dengan kebutuhan verifikasi tinggi, bukan menganggap tingkat kerusakan sudah diketahui.`;
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const limit=(x,n=450)=>typeof x==="string"?x.trim().slice(0,n):"";
function decode(raw){let s=typeof raw==="string"?raw:JSON.stringify(raw);s=s.replace(/^\s*```(?:json)?\s*/i,"").replace(/\s*```\s*$/i,"");try{return JSON.parse(s)}catch{const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a<0||b<a)throw Error("Model tidak menghasilkan JSON");return JSON.parse(s.slice(a,b+1))}}
const SATELLITE_PLAN = "Rencana, belum dijalankan: di Google Earth Engine gunakan Sentinel-2 SR Harmonized untuk koordinat laporan dengan beberapa citra Juli–September 2026 dan musim sebanding sebelumnya. Saring awan dan bayangan lalu bandingkan NDVI serta indeks kelembapan yang sesuai (misalnya NDWI), lengkap dengan tanggal citra dan tutupan awan. Tandai perubahan yang bertahan pada beberapa tanggal sebagai kandidat lokasi verifikasi; jangan menganggap NDVI rendah sebagai bukti kekeringan atau gagal panen sebelum memeriksa kalender tanam, panen, dan kondisi irigasi.";
const FIELD_TASKS = [
  "Hubungi pelapor dan petani di tiap titik untuk mencatat tanggal foto, tahap tanam, jadwal tanam/panen, ketersediaan air, dan luas petak yang dapat ditunjukkan.",
  "Kunjungi titik laporan dan petakan batas petak sebenarnya; dokumentasikan sumber air, kondisi saluran, foto berarah, dan koordinat baru hasil pengukuran lapangan.",
  "Minta peta jaringan irigasi, jadwal bukaan pintu, serta catatan distribusi air dari pengelola atau instansi terkait; cocokkan dengan kesaksian petani.",
  "Bandingkan temuan dengan beberapa citra Sentinel-2 yang bersih dari awan dan petak pembanding pada tahap tanam yang setara.",
  "Mintakan konfirmasi dan hak jawab pengelola irigasi sebelum menyimpulkan adanya ketimpangan pasokan air."
];
function validate(a,allowed){
  const valid=new Set(allowed.map(r=>r.id)),seen=new Set(),p=[];
  for(const item of Array.isArray(a.priorities)?a.priorities:[]){
    if(item&&valid.has(item.id)&&!seen.has(item.id)){seen.add(item.id);p.push({id:item.id,why:limit(item.why,340),check:limit(item.check,260)})}
  }
  if(!p.length){ const first=allowed[0];p.push({id:first.id,why:"Titik awal dari laporan terpilih; prioritas masih harus dikonfirmasi editor.",check:"Verifikasi kondisi sawah dan sumber air langsung bersama petani."}); }
  return {headline:limit(a.headline,230)||"Prioritas pemeriksaan lapangan",reason:limit(a.reason,650),satellite:(limit(a.satellite,750).length>=140&&/Sentinel|citra|satelit/i.test(a.satellite)?limit(a.satellite,750):SATELLITE_PLAN.slice(0,750)),caution:limit(a.caution,800),priorities:p.slice(0,3),tasks:((Array.isArray(a.tasks)?a.tasks:[]).map(t=>limit(t,340)).filter(t=>t.length>=45).length>=3)?a.tasks.slice(0,5).map(t=>limit(t,340)):FIELD_TASKS)}
}
export default {async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==="/api/status")return json({ai:!!env.AI,model:"@cf/meta/llama-3.1-8b-instruct-fast"});
  if(path==="/api/analyze"){
    if(request.method!=="POST")return json({ok:false,error:"Metode harus POST"},405);
    if(!env.AI)return json({ok:false,error:"Binding AI tidak tersedia"},503);
    if(Number(request.headers.get("content-length")||0)>12000)return json({ok:false,error:"Permintaan terlalu besar"},413);
    try{
      const body=await request.json();
      const question=limit(body.question,850);
      const selected=Array.isArray(body.selectedIds)?body.selectedIds:[];
      const allowed=REPORTS.filter(r=>selected.includes(r.id));
      if(!question||!allowed.length)return json({ok:false,error:"Pertanyaan dan laporan wajib dipilih"},400);
      const prompt="PERTANYAAN REPORTER: "+question+"\nLAPORAN YANG DAPAT DIPILIH: "+JSON.stringify(allowed)+"\nKONTEKS: Zonautara memiliki analisis regional vegetasi Bolmong Juli–September 2026, tetapi tidak tersedia hasil indeks untuk tiga koordinat laporan ini. Ketersediaan air, kalender tanam, hubungan hulu-hilir dan catatan pintu air belum diperiksa. Buat rekomendasi berdasarkan laporan yang tersedia dan rencana Sentinel-2, tanpa mengaku telah menghitung indeks.";
      const result=await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast",{messages:[{role:"system",content:SYSTEM},{role:"user",content:prompt}],max_tokens:1700,temperature:0.2});
      return json({ok:true,analysis:validate(decode(result?.response??result),allowed)});
    }catch(e){const message=String(e?.message||e||"Kesalahan tidak diketahui").slice(0,280);console.error("SINYAL AI error:",message);return json({ok:false,error:"Analisis AI gagal: "+message},502)}
  }
  return env.ASSETS.fetch(request);
}};
