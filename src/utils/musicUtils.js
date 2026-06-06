export function formatDuration(ms) {
    if (!ms || isNaN(ms)) return '00:00';
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const h = Math.floor(m / 60);
    const formattedM = m % 60;
    if (h > 0) {
        return `${h}:${formattedM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function createProgressBar(current, total, size = 15) {
    if (!total || total === 0) return '▬'.repeat(size);
    const progress = Math.round((current / total) * size);
    const emptyProgress = size - progress;
    const progressText = '🔘'.padStart(progress, '▬');
    const emptyProgressText = '▬'.repeat(emptyProgress);
    return progressText + emptyProgressText;
}

export function serializeTrack(track) {
    if (!track) return null;
    return {
        title: track.title,
        uri: track.uri,
        author: track.author,
        duration: track.length,
        isStream: track.isStream,
        thumbnail: track.thumbnail || null,
        requester: track.requester ? {
            id: track.requester.id,
            tag: track.requester.tag,
            avatar: track.requester.displayAvatarURL?.()
        } : null
    };
}
