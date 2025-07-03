export default jest.fn().mockResolvedValue({
  text: 'Mock PDF text content',
  numpages: 1,
  info: { title: 'Mock PDF' }
});