'use strict'
let logger = require('@arve.knudsen/js-logger').get('validationFunctions')
let R = require('ramda')
let S = require('underscore.string.fp')

module.exports = {
  isBlank: S.isBlank,
  isBlankOrHasSpace: (input) => {
    let isBlank = S.isBlank(input)
    let hasSpace = input.indexOf(' ') > -1
    return (isBlank || hasSpace)
  },
  hasSpecialChars: (input) => {
    let match = R.match(/[a-z_0-9]/gi, input)
    return match.length !== input.length
  },
  areNotTheSame: (inputA, inputB) => {
    return inputA !== inputB
  },
}
