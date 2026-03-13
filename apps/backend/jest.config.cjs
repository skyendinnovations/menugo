module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    transform: {
        // ts-jest transpiles in isolatedModules mode (set in tsconfig.json).
        // This avoids the verbatimModuleSyntax / CommonJS conflict that arises
        // when the project tsconfig is configured for bundler / ESM output but
        // Jest requires CommonJS at runtime.
        '^.+\.ts$': 'ts-jest',
    },
};
