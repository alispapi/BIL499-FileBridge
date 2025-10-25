// DOM Elementleri
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const btnSelect = document.getElementById('btnSelect');
const btnUpload = document.getElementById('btnUpload');
const fileList = document.getElementById('fileList');

// selectedFiles holds objects: { file: File, type: string }
let selectedFiles = [];

// Dosya seçme butonu
btnSelect.addEventListener('click', () => {
    fileInput.click();
});

// Dosya input değişikliği
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Drag & Drop olayları
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});

// Dosyaları işleme
function handleFiles(files) {
    const filesArray = Array.from(files);
    
    filesArray.forEach(file => {
        // 100MB kontrolü
        if (file.size > 100 * 1024 * 1024) {
            alert(`${file.name} çok büyük! Maksimum 100MB`);
            return;
        }
        
        // Aynı dosya kontrolü (dosya adı ile)
        if (!selectedFiles.find(f => f.file.name === file.name)) {
            selectedFiles.push({ file: file, type: '' }); // type boş - kullanıcı seçecek
        }
    });
    
    updateFileList();
    updateUploadButton();
}

// Dosya listesini güncelleme
function updateFileList() {
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const entry = file;
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        const fileSize = formatFileSize(entry.file.size);

        fileItem.innerHTML = `
            <div class="file-item-info">
                <div class="file-item-icon">📄</div>
                <div class="file-item-details">
                    <h4>${entry.file.name}</h4>
                    <p>${fileSize}</p>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <select class="file-type-select" onchange="setFileType(${index}, this.value)">
                    <option value="">Tür seçin</option>
                    <option value="gorsel">Görsel</option>
                    <option value="dokuman">Döküman</option>
                    <option value="video">Video</option>
                    <option value="diger">Diğer</option>
                </select>
                <button class="file-item-remove" onclick="removeFile(${index})">×</button>
            </div>
        `;

        fileList.appendChild(fileItem);
        // Eğer daha önce tür seçilmişse select'e uygula
        const selects = fileList.getElementsByClassName('file-type-select');
        if (selects && selects[index]) {
            selects[index].value = entry.type || '';
        }
    });
}

// Dosya boyutu formatlama
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Dosya silme
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    updateUploadButton();
}

// Upload butonunu güncelleme
function updateUploadButton() {
    // Şimdilik: Upload butonunu devre dışı tut (API bağlandıktan sonra etkinleştireceksiniz)
    // Butonun etkinleştirilmesi manuel veya API-bağlantı sonrası yapılmalıdır.
    btnUpload.disabled = true;
    btnUpload.title = 'API bağlı değil - gerçek yükleme için etkinleştirilecektir.';
}

// Set file type from select
function setFileType(index, type) {
    if (selectedFiles[index]) {
        selectedFiles[index].type = type;
    }
    updateUploadButton();
    // Görsel geri bildirim: seçilen option'u elemente uygula (opsiyonel)
    const selects = document.getElementsByClassName('file-type-select');
    if (selects && selects[index]) selects[index].value = type;
}

// Dosya yükleme
btnUpload.addEventListener('click', () => {
    if (selectedFiles.length === 0) return;
    
    btnUpload.textContent = 'Gönderiliyor...';
    btnUpload.disabled = true;
    
    // Progress bar oluştur
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.innerHTML = '<div class="progress-fill"></div>';
    btnUpload.after(progressBar);
    
    const progressFill = progressBar.querySelector('.progress-fill');
    
    // Simüle edilmiş yükleme (gerçek SFTP bağlantısı için backend gerekir)
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressFill.style.width = progress + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                // Özet bilgi: dosya isimleri ve seçilen türler (geliştirme amaçlı)
                const summary = selectedFiles.map(s => `${s.file.name} [${s.type || 'belirsiz'}]`).join('\n');
                alert('✅ Dosyalar başarıyla gönderildi!\n\n' + summary);
                selectedFiles = [];
                updateFileList();
                btnUpload.textContent = 'Dosyaları Gönder';
                updateUploadButton();
                progressBar.remove();
            }, 500);
        }
    }, 300);
});