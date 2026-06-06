const socket = io();

let currentGuildId = null;
let user = null;

// DOM Elements
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const guildList = document.getElementById('guildList');
const nodeList = document.getElementById('nodeList');
const activeGuildName = document.getElementById('activeGuildName');

// Player Elements
const npTitle = document.getElementById('npTitle');
const npAuthor = document.getElementById('npAuthor');
const npThumbnail = document.getElementById('npThumbnail');
const timeCurrent = document.getElementById('timeCurrent');
const timeTotal = document.getElementById('timeTotal');
const progressBar = document.getElementById('progressBar');
const volumeSlider = document.getElementById('volumeSlider');
const volValue = document.getElementById('volValue');
const queueListEl = document.getElementById('queueList');

// Controls
const btnPlayPause = document.getElementById('btnPlayPause');
const btnSkip = document.getElementById('btnSkip');
const btnStop = document.getElementById('btnStop');
const btnShuffle = document.getElementById('btnShuffle');
const btnLoop = document.getElementById('btnLoop');
const loopState = document.getElementById('loopState');

// Search
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// Format duration utility
function formatDuration(ms) {
    if (!ms || isNaN(ms)) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const h = Math.floor(m / 60);
    const formattedM = m % 60;
    if (h > 0) return `${h}:${formattedM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

async function init() {
    try {
        const resUser = await fetch('/api/user');
        if (!resUser.ok) {
            window.location.href = '/';
            return;
        }
        user = await resUser.json();
        
        userAvatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        userName.textContent = user.username;

        const resGuilds = await fetch('/api/guilds');
        const guilds = await resGuilds.json();

        guilds.forEach(g => {
            const li = document.createElement('li');
            li.className = 'guild-item';
            const iconUrl = g.icon 
                ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
                : 'https://via.placeholder.com/32?text=' + g.name.charAt(0);
            li.innerHTML = `<img src="${iconUrl}" alt="${g.name}"><span>${g.name}</span>`;
            li.onclick = () => selectGuild(g.id, g.name, li);
            guildList.appendChild(li);
        });

        // Load Nodes
        const resNodes = await fetch('/api/nodes');
        const nodes = await resNodes.json();
        nodes.forEach(n => {
            const li = document.createElement('li');
            li.className = 'node-item';
            const statusClass = n.state === 1 ? 'connected' : 'disconnected';
            li.innerHTML = `<span class="node-status ${statusClass}"></span>${n.name}`;
            nodeList.appendChild(li);
        });

        // Select first guild if exists
        if (guilds.length > 0) {
            const firstGuild = guildList.firstChild;
            selectGuild(guilds[0].id, guilds[0].name, firstGuild);
        }

    } catch (e) {
        console.error(e);
        window.location.href = '/';
    }
}

function selectGuild(id, name, element) {
    currentGuildId = id;
    activeGuildName.textContent = name;
    
    document.querySelectorAll('.guild-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    socket.emit('join_guild', id);
}

// Socket Events
socket.on('playerUpdate', (state) => {
    if (!state) {
        resetPlayer();
        return;
    }

    // Update NP
    if (state.current) {
        npTitle.textContent = state.current.title;
        npAuthor.textContent = state.current.author;
        npThumbnail.src = state.current.thumbnail || 'https://via.placeholder.com/400';
        timeTotal.textContent = formatDuration(state.current.duration);
        progressBar.max = state.current.duration;
        progressBar.value = state.position;
        timeCurrent.textContent = formatDuration(state.position);
    } else {
        resetPlayer();
    }

    // Play/Pause button
    btnPlayPause.innerHTML = state.playing && !state.paused ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
    
    // Volume
    volumeSlider.value = state.volume;
    volValue.textContent = state.volume + '%';

    // Loop
    let ls = 'N';
    if (state.loop === 'track') ls = 'T';
    if (state.loop === 'queue') ls = 'Q';
    loopState.textContent = ls;
    btnLoop.style.color = state.loop !== 'none' ? 'var(--accent)' : 'var(--text-muted)';

    // Queue
    queueListEl.innerHTML = '';
    state.queue.forEach((t, i) => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        li.innerHTML = `
            <img src="${t.thumbnail || 'https://via.placeholder.com/50'}" alt="Thumb">
            <div class="queue-info">
                <div class="queue-title">${t.title}</div>
                <div class="queue-author">${t.author}</div>
            </div>
            <button class="remove-btn" onclick="removeTrack(${i})"><i data-lucide="trash-2"></i></button>
        `;
        queueListEl.appendChild(li);
    });

    lucide.createIcons();
});

function resetPlayer() {
    npTitle.textContent = 'No song playing';
    npAuthor.textContent = '--';
    npThumbnail.src = 'https://via.placeholder.com/400';
    timeCurrent.textContent = '0:00';
    timeTotal.textContent = '0:00';
    progressBar.value = 0;
    queueListEl.innerHTML = '';
    btnPlayPause.innerHTML = '<i data-lucide="play"></i>';
    lucide.createIcons();
}

// Controls
function emitControl(action, value = null) {
    if (!currentGuildId) return;
    socket.emit('control', { guildId: currentGuildId, action, value });
}

btnPlayPause.onclick = () => emitControl('playpause');
btnSkip.onclick = () => emitControl('skip');
btnStop.onclick = () => emitControl('stop');
btnShuffle.onclick = () => emitControl('shuffle');
btnLoop.onclick = () => {
    let next = 'none';
    const ls = loopState.textContent;
    if (ls === 'N') next = 'track';
    else if (ls === 'T') next = 'queue';
    emitControl('loop', next);
};

volumeSlider.onchange = (e) => emitControl('volume', parseInt(e.target.value));
volumeSlider.oninput = (e) => volValue.textContent = e.target.value + '%';

progressBar.onchange = (e) => emitControl('seek', parseInt(e.target.value));

window.removeTrack = (index) => emitControl('remove_queue', index);

// Search
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (!query || !currentGuildId) {
        searchResults.classList.add('hidden');
        return;
    }

    searchTimeout = setTimeout(() => {
        socket.emit('search', { guildId: currentGuildId, query, userId: user.id });
    }, 500);
});

socket.on('search_results', (tracks) => {
    searchResults.innerHTML = '';
    if (!tracks || tracks.length === 0) {
        searchResults.classList.add('hidden');
        return;
    }

    tracks.forEach(t => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
            <img src="${t.thumbnail || 'https://via.placeholder.com/40'}" alt="Thumb">
            <div class="search-item-info">
                <span class="search-item-title">${t.title.substring(0, 50)}</span>
                <span class="search-item-author">${t.author}</span>
            </div>
        `;
        div.onclick = () => {
            searchResults.classList.add('hidden');
            searchInput.value = '';
            socket.emit('play_track', {
                guildId: currentGuildId,
                uri: t.uri,
                userId: user.id
                // Note: we don't have textChannelId/voiceChannelId here.
                // The bot handles logic: if not in VC, will return error via socket
            });
        };
        searchResults.appendChild(div);
    });
    searchResults.classList.remove('hidden');
});

socket.on('error', (msg) => {
    alert(msg);
});

// Close search on click outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
        searchResults.classList.add('hidden');
    }
});

// Start
init();
