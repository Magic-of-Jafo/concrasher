// Mock for preact to avoid ES module parsing issues
module.exports = {
    Component: class Component {
        constructor(props) {
            this.props = props;
        }
        render() {
            return null;
        }
    },
    Fragment: 'Fragment',
    createElement: jest.fn(),
    createRef: jest.fn(() => ({ current: null })),
    render: jest.fn(),
    h: jest.fn(),
    hydrate: jest.fn(),
    isValidElement: jest.fn(),
    options: {},
    toChildArray: jest.fn(),
    cloneElement: jest.fn(),
    createContext: jest.fn(),
}; 