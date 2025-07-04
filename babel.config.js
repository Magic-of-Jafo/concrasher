module.exports = {
    presets: [
        'next/babel',
        ['@babel/preset-env', { targets: { node: 'current' } }],
    ],
    env: {
        test: {
            presets: [
                'next/babel',
                ['@babel/preset-env', { targets: { node: 'current' } }],
            ],
        },
    },
}; 