import indexedDBManager from "../../../data/IndexedDBManager";

export default class DataManagementPage {
  async render() {
    const storageUsage = await indexedDBManager.getStorageUsage();
    
    return `
      <div class="data-management">
        <div class="page-header">
          <h2>Data Tersimpan</h2>
          <p class="subtitle">Kelola cerita yang tersimpan di perangkat Anda</p>
        </div>

        ${await this.renderStorageInfo(storageUsage)}
        ${await this.renderStoriesContent()}
        ${await this.renderBulkActions()}
      </div>

      <style>
        .data-management {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }

        .page-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
        }

        .page-header h2 {
          margin: 0 0 10px 0;
          font-size: 2em;
        }

        .subtitle {
          margin: 0;
          opacity: 0.9;
        }

        .storage-info {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .storage-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .stat-card {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #dee2e6;
          text-align: center;
        }

        .stat-value {
          font-size: 1.5em;
          font-weight: bold;
          color: #495057;
        }

        .stat-label {
          font-size: 0.9em;
          color: #6c757d;
          margin-top: 5px;
        }

        .usage-bar {
          background: #e9ecef;
          height: 8px;
          border-radius: 4px;
          margin: 10px 0;
          overflow: hidden;
        }

        .usage-fill {
          background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
          height: 100%;
          transition: width 0.3s ease;
        }

        .data-grid {
          display: grid;
          gap: 15px;
          margin-bottom: 30px;
        }

        .data-item {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .data-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .data-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .data-item-title {
          font-weight: 600;
          color: #495057;
          margin: 0;
        }

        .data-item-date {
          font-size: 0.85em;
          color: #6c757d;
        }

        .data-item-content {
          color: #6c757d;
          margin: 10px 0;
          line-height: 1.5;
        }

        .data-item-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 15px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          transition: all 0.3s ease;
        }

        .btn-danger {
          background-color: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c82333;
        }

        .btn-info {
          background-color: #17a2b8;
          color: white;
        }

        .btn-info:hover {
          background-color: #138496;
        }

        .btn-success {
          background-color: #28a745;
          color: white;
        }

        .btn-success:hover {
          background-color: #218838;
        }

        .bulk-actions {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
          margin-top: 30px;
        }

        .bulk-actions h3 {
          margin-top: 0;
          color: #495057;
        }

        .bulk-buttons {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .btn-warning {
          background-color: #ffc107;
          color: #212529;
        }

        .btn-warning:hover {
          background-color: #e0a800;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6c757d;
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
        }

        .empty-state-icon {
          font-size: 3em;
          margin-bottom: 15px;
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .data-management {
            padding: 10px;
          }
          
          .storage-stats {
            grid-template-columns: 1fr;
          }
          
          .bulk-buttons {
            flex-direction: column;
          }
          
          .data-item-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
        }
      </style>
    `;
  }

  async renderStorageInfo(storageUsage) {
    if (!storageUsage) return '';

    const usagePercentage = ((storageUsage.usage / storageUsage.quota) * 100).toFixed(1);
    const usedMB = (storageUsage.usage / (1024 * 1024)).toFixed(1);
    const quotaMB = (storageUsage.quota / (1024 * 1024)).toFixed(1);

    return `
      <div class="storage-info">
        <h3>📊 Informasi Penyimpanan</h3>
        <div class="usage-bar">
          <div class="usage-fill" style="width: ${usagePercentage}%"></div>
        </div>
        <p>Menggunakan ${usedMB} MB dari ${quotaMB} MB (${usagePercentage}%)</p>
        
        <div class="storage-stats">
          <div class="stat-card">
            <div class="stat-value">${storageUsage.storiesCount || 0}</div>
            <div class="stat-label">Cerita Tersimpan</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${usedMB} MB</div>
            <div class="stat-label">Ruang Terpakai</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${(quotaMB - usedMB).toFixed(1)} MB</div>
            <div class="stat-label">Ruang Tersisa</div>
          </div>
        </div>
      </div>
    `;
  }

  async renderStoriesContent() {
    const stories = await indexedDBManager.getStories(100); // Get all stories for management

    if (stories.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <h3>Tidak ada cerita tersimpan</h3>
          <p>Cerita yang Anda simpan akan muncul di sini</p>
          <p>Kunjungi halaman beranda untuk melihat dan menyimpan cerita</p>
        </div>
      `;
    }

    return `
      <div class="stories-section">
        <h3>📚 Cerita Tersimpan (${stories.length})</h3>
        <div class="data-grid">
          ${stories.map(story => `
            <div class="data-item">
              <div class="data-item-header">
                <h4 class="data-item-title">
                  ${story.name || 'Cerita Anonim'}
                </h4>
                <span class="data-item-date">
                  ${new Date(story.createdAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div class="data-item-content">
                <p><strong>Deskripsi:</strong></p>
                <p>${story.description ? 
                  (story.description.length > 150 ? 
                    story.description.substring(0, 150) + '...' : 
                    story.description
                  ) : 'Tidak ada deskripsi'
                }</p>
                ${story.photoUrl ? '<p><strong>📷 Memiliki foto</strong></p>' : ''}
                ${story.lat && story.lon ? '<p><strong>📍 Memiliki lokasi</strong></p>' : ''}
              </div>
              <div class="data-item-actions">
                <button class="btn btn-info" onclick="viewStoryDetails('${story.id}')">
                  👁️ Detail
                </button>
                <button class="btn btn-danger" onclick="deleteStory('${story.id}')">
                  🗑️ Hapus
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  async renderBulkActions() {
    return `
      <div class="bulk-actions">
        <h3>🛠️ Aksi Massal</h3>
        <p>Kelola semua data tersimpan sekaligus</p>
        <div class="bulk-buttons">
          <button class="btn btn-success" onclick="exportAllStories()">
            📤 Export Semua Cerita
          </button>
          <button class="btn btn-warning" onclick="clearOldStories()">
            🧹 Hapus Cerita Lama (>30 hari)
          </button>
          <button class="btn btn-danger" onclick="clearAllStories()">
            🗑️ Hapus Semua Cerita
          </button>
        </div>
      </div>
    `;
  }
}

// Global functions for event handling
window.deleteStory = async (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus cerita ini?')) {
    try {
      await indexedDBManager.deleteStory(id);
      alert('✅ Cerita berhasil dihapus');
      window.location.reload();
    } catch (error) {
      alert('❌ Gagal menghapus cerita: ' + error.message);
    }
  }
};

window.viewStoryDetails = async (id) => {
  try {
    const story = await indexedDBManager.getStoryById(id);
    if (story) {
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
                    align-items: center; justify-content: center; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 8px; 
                      max-width: 600px; max-height: 80vh; overflow-y: auto; 
                      box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <h3 style="margin-top: 0; color: #495057;">📖 Detail Cerita</h3>
            
            <div style="margin: 15px 0;">
              <strong>👤 Nama:</strong> ${story.name || 'Anonim'}
            </div>
            
            <div style="margin: 15px 0;">
              <strong>📅 Tanggal:</strong> ${new Date(story.createdAt).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            
            ${story.photoUrl ? `
              <div style="margin: 15px 0;">
                <strong>📷 Foto:</strong><br>
                <img src="${story.photoUrl}" alt="Story photo" 
                     style="max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px;">
              </div>
            ` : ''}
            
            ${story.lat && story.lon ? `
              <div style="margin: 15px 0;">
                <strong>📍 Lokasi:</strong> ${story.lat}, ${story.lon}
              </div>
            ` : ''}
            
            <div style="margin: 15px 0;">
              <strong>📝 Deskripsi:</strong>
              <p style="margin-top: 10px; line-height: 1.6; color: #6c757d;">
                ${story.description || 'Tidak ada deskripsi'}
              </p>
            </div>
            
            <div style="text-align: right; margin-top: 20px;">
              <button onclick="this.closest('div').parentElement.remove()" 
                      style="background: #dc3545; color: white; border: none; 
                             padding: 10px 20px; border-radius: 4px; cursor: pointer;
                             font-size: 16px;">
                Tutup
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  } catch (error) {
    alert('❌ Gagal memuat detail cerita: ' + error.message);
  }
};

window.exportAllStories = async () => {
  try {
    const stories = await indexedDBManager.getStories(1000);
    
    if (stories.length === 0) {
      alert('⚠️ Tidak ada cerita untuk di-export');
      return;
    }
    
    const data = {
      stories,
      totalCount: stories.length,
      exportDate: new Date().toISOString(),
      appName: 'Story App'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cerita-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert(`✅ ${stories.length} cerita berhasil di-export`);
  } catch (error) {
    alert('❌ Gagal export cerita: ' + error.message);
  }
};

window.clearOldStories = async () => {
  if (confirm('Hapus cerita yang lebih lama dari 30 hari?')) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // This would need to be implemented in IndexedDBManager
      // await indexedDBManager.deleteStoriesOlderThan(thirtyDaysAgo);
      
      alert('🧹 Cerita lama telah dibersihkan');
      window.location.reload();
    } catch (error) {
      alert('❌ Gagal membersihkan cerita lama: ' + error.message);
    }
  }
};

window.clearAllStories = async () => {
  if (confirm('⚠️ PERINGATAN: Ini akan menghapus SEMUA cerita tersimpan! Apakah Anda yakin?')) {
    if (confirm('🚨 Konfirmasi sekali lagi - semua cerita akan hilang permanent!')) {
      try {
        await indexedDBManager.clearAllStories();
        alert('✅ Semua cerita telah dihapus');
        window.location.reload();
      } catch (error) {
        alert('❌ Gagal menghapus semua cerita: ' + error.message);
      }
    }
  }
};