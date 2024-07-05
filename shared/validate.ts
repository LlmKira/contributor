function extractGitHubRepoUrl(text: string): string {
    const githubRepoUrlPattern = /https?:\/\/github\.com\/[\w-]+\/[\w-]+/g;
    const matches = text.match(githubRepoUrlPattern);
    return matches ? matches[0] : '';
}

function isValidUrl(text: string): boolean {
    try {
        const url = new URL(text);
        return ['http:', 'https:'].includes(url.protocol);
    } catch (_) {
        return false;
    }
}

export {extractGitHubRepoUrl, isValidUrl};