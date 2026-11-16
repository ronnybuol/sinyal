// SINYAL — Zonautara.com | Endpoint AI untuk rekomendasi investigasi.
// Jangan membuat titik koordinat atau mengklaim perhitungan Sentinel telah dijalankan.
const REPORTS = [
  {id:"PIS-2026-BD9D93",place:"Pinonobatuan, Dumoga",title:"Sawah mengering",date:"2026-08-13",description:"Laporan warga mengenai sawah mengering pada musim kemarau 2026.",lat:0.5803222,lon:124.1052808},
  {id:"PIS-2026-CC38D3",place:"Werdhi Agung Timur, Dumoga",title:"Petani melaporkan gagal panen",date:"2026-08-13",description:"Pelapor menyebut kerugian sekitar Rp15 juta; angka dan penyebab belum dikonfirmasi independen.",lat:0.5470584,lon:124.039329},
  {id:"PIS-2026-884EFB",place:"Werdhi Agung Timur, Dumoga",title:"Hasil panen berkurang",date:"2026-08-13",description:"Laporan mengenai hasil panen berkurang dibandingkan biaya produksi.",lat:0.5468291,lon:124.0397924}
];
const SYSTEM = `Anda adalah SINYAL, asisten investigasi lingkungan bagi reporter dan editor Zonautara.com. Gunakan HANYA laporan warga yang diberikan, pilih titik berdasarkan ID. Jangan pernah menciptakan titik, koordinat, posisi pintu air, status hulu-hilir, nilai NDVI, hasil Google Earth Engine, atau hubungan sebab-akibat. Status "terverifikasi" berarti laporan diterima dan diperiksa redaksi, bukan bukti klaim sebabnya. Tugas Anda: memprioritaskan laporan untuk kunjungan lapangan, menyarankan pemeriksaan Sentinel-2 multi-tanggal sebagai RENCANA (belum dieksekusi), serta mengidentifikasi kalender tanam, masa bera, panen, awan dan bayangan, sumber air, jaringan irigasi, dan catatan buka-tutup pintu air sebagai variabel yang perlu diverifikasi. Tulis singkat, dalam bahasa Indonesia dan fokus pada penugasan reporter. Keluarkan HANYA JSON objek dengan properti: headline (string), reason (string), satellite (string), caution (string), priorities (array objek {id,why,check}, maksimum 3), tasks (array string, 3 sampai 5). Jangan gunakan Markdown atau code fence.`;
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const limit=(x,n=450)=>typeof x==="string"?x.trim().slice(0,n):"";
function decode(raw){let s=typeof raw==="string"?raw:JSON.stringify(raw);s=s.replace(/^\s*```(?:json)?\s*/i,"").replace(/\s*```\s*$/i,"");try{return JSON.parse(s)}catch{const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a<0||b<a)throw Error("Model tidak menghasilkan JSON");return JSON.parse(s.slice(a,b+1))}}
function validate(a,allowed){
  const valid=new Set(allowed.map(r=>r.id)),seen=new Set(),p=[];
  for(const item of Array.isArray(a.priorities)?a.priorities:[]){
    if(item&&valid.has(item.id)&&!seen.has(item.id)){seen.add(item.id);p.push({id:item.id,why:limit(item.why,340),check:limit(item.check,260)})}
  }
  if(!p.length)throw Error("Tidak ada titik sah di keluaran AI");
  return {headline:limit(a.headline,230)||"Prioritas pemeriksaan lapangan",reason:limit(a.reason,650),satellite:limit(a.satellite,750),caution:limit(a.caution,800),priorities:p.slice(0,3),tasks:(Array.isArray(a.tasks)?a.tasks:[]).slice(0,6).map(t=>limit(t,340)).filter(Boolean)}
}
export default {async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==="/api/status")return json({ai:!!env.AI,model:"@cf/meta/llama-3.1-8b-instruct"});
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
      const result=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:SYSTEM},{role:"user",content:prompt}],max_tokens:1000,temperature:0.2});
      return json({ok:true,analysis:validate(decode(result?.response??result),allowed)});
    }catch(e){return json({ok:false,error:"Model gagal menghasilkan jawaban yang dapat diverifikasi; ulangi pertanyaan."},502)}
  }
  return env.ASSETS.fetch(request);
}};
