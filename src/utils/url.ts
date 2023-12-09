export const changeHttpsToHttp = (link: string) => {
    const urlFileLink = new URL(link);
    urlFileLink.protocol = 'http';
    return urlFileLink.toString();
};
