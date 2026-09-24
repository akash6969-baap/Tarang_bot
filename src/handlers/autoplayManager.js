import { logger } from '../utils/logger.js';

// --- LRU Cache Implementation ---
// Prevents memory leaks by capping the map size and enforcing TTL.
class MixCache {
    constructor(maxSize = 500, ttl = 60 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;

        setInterval(() => this.clean(), this.ttl);
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        // Make it true LRU: refresh position by deleting and re-setting
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            // Delete the oldest entry (Map iterates in insertion order)
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, { timestamp: Date.now(), value });
    }

    clean() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

const mixCache = new MixCache(500, 60 * 60 * 1000); // 500 items max, 1 hour TTL

// --- Utility Functions ---

function cleanAuthorName(author) {
    if (!author) return 'Unknown';
    // Remove everything after comma, pipe, dash, ampersand, semicolon safely
    return author.split(/[,\-|&;]/)[0].trim();
}

function cleanTitleName(title) {
    if (!title) return 'Songs';
    // Safely escaped regex to remove metadata brackets and secondary text
    let shortTitle = title.split(/[|\-\(\{\[\]]/)[0].trim();
    if (!shortTitle) shortTitle = 'Songs';
    return shortTitle;
}

function extractVideoId(uri) {
    if (!uri) return null;
    try {
        const url = new URL(uri);
        // Correctly handle both desktop and music variants of YouTube
        if (url.hostname.includes('youtube.com') || url.hostname.includes('music.youtube.com')) {
            return url.searchParams.get('v');
        } else if (url.hostname.includes('youtu.be')) {
            return url.pathname.slice(1);
        }
    } catch (e) {
        // Fallback for badly formatted URIs
        return null;
    }
    return null;
}

// --- Recommendation Scoring Algorithm ---

function getTrackScore(candidate, previousTrack) {
    let score = 0;
    const prevAuthor = previousTrack.author?.toLowerCase() || '';
    const candAuthor = candidate.author?.toLowerCase() || '';
    const prevTitle = previousTrack.title?.toLowerCase() || '';
    const candTitle = candidate.title?.toLowerCase() || '';

    // Same artist massive bonus
    if (candAuthor && prevAuthor && (candAuthor.includes(prevAuthor) || prevAuthor.includes(candAuthor))) {
        score += 50;
    }
    
    // Exact match artist bonus
    if (candAuthor === prevAuthor) {
        score += 20;
    }

    // Similar title keywords (if candidate title contains the previous author's name)
    if (candTitle.includes(prevAuthor) && prevAuthor.length > 3) {
        score += 30;
    }

    // Title keyword similarity
    const words = prevTitle.split(/\s+/);
    for (const word of words) {
        if (word.length > 3 && candTitle.includes(word)) {
            score += 10;
        }
    }

    // Exact title penalty (prevents playing exact same song/covers over and over)
    if (candTitle === prevTitle) {
        score -= 100;
    }

    return score;
}

// --- Core Autoplay Handler ---

/**
 * Advanced Autoplay Handler
 * Implements History Tracking, Caching, Scoring, and Multi-Level Fallbacks
 */
export async function handleAutoplay(client, player, previousTrack) {
    if (!previousTrack) return false;
    
    const kazagumo = client.kazagumo;
    
    // 1. Initialize History and Buffer
    let history = player.data.get('autoplayHistory') || [];
    let buffer = player.data.get('autoplayBuffer') || [];

    // Save previous track to history (Using Identifier + Title for maximum protection)
    const prevId = previousTrack.identifier || previousTrack.uri;
    const prevTitle = previousTrack.title?.toLowerCase().trim() || '';
    
    if (prevId) {
        history.push({ id: prevId, title: prevTitle });
        // Keep only last 100 tracks
        if (history.length > 100) history.shift(); 
        player.data.set('autoplayHistory', history);
    }

    // Advanced Duplicate Checker
    const isPlayedRecently = (track) => {
        const id = track.identifier || track.uri;
        if (!id) return true; // Block Invalid tracks
        
        const candTitle = track.title?.toLowerCase().trim() || '';
        
        for (const item of history) {
            // Backwards compatibility for old string-based history
            if (typeof item === 'string') {
                if (item === id) return true;
            } else {
                // Strict Identifier Check only (Title is handled by penalty in score)
                if (item.id === id) return true;
            }
        }
        return false;
    };

    // 2. Check Buffer First
    while (buffer.length > 0) {
        const bufferedTrack = buffer.shift();
        player.data.set('autoplayBuffer', buffer);
        
        if (!isPlayedRecently(bufferedTrack)) {
            // Safer play check depending on current queue
            if (!player.queue.current) {
                player.queue.add(bufferedTrack);
                await player.play();
                return true;
            }
        }
    }

    // 3. Fallback Search Chain Strategy
    const videoId = extractVideoId(previousTrack.uri);
    const cleanAuthor = cleanAuthorName(previousTrack.author);
    const shortTitle = cleanTitleName(previousTrack.title);
    
    const searchQueries = [];
    
    // Level 1: True YouTube Mix
    if (videoId) searchQueries.push(`https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`);
    // Level 2: YouTube Music Artist
    searchQueries.push(`ytmsearch:${cleanAuthor}`);
    // Level 3: YouTube Music Title + Artist
    searchQueries.push(`ytmsearch:${shortTitle} ${cleanAuthor}`);
    // Level 4: YouTube Search Title + Artist
    searchQueries.push(`ytsearch:${shortTitle} ${cleanAuthor}`);
    // Level 5: YouTube Generic Audio Fallback
    searchQueries.push(`ytsearch:${cleanAuthor} official audio`);

    let candidates = [];

    // 4. Execute Search Chain Safely
    for (const query of searchQueries) {
        try {
            // Check Memory Cache
            const cached = mixCache.get(query);
            if (cached) {
                candidates = cached;
            } else {
                const res = await kazagumo.search(query, { requester: { id: client.user.id, username: 'Autoplay' } });
                if (res && res.tracks && res.tracks.length > 0) {
                    candidates = res.tracks;
                    mixCache.set(query, res.tracks);
                }
            }

            if (candidates.length > 0) {
                // 5. Filter out history and identical tracks
                let validCandidates = candidates.filter(t => !isPlayedRecently(t));
                
                if (validCandidates.length > 0) {
                    // 6. Score Tracks deterministically
                    validCandidates = validCandidates.map(track => {
                        return { track, score: getTrackScore(track, previousTrack) };
                    });

                    // Sort by highest score descending
                    validCandidates.sort((a, b) => b.score - a.score);

                    // 7. Candidate Selection
                    const trackToPlay = validCandidates[0].track; // Pick absolute highest score
                    
                    // Store the next best 4 tracks into the buffer
                    const newBuffer = validCandidates.slice(1, 5).map(i => i.track);
                    player.data.set('autoplayBuffer', newBuffer);

                    // 8. Safe Playback
                    if (!player.queue.current) {
                        player.queue.add(trackToPlay);
                        await player.play();
                        return true;
                    }
                }
            }
        } catch (err) {
            // Safe Error Handling: Catch Lavalink timeouts and proceed to next fallback
            logger.error(`Autoplay search failed for query: ${query}`, err);
        }
    }

    // 9. If ALL fallbacks fail
    logger.warn(`Autoplay could not find any track for: ${previousTrack.title} by ${previousTrack.author}`);
    return false;
}
