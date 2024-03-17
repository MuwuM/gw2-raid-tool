module.exports = {
  services: [
    require('volar-service-prettyhtml').default({
      singleQuote: true,
      semi: false,
      printWidth: 100,
      trailingComma: 'none'
    })
  ]
}
