export const getProjectPicture = (url) => url == null ? ("/common/projectCoverBlank.png") : url;

export const bytesToMBytes = (bytes) => Math.round(bytes *100 / 1024 / 1024 )/100;
