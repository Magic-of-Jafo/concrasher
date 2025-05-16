const mockRenderToString = jest.fn((component, context, options) => {
  // Simulate rendering a component to a string.
  // For many tests, just returning a simple string or an empty string is enough.
  // If the actual rendered output is needed for assertions, this mock would need to be more sophisticated.
  if (component && typeof component.type === 'function') {
    return `<mocked:${component.type.name || 'Component'} />`;
  }
  return '<mocked:Component />';
});

module.exports = {
  renderToString: mockRenderToString,
  render: mockRenderToString, // Alias or if used directly
  renderToStaticMarkup: mockRenderToString, // Alias or if used directly
  shallowRender: mockRenderToString, // If its shallow rendering capabilities are used
  default: mockRenderToString, // If used as a default import
}; 