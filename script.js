// ==========================================
// PWA UPDATE MANAGER
// ==========================================

let newWorker;
let refreshing = false;

// Détection de nouvelle version du Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/MyLore/sw.js').then((registration) => {
        console.log('✅ Service Worker enregistré');

        // Vérifier les mises à jour toutes les 5 minutes
        setInterval(() => {
            registration.update();
        }, 5 * 60 * 1000);

        // Détecter quand un nouveau Service Worker est en attente
        registration.addEventListener('updatefound', () => {
            newWorker = registration.installing;
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Nouvelle version disponible
                    showUpdateNotification();
                }
            });
        });
    });

    // Rafraîchir automatiquement quand le nouveau SW prend le contrôle
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

// Afficher notification de mise à jour
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 24px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 16px;
            animation: slideInUp 0.5s ease-out;
            max-width: 400px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        ">
            <div>
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
                    🎉 Mise à jour disponible !
                </div>
                <div style="font-size: 14px; opacity: 0.9;">
                    Une nouvelle version de MyLore est prête
                </div>
            </div>
            <button id="update-btn" style="
                background: white;
                color: #667eea;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            ">
                Mettre à jour
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);

    // Ajouter l'animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInUp {
            from {
                transform: translateY(100px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        #update-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
    `;
    document.head.appendChild(style);

    // Action du bouton
    document.getElementById('update-btn').addEventListener('click', () => {
        if (newWorker) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
    });
}

// ==========================================
// CACHE MANAGEMENT
// ==========================================

// Fonction pour vider complètement le cache
async function clearAllCache() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('🗑️ Cache vidé complètement');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors du vidage du cache:', error);
        return false;
    }
}

// Fonction pour forcer le rafraîchissement avec nouveau cache
async function forceRefreshWithCache() {
    const refreshBtn = document.getElementById('force-refresh-btn');
    if (refreshBtn) {
        refreshBtn.textContent = '⏳ Mise à jour...';
        refreshBtn.disabled = true;
    }

    // Vider le cache
    await clearAllCache();
    
    // Désenregistrer tous les service workers
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
    }
    
    // Recharger la page
    window.location.reload(true);
}

// Ajouter un bouton de rafraîchissement manuel (caché par défaut)
window.addEventListener('load', () => {
    const refreshButton = document.createElement('button');
    refreshButton.id = 'force-refresh-btn';
    refreshButton.innerHTML = '🔄 Forcer MAJ';
    refreshButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(168, 85, 247, 0.9);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: bold;
        z-index: 9999;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
        opacity: 0.7;
        font-size: 14px;
    `;
    
    refreshButton.addEventListener('mouseenter', () => {
        refreshButton.style.opacity = '1';
        refreshButton.style.transform = 'scale(1.05)';
    });
    
    refreshButton.addEventListener('mouseleave', () => {
        refreshButton.style.opacity = '0.7';
        refreshButton.style.transform = 'scale(1)';
    });
    
    refreshButton.addEventListener('click', forceRefreshWithCache);
    
    document.body.appendChild(refreshButton);
});

// ==========================================
// PRECACHING INTELLIGENT
// ==========================================

// Liste des ressources critiques à précacher
const CRITICAL_RESOURCES = [
    '/MyLore/',
    '/MyLore/index.html',
    '/MyLore/styles.css',
    '/MyLore/app.js',
    '/MyLore/script.js',
    '/MyLore/manifest.json'
];

// Précacher les ressources critiques au chargement
async function precacheResources() {
    if ('caches' in window) {
        try {
            const cache = await caches.open('mylore-critical-v1');
            
            // Vérifier quelles ressources ne sont pas déjà en cache
            const promises = CRITICAL_RESOURCES.map(async (url) => {
                const response = await cache.match(url);
                if (!response) {
                    console.log(`📦 Précaching: ${url}`);
                    return cache.add(url);
                }
            });
            
            await Promise.all(promises);
            console.log('✅ Précaching terminé');
        } catch (error) {
            console.error('❌ Erreur précaching:', error);
        }
    }
}

// Lancer le précaching au chargement de la page
window.addEventListener('load', precacheResources);

// Vérifier la taille du cache et nettoyer si nécessaire
async function manageCacheSize() {
    if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            const percentUsed = (estimate.usage / estimate.quota) * 100;
            
            console.log(`💾 Stockage utilisé: ${percentUsed.toFixed(2)}%`);
            
            // Si plus de 80% utilisé, nettoyer les vieux caches
            if (percentUsed > 80) {
                const cacheNames = await caches.keys();
                // Garder seulement les 2 versions les plus récentes
                const oldCaches = cacheNames.slice(0, -2);
                await Promise.all(oldCaches.map(name => caches.delete(name)));
                console.log('🧹 Anciens caches nettoyés');
            }
        } catch (error) {
            console.error('❌ Erreur gestion cache:', error);
        }
    }
}

// Vérifier la taille du cache toutes les 10 minutes
setInterval(manageCacheSize, 10 * 60 * 1000);

// ==========================================
// DÉSACTIVER CLIC DROIT
// ==========================================

// Désactiver le menu contextuel (clic droit)
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    // Afficher une notification subtile
    showContextMenuNotification();
    
    return false;
});

// Notification quand on tente un clic droit
function showContextMenuNotification() {
    // Vérifier si une notification existe déjà
    if (document.getElementById('no-context-menu-notif')) return;
    
    const notif = document.createElement('div');
    notif.id = 'no-context-menu-notif';
    notif.innerHTML = '🔒 Clic droit désactivé';
    notif.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10001;
        animation: fadeInOut 1.5s ease-in-out;
        pointer-events: none;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notif);
    
    // Supprimer après l'animation
    setTimeout(() => {
        notif.remove();
    }, 1500);
}

// Désactiver aussi certains raccourcis clavier de développeur
document.addEventListener('keydown', (e) => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
        (e.ctrlKey && e.keyCode === 85) // Ctrl+U
    ) {
        e.preventDefault();
        showContextMenuNotification();
        return false;
    }
});

// Désactiver la sélection de texte (optionnel - décommentez si souhaité)
/*
document.addEventListener('selectstart', (e) => {
    e.preventDefault();
    return false;
});

document.body.style.userSelect = 'none';
document.body.style.webkitUserSelect = 'none';
document.body.style.mozUserSelect = 'none';
document.body.style.msUserSelect = 'none';
*/

// ==========================================
// MONITORING DU PWA
// ==========================================

// Logger l'état du PWA
window.addEventListener('load', () => {
    // Vérifier si installé comme PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches 
                  || window.navigator.standalone 
                  || document.referrer.includes('android-app://');
    
    if (isPWA) {
        console.log('📱 Application lancée en mode PWA');
    } else {
        console.log('🌐 Application lancée dans le navigateur');
    }

    // Logger les informations de cache
    manageCacheSize();
});

// Export des fonctions utiles
window.MyLorePWA = {
    clearCache: clearAllCache,
    forceRefresh: forceRefreshWithCache,
    precache: precacheResources
};

console.log('✨ MyLore PWA Manager chargé');
console.log('💡 Utilisez MyLorePWA.clearCache() pour vider le cache');
console.log('💡 Utilisez MyLorePWA.forceRefresh() pour forcer une mise à jour');