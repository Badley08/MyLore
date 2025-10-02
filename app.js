// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query,
    orderBy,
    limit,
    where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBRDXkNeXV-s-ExeoYSsOBz7o1brTh5FcE",
    authDomain: "citations-bf164.firebaseapp.com",
    projectId: "citations-bf164",
    storageBucket: "citations-bf164.firebasestorage.app",
    messagingSenderId: "50477077731",
    appId: "1:50477077731:web:bc4768457726d3ab62a1d6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection reference
const novelsCollection = collection(db, 'novels');

// DOM Elements
const novelsGrid = document.getElementById('novelsGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const readModal = document.getElementById('readModal');
const closeModal = document.getElementById('closeModal');
const refreshBtn = document.getElementById('refreshBtn');
const offlineBanner = document.getElementById('offlineBanner');
const filterBtns = document.querySelectorAll('.filter-btn');

// State
let novels = [];
let filteredNovels = [];
let currentFilter = 'all';
let isOnline = navigator.onLine;

// Détection online/offline
window.addEventListener('online', () => {
    isOnline = true;
    offlineBanner.classList.add('hidden');
    loadNovels(true); // Recharger depuis le serveur
});

window.addEventListener('offline', () => {
    isOnline = false;
    offlineBanner.classList.remove('hidden');
    // Essayer de charger depuis le cache
    loadFromCache();
});

// Refresh button
refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('animate-spin');
    loadNovels(true).finally(() => {
        setTimeout(() => {
            refreshBtn.classList.remove('animate-spin');
        }, 500);
    });
});

// Filter buttons
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active state
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Apply filter
        currentFilter = btn.dataset.filter;
        applyFilter();
    });
});

// Apply filter
function applyFilter() {
    let filtered = [...novels];
    
    switch(currentFilter) {
        case 'recent':
            filtered.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });
            filtered = filtered.slice(0, 6); // Top 6 récents
            break;
        case 'popular':
            // Tri par vues (si disponible) ou par défaut
            filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case 'all':
        default:
            // Ordre par défaut
            break;
    }
    
    filteredNovels = filtered;
    displayNovels(filteredNovels);
}

// Load novels
async function loadNovels(forceRefresh = false) {
    try {
        loadingState.classList.remove('hidden');
        novelsGrid.innerHTML = '';
        emptyState.classList.add('hidden');

        // Essayer de charger depuis le cache d'abord si hors ligne
        if (!isOnline && !forceRefresh) {
            const cached = await loadFromCache();
            if (cached) return;
        }

        const q = query(novelsCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        novels = [];
        querySnapshot.forEach((doc) => {
            novels.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sauvegarder dans le cache
        saveToCache(novels);

        loadingState.classList.add('hidden');

        if (novels.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            filteredNovels = novels;
            applyFilter();
        }
    } catch (error) {
        console.error("Erreur lors du chargement:", error);
        loadingState.classList.add('hidden');
        
        // Essayer de charger depuis le cache en cas d'erreur
        const cached = await loadFromCache();
        if (!cached) {
            emptyState.classList.remove('hidden');
        }
    }
}

// Save to cache (IndexedDB simulation avec localStorage)
function saveToCache(data) {
    try {
        localStorage.setItem('mylore_novels', JSON.stringify(data));
        localStorage.setItem('mylore_cache_time', Date.now().toString());
    } catch (e) {
        console.warn('Cannot save to cache:', e);
    }
}

// Load from cache
async function loadFromCache() {
    try {
        const cached = localStorage.getItem('mylore_novels');
        if (cached) {
            novels = JSON.parse(cached);
            filteredNovels = novels;
            
            loadingState.classList.add('hidden');
            
            if (novels.length > 0) {
                applyFilter();
                
                // Montrer le banner offline si on est hors ligne
                if (!isOnline) {
                    offlineBanner.classList.remove('hidden');
                }
                
                return true;
            }
        }
    } catch (e) {
        console.error('Error loading from cache:', e);
    }
    return false;
}

// Display novels
function displayNovels(novelsToDisplay) {
    novelsGrid.innerHTML = '';
    
    if (novelsToDisplay.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    novelsToDisplay.forEach((novel, index) => {
        const card = document.createElement('div');
        card.className = 'novel-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        const createdDate = novel.createdAt?.toDate?.() || new Date();
        const formattedDate = createdDate.toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        card.innerHTML = `
            <div class="overflow-hidden relative">
                <img src="${novel.coverUrl}" alt="${novel.title}" onerror="this.src='https://via.placeholder.com/400x300/1e1b4b/a855f7?text=No+Image'">
                <div class="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold">
                    ${formattedDate}
                </div>
            </div>
            <div class="novel-card-content">
                <h3>${novel.title}</h3>
                <p class="line-clamp-3">${novel.description}</p>
                <button class="btn-primary w-full" onclick="window.openNovel('${novel.id}')">
                    📖 Lire maintenant
                </button>
            </div>
        `;
        
        novelsGrid.appendChild(card);
    });
}

// Search functionality
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            applyFilter();
        } else {
            const searched = novels.filter(novel => 
                novel.title.toLowerCase().includes(searchTerm) ||
                novel.description.toLowerCase().includes(searchTerm) ||
                (novel.content && novel.content.toLowerCase().includes(searchTerm))
            );
            filteredNovels = searched;
            displayNovels(filteredNovels);
        }
    }, 300);
});

// Open novel in modal
window.openNovel = function(novelId) {
    const novel = novels.find(n => n.id === novelId);
    if (novel) {
        document.getElementById('modalTitle').textContent = novel.title;
        
        const createdDate = novel.createdAt?.toDate?.() || new Date();
        const formattedDate = createdDate.toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        document.getElementById('modalMeta').textContent = `Publié le ${formattedDate}`;
        
        document.getElementById('modalDescription').textContent = novel.description;
        document.getElementById('modalContent').textContent = novel.content;
        readModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Sauvegarder dans l'historique de lecture
        saveToReadingHistory(novel);
    }
};

// Close modal
closeModal.addEventListener('click', () => {
    readModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
});

readModal.addEventListener('click', (e) => {
    if (e.target === readModal) {
        readModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
});

// Bookmark functionality
document.getElementById('bookmarkBtn').addEventListener('click', () => {
    const title = document.getElementById('modalTitle').textContent;
    alert(`"${title}" a été enregistré dans vos favoris !`);
    // TODO: Implémenter la sauvegarde locale des favoris
});

// Share functionality
document.getElementById('shareBtn').addEventListener('click', async () => {
    const title = document.getElementById('modalTitle').textContent;
    const description = document.getElementById('modalDescription').textContent;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: `MyLore - ${title}`,
                text: description,
                url: window.location.href
            });
        } catch (err) {
            console.log('Error sharing:', err);
        }
    } else {
        // Fallback: copier dans le presse-papier
        navigator.clipboard.writeText(window.location.href);
        alert('Lien copié dans le presse-papier !');
    }
});

// Save to reading history
function saveToReadingHistory(novel) {
    try {
        let history = JSON.parse(localStorage.getItem('mylore_history') || '[]');
        
        // Éviter les doublons
        history = history.filter(h => h.id !== novel.id);
        
        // Ajouter au début
        history.unshift({
            id: novel.id,
            title: novel.title,
            readAt: Date.now()
        });
        
        // Garder seulement les 20 derniers
        history = history.slice(0, 20);
        
        localStorage.setItem('mylore_history', JSON.stringify(history));
    } catch (e) {
        console.warn('Cannot save to history:', e);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape pour fermer le modal
    if (e.key === 'Escape' && !readModal.classList.contains('hidden')) {
        readModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
    
    // Ctrl/Cmd + K pour focus sur la recherche
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
});

// Initialize app
console.log('🚀 MyLore PWA initialisé');
console.log('📡 Mode:', isOnline ? 'En ligne' : 'Hors ligne');

// Afficher le banner si hors ligne au démarrage
if (!isOnline) {
    offlineBanner.classList.remove('hidden');
}

loadNovels();