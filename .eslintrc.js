module.exports = {
  env: {
    es6: true,
    node: true,
    mocha: true
  },
  globals: {
    BigInt: true,
    Quill: true,
    AbortError: true
  },
  parserOptions: {ecmaVersion: 2018},
  extends: "eslint:recommended",
  rules: {
    "indent": [
      "error",
      2
    ],
    "no-console": "off",
    "linebreak-style": [
      "error",
      "windows"
    ],
    "quotes": [
      "error",
      "double"
    ],
    "semi": [
      "error",
      "always"
    ],
    "curly": "error",
    "dot-location": [
      "error",
      "property"
    ],
    "dot-notation": "error",
    "eqeqeq": [
      "error",
      "always"
    ],
    "no-else-return": "error",
    "no-extra-label": "error",
    "no-floating-decimal": "error",
    "no-multi-spaces": "error",
    "wrap-iife": [
      "error",
      "outside"
    ],
    "yoda": "error",
    "global-require": "error",
    "no-sync": "error",
    "array-bracket-newline": [
      "error",
      {
        multiline: true,
        minItems: 2
      }
    ],
    "array-bracket-spacing": [
      "error",
      "never"
    ],
    "array-element-newline": [
      "error",
      {minItems: 2}
    ],
    "block-spacing": "error",
    "brace-style": [
      "error",
      "1tbs"
    ],
    "comma-dangle": [
      "error",
      "never"
    ],
    "comma-spacing": [
      "error",
      {
        before: false,
        after: true
      }
    ],
    "comma-style": [
      "error",
      "last"
    ],
    "computed-property-spacing": [
      "error",
      "never"
    ],
    "eol-last": [
      "error",
      "always"
    ],
    "func-call-spacing": [
      "error",
      "never"
    ],
    "function-paren-newline": [
      "error",
      "multiline"
    ],
    "implicit-arrow-linebreak": [
      "error",
      "beside"
    ],
    "key-spacing": [
      "error",
      {
        afterColon: true,
        beforeColon: false,
        mode: "strict"
      }
    ],
    "keyword-spacing": [
      "error",
      {
        after: true,
        before: true
      }
    ],
    "new-parens": "error",
    "newline-per-chained-call": [
      "error",
      {ignoreChainWithDepth: 2}
    ],

    "no-lonely-if": "off",

    "no-multiple-empty-lines": "error",

    "no-trailing-spaces": "error",

    "no-unneeded-ternary": "error",

    "no-whitespace-before-property": "error",

    "object-curly-newline": [
      "error",
      {
        minProperties: 2,
        minProperties: 2
      }
    ],

    "object-curly-spacing": [
      "error",
      "never"
    ],

    "object-property-newline": "error",

    "one-var": [
      "error",
      "never"
    ],

    "operator-assignment": [
      "error",
      "always"
    ],

    "operator-linebreak": [
      "error",
      "after"
    ],

    // "prefer-object-spread":"error",

    "quote-props": [
      "error",
      "consistent-as-needed"
    ],

    "space-before-blocks": "error",

    "space-before-function-paren": [
      "error",
      "never"
    ],

    "space-in-parens": [
      "error",
      "never"
    ],

    "space-infix-ops": "error",

    "space-unary-ops": "error",

    "switch-colon-spacing": [
      "error",
      {
        after: true,
        before: false
      }
    ],

    "template-tag-spacing": "error",

    "arrow-body-style": [
      "error",
      "as-needed"
    ],

    "arrow-parens": [
      "error",
      "always"
    ],

    "arrow-spacing": "error",

    "generator-star-spacing": [
      "error",
      {
        before: true,
        after: true
      }
    ],

    "no-confusing-arrow": "error",

    "no-useless-computed-key": "error",

    "no-useless-rename": "error",

    "no-var": "error",

    "object-shorthand": "error",

    "prefer-arrow-callback": "error",

    "prefer-const": "error",

    "prefer-numeric-literals": "error",

    "prefer-spread": "error",

    "prefer-template": "error",

    "rest-spread-spacing": [
      "error",
      "never"
    ],

    "template-curly-spacing": [
      "error",
      "never"
    ],

    "yield-star-spacing": [
      "error",
      {
        before: true,
        after: false
      }
    ],

    "radix": "error",

    "require-atomic-updates": "off"

  }

};
