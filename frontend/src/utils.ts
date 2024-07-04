const obscureApiKey = (apiKey: string): string => {
    if (apiKey.length <= 8) return apiKey;
    const visibleCharacters = 4;
    const obscuredSectionLength = apiKey.length - (visibleCharacters * 2);
    const obscuredSection = '*'.repeat(obscuredSectionLength);
    return `${apiKey.substring(0, visibleCharacters)}${obscuredSection}${apiKey.substring(apiKey.length - visibleCharacters)}`;
};

const validateRepoUrl = (url: string) => {
    const regex = /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/[\w-]+(\/)?$/;
    return regex.test(url);
};