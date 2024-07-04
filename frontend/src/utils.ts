
const validateRepoUrl = (url: string) => {
    const regex = /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/[\w-]+(\/)?$/;
    return regex.test(url);
};

export {validateRepoUrl};