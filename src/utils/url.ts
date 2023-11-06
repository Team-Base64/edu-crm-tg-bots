export const changeHttpsToHttps = (link: string) => {
    const urlFileLink = new URL(link);
    urlFileLink.protocol = 'http';
    return urlFileLink.toString();
};
