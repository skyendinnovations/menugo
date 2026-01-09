module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons'],
    },
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    globals: {
        'ts-jest': {
            useESM: false,
        },
    },
};
