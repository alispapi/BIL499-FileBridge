import ftplib
import ssl
import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from werkzeug.utils import secure_filename
from io import BytesIO

# .env dosyasındaki değişkenleri yükle
load_dotenv() 

app = Flask(__name__)

# --- FTPS Bilgileri .env dosyasından okunuyor ---
FTPS_HOST = os.getenv("FTPS_HOST")
FTPS_USER = os.getenv("FTPS_USER")
FTPS_PASS = os.getenv("FTPS_PASS")

if not FTPS_HOST or not FTPS_USER or not FTPS_PASS:
    print("="*50)
    print("!!! KRİTİK HATA: FTPS sunucu bilgileri yüklenemedi. !!!")
    print("Lütfen .env dosyasını kontrol edin.")
    print("="*50)

# -----------------------------------------------
# --- YARDIMCI FONKSİYONLAR ---
# -----------------------------------------------

def get_file_type_from_name(filename):
    """
    Dosya adına göre (scriptpool.js'deki mantığın aynısı) 
    dosya tipini döndürür.
    """
    # Dosya uzantısını al (örn: "rapor.pdf" -> "pdf")
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    
    types = {
        'document': ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'],
        'image': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
        'video': ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'],
        'audio': ['mp3', 'wav', 'ogg', 'flac'],
        'archive': ['zip', 'rar', '7z', 'tar', 'gz']
    }
    
    for file_type, extensions in types.items():
        if ext in extensions:
            return file_type
    return 'other' # Eşleşmezse 'diğer'

def parse_dir_lines(lines):
    """
    MLSD komutu (modern) çalışmazsa, eski .dir() komutunun
    çıktısını ayrıştırmak (parse) için acil durum fonksiyonu.
    """
    parsed = []
    for line in lines:
        try:
            parts = line.split(None, 8)
            # Sadece dosyaları al (d ile başlayan klasörleri atla)
            if line.startswith('-') and len(parts) >= 9:
                filename = parts[8]
                parsed.append({
                    "name": filename,
                    "size": int(parts[4]),
                    "type": get_file_type_from_name(filename),
                    # .dir() formatından tarihi parse etmek çok zordur,
                    # bu yüzden 'None' yolluyoruz.
                    "date": None 
                })
        except Exception:
            continue # Hatalı veya anlaşılamayan satırı atla
    return parsed

# -----------------------------------------------
# --- API ENDPOINT'LERİ ---
# -----------------------------------------------

@app.route("/")
def ana_sayfa():
    if not FTPS_HOST:
         return "API Çalışıyor ancak .env dosyası yüklenemedi!", 500
    return "API Çalışıyor! FTPS köprüsüne hoş geldiniz."
    

# API DOSYALARI LİSTELE (GÜNCELLENDİ)
@app.route("/api/dosyalari-listele", methods=["GET"])
def listele_endpoint():
    print("'/api/dosyalari-listele' isteği alındı...")
    
    parsed_files = []
    try:
        ftps = ftplib.FTP_TLS()
        ftps.connect(FTPS_HOST, 21)
        ftps.auth()
        ftps.login(FTPS_USER, FTPS_PASS)
        ftps.prot_p()

        # Modern yöntem: MLSD (Machine Listing)
        # Bize yapılandırılmış veri (dosya adı, boyutu, tipi, tarihi) verir.
        try:
            # ftps.mlsd() bir generator döndürür
            for (name, facts) in ftps.mlsd():
                # 'facts' bir sözlüktür: {'type': 'file', 'size': '1234', 'modify': '20251025120000'}
                
                # Sadece dosyaları istiyoruz (klasörleri değil)
                if facts.get('type') == 'file':
                    parsed_files.append({
                        "name": name,
                        "size": int(facts.get("size", 0)),
                        "type": get_file_type_from_name(name),
                        # Tarih formatı: YYYYMMDDHHMMSS
                        "date": facts.get("modify") 
                    })
        
        except ftplib.error_perm as e:
            # Sunucu MLSD'yi desteklemiyorsa (500 Unknown command hatası verirse)
            # eski .dir() yöntemine geri dön.
            if "500" in str(e): 
                print("Uyarı: Sunucu MLSD'yi desteklemiyor. Eski .dir() yöntemine geçiliyor.")
                raw_lines = []
                ftps.dir(raw_lines.append)
                parsed_files = parse_dir_lines(raw_lines) # Acil durum parser'ını kullan
            else:
                raise e # Başka bir izin hatasıysa, hatayı yükselt

        ftps.quit()
        
        print(f"Başarılı: {len(parsed_files)} adet dosya bulundu.")
        return jsonify({"durum": "basarili", "dosyalar": parsed_files}), 200
    
    except ftplib.all_errors as e :
        print(f"FTPS Hatası: {e}")
        return jsonify({"durum": "hata", "mesaj": f"FTPS Sunucu Hatası: {e}"}), 500
    except Exception as e:
        print(f"Genel API Hatası: {e}")
        return jsonify({"durum": "hata", "mesaj": f"API Sunucusunda beklenmedik bir hata oluştu: {e}"}), 500


# API DOSYA YUKLEME (Düzeltilmiş rota /api/upload)
@app.route("/api/upload", methods=["POST"])
def upload_file():
    # ... (Bu fonksiyon bir önceki adımdakiyle aynı, değişiklik yok)
    print("'/api/upload' isteği alındı, dosya kontrol ediliyor...")
    if 'file' not in request.files:
        return jsonify({"durum": "hata", "mesaj": "Dosya bulunamadı."}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"durum": "hata", "mesaj": "Dosya seçilmedi."}), 400
    filename = secure_filename(file.filename)
    try:
        ftps = ftplib.FTP_TLS()
        ftps.connect(FTPS_HOST, 21)
        ftps.auth()
        ftps.login(FTPS_USER, FTPS_PASS)
        ftps.prot_p()
        ftps.storbinary(f'STOR {filename}', file)
        ftps.quit()
        return jsonify({"durum": "basarili", "mesaj": f"'{filename}' dosyası başarıyla yüklendi."}), 201
    except Exception as e:
        return jsonify({"durum": "hata", "mesaj": f"API Sunucu Hatası: {e}"}), 500
    

# API DOSYA İNDİRME (Değişiklik yok)
@app.route("/api/download", methods=["GET"])
def download_file():
    # ... (Bu fonksiyon bir önceki adımdakiyle aynı, değişiklik yok)
    filename = request.args.get('filename')
    if not filename:
        return jsonify({"durum": "hata", "mesaj": "'filename' parametresi eksik."}), 400
    filename = secure_filename(filename)
    if filename == "":
        return jsonify({"durum": "hata", "mesaj": "Geçersiz dosya adı."}), 400
    try:
        memory_file = BytesIO()
        ftps = ftplib.FTP_TLS()
        ftps.connect(FTPS_HOST, 21)
        ftps.auth()
        ftps.login(FTPS_USER, FTPS_PASS)
        ftps.prot_p()
        ftps.retrbinary(f'RETR {filename}', memory_file.write)
        ftps.quit()
        memory_file.seek(0)
        return send_file(memory_file,as_attachment=True,download_name=filename)
    except ftplib.error_perm as e:
        return jsonify({"durum": "hata", "mesaj": f"Dosya bulunamadı veya izin hatası: {e}"}), 404
    except Exception as e:
        return jsonify({"durum": "hata", "mesaj": f"API Sunucusunda beklenmedik bir hata oluştu: {e}"}), 500


# API DOSYA SİLME (YENİ FONKSİYON)
@app.route("/api/delete", methods=["POST"])
def delete_file():
    # İstekten JSON verisini al (örn: {"filename": "rapor.pdf"})
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({"durum": "hata", "mesaj": "'filename' parametresi eksik."}), 400
    
    filename = secure_filename(data['filename']) # Güvenlik!
    if not filename:
        return jsonify({"durum": "hata", "mesaj": "Geçersiz dosya adı."}), 400
        
    print(f"'/api/delete' isteği alındı. Silinecek dosya: {filename}")
    
    try:
        ftps = ftplib.FTP_TLS()
        ftps.connect(FTPS_HOST, 21)
        ftps.auth()
        ftps.login(FTPS_USER, FTPS_PASS)
        ftps.prot_p()
        
        # FTPS silme komutu: DELE
        ftps.delete(filename)
        
        ftps.quit()
        
        print(f"'{filename}' başarıyla silindi.")
        return jsonify({"durum": "basarili", "mesaj": f"'{filename}' başarıyla silindi."}), 200
    
    except ftplib.error_perm as e:
        # 550 No such file or directory
        print(f"FTPS Silme Hatası: {e}")
        return jsonify({"durum": "hata", "mesaj": f"Dosya bulunamadı veya silme izni yok: {e}"}), 404
    except Exception as e:
        print(f"Genel API Hatası: {e}")
        return jsonify({"durum": "hata", "mesaj": f"API Sunucusunda beklenmedik bir hata oluştu: {e}"}), 500


# Sunucuyu başlat
if __name__ == '__main__':
    app.run(debug=True, port=5000)