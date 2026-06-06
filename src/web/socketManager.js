let ioInstance = null;

export const setIo = (io) => {
    ioInstance = io;
};

export const getIo = () => {
    return ioInstance;
};
