module.exports = {
    root: true,
    env: {
        browser: false,
        es2021: true,
        node: true
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/eslint-recommended"
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 12,
        sourceType: "module"
    },
    plugins: ["@typescript-eslint"],
    rules: {
        "no-case-declarations": "off"
    },
    ignorePatterns: ["node_modules/", "dist/", "coverage/"]
};
