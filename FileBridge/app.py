
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil

app = FastAPI()

# =====================
#  Temel ayarlar
# =====================
UPLOAD_DIR = "uploads"

# uploads klasörünü oluştur (yoksa)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# =====================
#  CORS ayarları
# =====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme aşamasında * kullan, canlıya geçince domainini yaz
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
#  Test endpoint
# =====================
@app.get("/")
def index():
    return {"message": "API aktif ✅ - Dosya yükleme servisi hazır."}

# =====================
#  Dosya yükleme endpoint
# =====================
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Kullanıcıdan gelen dosyayı sunucuda uploads klasörüne kaydeder.
    """

    # hedef dosya yolu
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    try:
        # Geçici yükleme -> uploads klasörüne taşı
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {"success": True, "message": f"✅ {file.filename} kaydedildi.", "path": file_path}

    except Exception as e:
        print("⚠️ Yükleme hatası:", e)
        return {"success": False, "error": str(e)}