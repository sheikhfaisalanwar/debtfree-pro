export const ReactNativeBlobUtil = {
  fs: {
    stat: jest.fn().mockResolvedValue({
      size: 100000,
      lastModified: '2024-01-01T00:00:00.000Z'
    })
  }
};