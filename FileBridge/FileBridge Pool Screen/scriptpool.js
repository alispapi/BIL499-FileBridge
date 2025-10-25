// LocalStorage'dan dosyaları al
let uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];

// DOM Elementleri
const filesContainer = document.getElementById('filesContainer');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const btnClearAll = document.getElementById('btnClearAll');
const totalFilesEl = document.getElementById('totalFiles');
const totalSizeEl = document.getElementById('totalSize');
const latestDateEl = document.getElementById('latestDate');

// Sayfa yüklendiğinde dosyaları göster
document.addEventListener('DOMContentLoaded', () => {
    // Örnek dosyalar ekle (ilk kullanımda)
    if (uploadedFiles.length === 0) {
        addSampleFiles();
    }
    
    updateStats();
    displayFiles(uploadedFiles);
});

// Örnek dosyalar ekle
function addSampleFiles() {
    const sampleFiles = [
        {
            id: Date.now() + 1,
            name: 'Proje_Raporu.pdf',
            size: 2458624,
            type: 'document',
            date: new Date().toISOString()
        },
        {
            id: Date.now() + 2,
            name: 'Sunum_2024.pptx',
            size: 5242880,
            type: 'document',
            date: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: Date.now() + 3,
            name: 'demo_video.mp4',
            size: 15728640,
            type: 'video',
            date: new Date(Date.now() - 172800000).toISOString()
        },
        {
            id: Date.now() + 4,
            name: 'logo_tasarim.png',
            size: 524288,
            type: 'image',
            date: new Date(Date.now() - 259200000).toISOString()
        }
    ];
    
    uploadedFiles = sampleFiles;
    localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
}

// Dosya tipine göre ikon
function getFileIcon(type) {
    const icons = {
        document: '📄',
        image: '🖼️',
        video: '🎥',
        audio: '🎵',
        archive: '📦',
        other: '📁'
    };
    return icons[type] || icons.other;
}

// Dosya tipi belirleme
function getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    
    const types = {
        document: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'],
        image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
        video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'],
        audio: ['mp3', 'wav', 'ogg', 'flac'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz']
    };
    
    for (let [type, extensions] of Object.entries(types)) {
        if (extensions.includes(ext)) return type;
    }
    return 'other';
}

// Dosya boyutu formatlama
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Tarih formatlama
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Bugün';
    if (days === 1) return 'Dün';
    if (days < 7) return `${days} gün önce`;
    
    return date.toLocaleDateString('tr-TR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
}

// İstatistikleri güncelle
function updateStats() {
    totalFilesEl.textContent = uploadedFiles.length;
    
    const totalBytes = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
    totalSizeEl.textContent = formatFileSize(totalBytes);
    
    if (uploadedFiles.length > 0) {
        const latestFile = uploadedFiles.reduce((latest, file) => {
            return new Date(file.date) > new Date(latest.date) ? file : latest;
        });
        latestDateEl.textContent = formatDate(latestFile.date);
    } else {
        latestDateEl.textContent = '-';
    }
}

// Dosyaları göster
function displayFiles(files) {
    filesContainer.innerHTML = '';
    
    if (files.length === 0) {
        emptyState.classList.add('show');
        filesContainer.style.display = 'none';
        return;
    }
    
    emptyState.classList.remove('show');
    filesContainer.style.display = 'grid';
    
    files.forEach(file => {
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        
        const icon = getFileIcon(file.type);
        
        fileCard.innerHTML = `
            <div class="file-card-header">
                <div class="file-type-icon">${icon}</div>
                <div class="file-card-info">
                    <h3>${file.name}</h3>
                    <div class="file-card-meta">
                        <span>💾 ${formatFileSize(file.size)}</span>
                        <span>📅 ${formatDate(file.date)}</span>
                    </div>
                </div>
            </div>
            <div class="file-card-actions">
                <button class="btn-action btn-download" onclick="downloadFile(${file.id})">
                    ⬇️ İndir
                </button>
                <button class="btn-action btn-delete" onclick="deleteFile(${file.id})">
                    🗑️ Sil
                </button>
            </div>
        `;
        
        filesContainer.appendChild(fileCard);
    });
}

// Arama
searchInput.addEventListener('input', (e) => {
    filterFiles();
});

// Filtre
filterType.addEventListener('change', () => {
    filterFiles();
});

// Dosyaları filtrele
function filterFiles() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedType = filterType.value;
    
    let filtered = uploadedFiles;
    
    // Arama filtresi
    if (searchTerm) {
        filtered = filtered.filter(file => 
            file.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Tip filtresi
    if (selectedType !== 'all') {
        filtered = filtered.filter(file => file.type === selectedType);
    }
    
    displayFiles(filtered);
}

// Dosya indir (simüle edilmiş)
function downloadFile(fileId) {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (file) {
        alert(`✅ "${file.name}" dosyası indiriliyor...`);
        // Gerçek uygulamada burada download API'si çağrılır
    }
}

// Dosya sil
function deleteFile(fileId) {
    if (confirm('Bu dosyayı silmek istediğinize emin misiniz?')) {
        uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
        localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
        updateStats();
        filterFiles();
        
        alert('✅ Dosya silindi!');
    }
}

// Tüm dosyaları temizle
btnClearAll.addEventListener('click', () => {
    if (uploadedFiles.length === 0) {
        alert('Silinecek dosya yok!');
        return;
    }
    
    if (confirm(`${uploadedFiles.length} dosyayı silmek istediğinize emin misiniz?`)) {
        uploadedFiles = [];
        localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
        updateStats();
        displayFiles(uploadedFiles);
        
        alert('✅ Tüm dosyalar temizlendi!');
    }
});